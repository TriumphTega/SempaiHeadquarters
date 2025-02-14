'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../services/supabase/supabaseClient';

export default function GameList() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState(null);
  const [stake, setStake] = useState(0);
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
          .from("rock_paper_scissors")  // ✅ Use the new table name
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

    // ✅ Auto-refresh game list every 2 seconds
    const interval = setInterval(fetchGames, 2000);

    // ✅ Listen for real-time game updates
    const subscription = supabase
      .channel('rock_paper_scissors')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rock_paper_scissors' }, fetchGames)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rock_paper_scissors' }, fetchGames)
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(subscription);
    };
  }, []);

  const createGame = async () => {
    if (!walletAddress) return console.error("⚠️ No wallet connected.");
  
    const { data, error } = await supabase
      .from('rock_paper_scissors')
      .insert([{ 
        player1_wallet: walletAddress, 
        player2_wallet: null, // ✅ Allow NULL or use ''
        status: 'waiting' 
      }])
      .select()
      .single();
  
    if (error) return console.error('Error creating game:', error.message);
  
    console.log('🎉 Game created successfully:', data);
    router.push(`/game/${data.id}`);
  };
  

  const joinGame = async (gameId) => {
    if (!walletAddress) return console.error("⚠️ No wallet connected.");
  
    const { data: game, error: fetchError } = await supabase
      .from('rock_paper_scissors')
      .select('status')
      .eq('id', gameId)
      .single();
  
    if (fetchError || !game) {
      console.error("⚠️ Error fetching game before joining:", fetchError?.message);
      return;
    }
  
    if (game.status !== 'waiting') {
      console.error("⚠️ Cannot join a game that isn't in 'waiting' status.");
      return;
    }
  
    const { data, error } = await supabase
      .from('rock_paper_scissors')
      .update({ player2_wallet: walletAddress, status: 'ongoing' })  // ✅ Use valid status
      .eq('id', gameId)
      .select()
      .single();
  
    if (error) return console.error('Error joining game:', error.message);
  
    console.log('🎉 Joined game successfully:', data);
    router.push(`/game/${gameId}`);
  };
  

  if (loading) return <p>Loading games...</p>;
  if (!walletAddress) return <p className="text-danger">⚠️ No wallet connected.</p>;

  return (
    <div>
      <h2>Rock Paper Scissors Game List</h2>

      <button onClick={createGame} className="btn btn-primary mb-3">Create Game</button>

      {games.length === 0 ? <p>No games available...</p> : (
        <ul>
          {games.map((game) => (
            <li key={game.id}>
              {game.player1_wallet} is waiting for an opponent!
              <button onClick={() => joinGame(game.id)} className="btn btn-success ms-2">Join Game</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
