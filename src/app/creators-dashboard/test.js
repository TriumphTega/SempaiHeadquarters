"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GameLobby() {
  const [games, setGames] = useState([]);
  const [walletAddress, setWalletAddress] = useState("");
  const router = useRouter();

  useEffect(() => {
    try {
      const storedWallet = localStorage.getItem("walletAddress");
      if (storedWallet) setWalletAddress(storedWallet);
    } catch (err) {
      console.error("LocalStorage not available:", err);
    }

    fetchGames();
  }, []);

  async function fetchGames() {
    try {
      const res = await fetch("/api/game/list");
      const data = await res.json();
      if (data.success) {
        setGames(data.games);
      }
    } catch (error) {
      console.error("Error fetching games:", error);
    }
  }

  const handleJoinGame = async (gameId) => {
    try {
      const res = await fetch("/api/game/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, player_wallet: walletAddress }),
      });

      const data = await res.json();
      if (data.success) {
        router.push(`/game/${gameId}`);
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error("Error joining game:", error);
      alert("Failed to join game.");
    }
  };

  return (
    <div>
      <h1>Available Games</h1>
      {games.length === 0 ? <p>No active games.</p> : null}
      {games.map((game) => (
        <div key={game.id} style={{ border: "1px solid gray", padding: "10px", margin: "10px 0" }}>
          <p>Game ID: {game.id}</p>
          <p>Stake: {game.stake_amount} SMP</p>
          <p>Creator: {game.player1_wallet}</p>
          <p>Opponent: {game.player2_wallet || "Waiting for opponent..."}</p>

          {walletAddress === game.player1_wallet ? (
            <button onClick={() => router.push(`/game/${game.id}`)}>Enter Room</button>
          ) : !game.player2_wallet ? (
            <button onClick={() => handleJoinGame(game.id)}>Join Game</button>
          ) : (
            <button onClick={() => router.push(`/game/${game.id}`)}>Watch / Play</button>
          )}
        </div>
      ))}
    </div>
  );
}
