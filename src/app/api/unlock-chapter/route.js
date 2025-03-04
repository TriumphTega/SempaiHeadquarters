import { supabase } from "@/services/supabase/supabaseClient";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { RPC_URL } from "@/constants";

const TARGET_WALLET = "HSxUYwGM3NFzDmeEJ6o4bhyn8knmQmq7PLUZ6nZs4F58";
const connection = new Connection(RPC_URL, "confirmed");

// Fetch SOL price in USD from CoinGecko
const fetchSolPrice = async () => {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
    );
    const data = await response.json();
    return data.solana.usd;
  } catch (error) {
    console.error("Error fetching SOL price:", error);
    throw new Error("Failed to fetch SOL price");
  }
};

export async function POST(req) {
  try {
    const { user_id, story_id, subscription_type, signature, userPublicKey, current_chapter, sol_amount } = await req.json();
    console.log("Request Body:", { user_id, story_id, subscription_type, signature, userPublicKey, current_chapter, sol_amount });

    if (!["3CHAPTERS", "FULL"].includes(subscription_type)) {
      console.log("Invalid subscription type:", subscription_type);
      return new Response(JSON.stringify({ error: "Invalid subscription type" }), { status: 400 });
    }

    // Fetch real-time SOL price
    const solPrice = await fetchSolPrice();
    const usdAmount = subscription_type === "3CHAPTERS" ? 3 : 15; // $3 or $15
    const expectedSolAmount = usdAmount / solPrice; // Expected SOL amount
    const expectedLamports = Math.round(expectedSolAmount * LAMPORTS_PER_SOL);

    // Allow a small tolerance (e.g., 2% of lamports) due to rounding and price fluctuations
    const tolerance = 0.02;
    const minLamports = Math.round(expectedLamports * (1 - tolerance));
    const maxLamports = Math.round(expectedLamports * (1 + tolerance));

    console.log(`Expected USD: $${usdAmount}, SOL Price: $${solPrice}, Expected SOL: ${expectedSolAmount}, Expected Lamports: ${expectedLamports}, Range: ${minLamports}-${maxLamports}`);

    let tx = null;
    for (let i = 0; i < 3; i++) {
      tx = await connection.getTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
      if (tx) break;
      console.log(`Attempt ${i + 1}: Transaction not found yet, retrying...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    if (!tx) {
      console.log("Transaction not found after retries:", signature);
      return new Response(JSON.stringify({ error: "Invalid transaction: not found" }), { status: 400 });
    }

    if (!tx.meta || tx.meta.err) {
      console.log("Transaction meta error:", tx.meta?.err);
      return new Response(JSON.stringify({ error: "Invalid transaction: failed on chain" }), { status: 400 });
    }

    const senderIndex = tx.transaction.message.accountKeys.findIndex(
      (key) => key.toBase58() === userPublicKey
    );
    const receiverIndex = tx.transaction.message.accountKeys.findIndex(
      (key) => key.toBase58() === TARGET_WALLET
    );

    if (senderIndex === -1 || receiverIndex === -1) {
      console.log("Sender or receiver not found in transaction accounts:", {
        senderIndex,
        receiverIndex,
      });
      return new Response(JSON.stringify({ error: "Invalid transaction: sender or receiver missing" }), { status: 400 });
    }

    const amountTransferredLamports = tx.meta.postBalances[receiverIndex] - tx.meta.preBalances[receiverIndex];
    const amountTransferredSol = amountTransferredLamports / LAMPORTS_PER_SOL;
    console.log("Amount transferred (SOL):", amountTransferredSol, "Lamports:", amountTransferredLamports);

    if (amountTransferredLamports < minLamports || amountTransferredLamports > maxLamports) {
      console.log("Incorrect payment amount:", { expectedSol: expectedSolAmount, actualSol: amountTransferredSol });
      return new Response(JSON.stringify({ error: "Incorrect payment amount" }), { status: 400 });
    }

    if (tx.transaction.message.accountKeys[receiverIndex].toBase58() !== TARGET_WALLET) {
      console.log("Invalid recipient:", tx.transaction.message.accountKeys[receiverIndex].toBase58());
      return new Response(JSON.stringify({ error: "Invalid recipient" }), { status: 400 });
    }

    const { data: novel, error: novelError } = await supabase
      .from("novels")
      .select("chaptercontents, advance_chapters")
      .eq("id", story_id)
      .single();
    if (novelError || !novel) {
      return new Response(JSON.stringify({ error: "Novel not found" }), { status: 404 });
    }

    const totalChapters = Object.keys(novel.chaptercontents || {}).length;
    const currentChapterNum = parseInt(current_chapter, 10);

    const advanceChapters = novel.advance_chapters || [];
    for (let i = 0; i < currentChapterNum; i++) {
      const advanceInfo = advanceChapters.find((c) => c.index === i) || { is_advance: false, free_release_date: null };
      if (advanceInfo.is_advance && (!advanceInfo.free_release_date || new Date(advanceInfo.free_release_date) > new Date())) {
        const { data: unlock } = await supabase
          .from("unlocked_story_chapters")
          .select("chapter_unlocked_till, expires_at")
          .eq("user_id", user_id)
          .eq("story_id", story_id)
          .single();
        const hasUnlock = unlock && (!unlock.expires_at || new Date(unlock.expires_at) > new Date()) && unlock.chapter_unlocked_till >= i;
        if (!hasUnlock) {
          return new Response(JSON.stringify({ error: `Chapter ${i} must be unlocked first` }), { status: 403 });
        }
      }
    }

    let chapter_unlocked_till;
    const chaptersPurchased = subscription_type === "3CHAPTERS" ? 3 : Infinity;
    if (subscription_type === "FULL") {
      chapter_unlocked_till = -1;
    } else {
      chapter_unlocked_till = currentChapterNum + chaptersPurchased - 1;
    }

    const expires_at = subscription_type === "3CHAPTERS"
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const unlockData = {
      user_id,
      story_id,
      chapter_unlocked_till,
      transaction_id: signature,
      payment_amount: amountTransferredSol, // Store actual SOL amount paid
      subscription_type,
      expires_at,
      chapters_purchased: subscription_type === "3CHAPTERS" ? 3 : null,
    };

    const { data: existing } = await supabase
      .from("unlocked_story_chapters")
      .select("*")
      .eq("user_id", user_id)
      .eq("story_id", story_id)
      .single();

    if (existing) {
      const new_unlocked_till = existing.chapter_unlocked_till === -1 ? -1 : Math.max(existing.chapter_unlocked_till, chapter_unlocked_till);
      await supabase
        .from("unlocked_story_chapters")
        .update({ ...unlockData, chapter_unlocked_till: new_unlocked_till })
        .eq("user_id", user_id)
        .eq("story_id", story_id);
    } else {
      await supabase
        .from("unlocked_story_chapters")
        .insert(unlockData);
    }

    console.log("Unlock successful:", unlockData);
    return new Response(
      JSON.stringify({
        message: "Chapters unlocked successfully!",
        subscription_type,
        chapter_unlocked_till,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("API Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}