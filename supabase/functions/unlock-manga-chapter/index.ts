// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { decodeBase64 } from "jsr:@std/encoding/base64";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Keypair,
  sendAndConfirmTransaction,
} from "https://esm.sh/@solana/web3.js@1";
import {
  createBurnInstruction,
  createTransferInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
} from "https://esm.sh/@solana/spl-token@0.4.8";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import bs58 from "https://esm.sh/bs58@4.0.1";

// Constants
const RPC_URL = Deno.env.get("RPC_URL") || "https://mainnet.helius-rpc.com/?api-key=ad8457f8-9c51-4122-95d4-91b15728ea90";
const connection = new Connection(RPC_URL, "confirmed");
const SMP_MINT_ADDRESS = new PublicKey("SMP1xiPwpMiLPpnJtdEmsDGSL9fR1rvat6NFGznKPor");
const USDC_MINT_ADDRESS = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const SQUADS_WALLET = new PublicKey("4EeY4iDCp36yvLFvwhFhBrurKGJwNqLDzvM3PVsxrPdR");
const TREASURY_WALLET = new PublicKey("62PPSRhAk6hdn85MUoYAnUDisswZRfos68Zqf7N1QLkr");

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseAdminKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabaseAdmin = createClient(supabaseUrl, supabaseAdminKey);

function throwOnError({ data, error }: { data: any; error: any }) {
  if (error) {
    console.error("[supabase] Error:", error?.message, error?.stack);
    throw new Error(error?.message);
  }
  return data;
}

// Helper: Fetch and decrypt user private key
async function getUserPrivateKey(userId: string) {
  const wallet = await supabaseAdmin
    .from("user_wallets")
    .select("private_key")
    .eq("user_id", userId)
    .maybeSingle()
    .then(throwOnError);
  if (!wallet) throw new Error(`could not find wallet for user ${userId}`);

  const { data: decryptResult, error: decryptError } = await supabaseAdmin.functions.invoke("wallet-encryption", {
    body: { action: "decrypt", data: wallet.private_key },
  });
  if (decryptError) throw new Error("wallet-encryption failed: " + decryptError.message);
  const privateKeyBase58 = decryptResult?.result || decryptResult?.privateKey || decryptResult;
  if (typeof privateKeyBase58 !== "string") {
    throw new Error("Decrypted private key is not a string: " + JSON.stringify(privateKeyBase58));
  }
  let privateKeyBytes: Uint8Array;
  try {
    privateKeyBytes = bs58.decode(privateKeyBase58);
  } catch (e: any) {
    throw new Error("Failed to decode base58 private key: " + e.message);
  }
  if (privateKeyBytes.length !== 64) {
    throw new Error(`Invalid private key format: length ${privateKeyBytes.length}`);
  }
  return Keypair.fromSecretKey(privateKeyBytes);
}

// Helper: Fetch prices via Meteora pool [SMP, SOL]
async function fetchPrices() {
  const [pool] = await fetch(
    "https://amm-v2.meteora.ag/pools?address=3duTFdX9wrGh3TatuKtorzChL697HpiufZDPnc44Yp33",
  ).then((r) => r.json());
  const smpAmount = parseFloat(pool.pool_token_amounts[0]);
  const solAmount = parseFloat(pool.pool_token_amounts[1]);
  const smpUsdAmount = parseFloat(pool.pool_token_usd_amounts[0]);
  const solUsdAmount = parseFloat(pool.pool_token_usd_amounts[1]);
  return {
    smpPerUsd: smpAmount / smpUsdAmount,
    solPerUsd: solAmount / solUsdAmount,
  };
}

function splitAmountWithResidual(amount: number, ratios: number[]) {
  const totalRatio = ratios.reduce((a, b) => a + b, 0);
  const r: number[] = [];
  let runningTotal = 0;
  for (let i = 0; i < ratios.length - 1; i++) {
    r[i] = Math.floor((amount * ratios[i]) / totalRatio);
    runningTotal += r[i];
  }
  r[ratios.length - 1] = amount - runningTotal;
  return r;
}

