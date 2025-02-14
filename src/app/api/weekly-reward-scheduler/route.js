import { supabase } from "@/services/supabase/supabaseClient";

const TIMER_KEY = "weekly_reward_timer";
const REWARD_AMOUNT = 2000000; // Total SMP to distribute

export async function GET(req) {
  try {
    // ✅ 1. Check the last distribution time
    const { data: timerData, error: timerError } = await supabase
      .from("settings")
      .select("value")
      .eq("key", TIMER_KEY)
      .single();

    if (timerError && timerError.code !== "PGRST116") {
      throw new Error(`Failed to fetch timer: ${timerError.message}`);
    }

    let lastDistribution = timerData ? new Date(timerData.value) : null;
    let now = new Date();
    let nextDistribution = lastDistribution ? new Date(lastDistribution) : new Date();
    nextDistribution.setDate(nextDistribution.getDate() + 7);

    if (!lastDistribution || now >= nextDistribution) {
      // ✅ Timer expired → Distribute rewards
      console.log("🚀 Weekly reward timer hit 0, distributing rewards...");

      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, weekly_points")
        .gt("weekly_points", 0);

      if (usersError) throw new Error(`Failed to fetch users: ${usersError.message}`);

      if (users.length === 0) {
        return Response.json({ success: false, message: "No points to distribute." });
      }

      // ✅ Fetch wallets of these users
      const userIds = users.map(user => user.id);
      const { data: wallets, error: walletsError } = await supabase
        .from("wallet_balances")
        .select("user_id, amount")
        .in("user_id", userIds)
        .eq("chain", "SOL")
        .eq("currency", "SMP");

      if (walletsError) throw new Error(`Failed to fetch wallets: ${walletsError.message}`);

      const walletMap = {};
      wallets.forEach(wallet => {
        walletMap[wallet.user_id] = wallet.amount;
      });

      const totalPoints = users.reduce((sum, user) => sum + user.weekly_points, 0);
      const rewardPerPoint = REWARD_AMOUNT / totalPoints;

      for (const user of users) {
        const rewardAmount = user.weekly_points * rewardPerPoint;

        if (walletMap[user.id] !== undefined) {
          await supabase
            .from("wallet_balances")
            .update({ amount: walletMap[user.id] + rewardAmount })
            .eq("user_id", user.id)
            .eq("chain", "SOL")
            .eq("currency", "SMP");
        }
      }

      // ✅ Reset weekly points
      await supabase.from("users").update({ weekly_points: 0 }).neq("weekly_points", 0);

      // ✅ Update timer for next 7 days
      const newDistributionTime = new Date().toISOString();
      await supabase.from("settings").upsert([{ key: TIMER_KEY, value: newDistributionTime }]);

      return Response.json({ success: true, message: "Rewards distributed successfully!", nextDistribution: newDistributionTime });
    }

    return Response.json({ success: true, nextDistribution: nextDistribution.toISOString() });

  } catch (err) {
    console.error("🔥 Error:", err.message);
    return Response.json({ success: false, message: `Failed: ${err.message}` }, { status: 500 });
  }
}
