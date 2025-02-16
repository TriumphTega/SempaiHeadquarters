import { supabase } from "@/services/supabase/supabaseClient";

export async function POST(req) {
  try {
    const body = await req.json();
    console.log("Received Move Request:", body);

    const { gameId, walletAddress, choice } = body;

    if (!gameId || !walletAddress || !choice) {
      return Response.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    // Fetch the game from the database
    const { data: game, error: fetchError } = await supabase
      .from("rock_paper_scissors")
      .select("*")
      .eq("id", gameId)
      .single();

    if (fetchError || !game) {
      return Response.json({ success: false, message: "Game not found" }, { status: 404 });
    }

    // Determine if player1 or player2 is making a move
    let updateField = "";
    if (game.player1_wallet === walletAddress) {
      updateField = "player1_choice";
    } else if (game.player2_wallet === walletAddress) {
      updateField = "player2_choice";
    } else {
      return Response.json({ success: false, message: "You are not a participant in this game" }, { status: 403 });
    }

    // Update the player's choice
    const { error: updateError } = await supabase
      .from("rock_paper_scissors")
      .update({ [updateField]: choice })
      .eq("id", gameId);

    if (updateError) {
      return Response.json({ success: false, message: "Failed to submit move" }, { status: 500 });
    }

    // Fetch the updated game
    const { data: updatedGame } = await supabase
      .from("rock_paper_scissors")
      .select("*")
      .eq("id", gameId)
      .single();

    // Check if both players have made their choices
    if (updatedGame.player1_choice && updatedGame.player2_choice) {
      // Determine winner
      const winner = determineWinner(
        updatedGame.player1_choice,
        updatedGame.player2_choice,
        updatedGame.player1_wallet,
        updatedGame.player2_wallet
      );

      // If it's a tie, reset player choices and allow replay
      if (winner === "tie") {
        await supabase
          .from("rock_paper_scissors")
          .update({ player1_choice: null, player2_choice: null })
          .eq("id", gameId);

        return Response.json({ success: true, message: "It's a tie! Play again." }, { status: 200 });
      }

      // Update the game with the winner and set status to "completed"
      const { error: winnerUpdateError } = await supabase
        .from("rock_paper_scissors")
        .update({ winner, status: "completed" })
        .eq("id", gameId);

      if (winnerUpdateError) {
        return Response.json({ success: false, message: "Failed to update winner" }, { status: 500 });
      }

      return Response.json({ success: true, message: `Game completed! Winner: ${winner}` }, { status: 200 });
    }

    return Response.json({ success: true, message: "Move submitted!" }, { status: 200 });

  } catch (error) {
    console.error("Server error:", error);
    return Response.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}

// Function to determine the winner
function determineWinner(choice1, choice2, player1, player2) {
  if (choice1 === choice2) return "tie"; // Handle tie condition

  const winningMoves = {
    rock: "scissors",
    paper: "rock",
    scissors: "paper",
  };

  return winningMoves[choice1] === choice2 ? player1 : player2;
}
