'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../services/supabase/supabaseClient';
import TicTacToe from '../../../components/tic-tac-toe';
import RockPaperScissors from '../../../components/rockpaperscissors';

export default function GameRoom() {
  const params = useParams();
  const gameId = params?.gameId; // Ensure gameId is properly extracted
  const [gameData, setGameData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;

    const fetchGame = async () => {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (error) {
        console.error('Error fetching game:', error.message);
      } else {
        setGameData(data);
      }
      setLoading(false);
    };

    fetchGame();

    // ✅ Auto-refresh game data every 2 seconds
    const interval = setInterval(fetchGame, 2000);

    // ✅ Listen for real-time updates
    const subscription = supabase
      .channel('game_updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` }, fetchGame)
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(subscription);
    };
  }, [gameId]);

  if (loading) return <p>Loading game...</p>;
  if (!gameData) return <p>Game not found!</p>;

  return (
    <div>
      <h2>Game Room: {gameId}</h2>
      <p>Game Type: {gameData.game_type}</p>
      <p>Player 1: {gameData.player1}</p>
      <p>Player 2: {gameData.player2 || "Waiting for opponent..."}</p>
      <p>Stake: {gameData.stake} SMP</p>
      <p>Status: {gameData.status}</p>

      {gameData.status === "ongoing" ? (
        gameData.game_type === "tic-tac-toe" ? <TicTacToe gameId={gameId} /> : <RockPaperScissors gameId={gameId} />
      ) : (
        <p>Waiting for another player...</p>
      )}
    </div>
  );
}
