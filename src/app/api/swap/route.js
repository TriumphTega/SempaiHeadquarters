import {
  Connection,
  ComputeBudgetProgram,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createBurnInstruction,
  createCloseAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
  unpackAccount,
} from "@solana/spl-token";
import { AMETHYST_MINT_ADDRESS, SMP_MINT_ADDRESS, RPC_URL } from "@/constants";

const TREASURY_WALLET = new PublicKey(
  "HSxUYwGM3NFzDmeEJ6o4bhyn8knmQmq7PLUZ6nZs4F58",
);

const BACKEND_KEYPAIR = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(process.env.BACKEND_WALLET_KEYPAIR ?? "[]")),
);

const connection = new Connection(RPC_URL);

export async function POST(req) {
  const body = await req.json();

  const { userAddress, amethystAmount } = body ?? {};

  let user;
  try {
    user = new PublicKey(userAddress);
  } catch (e) {
    return Response.json(
      {
        error: "invalid public key",
        message: `could not parse ${userAddress} as public key: ${e?.message}`,
      },
      { status: 400 },
    );
  }

  const amethystAta = {
    treasury: getAssociatedTokenAddressSync(
      AMETHYST_MINT_ADDRESS,
      TREASURY_WALLET,
    ),
    user: getAssociatedTokenAddressSync(AMETHYST_MINT_ADDRESS, user),
  };
  const smpAta = {
    treasury: getAssociatedTokenAddressSync(
      SMP_MINT_ADDRESS,
      BACKEND_KEYPAIR.publicKey,
    ),
    user: getAssociatedTokenAddressSync(SMP_MINT_ADDRESS, user),
  };

  const [userAmethystAccountInfo, userSmbAccountInfo] =
    await connection.getMultipleAccountsInfo([amethystAta.user, smpAta.user]);

  if (!userAmethystAccountInfo)
    return Response.json(
      {
        error: "could not fetch user's amethyst token account",
        message: `${amethystAta.user} does not exist`,
      },
      { status: 400 },
    );

  const userAmethystAccount = unpackAccount(
    amethystAta.user,
    userAmethystAccountInfo,
  );

  let rawAmethystAmount;
  if (typeof amethystAmount === "number")
    rawAmethystAmount = BigInt(Math.floor(amethystAmount * 1_000_000));
  else rawAmethystAmount = userAmethystAccount.amount;

  if (rawAmethystAmount > userAmethystAccount.amount)
    return Response.json(
      {
        error: "insufficient balance",
        message: `${user} is swapping ${rawAmethystAmount} but has ${userAmethystAccount.amount}`,
      },
      { status: 400 },
    );

  const rawSmpAmount = (rawAmethystAmount * 125n) / 100n;
  const amethystBurnAmount = (rawAmethystAmount * 25n) / 100n;
  const amethystTransferAmount = rawAmethystAmount - amethystBurnAmount;

  const transaction = new Transaction();
  // add priority fees
  transaction.add(
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 }),
  );

  // create smb ata if it doesn't exist
  if (!userSmbAccountInfo)
    transaction.add(
      createAssociatedTokenAccountIdempotentInstruction(
        user,
        smpAta.user,
        user,
        SMP_MINT_ADDRESS,
      ),
    );

  transaction.add(
    // transfer 75% amethyst from user -> treasury
    createTransferInstruction(
      amethystAta.user,
      amethystAta.treasury,
      user,
      amethystTransferAmount,
    ),

    // burn 25% amethyst
    createBurnInstruction(
      amethystAta.user,
      AMETHYST_MINT_ADDRESS,
      user,
      amethystBurnAmount,
    ),

    // transfer smp from treasury -> user
    createTransferInstruction(
      smpAta.treasury,
      smpAta.user,
      BACKEND_KEYPAIR.publicKey,
      rawSmpAmount,
    ),
  );

  // close token account if empty
  if (userAmethystAccount.amount === rawAmethystAmount)
    transaction.add(
      createCloseAccountInstruction(amethystAta.user, user, user),
    );

  // charge user 0.01 sol
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: user,
      toPubkey: TREASURY_WALLET,
      lamports: Math.floor(0.01 * LAMPORTS_PER_SOL),
    }),
  );

  const blockhashInfo = await connection.getLatestBlockhash("finalized");
  transaction.feePayer = user;
  transaction.recentBlockhash = blockhashInfo.blockhash;
  transaction.partialSign(BACKEND_KEYPAIR);

  return Response.json({
    blockhashInfo,
    transaction: transaction
      .serialize({ requireAllSignatures: false })
      .toString("base64"),
  });
}
