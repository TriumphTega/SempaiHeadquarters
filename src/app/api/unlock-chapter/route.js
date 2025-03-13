import { supabase } from "@/services/supabase/supabaseClient";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { RPC_URL } from "@/constants";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";


const TARGET_WALLET = "HSxUYwGM3NFzDmeEJ6o4bhyn8knmQmq7PLUZ6nZs4F58";
const USDC_MINT_ADDRESS = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SMP_MINT_ADDRESS = "SMP1xiPwpMiLPpnJtdEmsDGSL9fR1rvat6NFGznKPor";
const connection = new Connection(RPC_URL, "confirmed");

const fetchSolPrice = async () => {
  try {
    const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
    const data = await response.json();
    return data.solana.usd;
  } catch (error) {
    console.error("Error fetching SOL price:", error);
    return null;
  }
};

const fetchSmpPrice = async () => {
  try {
    // Placeholder: Replace "smp-token-id" with actual CoinGecko ID if available
    const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=smp-token-id&vs_currencies=usd");
    const data = await response.json();
    return data["smp-token-id"]?.usd || null;
  } catch (error) {
    console.error("Error fetching SMP price:", error);
    return null;
  }
};

export async function POST(req) {
  try {
    const { user_id, story_id, subscription_type, signature, userPublicKey, current_chapter, amount, currency } = await req.json();
    console.log("Request Body:", { user_id, story_id, subscription_type, signature, userPublicKey, current_chapter, amount, currency });

    if (!["3CHAPTERS", "FULL"].includes(subscription_type)) {
      console.log("Invalid subscription type:", subscription_type);
      return new Response(JSON.stringify({ error: "Invalid subscription type" }), { status: 400 });
    }

    const usdAmount = subscription_type === "3CHAPTERS" ? 3 : 15;
    let expectedAmount, decimals, mint;

    if (currency === "SOL") {
      const solPrice = await fetchSolPrice();
      if (!solPrice) throw new Error("Failed to fetch SOL price");
      expectedAmount = usdAmount / solPrice;
      decimals = 9;
    } else if (currency === "USDC") {
      expectedAmount = usdAmount; // USDC is $1
      decimals = 6;
      mint = USDC_MINT_ADDRESS;
    } else if (currency === "SMP") {
      const smpPrice = await fetchSmpPrice();
      if (!smpPrice) throw new Error("SMP price unavailable");
      expectedAmount = usdAmount / smpPrice;
      decimals = 9; // Adjust if SMP uses different decimals
      mint = SMP_MINT_ADDRESS;
    } else {
      return new Response(JSON.stringify({ error: "Unsupported currency" }), { status: 400 });
    }

    const tolerance = 0.02;
    const minAmount = expectedAmount * (1 - tolerance);
    const maxAmount = expectedAmount * (1 + tolerance);

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

    let amountTransferred;
    if (currency === "SOL") {
      amountTransferred = (tx.meta.postBalances[receiverIndex] - tx.meta.preBalances[receiverIndex]) / LAMPORTS_PER_SOL;
    } else {
      const preTokenBalances = tx.meta.preTokenBalances?.find(b => b.mint === mint && b.accountIndex === senderIndex);
      const postTokenBalances = tx.meta.postTokenBalances?.find(b => b.mint === mint && b.accountIndex === receiverIndex);
      if (!preTokenBalances || !postTokenBalances) {
        console.log("Token balances not found:", { preTokenBalances, postTokenBalances });
        return new Response(JSON.stringify({ error: "Invalid token transfer" }), { status: 400 });
      }
      amountTransferred = (preTokenBalances.uiTokenAmount.uiAmount - (postTokenBalances.uiTokenAmount.uiAmount || 0)) ||
                         (postTokenBalances.uiTokenAmount.uiAmount / (10 ** decimals));
    }

    console.log("Amount transferred:", amountTransferred, "Expected range:", minAmount, "-", maxAmount);

    if (amountTransferred < minAmount || amountTransferred > maxAmount) {
      console.log("Incorrect payment amount:", { expected: expectedAmount, actual: amountTransferred });
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
      payment_amount: amountTransferred,
      payment_currency: currency,
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