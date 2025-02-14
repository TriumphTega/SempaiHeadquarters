'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'; 
import { supabase } from '../../services/supabase/supabaseClient';

export default function GameList() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState(null);
  const [gameType, setGameType] = useState("tic-tac-toe"); // Default game type
  const [stake, setStake] = useState(0); // Default stake
  const router = useRouter(); 

  useEffect(() => {
    const storedWallet = localStorage.getItem("walletAddress");
    if (!storedWallet) {
      console.error("⚠️ No wallet address found. Connect your wallet first.");
      setLoading(false);
      return;
    }

    setWalletAddress(storedWallet);
    console.log("🔗 Using wallet address:", storedWallet);

    const fetchGames = async () => {
      try {
        const { data, error } = await supabase
          .from("games")
          .select("*")
          .eq("status", "waiting");

        if (error) {
          console.error("Error fetching games:", error.message);
        } else {
          setGames(data);
          console.log("🎮 Games loaded:", data);
        }
      } catch (err) {
        console.error("Error fetching games:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  // ✅ Create a new game
  const createGame = async () => {
    if (!walletAddress) {
      console.error("⚠️ No wallet connected.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('games')
        .insert([{ player1: walletAddress, game_type: gameType, stake, status: 'waiting' }])
        .select()
        .single();

      if (error) {
        console.error('Error creating game:', error.message);
        return;
      }

      console.log('🎉 Game created successfully:', data);
      router.push(`/game/${data.id}`);
    } catch (err) {
      console.error('Game creation failed:', err.message);
    }
  };

  // ✅ Join a game
  const joinGame = async (gameId) => {
    if (!walletAddress) {
      console.error("⚠️ No wallet connected.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('games')
        .update({ player2: walletAddress, status: 'ongoing' })
        .eq('id', gameId)
        .select()
        .single();

      if (error) {
        console.error('Error joining game:', error.message);
        return;
      }

      console.log('🎉 Joined game successfully:', data);
      router.push(`/game/${gameId}`);
    } catch (err) {
      console.error('Join game failed:', err.message);
    }
  };

  if (loading) {
    return <p>Loading games...</p>;
  }

  if (!walletAddress) {
    return <p className="text-danger">⚠️ No wallet connected. Please connect your wallet.</p>;
  }

  return (
    <div>
      <h2>Game List</h2>

      {/* ✅ Game Creation Form */}
      <div className="mb-3">
        <label>Choose Game Type:</label>
        <select value={gameType} onChange={(e) => setGameType(e.target.value)} className="form-select">
          <option value="tic-tac-toe">Tic-Tac-Toe</option>
          <option value="rock-paper-scissors">Rock-Paper-Scissors</option>
        </select>
      </div>

      <div className="mb-3">
        <label>Stake (SMP):</label>
        <input 
          type="number" 
          value={stake} 
          onChange={(e) => setStake(Number(e.target.value))} 
          className="form-control"
          min="0"
        />
      </div>

      <button onClick={createGame} className="btn btn-primary mb-3">Create Game</button>

      {/* ✅ Available Games */}
      {games.length === 0 ? (
        <p>No games available...</p>
      ) : (
        <ul>
          {games.map((game) => (
            <li key={game.id}>
              {game.player1} created a {game.game_type} game with {game.stake} SMP! 
              <button onClick={() => joinGame(game.id)} className="btn btn-success ms-2">Join Game</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
