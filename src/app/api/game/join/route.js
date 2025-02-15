import { supabase } from "@/services/supabase/supabaseClient";

export async function POST(req) {
  try {
    const body = await req.json();
    console.log("Received Join Game Request:", body); // Debugging log

    const { gameId, player_wallet } = body;

    if (!gameId || !player_wallet) {
      return Response.json({ success: false, message: "Missing gameId or player_wallet" }, { status: 400 });
    }

    // Check if the game exists
    const { data: game, error: fetchError } = await supabase
      .from("rock_paper_scissors")
      .select("*")
      .eq("id", gameId)
      .single();

    if (fetchError || !game) {
      return Response.json({ success: false, message: "Game not found" }, { status: 404 });
    }

    if (game.player2_wallet) {
      return Response.json({ success: false, message: "Game already has two players" }, { status: 400 });
    }

    // Update the game with the second player
    const { data, error: updateError } = await supabase
      .from("rock_paper_scissors")
      .update({ player2_wallet: player_wallet, status: "in_progress" })
      .eq("id", gameId)
      .select()
      .single();

    if (updateError) {
      return Response.json({ success: false, message: "Failed to join game" }, { status: 500 });
    }

    return Response.json({ success: true, game: data }, { status: 200 });

  } catch (error) {
    console.error("Server error:", error);
    return Response.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}
