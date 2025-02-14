import { useState, useEffect } from "react";
import { supabase } from "../services/supabase/supabaseClient";

export default function RockPaperScissors({ gameId, walletAddress }) {
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchGame = async () => {
      const { data, error } = await supabase
        .from("rock_paper_scissors")
        .select("*")
        .eq("id", gameId)
        .single();

      if (error) console.error("Error fetching game:", error.message);
      setGame(data);
    };

    fetchGame();

    // ✅ Listen for real-time updates
    const channel = supabase
      .channel("game_updates")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rock_paper_scissors", filter: `id=eq.${gameId}` }, (payload) => {
        setGame(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  const makeChoice = async (choice) => {
    if (!game) return;
    if (walletAddress === game.player1_wallet && !game.player2_choice) {
      return alert("Wait for Player 2 to choose first!");
    }

    setLoading(true);

    let updateField = walletAddress === game.player2_wallet ? "player2_choice" : "player1_choice";

    const { error } = await supabase
      .from("rock_paper_scissors")
      .update({ [updateField]: choice })
      .eq("id", gameId);

    if (error) console.error("Error updating choice:", error.message);
    
    setLoading(false);
  };

  if (!game) return <p>Loading...</p>;

  return (
    <div>
      <h3>Rock-Paper-Scissors</h3>
      {loading && <p>Processing...</p>}

      {game.winner ? (
        <p>
          {game.winner === "tie"
            ? "It's a tie! Play again!"
            : `Winner: ${game.winner}`}
        </p>
      ) : (
        <p>
          {walletAddress === game.player2_wallet
            ? "Choose your move first!"
            : "Waiting for Player 2..."}
        </p>
      )}

      {!game.winner && walletAddress === game.player2_wallet && (
        <div>
          <button onClick={() => makeChoice("rock")}>Rock</button>
          <button onClick={() => makeChoice("paper")}>Paper</button>
          <button onClick={() => makeChoice("scissors")}>Scissors</button>
        </div>
      )}

      {!game.winner && walletAddress === game.player1_wallet && game.player2_choice && (
        <div>
          <button onClick={() => makeChoice("rock")}>Rock</button>
          <button onClick={() => makeChoice("paper")}>Paper</button>
          <button onClick={() => makeChoice("scissors")}>Scissors</button>
        </div>
      )}
    </div>
  );
}
