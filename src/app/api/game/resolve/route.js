import { supabase } from "@/services/supabase/supabaseClient";


export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, message: "Method not allowed" });

  const { gameId } = req.body;
  if (!gameId) return res.status(400).json({ success: false, message: "Game ID is required" });

  const { data: game, error: gameError } = await supabase.from("rock_paper_scissors").select("*").eq("id", gameId).single();
  if (gameError || !game) return res.status(404).json({ success: false, message: "Game not found" });

  const { player1_wallet, player2_wallet, player1_choice, player2_choice, stake_amount } = game;

  if (!player1_choice || !player2_choice) return res.json({ success: false, message: "Both players must make a move" });

  // Determine winner
  let winner = null;
  if (player1_choice === player2_choice) {
    winner = "tie"; // It's a tie
  } else if (
    (player1_choice === "rock" && player2_choice === "scissors") ||
    (player1_choice === "scissors" && player2_choice === "paper") ||
    (player1_choice === "paper" && player2_choice === "rock")
  ) {
    winner = player1_wallet;
  } else {
    winner = player2_wallet;
  }

  // If tie, reset choices and allow replay
  if (winner === "tie") {
    await supabase.from("rock_paper_scissors").update({ player1_choice: null, player2_choice: null }).eq("id", gameId);
    return res.json({ success: true, message: "It's a tie! Play again." });
  }

  // Update game winner
  await supabase.from("rock_paper_scissors").update({ winner }).eq("id", gameId);

  // Update wallet balances
  const { data: loserBalance, error: loserError } = await supabase
    .from("wallet_balances")
    .select("amount")
    .eq("wallet_address", winner === player1_wallet ? player2_wallet : player1_wallet)
    .single();

  if (loserError || !loserBalance) return res.json({ success: false, message: "Failed to fetch loser balance" });

  if (loserBalance.amount < stake_amount)
    return res.json({ success: false, message: "Loser does not have enough balance" });

  await supabase.from("wallet_balances").update({ amount: loserBalance.amount - stake_amount }).eq("wallet_address", winner === player1_wallet ? player2_wallet : player1_wallet);
  
  await supabase.from("wallet_balances").upsert({ wallet_address: winner, amount: stake_amount }, { onConflict: ["wallet_address"] });

  return res.json({ success: true, winner, message: "Game resolved" });
}
