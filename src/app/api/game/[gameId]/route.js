import { supabase } from "@/services/supabase/supabaseClient";

export async function GET(req, { params }) {
  const { gameId } = params;
  
  if (!gameId) {
    return Response.json({ success: false, message: "Game ID is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("rock_paper_scissors")
    .select("*")
    .eq("id", gameId)
    .single();

  if (error) {
    console.error("Supabase error:", error);  // Log error in terminal
    return Response.json({ success: false, message: "Game not found" }, { status: 404 });
  }

  return Response.json({ success: true, game: data });
}
