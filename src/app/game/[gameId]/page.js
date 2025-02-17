"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import styles from "../GameRoom.module.css"; // Importing the new CSS module
import { supabase } from "@/services/supabase/supabaseClient";



export default function GameRoom() {
  const { gameId } = useParams();
  const [game, setGame] = useState(null);
  const [choice, setChoice] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [userBalance, setUserBalance] = useState(0);

  useEffect(() => {
    try {
      const storedWallet = localStorage.getItem("walletAddress");
      if (storedWallet) {
        setWalletAddress(storedWallet);
        fetchUserBalance(storedWallet);
      }
    } catch (err) {
      console.error("LocalStorage not available:", err);
    }

    fetchGame();
  }, [gameId]);

  async function fetchGame() {
    if (!gameId) return;
    try {
      const { data, error } = await supabase.from("rock_paper_scissors").select("*").eq("id", gameId).single();
      if (error) throw error;
      setGame(data);
    } catch (error) {
      console.error("Error fetching game:", error);
    }
  }

  async function fetchUserBalance(wallet) {
    try {
      const { data, error } = await supabase
        .from("wallet_balances")
        .select("amount")
        .eq("wallet_address", wallet)
        .single();

      if (error) {
        console.error("Failed to fetch balance:", error.message);
      } else {
        setUserBalance(data.amount);
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  }

  const handleChoice = async (selection) => {
    if (!gameId || !walletAddress) {
      alert("Invalid game state. Try refreshing the page.");
      return;
    }

    if (loading || choice) return; // Prevents multiple selections
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
        fetchGame();
        fetchUserBalance(walletAddress); // Update balance after the move
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

  if (!game) return <p className={styles.gameInfo}>Loading game...</p>;

  return (
    <div className={styles.container}>
      <h1 className={styles.gameTitle}>Game Room: {gameId}</h1>
      <p className={styles.gameInfo}>
        <strong>Stake:</strong> {game.stake_amount} SMP
      </p>
      <p className={styles.gameInfo}>
        <strong>Your Balance:</strong> {userBalance} SMP
      </p>
      <p className={styles.gameInfo}>
        <strong>Creator:</strong> {game.player1_wallet}
      </p>
      <p className={styles.gameInfo}>
        <strong>Opponent:</strong> {game.player2_wallet || "Waiting for opponent..."}
      </p>

      {game.winner && (
        <h2 className={styles.gameTitle}>
          🎉 Winner: {game.winner === game.player1_wallet ? "Creator" : "Opponent"} 🎉
        </h2>
      )}

      <button onClick={fetchGame} disabled={loading} className={styles.choiceButton}>
        {loading ? "Refreshing..." : "Refresh Game"}
      </button>

      {game.player2_wallet && !game.winner && (
        <>
          <h2 className={styles.gameTitle}>🔥 Choose Your Move 🔥</h2>
          <div className={styles.choiceContainer}>
            <button
              onClick={() => handleChoice("rock")}
              disabled={loading || choice !== ""}
              className={`${styles.choiceButton} ${styles.rock} ${choice === "rock" ? styles.selected : ""}`}
            >
              <img src="/animations/rock.svg" alt="Rock" className={styles.choiceAnimation} />
            </button>
            <button
              onClick={() => handleChoice("paper")}
              disabled={loading || choice !== ""}
              className={`${styles.choiceButton} ${styles.paper} ${choice === "paper" ? styles.selected : ""}`}
            >
              <img src="/animations/paper.svg" alt="Paper" className={styles.choiceAnimation} />
            </button>
            <button
              onClick={() => handleChoice("scissors")}
              disabled={loading || choice !== ""}
              className={`${styles.choiceButton} ${styles.scissors} ${choice === "scissors" ? styles.selected : ""}`}
            >
              <img src="/animations/scissors.svg" alt="Scissors" className={styles.choiceAnimation} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
