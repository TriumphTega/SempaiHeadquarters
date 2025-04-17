import { NextResponse } from "next/server";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddress, createTransferInstruction, getAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { supabase } from "../../../services/supabase/supabaseClient";
import { TREASURY_KEYPAIR, SMP_MINT_ADDRESS, RPC_URL } from "@/constants";

const SMP_DECIMALS = 6;
const MIN_WITHDRAWAL = 2500;

export async function POST(req) {
  try {
    const { userId, walletAddress, amount } = await req.json();

    if (!userId || !walletAddress || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: userId, walletAddress, amount" },
        { status: 400 }
      );
    }

    if (amount < MIN_WITHDRAWAL) {
      return NextResponse.json(
        { error: `Withdrawal amount must be at least ${MIN_WITHDRAWAL} SMP` },
        { status: 400 }
      );
    }

    const connection = new Connection(RPC_URL, "confirmed");

    // Validate balance
    const { data: walletBalance, error: balanceError } = await supabase
      .from("wallet_balances")
      .select("amount")
      .eq("user_id", userId)
      .eq("currency", "SMP")
      .eq("chain", "SOL")
      .single();

    if (balanceError || !walletBalance) {
      throw new Error("Wallet balance not found");
    }
    if (walletBalance.amount < amount) {
      throw new Error(`Insufficient balance: ${walletBalance.amount.toLocaleString()} SMP available`);
    }

    // Check treasury balance
    const treasuryPubkey = TREASURY_KEYPAIR.publicKey;
    const treasuryATA = await getAssociatedTokenAddress(SMP_MINT_ADDRESS, treasuryPubkey);
    const treasuryAccountInfo = await connection.getAccountInfo(treasuryATA);
    const treasuryBalance = treasuryAccountInfo
      ? Number((await getAccount(connection, treasuryATA)).amount) / 10 ** SMP_DECIMALS
      : 0;
    if (treasuryBalance < amount) {
      throw new Error(`Treasury has insufficient SMP: ${treasuryBalance.toLocaleString()} SMP available`);
    }

    // Build transaction
    const userATA = await getAssociatedTokenAddress(SMP_MINT_ADDRESS, new PublicKey(walletAddress));
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: treasuryPubkey,
    }).add(
      createTransferInstruction(
        treasuryATA,
        userATA,
        treasuryPubkey,
        Math.round(amount * (10 ** SMP_DECIMALS)),
        [],
        TOKEN_PROGRAM_ID
      )
    );

    // Sign and send transaction
    transaction.sign(TREASURY_KEYPAIR);
    const signature = await connection.sendRawTransaction(transaction.serialize());
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");

    // Update balance
    const newBalance = walletBalance.amount - amount;
    const { error: updateError } = await supabase
      .from("wallet_balances")
      .update({ amount: newBalance })
      .eq("user_id", userId)
      .eq("currency", "SMP")
      .eq("chain", "SOL");

    if (updateError) throw new Error(`Failed to update balance: ${updateError.message}`);

    // Record event
    const eventDetails = `withdrawal-${Date.now()}`;
    const { error: eventError } = await supabase
      .from("wallet_events")
      .insert({
        destination_user_id: userId,
        event_type: "withdrawal",
        event_details: eventDetails,
        source_chain: "SOL",
        source_currency: "SMP",
        amount_change: -amount,
        wallet_address: walletAddress,
        source_user_id: userId,
        destination_chain: "SOL", // Fixed typo from uesta_chain
        destination_currency: "SMP",
        destination_transaction_signature: signature,
      });

    if (eventError) throw new Error(`Failed to record event: ${eventError.message}`);

    return NextResponse.json({ signature }, { status: 200 });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}