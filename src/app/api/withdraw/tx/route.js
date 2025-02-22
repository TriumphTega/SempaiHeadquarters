import { NextResponse } from "next/server";
import {
  Connection,
  ComputeBudgetProgram,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { AMETHYST_MINT_ADDRESS, SMP_MINT_ADDRESS, RPC_URL } from "@/constants";
import { supabase } from "@/services/supabase/supabaseClient";

const TREASURY_WALLET = new PublicKey(
  "HSxUYwGM3NFzDmeEJ6o4bhyn8knmQmq7PLUZ6nZs4F58"
);

const BACKEND_KEYPAIR = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(process.env.BACKEND_WALLET_KEYPAIR ?? "[]"))
);

const connection = new Connection(RPC_URL);

export async function POST(req) {
  try {
    const { withdrawalId } = await req.json();

    if (!withdrawalId) {
      return NextResponse.json(
        { error: `Invalid withdrawal ID: ${withdrawalId}` },
        { status: 400 }
      );
    }

    const { data: withdrawal, error: withdrawalError } = await supabase
      .from("pending_withdrawals")
      .select("*")
      .eq("id", withdrawalId)
      .single();

    if (withdrawalError || !withdrawal) {
      return NextResponse.json(
        { error: "Could not find withdrawal", message: withdrawalError?.message },
        { status: 404 }
      );
    }

    if (withdrawal.status !== "pending") {
      return NextResponse.json(
        { error: "Withdrawal not pending", data: withdrawal },
        { status: 409 }
      );
    }

    let idempotence_key = withdrawal.idempotence_key
      ? new PublicKey(withdrawal.idempotence_key)
      : Keypair.generate().publicKey;

    if (!withdrawal.idempotence_key) {
      const { error: idempotenceKeyError } = await supabase
        .from("pending_withdrawals")
        .update({ idempotence_key: idempotence_key.toString() })
        .eq("id", withdrawalId);

      if (idempotenceKeyError) {
        return NextResponse.json(
          { error: "Could not create idempotence key", message: idempotenceKeyError.message },
          { status: 500 }
        );
      }
    }

    // Check if transaction is already confirmed
    const [confirmedTx] = await connection.getSignaturesForAddress(idempotence_key, { limit: 1 }, "confirmed");
    if (confirmedTx) {
      // Update withdrawal status and deduct balance
      await supabase
        .from("pending_withdrawals")
        .update({
          status: "approved",
          transaction_id: confirmedTx.signature,
        })
        .eq("id", withdrawalId);

      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("wallet_address", withdrawal.wallet_address)
        .single();

      if (userError || !user) {
        throw new Error("User not found for balance update");
      }

      const { data: balance, error: balanceError } = await supabase
        .from("wallet_balances")
        .select("amount")
        .eq("user_id", user.id)
        .single();

      if (balanceError || !balance) {
        throw new Error("Balance not found");
      }

      const newBalance = balance.amount - withdrawal.amount;
      const { error: updateBalanceError } = await supabase
        .from("wallet_balances")
        .update({ amount: newBalance })
        .eq("user_id", user.id);

      if (updateBalanceError) {
        throw new Error("Failed to update balance");
      }

      return NextResponse.json({
        message: "Withdrawal successful",
        transaction: confirmedTx.signature,
      });
    }

    const currentBlockheight = await connection.getBlockHeight();
    if (withdrawal.last_valid_blockheight && currentBlockheight < withdrawal.last_valid_blockheight) {
      return NextResponse.json(
        {
          message: `Withdrawal pending: current height ${currentBlockheight}, pending till: ${withdrawal.last_valid_blockheight}`,
          data: withdrawal,
        },
        { status: 202 }
      );
    }

    // Fetch user's wallet address
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("wallet_address")
      .eq("id", withdrawal.user_id)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Could not load user wallet", message: userError?.message },
        { status: 404 }
      );
    }

    // Create transaction
    const { transaction, blockhashInfo } = await createWithdrawalTransaction({
      user: new PublicKey(user.wallet_address),
      idempotenceKey: idempotence_key,
      rawSmpAmount: Math.floor(withdrawal.amount * 1e6), // Assuming SMP uses 6 decimals
    });

    // Update withdrawal with block height
    const { error: updateWithdrawalError } = await supabase
      .from("pending_withdrawals")
      .update({
        last_valid_blockheight: blockhashInfo.lastValidBlockHeight,
      })
      .eq("id", withdrawalId);

    if (updateWithdrawalError) {
      return NextResponse.json(
        { error: "Could not update withdrawal", message: updateWithdrawalError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      blockhashInfo,
      transaction: transaction.serialize({ requireAllSignatures: false }).toString("base64"),
    });
  } catch (error) {
    console.error("Error in POST /api/withdraw/tx:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

async function createWithdrawalTransaction({ user, idempotenceKey, rawSmpAmount }) {
  const smpAta = {
    treasury: getAssociatedTokenAddressSync(SMP_MINT_ADDRESS, BACKEND_KEYPAIR.publicKey),
    user: getAssociatedTokenAddressSync(SMP_MINT_ADDRESS, user),
  };

  const [userSmpAccountInfo] = await connection.getMultipleAccountsInfo([smpAta.user]);
  const transaction = new Transaction();

  transaction.add(
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 })
  );

  if (!userSmpAccountInfo) {
    transaction.add(
      createAssociatedTokenAccountIdempotentInstruction(
        user,
        smpAta.user,
        user,
        SMP_MINT_ADDRESS
      )
    );
  }

  transaction.add(
    createTransferInstruction(
      smpAta.treasury,
      smpAta.user,
      BACKEND_KEYPAIR.publicKey,
      rawSmpAmount
    ),
    createNoopInstruction(idempotenceKey)
  );

  const blockhashInfo = await connection.getLatestBlockhash("finalized");
  transaction.feePayer = user;
  transaction.recentBlockhash = blockhashInfo.blockhash;
  transaction.partialSign(BACKEND_KEYPAIR);

  return { transaction, blockhashInfo };
}

function createNoopInstruction(...keys) {
  return new TransactionInstruction({
    programId: new PublicKey("noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV"),
    keys: keys.map((pubkey) => ({
      isSigner: false,
      isWritable: false,
      pubkey,
    })),
    data: Buffer.from([]),
  });
}