"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./GamePage.module.css"; // Import the CSS module

export default function GamePage() {
  const [walletAddress, setWalletAddress] = useState("");
  const [stakeAmount, setStakeAmount] = useState(10);
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
        fetchGames();
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
    <div className={styles.container}>
      <h1 className={styles.header}>Rock Paper Scissors</h1>
      <p className={styles.walletInfo}>
        Your Wallet: <span className="fw-bold">{walletAddress || "Not connected"}</span>
      </p>

      {/* Create Game Section */}
      <div className={styles.card}>
        <label className="text-light mb-2 fw-bold">Stake Amount (SMP):</label>
        <div className="input-group">
          <input
            type="number"
            className={`${styles.input} form-control`}
            value={stakeAmount}
            onChange={(e) => setStakeAmount(parseFloat(e.target.value))}
            placeholder="Enter stake amount"
          />
          <button className={`${styles.button} btn fw-bold`} onClick={handleCreateGame}>
            Create Game
          </button>
        </div>
      </div>

      {/* Available Games Section */}
      <div className={styles.card}>
        <h2 className="text-light text-center">Available Games</h2>
        <button className={`${styles.button} btn mb-3 w-100 fw-bold`} onClick={fetchGames} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh Games"}
        </button>

        {games.length === 0 ? (
          <p className="text-center text-danger">No active games.</p>
        ) : (
          games.map((game) => (
            <div key={game.id} className={`${styles.card} mb-3`}>
              <p className="text-light">
                <strong>Game ID:</strong> {game.id}
              </p>
              <p className="text-light">
                <strong>Stake:</strong> {game.stake_amount} SMP
              </p>
              <p className="text-light">
                <strong>Creator:</strong> {game.player1_wallet}
              </p>
              <p className="text-warning">
                <strong>Opponent:</strong> {game.player2_wallet || "Waiting for opponent..."}
              </p>

              {walletAddress === game.player1_wallet ? (
                <button className={`${styles.button} btn-success fw-bold w-100`} onClick={() => router.push(`/game/${game.id}`)}>
                  Enter Room
                </button>
              ) : !game.player2_wallet ? (
                <button className={`${styles.button} btn-primary fw-bold w-100`} onClick={() => handleJoinGame(game.id)}>
                  Join Game
                </button>
              ) : (
                <button className={`${styles.button} btn-info fw-bold w-100`} onClick={() => router.push(`/game/${game.id}`)}>
                  Watch / Play
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