async function createPaymentTransaction({
  paymentMint,
  paymentAmount,
  user,
  author,
}: {
  paymentMint: PublicKey | null;
  paymentAmount: number;
  user: Keypair | PublicKey;
  author: PublicKey;
}) {
  const [authorAmount, treasuryAmount, squadsAmount, burnAmount] = splitAmountWithResidual(paymentAmount, [30, 30, 25, 15]);
  const instructions: any[] = [];
  const userPublicKey = "publicKey" in user ? user.publicKey : user;

  if (!paymentMint) {
    instructions.push(
      SystemProgram.transfer({ fromPubkey: userPublicKey, toPubkey: author, lamports: authorAmount }),
      SystemProgram.transfer({ fromPubkey: userPublicKey, toPubkey: TREASURY_WALLET, lamports: treasuryAmount + burnAmount }),
      SystemProgram.transfer({ fromPubkey: userPublicKey, toPubkey: SQUADS_WALLET, lamports: squadsAmount }),
    );
  } else {
    const userAta = getAssociatedTokenAddressSync(paymentMint, userPublicKey);
    const authorAta = getAssociatedTokenAddressSync(paymentMint, author);
    const treasuryAta = getAssociatedTokenAddressSync(paymentMint, TREASURY_WALLET, true);
    const squadsAta = getAssociatedTokenAddressSync(paymentMint, SQUADS_WALLET, true);

    const [userAtaInfo, authorAtaInfo, treasuryAtaInfo, squadsAtaInfo] = await connection.getMultipleAccountsInfo([
      userAta,
      authorAta,
      treasuryAta,
      squadsAta,
    ]);

    if (!userAtaInfo) {
      console.error("[unlock-manga] User ATA missing:", userAta.toBase58());
      throw new Error("User wallet is missing associated token account (ATA) for this token. Please create it first.");
    }

    let reroutedToTreasury = 0;

    // Author
    let authorDestAta: PublicKey | null = authorAta;
    let authorDestAmount = authorAmount;
    if (!authorAtaInfo) {
      console.warn("[unlock-manga] Author ATA missing:", authorAta.toBase58(), "Rerouting author share to treasury.");
      reroutedToTreasury += authorAmount;
      authorDestAta = null;
      authorDestAmount = 0;
    }

    // Squads
    let squadsDestAta: PublicKey | null = squadsAta;
    let squadsDestAmount = squadsAmount;
    if (!squadsAtaInfo) {
      console.warn("[unlock-manga] Squads ATA missing:", squadsAta.toBase58(), "Rerouting squads share to treasury.");
      reroutedToTreasury += squadsAmount;
      squadsDestAta = null;
      squadsDestAmount = 0;
    }

    // Treasury must exist
    if (!treasuryAtaInfo) {
      console.error("[unlock-manga] Treasury ATA missing:", treasuryAta.toBase58());
      throw new Error("Treasury wallet is missing associated token account (ATA) for this token. Please contact support.");
    }

    if (authorDestAta && authorDestAmount > 0) {
      instructions.push(createTransferInstruction(userAta, authorDestAta, userPublicKey, authorDestAmount));
    }
    if (squadsDestAta && squadsDestAmount > 0) {
      instructions.push(createTransferInstruction(userAta, squadsDestAta, userPublicKey, squadsDestAmount));
    }
    const totalTreasuryAmount = treasuryAmount + burnAmount + reroutedToTreasury;
    if (totalTreasuryAmount > 0) {
      instructions.push(createTransferInstruction(userAta, treasuryAta, userPublicKey, totalTreasuryAmount));
    }
    if (paymentMint.equals(SMP_MINT_ADDRESS)) {
      instructions.push(createBurnInstruction(userAta, paymentMint, userPublicKey, burnAmount));
    }
  }

  const tx = new Transaction();
  tx.add(...instructions);
  tx.feePayer = userPublicKey;
  return tx;
}

