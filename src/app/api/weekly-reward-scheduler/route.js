import { supabase } from "@/services/supabase/supabaseClient";

const TIMER_KEY = "weekly_reward_timer";
const REWARD_AMOUNT = 200; // Total SMP to distribute

export async function POST(req) {
  try {
    console.log("🔥 API HIT: /api/weekly-reward");

    // ✅ 1. Fetch last distribution time
    const { data: timerData, error: timerError } = await supabase
      .from("settings")
      .select("value")
      .eq("key", TIMER_KEY)
      .single();

    if (timerError) {
      console.error("❌ Timer fetch error:", timerError);
      return Response.json({ success: false, message: `Failed to fetch timer: ${timerError.message}` }, { status: 500 });
    }

    let lastDistribution = timerData ? new Date(timerData.value) : null;
    let now = new Date();
    let nextDistribution = lastDistribution ? new Date(lastDistribution) : new Date();
    nextDistribution.setMinutes(nextDistribution.getMinutes() + 1); // Debug mode: 1-minute interval

    if (!lastDistribution || now >= nextDistribution) {
      console.log("🚀 Timer expired, distributing rewards...");

      // ✅ 2. Fetch users with weekly points
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, weekly_points")
        .gt("weekly_points", 0);

      if (usersError) {
        console.error("❌ Users fetch error:", usersError);
        return Response.json({ success: false, message: `Failed to fetch users: ${usersError.message}` }, { status: 500 });
      }

      if (users.length === 0) {
        console.log("⚠️ No users have points to distribute.");
        return Response.json({ success: false, message: "No points to distribute." });
      }

      console.log(`✅ Found ${users.length} users with points.`);

      // ✅ 3. Fetch wallet balances
      const userIds = users.map(user => user.id);
      const { data: wallets, error: walletsError } = await supabase
        .from("wallet_balances")
        .select("user_id, amount")
        .in("user_id", userIds)
        .eq("chain", "SOL")
        .eq("currency", "SMP");

      if (walletsError) {
        console.error("❌ Wallet fetch error:", walletsError);
        return Response.json({ success: false, message: `Failed to fetch wallets: ${walletsError.message}` }, { status: 500 });
      }

      console.log(`✅ Found ${wallets.length} wallet balances.`);

      const walletMap = {};
      wallets.forEach(wallet => {
        walletMap[wallet.user_id] = wallet.amount;
      });

      const totalPoints = users.reduce((sum, user) => sum + user.weekly_points, 0);
      const rewardPerPoint = REWARD_AMOUNT / totalPoints;

      for (const user of users) {
        const rewardAmount = user.weekly_points * rewardPerPoint;

        if (walletMap[user.id] !== undefined) {
          console.log(`💰 Adding ${rewardAmount} SMP to user ${user.id}`);

          const { error: updateError } = await supabase
            .from("wallet_balances")
            .update({ amount: walletMap[user.id] + rewardAmount })
            .eq("user_id", user.id)
            .eq("chain", "SOL")
            .eq("currency", "SMP");

          if (updateError) {
            console.error(`❌ Failed to update balance for user ${user.id}:`, updateError);
          }
        }
      }

      // ✅ 4. Reset weekly points
      console.log("🔄 Resetting weekly points...");
      await supabase.from("users").update({ weekly_points: 0 }).neq("weekly_points", 0);

      // ✅ 5. Update timer (Check if settings table is writable)
      const newDistributionTime = new Date().toISOString();
      console.log("⏳ Updating next distribution time:", newDistributionTime);

      const { error: timerUpdateError } = await supabase
        .from("settings")
        .update({ value: newDistributionTime })
        .eq("key", TIMER_KEY);

      if (timerUpdateError) {
        console.error("❌ Timer update error:", timerUpdateError);
        return Response.json({ success: false, message: `Failed to update timer: ${timerUpdateError.message}` }, { status: 500 });
      }

      console.log("✅ Rewards distributed successfully!");
      return Response.json({ success: true, message: "Rewards distributed successfully!", nextDistribution: newDistributionTime });
    }

    console.log("⏳ Timer not expired yet. Next distribution:", nextDistribution.toISOString());
    return Response.json({ success: true, nextDistribution: nextDistribution.toISOString() });

  } catch (err) {
    console.error("🔥 Unexpected error:", err);
    return Response.json({ success: false, message: `Failed: ${err.message}` }, { status: 500 });
  }
}
