import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase/supabaseClient';

export default function TicTacToe({ gameId }) {
  const [board, setBoard] = useState(Array(9).fill(''));
  const [turn, setTurn] = useState(null);
  const [winner, setWinner] = useState(null);
  const walletAddress = localStorage.getItem("walletAddress");

  useEffect(() => {
    const fetchGame = async () => {
      const { data, error } = await supabase
        .from('games')
        .select('board, turn, winner')
        .eq('id', gameId)
        .single();

      if (error) return console.error('Error fetching game:', error.message);

      setBoard(data.board);
      setTurn(data.turn);
      setWinner(data.winner);
    };

    fetchGame();

    // Listen for game updates in real time
    const subscription = supabase
      .channel('tic-tac-toe')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` }, fetchGame)
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [gameId]);

  const handleMove = async (index) => {
    if (board[index] || winner || turn !== walletAddress) return;

    const newBoard = [...board];
    newBoard[index] = walletAddress === turn ? "X" : "O";

    const nextTurn = turn === newBoard[0] ? newBoard[1] : newBoard[0];

    const { error } = await supabase
      .from('games')
      .update({ board: newBoard, turn: nextTurn })
      .eq('id', gameId);

    if (error) console.error('Error updating board:', error.message);

    checkWinner(newBoard);
  };

  const checkWinner = async (newBoard) => {
    const winningPatterns = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], 
      [0, 3, 6], [1, 4, 7], [2, 5, 8], 
      [0, 4, 8], [2, 4, 6]
    ];

    for (let pattern of winningPatterns) {
      const [a, b, c] = pattern;
      if (newBoard[a] && newBoard[a] === newBoard[b] && newBoard[a] === newBoard[c]) {
        setWinner(newBoard[a]);

        await supabase
          .from('games')
          .update({ winner: newBoard[a], status: 'finished' })
          .eq('id', gameId);

        return;
      }
    }
  };

  return (
    <div>
      <h3>Tic-Tac-Toe</h3>
      {winner ? <p>Winner: {winner}</p> : <p>Turn: {turn}</p>}
      <div className="tic-tac-toe-board">
        {board.map((cell, index) => (
          <button key={index} onClick={() => handleMove(index)} disabled={!!cell}>
            {cell}
          </button>
        ))}
      </div>
    </div>
  );
}
