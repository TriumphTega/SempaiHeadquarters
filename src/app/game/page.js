"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GamePage() {
  const [walletAddress, setWalletAddress] = useState("");
  const [stakeAmount, setStakeAmount] = useState(10); // Default stake
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
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

  const fetchGames = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/game/list");
      const data = await res.json();
      if (data.success) {
        setGames(data.games);
      }
    } catch (error) {
      console.error("Failed to fetch games:", error);
    }
    setLoading(false);
  };

  const handleCreateGame = async () => {
    if (!walletAddress) {
      alert("Connect your wallet first!");
      return;
    }
    if (stakeAmount <= 0) {
      alert("Stake amount must be greater than zero!");
      return;
    }

    try {
      const res = await fetch("/api/game/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player1_wallet: walletAddress, stake_amount: stakeAmount }),
      });

      const data = await res.json();
      if (data.success) {
        alert("Game created! Waiting for opponent...");
        fetchGames(); // Refresh game list
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error("Error creating game:", error);
      alert("Failed to create game.");
    }
  };

  const handleJoinGame = async (gameId) => {
    if (!walletAddress) {
      alert("Connect your wallet first!");
      return;
    }

    if (!gameId) {
      alert("Invalid game ID");
      return;
    }

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
      <h1>Rock Paper Scissors</h1>
      <p>Your Wallet: {walletAddress || "Not connected"}</p>

      <div>
        <label>Stake Amount (SMP): </label>
        <input
          type="number"
          value={stakeAmount}
          onChange={(e) => setStakeAmount(parseFloat(e.target.value))}
        />
        <button onClick={handleCreateGame}>Create Game</button>
      </div>

      <div>
        <h1>Available Games</h1>
        <button onClick={fetchGames} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh Games"}
        </button>
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
    </div>
  );
}
