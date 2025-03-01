import { supabase } from "@/services/supabase/supabaseClient";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TREASURY_PUBLIC_KEY, DEVNET_RPC_URL } from "@/constants";

const connection = new Connection(DEVNET_RPC_URL, "confirmed");

export async function POST(req) {
  try {
    const { user_id, story_id, subscription_type, signature, userPublicKey, current_chapter } = await req.json();
    console.log("Request Body:", { user_id, story_id, subscription_type, signature, userPublicKey, current_chapter });

    if (!["3CHAPTERS", "FULL"].includes(subscription_type)) {
      console.log("Invalid subscription type:", subscription_type);
      return new Response(JSON.stringify({ error: "Invalid subscription type" }), { status: 400 });
    }

    const payment_amount = subscription_type === "3CHAPTERS" ? 0.03 : 0.15;
    console.log("Expected payment amount (SOL):", payment_amount);

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

    console.log("Transaction:", JSON.stringify(tx, null, 2));

    if (!tx.meta || tx.meta.err) {
      console.log("Transaction meta error:", tx.meta?.err);
      return new Response(JSON.stringify({ error: "Invalid transaction: failed on chain" }), { status: 400 });
    }

    const senderIndex = tx.transaction.message.accountKeys.findIndex(
      (key) => key.toBase58() === userPublicKey
    );
    const receiverIndex = tx.transaction.message.accountKeys.findIndex(
      (key) => key.toBase58() === TREASURY_PUBLIC_KEY
    );

    if (senderIndex === -1 || receiverIndex === -1) {
      console.log("Sender or receiver not found in transaction accounts:", {
        senderIndex,
        receiverIndex,
      });
      return new Response(JSON.stringify({ error: "Invalid transaction: sender or receiver missing" }), { status: 400 });
    }

    const amountTransferred = (tx.meta.postBalances[receiverIndex] - tx.meta.preBalances[receiverIndex]) / LAMPORTS_PER_SOL;
    console.log("Amount transferred (SOL):", amountTransferred);

    if (amountTransferred !== payment_amount) {
      console.log("Incorrect payment amount:", { expected: payment_amount, actual: amountTransferred });
      return new Response(JSON.stringify({ error: "Incorrect payment amount" }), { status: 400 });
    }

    if (tx.transaction.message.accountKeys[receiverIndex].toBase58() !== TREASURY_PUBLIC_KEY) {
      console.log("Invalid recipient:", tx.transaction.message.accountKeys[receiverIndex].toBase58());
      return new Response(JSON.stringify({ error: "Invalid recipient" }), { status: 400 });
    }

    const expires_at = subscription_type === "3CHAPTERS"
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Calculate chapter_unlocked_till based on subscription type
    const chapter_unlocked_till = subscription_type === "FULL"
      ? -1 // Full unlock
      : current_chapter + 2; // Unlock current chapter + next 2 (total 3 chapters)

    const unlockData = {
      user_id,
      story_id,
      chapter_unlocked_till,
      transaction_id: signature,
      payment_amount,
      subscription_type,
      expires_at,
    };

    // Check for existing unlock record
    const { data: existing, error: existingError } = await supabase
      .from("unlocked_story_chapters")
      .select("chapter_unlocked_till, expires_at")
      .eq("user_id", user_id)
      .eq("story_id", story_id)
      .single();

    if (existingError && existingError.code !== "PGRST116") {
      console.log("Error checking existing unlock:", existingError);
      throw existingError;
    }

    if (existing) {
      const expired = existing.expires_at && new Date(existing.expires_at) < new Date();
      if (!expired && existing.chapter_unlocked_till >= chapter_unlocked_till) {
        console.log("Already unlocked up to or beyond this range:", existing.chapter_unlocked_till);
        return new Response(
          JSON.stringify({ message: "Chapters already unlocked up to this point!", subscription_type }),
          { status: 200 }
        );
      } else {
        // Update to extend the unlock range
        await supabase
          .from("unlocked_story_chapters")
          .update({ chapter_unlocked_till: Math.max(existing.chapter_unlocked_till, chapter_unlocked_till), expires_at })
          .eq("user_id", user_id)
          .eq("story_id", story_id);
        console.log("Updated unlock range:", unlockData);
      }
    } else {
      // Insert new unlock record
      await supabase.from("unlocked_story_chapters").insert(unlockData);
      console.log("Inserted new unlock:", unlockData);
    }

    return new Response(
      JSON.stringify({
        message: "Chapters unlocked successfully!",
        subscription_type,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("API Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}