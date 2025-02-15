"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function GameRoom() {
  const { gameId } = useParams();
  const router = useRouter();
  const [game, setGame] = useState(null);
  const [choice, setChoice] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [loading, setLoading] = useState(false); // Prevent duplicate submissions

  useEffect(() => {
    // Fetch wallet address from localStorage
    try {
      const storedWallet = localStorage.getItem("walletAddress");
      if (storedWallet) setWalletAddress(storedWallet);
    } catch (err) {
      console.error("LocalStorage not available:", err);
    }

    fetchGame(); // Fetch game data when the component mounts
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

  const handleJoinGame = async () => {
    if (!walletAddress) {
      alert("Connect your wallet first!");
      return;
    }

    if (!gameId) {
      alert("Invalid game ID");
      return;
    }

    try {
      console.log("Joining game with:", { gameId, player_wallet: walletAddress });

      const res = await fetch("/api/game/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, player_wallet: walletAddress }),
      });

      const data = await res.json();
      if (data.success) {
        alert("Successfully joined the game!");
        fetchGame(); // Refetch game data after joining
        router.push(`/game/${gameId}`);
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error("Error joining game:", error);
      alert("Failed to join game.");
    }
  };

  const handleChoice = async (selection) => {
    if (!gameId || !walletAddress) {
      alert("Invalid game state. Try refreshing the page.");
      return;
    }

    if (loading) return; // Prevent multiple submissions
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
        fetchGame(); // Refetch game data after a move to update the winner
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

      {game.winner && (
        <h2>Winner: {game.winner === game.player1_wallet ? "Creator" : "Opponent"}</h2>
      )}

      {!game.player2_wallet && walletAddress !== game.player1_wallet && (
        <button onClick={handleJoinGame} disabled={loading}>
          Join Game
        </button>
      )}

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
