import { NextResponse } from "next/server";
import { supabase } from "@/services/supabase/supabaseClient";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { RPC_URL } from "@/constants";

const MERCHANT_WALLET = "3p1HL3nY5LUNwuAj6dKLRiseSU93UYRqYPGbR7LQaWd5";
const USDC_MINT_ADDRESS = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const connection = new Connection(RPC_URL, "confirmed");

const fetchSolPrice = async () => {
  try {
    const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
    const text = await response.text();
    console.log("CoinGecko SOL Response:", text);
    if (!response.ok) throw new Error(`CoinGecko API error: ${response.status}`);
    const data = JSON.parse(text);
    return data.solana.usd || 150;
  } catch (error) {
    console.error("Error fetching SOL price:", error);
    return 150;
  }
};

export async function POST(req) {
  try {
    const { user_wallet, manga_id, chapter_id, signature, amount, currency } = await req.json();
    console.log("Request Body:", { user_wallet, manga_id, chapter_id, signature, amount, currency });

    // Validate input
    if (!user_wallet || !manga_id || !chapter_id || !signature || !amount || !currency) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!["SOL", "USDC"].includes(currency)) {
      return NextResponse.json({ error: "Unsupported currency" }, { status: 400 });
    }

    let senderPubkey, receiverPubkey;
    try {
      senderPubkey = new PublicKey(user_wallet);
      receiverPubkey = new PublicKey(MERCHANT_WALLET);
    } catch (e) {
      return NextResponse.json({ error: "Invalid wallet address format" }, { status: 400 });
    }

    // Fetch chapter details to get the price
    const { data: chapter, error: chapterError } = await supabase
      .from("manga_chapters")
      .select("id, is_premium, price")
      .eq("id", chapter_id)
      .eq("manga_id", manga_id)
      .single();
    if (chapterError || !chapter) {
      console.error("Chapter fetch error:", chapterError);
      return NextResponse.json({ error: "Manga chapter not found" }, { status: 404 });
    }
    if (!chapter.is_premium) {
      return NextResponse.json({ error: "Chapter is not premium" }, { status: 400 });
    }

    // Use chapter price, fallback to 2.5 if null or invalid
    const usdAmount = chapter.price && chapter.price > 0 ? chapter.price : 2.5;
    console.log("Chapter USD Amount:", usdAmount);

    let expectedAmount, decimals, mint;

    if (currency === "SOL") {
      const solPrice = await fetchSolPrice();
      if (!solPrice) throw new Error("Failed to fetch SOL price");
      expectedAmount = usdAmount / solPrice;
      decimals = 9;
    } else if (currency === "USDC") {
      expectedAmount = usdAmount;
      decimals = 6;
      mint = USDC_MINT_ADDRESS;
    }

    const tolerance = 0.02; // 2% tolerance
    const minAmount = expectedAmount * (1 - tolerance);
    const maxAmount = expectedAmount * (1 + tolerance);

    let tx = null;
    for (let i = 0; i < 3; i++) {
      tx = await connection.getTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
      if (tx) break;
      console.log(`Attempt ${i + 1}: Transaction not found, retrying...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    if (!tx) {
      console.log("Transaction not found after retries:", signature);
      return NextResponse.json({ error: "Invalid transaction: not found" }, { status: 400 });
    }

    if (!tx.meta || tx.meta.err) {
      console.log("Transaction meta error:", tx.meta?.err);
      return NextResponse.json({ error: "Invalid transaction: failed on chain" }, { status: 400 });
    }

    console.log("Transaction accountKeys:", tx.transaction.message.accountKeys.map(key => key.toBase58()));

    const senderIndex = tx.transaction.message.accountKeys.findIndex(
      (key) => key.toBase58() === senderPubkey.toBase58()
    );
    const receiverIndex = tx.transaction.message.accountKeys.findIndex(
      (key) => key.toBase58() === receiverPubkey.toBase58()
    );

    if (senderIndex === -1 || receiverIndex === -1) {
      console.log("Sender or receiver not found:", { senderIndex, receiverIndex });
      const missing = senderIndex === -1 ? "sender" : "receiver";
      return NextResponse.json({ error: `Invalid transaction: ${missing} missing` }, { status: 400 });
    }

    let amountTransferred;
    if (currency === "SOL") {
      amountTransferred = (tx.meta.postBalances[receiverIndex] - tx.meta.preBalances[receiverIndex]) / LAMPORTS_PER_SOL;
      console.log("SOL Transfer Details:", { amountTransferred });
    } else if (currency === "USDC") {
      const senderATA = await PublicKey.findProgramAddress(
        [senderPubkey.toBuffer(), new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").toBuffer(), new PublicKey(mint).toBuffer()],
        new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
      );
      const receiverATA = await PublicKey.findProgramAddress(
        [receiverPubkey.toBuffer(), new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").toBuffer(), new PublicKey(mint).toBuffer()],
        new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
      );

      const senderATAIndex = tx.transaction.message.accountKeys.findIndex(
        (key) => key.toBase58() === senderATA[0].toBase58()
      );
      const receiverATAIndex = tx.transaction.message.accountKeys.findIndex(
        (key) => key.toBase58() === receiverATA[0].toBase58()
      );

      if (senderATAIndex === -1 || receiverATAIndex === -1) {
        console.log("ATA not found:", { senderATAIndex, receiverATAIndex });
        return NextResponse.json({ error: "Invalid USDC transaction: ATAs missing" }, { status: 400 });
      }

      const preTokenBalances = tx.meta.preTokenBalances?.find(
        (b) => b.accountIndex === senderATAIndex && b.mint === mint
      );
      const postTokenBalances = tx.meta.postTokenBalances?.find(
        (b) => b.accountIndex === receiverATAIndex && b.mint === mint
      );

      if (!preTokenBalances || !postTokenBalances) {
        console.log("Token balances not found:", { preTokenBalances, postTokenBalances });
        return NextResponse.json({ error: "Invalid USDC transfer: token balances missing" }, { status: 400 });
      }

      amountTransferred = (preTokenBalances.uiTokenAmount.uiAmount - (postTokenBalances.uiTokenAmount.uiAmount || 0)) / (10 ** decimals);
      if (amountTransferred <= 0) {
        amountTransferred = postTokenBalances.uiTokenAmount.uiAmount / (10 ** decimals);
      }
      console.log("USDC Transfer Details:", { amountTransferred });
    }

    console.log("Amount transferred:", amountTransferred, "Expected range:", minAmount, "-", maxAmount);

    if (amountTransferred < minAmount || amountTransferred > maxAmount) {
      console.log("Incorrect payment amount:", { expected: expectedAmount, actual: amountTransferred });
      return NextResponse.json({ error: "Incorrect payment amount" }, { status: 400 });
    }

    if (tx.transaction.message.accountKeys[receiverIndex].toBase58() !== MERCHANT_WALLET) {
      console.log("Invalid recipient:", tx.transaction.message.accountKeys[receiverIndex].toBase58());
      return NextResponse.json({ error: "Invalid recipient" }, { status: 400 });
    }

    const { data: existingPayment } = await supabase
      .from("user_payments")
      .select("id")
      .eq("user_wallet", user_wallet)
      .eq("manga_id", manga_id)
      .eq("chapter_id", chapter_id)
      .single();

    if (existingPayment) {
      return NextResponse.json({ message: "Chapter already unlocked" }, { status: 200 });
    }

    const paymentData = {
      user_wallet,
      manga_id,
      chapter_id,
      transaction_id: signature,
      payment_amount: usdAmount, // Store USD amount for consistency
      payment_currency: currency,
      paid_at: new Date().toISOString(),
    };

    const { error: insertError } = await supabase.from("user_payments").insert(paymentData);
    if (insertError) {
      console.error("Error inserting payment:", insertError);
      return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
    }

    console.log("Unlock successful:", paymentData);
    return NextResponse.json(
      {
        message: "Chapter unlocked successfully!",
        chapter_id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}