import { supabase } from "@/services/supabase/supabaseClient";

export async function POST(req) {
  try {
    const { amount } = await req.json();
    if (!amount || amount <= 0) {
      return Response.json({ success: false, message: "Invalid reward amount." }, { status: 400 });
    }

    console.log("🚀 Starting weekly reward distribution...");

    // ✅ 1. Fetch users with weekly points > 0
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, weekly_points")
      .gt("weekly_points", 0);

    if (usersError) throw new Error(`Failed to fetch users: ${usersError.message}`);

    console.log("✅ Users fetched:", users.length);
    
    if (users.length === 0) {
      console.log("❌ No users with points, skipping distribution.");
      return Response.json({ success: false, message: "No points to distribute." });
    }

    // ✅ 2. Fetch wallets of these users
    const userIds = users.map(user => user.id);
    const { data: wallets, error: walletsError } = await supabase
      .from("wallet_balances")
      .select("user_id, amount")
      .in("user_id", userIds)
      .eq("chain", "SOL")
      .eq("currency", "SMP");

    if (walletsError) throw new Error(`Failed to fetch wallets: ${walletsError.message}`);

    console.log("✅ Wallets fetched:", wallets.length);

    // ✅ 3. Create a user-wallet map
    const walletMap = {};
    wallets.forEach(wallet => {
      walletMap[wallet.user_id] = wallet.amount;
    });

    // ✅ 4. Calculate total points & reward per point
    const totalPoints = users.reduce((sum, user) => sum + user.weekly_points, 0);
    if (totalPoints === 0) {
      return Response.json({ success: false, message: "No valid points for distribution." });
    }

    const rewardPerPoint = amount / totalPoints;
    console.log(`⚡ Reward per point: ${rewardPerPoint}`);

    // ✅ 5. Log all affected users before updating
    console.log("🔍 Users receiving rewards:");
    users.forEach(user => {
      const rewardAmount = user.weekly_points * rewardPerPoint;
      console.log(`📌 User ID: ${user.id} | Weekly Points: ${user.weekly_points} | Reward: ${rewardAmount} SMP`);
    });

    // ✅ 6. Distribute rewards
    for (const user of users) {
      const rewardAmount = user.weekly_points * rewardPerPoint;

      if (walletMap[user.id] !== undefined) {
        // ✅ Update existing wallet balance
        const { error: updateError } = await supabase
          .from("wallet_balances")
          .update({ amount: walletMap[user.id] + rewardAmount })
          .eq("user_id", user.id)
          .eq("chain", "SOL")
          .eq("currency", "SMP");

        if (updateError) throw new Error(`Failed to update wallet balance: ${updateError.message}`);

        console.log(`✅ Updated wallet for user ${user.id}: +${rewardAmount} SMP`);
      } else {
        console.error(`❌ ERROR: Wallet for user ${user.id} not found!`);
      }
    }

    // ✅ 7. Reset weekly points
    const { error: resetError } = await supabase
      .from("users")
      .update({ weekly_points: 0 })
      .neq("weekly_points", 0);

    if (resetError) throw new Error(`Failed to reset weekly points: ${resetError.message}`);

    console.log("✅ Weekly points reset!");

    return Response.json({ success: true, message: "Rewards distributed successfully!" });

  } catch (err) {
    console.error("🔥 Error:", err.message);
    return Response.json({ success: false, message: `Failed: ${err.message}` }, { status: 500 });
  }
}
