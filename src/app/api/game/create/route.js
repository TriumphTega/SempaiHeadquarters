import { supabase } from "@/services/supabase/supabaseClient";

export async function POST(req) {
  try {
    const { player1_wallet, stake_amount } = await req.json();

    if (!player1_wallet || !stake_amount || stake_amount <= 0) {
      return Response.json({ success: false, message: "Invalid game details" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("rock_paper_scissors")
      .insert([{ 
        player1_wallet, 
        stake_amount, 
        status: "waiting",
        player2_wallet: null,
        player1_choice: null,
        player2_choice: null,
        winner: null
      }])
      .select()
      .single();

    if (error) throw error;

    return Response.json({ success: true, game: data }, { status: 201 });
  } catch (error) {
    console.error("Error creating game:", error);
    return Response.json({ success: false, message: "Failed to create game" }, { status: 500 });
  }
}
