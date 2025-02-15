import { supabase } from "@/services/supabase/supabaseClient";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("rock_paper_scissors")
      .select("*")
      .eq("status", "waiting");

    if (error) throw error;

    return Response.json({ success: true, games: data }, { status: 200 });
  } catch (error) {
    console.error("Error fetching games:", error);
    return Response.json({ success: false, message: "Failed to fetch games" }, { status: 500 });
  }
}
