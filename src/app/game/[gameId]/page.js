"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function GameRoom() {
  const { gameId } = useParams();
  const router = useRouter();
  const [game, setGame] = useState(null);
  const [choice, setChoice] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const storedWallet = localStorage.getItem("walletAddress");
      if (storedWallet) setWalletAddress(storedWallet);
    } catch (err) {
      console.error("LocalStorage not available:", err);
    }

    fetchGame();
  }, [gameId]);

  async function fetchGame() {
    if (!gameId) return;
    try {
      const res = await fetch(`/api/game/${gameId}`);
      const data = await res.json();
      if (data.success) {
        setGame(data.game);
      } else {
        console.error("Failed to fetch game:", data.message);
      }
    } catch (error) {
      console.error("Error fetching game:", error);
    }
  }

  const handleChoice = async (selection) => {
    if (!gameId || !walletAddress) {
      alert("Invalid game state. Try refreshing the page.");
      return;
    }

    if (loading) return;
    setLoading(true);
    setChoice(selection);

    try {
      const res = await fetch(`/api/game/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, walletAddress, choice: selection }),
      });

      const data = await res.json();
      if (data.success) {
        alert("Move submitted!");
        fetchGame(); // Refresh the game after move
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error("Error submitting move:", error);
      alert("Failed to submit move.");
    } finally {
      setLoading(false);
    }
  };
  

  if (!game) return <p>Loading game...</p>;

  return (
    <div>
      <h1>Game Room: {gameId}</h1>
      <p>Stake: {game.stake_amount} SMP</p>
      <p>Creator: {game.player1_wallet}</p>
      <p>Opponent: {game.player2_wallet || "Waiting for opponent..."}</p>

      {game.winner && <h2>Winner: {game.winner === game.player1_wallet ? "Creator" : "Opponent"}</h2>}

      <button onClick={fetchGame} disabled={loading}>
        {loading ? "Refreshing..." : "Refresh Game"}
      </button>

      {game.player2_wallet && !game.winner && (
        <>
          <h2>Pick your move:</h2>
          <button onClick={() => handleChoice("rock")} disabled={loading}>Rock</button>
          <button onClick={() => handleChoice("paper")} disabled={loading}>Paper</button>
          <button onClick={() => handleChoice("scissors")} disabled={loading}>Scissors</button>
        </>
      )}
    </div>
  );
}
