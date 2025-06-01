// supabase/functions/airdrop-wallet/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { ComputeBudgetProgram, Keypair, sendAndConfirmTransaction, Transaction } from "@solana/web3.js";
import { createAssociatedTokenAccountInstruction, createTransferInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { connection, SMP_MINT_ADDRESS } from "@/shared/constants.ts";
import { supabaseAdmin } from "@/shared/supabaseAdmin.ts";
import { encrypt, decrypt } from "@/shared/encryption.ts";

// Airdrop configuration
const AIRDROP_KEYPAIR = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(Deno.env.get("AIRDROP_WALLET_KEYPAIR") ?? "[]"))
);
const AIRDROP_SMP_AMOUNT = 1_000_000 * 1e6; // 1,000,000 SMP (6 decimals)
const MAX_AIRDROP_CLAIMS = 500;

function throwOnError({ data, error }) {
  if (error) throw error;
  return data;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: `Method must be POST, got: ${req.method}` }, { status: 405 });
  }

  const { user_id } = await req.json();
  if (!user_id) {
    return Response.json({ error: `Invalid user id: ${user_id}` }, { status: 400 });
  }

  // Check total claims
  const { count, error: countError } = await supabaseAdmin
    .from("user_activity")
    .select("id", { count: "exact" })
    .eq("has_claimed_airdrop", true);
  if (countError) {
    return Response.json({ error: `Failed to check claim count: ${countError.message}` }, { status: 500 });
  }
  if (count >= MAX_AIRDROP_CLAIMS) {
    return Response.json({ error: "Airdrop limit of 500 users reached" }, { status: 400 });
  }

  // Check if user has already claimed
  const { data: userActivity, error: activityError } = await supabaseAdmin
    .from("user_activity")
    .select("has_claimed_airdrop")
    .eq("user_id", user_id)
    .single();
  if (activityError && activityError.code !== "PGRST116") {
    return Response.json({ error: `Failed to check user activity: ${activityError.message}` }, { status: 500 });
  }
  if (userActivity?.has_claimed_airdrop) {
    return Response.json({ error: "User has already claimed airdrop" }, { status: 400 });
  }

  // Get or create user wallet
  const userWallet = await getOrCreateUserWallet(user_id);
  if (!userWallet) {
    return Response.json({ error: "Failed to create or retrieve wallet" }, { status: 500 });
  }

  const userKeypair = Keypair.fromSecretKey(Uint8Array.from(decrypt(userWallet.private_key)));
  const user = userKeypair.publicKey;

  // Check if user has SMP ATA
  const smpAta = {
    treasury: getAssociatedTokenAddressSync(SMP_MINT_ADDRESS, AIRDROP_KEYPAIR.publicKey),
    user: getAssociatedTokenAddressSync(SMP_MINT_ADDRESS, user),
  };
  const [userSmpAccountInfo] = await connection.getMultipleAccountsInfo([smpAta.user]);
  if (userSmpAccountInfo) {
    // Mark as claimed to prevent re-attempts
    await supabaseAdmin
      .from("user_activity")
      .upsert(
        { user_id, has_claimed_airdrop: true, last_claim_timestamp: new Date().toISOString() },
        { onConflict: "user_id" }
      )
      .then(throwOnError);
    return Response.json({ error: `User ${user.toString()} already has SMP tokens` }, { status: 400 });
  }

  // Build transaction
  const transaction = new Transaction();
  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 27_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10_000 }),
    createAssociatedTokenAccountInstruction(
      AIRDROP_KEYPAIR.publicKey,
      smpAta.user,
      user,
      SMP_MINT_ADDRESS
    ),
    createTransferInstruction(
      smpAta.treasury,
      smpAta.user,
      AIRDROP_KEYPAIR.publicKey,
      AIRDROP_SMP_AMOUNT
    )
  );
  transaction.feePayer = AIRDROP_KEYPAIR.publicKey;

  // Execute transaction
  let signature = null;
  let confirmationError = null;
  try {
    signature = await sendAndConfirmTransaction(connection, transaction, [AIRDROP_KEYPAIR]);
    // Mark airdrop as claimed
    await supabaseAdmin
      .from("user_activity")
      .upsert(
        { user_id, has_claimed_airdrop: true, last_claim_timestamp: new Date().toISOString() },
        { onConflict: "user_id" }
      )
      .then(throwOnError);
  } catch (e) {
    confirmationError = e?.message;
  }

  return Response.json({
    userPublicKey: user.toString(),
    signature,
    confirmationError,
  });
});

async function getOrCreateUserWallet(user_id: string) {
  const newKeypair = Keypair.generate();
  await supabaseAdmin
    .from("user_wallets")
    .upsert(
      {
        user_id,
        address: newKeypair.publicKey.toString(),
        private_key: encrypt(newKeypair.secretKey),
      },
      { onConflict: "user_id", ignoreDuplicates: true }
    )
    .then(throwOnError);

  return supabaseAdmin
    .from("user_wallets")
    .select()
    .eq("user_id", user_id)
    .single()
    .then(throwOnError);
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/airdrop-wallet' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/