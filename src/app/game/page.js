"use client";
import { useState, useEffect } from "react";
import GameList from "./GameList";

export default function GamePage() {
  const [gameId, setGameId] = useState("");
  const [player, setPlayer] = useState("");
  const [board, setBoard] = useState(Array(9).fill(null));
  const [walletAddress, setWalletAddress] = useState("");

  useEffect(() => {
    // Fetch wallet address from localStorage or wallet provider
    setWalletAddress(localStorage.getItem("walletAddress"));
  }, []);

  const handleStartGame = async (opponent) => {
    const newGameId = Math.random().toString(36).substr(2, 7);
    setGameId(newGameId);
    setPlayer("X");

    const response = await fetch("/api/game/stake", {
      method: "POST",
      body: JSON.stringify({ gameId: newGameId, walletAddress, amount: 10 }),
    });

    const data = await response.json();
    if (!data.success) {
      alert(data.message);
      return;
    }
  };

  const handleMove = (index) => {
    if (!board[index]) {
      const newBoard = [...board];
      newBoard[index] = player;
      setBoard(newBoard);
    }
  };

  return (
    <div>
      <h1>Game Page</h1>
      <GameList onSelect={handleStartGame} />

      <div className="tic-tac-toe">
        {board.map((cell, index) => (
          <button key={index} onClick={() => handleMove(index)}>
            {cell}
          </button>
        ))}
      </div>
    </div>
  );
}
