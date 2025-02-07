import { supabase } from "@/services/supabase/supabaseClient";

export async function POST() {
  try {
    const now = new Date().toISOString(); // Get current timestamp

    // Insert or update the countdown start time
    const { error } = await supabase
      .from("settings")
      .upsert([{ key: "weekly_reward_timer", value: now }]);

    if (error) throw new Error(`Failed to start countdown: ${error.message}`);

    return Response.json({ success: true, message: "Countdown started!", startTime: now });
  } catch (err) {
    console.error("🔥 Error:", err.message);
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}
