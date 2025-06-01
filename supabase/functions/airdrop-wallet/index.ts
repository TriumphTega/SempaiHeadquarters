import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

import { connection, SMP_MINT_ADDRESS } from "@/shared/constants.ts";
import { supabaseAdmin } from "@/shared/supabaseAdmin.ts";
import { encrypt, decrypt } from "@/shared/encryption.ts";

const KEYPAIR_ENCRYPTION_SECRET = Deno.env.get("KEYPAIR_ENCRYPTION_SECRET");

const AIRDROP_KEYPAIR = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(Deno.env.get("AIRDROP_WALLET_KEYPAIR") ?? "[]")),
);

const AIRDROP_SMP_AMOUNT = 1_000_000 * 1e6;

function throwOnError({ data, error }) {
  if (error) throw error;
  return data;
}

Deno.serve(async (req) => {
  if (req.method != "POST") {
    return Response.json(
      { error: `method must be POST, got: ${req.method}` },
      { status: 405 },
    );
  }

  const { user_id } = await req.json();
  if (!user_id) {
    return Response.json(
      { error: `Invalid user id: ${user_id}` },
      { status: 400 },
    );
  }

  const userWallet = await getOrCreateUserWallet(user_id);
  if (!userWallet) {
    return Response.json(
      { error: "User not found" },
      {
        status: 404,
      },
    );
  }

  const userKeypair = Keypair.fromSecretKey(
    Uint8Array.from(decrypt(userWallet.private_key, KEYPAIR_ENCRYPTION_SECRET)),
  );
  const user = userKeypair.publicKey;

  const smpAta = {
    treasury: getAssociatedTokenAddressSync(
      SMP_MINT_ADDRESS,
      AIRDROP_KEYPAIR.publicKey,
    ),
    user: getAssociatedTokenAddressSync(SMP_MINT_ADDRESS, user),
  };
  const [userSmpAccountInfo] = await connection.getMultipleAccountsInfo([
    smpAta.user,
  ]);
  if (userSmpAccountInfo) {
    return Response.json(
      { error: `user ${user} already has received SMP airdrop` },
      { status: 400 },
    );
  }

  const transaction = new Transaction();

  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 27_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10_000 }),

    createAssociatedTokenAccountInstruction(
      AIRDROP_KEYPAIR.publicKey,
      smpAta.user,
      user,
      SMP_MINT_ADDRESS,
    ),
    createTransferInstruction(
      smpAta.treasury,
      smpAta.user,
      AIRDROP_KEYPAIR.publicKey,
      AIRDROP_SMP_AMOUNT,
    ),
  );
  transaction.feePayer = AIRDROP_KEYPAIR.publicKey;

  let signature = null;
  let confirmationError = null;
  try {
    signature = await sendAndConfirmTransaction(connection, transaction, [
      AIRDROP_KEYPAIR,
    ]);
  } catch (e) {
    confirmationError = e?.message;
  }

  return Response.json({
    userPublicKey: user,
    signature,
    confirmationError,
  });
});

async function getOrCreateUserWallet(user_id) {
  const newKeypair = Keypair.generate();
  await supabaseAdmin
    .from("user_wallets")
    .upsert(
      {
        user_id,
        address: newKeypair.publicKey.toString(),
        private_key: encrypt(newKeypair.secretKey, KEYPAIR_ENCRYPTION_SECRET),
      },
      {
        onConflict: "user_id",
        ignoreDuplicates: true,
      },
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