serve(async (req) => {
  try {
    const jwt = req.headers.get("authorization")?.replace(/^Bearer /, "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "authorization header missing" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const jwtBody = JSON.parse(new TextDecoder().decode(decodeBase64(jwt.split(".")[1])));
    if (typeof jwtBody?.email != "string") {
      return new Response(JSON.stringify({ error: "authorization header missing email" }), { status: 400 });
    }

    const { data: userData, error: userErr } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", jwtBody.email)
      .maybeSingle();
    if (!userData) {
      return new Response(JSON.stringify({ error: `could not find user with email ${jwtBody.email}: ` + (userErr?.message || "") }), { status: 400 });
    }

    const body = await req.json();
    const { mangaId, chapterId, currency } = body as { mangaId: string; chapterId: string; currency: "SOL" | "USDC" | "SMP" };
    if (!mangaId || !chapterId || !currency) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    // Load chapter and manga to determine pricing and author
    const chapter = await supabaseAdmin
      .from("manga_chapters")
      .select("id, manga_id, is_premium, price")
      .eq("id", chapterId)
      .eq("manga_id", mangaId)
      .maybeSingle()
      .then(throwOnError);
    if (!chapter) return new Response(JSON.stringify({ error: "Chapter not found" }), { status: 404 });

    const manga = await supabaseAdmin
      .from("manga")
      .select("id, user_id")
      .eq("id", mangaId)
      .maybeSingle()
      .then(throwOnError);
    if (!manga) return new Response(JSON.stringify({ error: "Manga not found" }), { status: 404 });

    const authorRow = await supabaseAdmin
      .from("users")
      .select("wallet_address")
      .eq("id", manga.user_id)
      .maybeSingle()
      .then(throwOnError);
    if (!authorRow?.wallet_address) return new Response(JSON.stringify({ error: "Author wallet not found" }), { status: 400 });
    const author = new PublicKey(authorRow.wallet_address);

    // Pricing: premium -> chapter.price (USD), non-premium -> $0.005 SMP-equivalent (still processed via chosen currency)
    let usdAmount = 0.005; // micro price for non-premium
    if (chapter.is_premium) {
      usdAmount = chapter.price && chapter.price > 0 ? Number(chapter.price) : 2.5; // fallback
    }

    // Resolve payer keypair from DB for server-side signing
    const userKeypair = await getUserPrivateKey(userData.id);
    const userPub = userKeypair.publicKey;

    // Compute payment amounts
    let paymentMint: PublicKey | null = null;
    let paymentAmount = 0; // lamports or token base units
    if (currency === "USDC") {
      paymentMint = USDC_MINT_ADDRESS;
      paymentAmount = Math.floor(usdAmount * 1e6);
    } else {
      const { smpPerUsd, solPerUsd } = await fetchPrices();
      if (currency === "SOL") {
        paymentAmount = Math.floor(usdAmount * solPerUsd * 1e9);
      } else if (currency === "SMP") {
        paymentMint = SMP_MINT_ADDRESS;
        paymentAmount = Math.floor(usdAmount * smpPerUsd * 1e6);
      } else {
        return new Response(JSON.stringify({ error: `Invalid currency: ${currency}` }), { status: 400 });
      }
    }

    // Ensure sufficient balances
    const userSolBalance = await connection.getBalance(userPub);
    const rentExempt = await connection.getMinimumBalanceForRentExemption(165);
    const feeEstimate = 10000;
    const minRequired = rentExempt + feeEstimate;
    if (userSolBalance < minRequired) {
      throw new Error(
        `Insufficient SOL for fees. You have ${(userSolBalance / 1e9).toFixed(6)} SOL, need at least ${(minRequired / 1e9).toFixed(6)} SOL.`,
      );
    }

    if (paymentMint) {
      const userAta = getAssociatedTokenAddressSync(paymentMint, userPub);
      let userBalance = 0;
      try {
        userBalance = await getAccount(connection, userAta).then((a) => Number(a.amount));
      } catch (_) {
        // no ATA or 0 balance
        userBalance = 0;
      }
      if (userBalance < paymentAmount) {
        return new Response(JSON.stringify({ error: `Insufficient token balance` }), { status: 400 });
      }
    }

    // Build, sign, send
    const tx = await createPaymentTransaction({ paymentMint, paymentAmount, author, user: userKeypair });
    const blockhashInfo = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhashInfo.blockhash;
    tx.feePayer = userKeypair.publicKey;
    const signature = await sendAndConfirmTransaction(connection, tx, [userKeypair], { skipPreflight: false });

    // Insert payment record
    await supabaseAdmin
      .from("user_payments")
      .insert({
        user_wallet: userPub.toBase58(),
        manga_id: String(mangaId),
        chapter_id: String(chapterId),
        transaction_id: signature,
        payment_amount: usdAmount,
        payment_currency: currency,
        paid_at: new Date().toISOString(),
      })
      .then(throwOnError);

    // Record unlock (no expiry by default)
    await supabaseAdmin
      .from("unlocked_manga_chapters")
      .insert({
        user_id: userData.id,
        manga_id: mangaId,
        chapter_id: chapterId,
        transaction_id: signature,
        payment_amount: usdAmount,
        payment_currency: currency,
        unlocked_at: new Date().toISOString(),
      })
      .then(throwOnError);

    return new Response(JSON.stringify({ success: true, signature }), { status: 200 });
  } catch (error: any) {
    console.error("[unlock-manga] Unexpected error:", error);
    return new Response(JSON.stringify({ error: error?.message || "Internal error" }), { status: 500 });
  }
});
