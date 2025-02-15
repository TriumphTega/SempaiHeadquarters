"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GamePage() {
  const [walletAddress, setWalletAddress] = useState("");
  const [stakeAmount, setStakeAmount] = useState(10); // Default stake
  const [games, setGames] = useState([]);
  const router = useRouter();

  useEffect(() => {
    // Fetch wallet address
    try {
      const storedWallet = localStorage.getItem("walletAddress");
      if (storedWallet) setWalletAddress(storedWallet);
    } catch (err) {
      console.error("LocalStorage not available:", err);
    }

    // Fetch available games
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const res = await fetch("/api/game/list");
      const data = await res.json();
      if (data.success) {
        setGames(data.games);
      }
    } catch (error) {
      console.error("Failed to fetch games:", error);
    }
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
      console.log("Joining game with:", { gameId, player_wallet: walletAddress });
  
      const res = await fetch("/api/game/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, player_wallet: walletAddress }), // Ensure gameId is correct
      });
  
      const data = await res.json();
      if (data.success) {
        alert("Successfully joined the game!");
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

      <h2>Available Games</h2>
      <ul>
  {games.length > 0 ? (
    games.map((game) => (
      <li key={game.id}>
        Game ID: {game.id} | Stake: {game.stake_amount} SMP |
        <button onClick={(e) => { e.stopPropagation(); handleJoinGame(game.id); }}>
  Join
</button>
      </li>
    ))
  ) : (
    <p>No games available.</p>
  )}
</ul>


    </div>
  );
}
