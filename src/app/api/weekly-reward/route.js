import { supabase } from "@/services/supabase/supabaseClient";

export async function POST(req) {
  try {
    const { amount } = await req.json();
    if (!amount || amount <= 0) {
      return Response.json(
        { success: false, message: "Invalid reward amount." },
        { status: 400 }
      );
    }

    console.log("🚀 Starting weekly reward distribution...");

    // 1. Fetch users with weekly points > 0, including wallet_address
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, weekly_points, wallet_address")
      .gt("weekly_points", 0);

    if (usersError) throw new Error(`Failed to fetch users: ${usersError.message}`);

    console.log("✅ Users fetched:", users?.length || 0);

    if (!users || users.length === 0) {
      console.log("❌ No users with points, skipping distribution.");
      return Response.json({
        success: false,
        message: "No users with points to distribute.",
      });
    }

    // 2. Fetch existing wallets for these users
    const userIds = users.map((user) => user.id);
    const { data: wallets, error: walletsError } = await supabase
      .from("wallet_balances")
      .select("user_id, wallet_address, amount")
      .in("user_id", userIds)
      .eq("chain", "SOL")
      .eq("currency", "SMP");

    if (walletsError)
      throw new Error(`Failed to fetch wallets: ${walletsError.message}`);

    console.log("✅ Wallets fetched:", wallets?.length || 0);

    // 3. Create a wallet map by user_id
    const walletMap = Object.fromEntries(
      (wallets || []).map((wallet) => [wallet.user_id, wallet])
    );

    // 4. Calculate total points & reward per point
    const totalPoints = users.reduce((sum, user) => sum + user.weekly_points, 0);
    if (totalPoints === 0) {
      return Response.json({
        success: false,
        message: "No valid points for distribution.",
      });
    }

    const rewardPerPoint = amount / totalPoints;
    console.log(`⚡ Reward per point: ${rewardPerPoint}`);

    // 5. Prepare updates/inserts and log
    console.log("🔍 Processing rewards:");
    const updates = [];
    for (const user of users) {
      const rewardAmount = user.weekly_points * rewardPerPoint;
      console.log(
        `📌 User ID: ${user.id} | Wallet: ${user.wallet_address} | Points: ${user.weekly_points} | Reward: ${rewardAmount} SMP`
      );
      updates.push({ user_id: user.id, wallet_address: user.wallet_address, rewardAmount });
    }

    // 6. Distribute rewards using upsert for efficiency
    const upsertData = updates.map(({ user_id, wallet_address, rewardAmount }) => ({
      user_id,
      wallet_address,
      chain: "SOL",
      currency: "SMP",
      amount: (walletMap[user_id]?.amount || 0) + rewardAmount,
      decimals: 9, // Adjust based on SMP token decimals
    }));

    const { error: upsertError } = await supabase
      .from("wallet_balances")
      .upsert(upsertData, {
        onConflict: ["user_id", "chain", "currency"],
      });

    if (upsertError) {
      console.error("Upsert error details:", upsertError);
      throw new Error(`Failed to upsert wallet balances: ${upsertError.message}`);
    }

    console.log(`✅ Processed ${updates.length} wallet balances (updates and inserts)`);

    // 7. Reset weekly points
    const { error: resetError } = await supabase
      .from("users")
      .update({ weekly_points: 0 })
      .neq("weekly_points", 0);

    if (resetError)
      throw new Error(`Failed to reset weekly points: ${resetError.message}`);

    console.log("✅ Weekly points reset!");

    return Response.json({
      success: true,
      message: `Rewards distributed successfully to ${users.length} users!`,
    });
  } catch (err) {
    console.error("🔥 Error:", err.message);
    return Response.json(
      { success: false, message: `Failed: ${err.message}` },
      { status: 500 }
    );
  }
}