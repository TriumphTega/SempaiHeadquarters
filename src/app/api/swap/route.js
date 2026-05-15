// app/api/swap/route.js
// ✅ Jupiter for normal tokens + smart fallback for SMP (the essence of your dApp)

import fetch from "cross-fetch";
import { PublicKey, Connection } from "@solana/web3.js";
import { AMETHYST_MINT_ADDRESS, SMP_MINT_ADDRESS, USDC_MINT_ADDRESS, SKR_MINT_ADDRESS, RPC_URL } from "@/constants";
import BN from "bn.js";

const TOKEN_MINTS = {
  SOL: "So11111111111111111111111111111111111111112",
  JUP: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  USDC: USDC_MINT_ADDRESS.toString(),
  AMETHYST: AMETHYST_MINT_ADDRESS.toString(),
  SMP: SMP_MINT_ADDRESS.toString(),
  SKR: SKR_MINT_ADDRESS.toString(),
};

const connection = new Connection(RPC_URL, "confirmed");

const isSMPPair = (inputMint, outputMint) => 
  inputMint === TOKEN_MINTS.SMP || outputMint === TOKEN_MINTS.SMP;

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const { userAddress, amount, inputMint, outputMint } = body ?? {};

  let user;
  try { user = new PublicKey(userAddress); } catch {
    return Response.json({ error: "invalid public key" }, { status: 400 });
  }

  const validMints = Object.values(TOKEN_MINTS);
  if (!validMints.includes(inputMint) || !validMints.includes(outputMint)) {
    return Response.json({ error: "invalid token" }, { status: 400 });
  }
  if (inputMint === outputMint) {
    return Response.json({ error: "invalid swap" }, { status: 400 });
  }

  // SPECIAL CASE: SMP is the essence of the dApp → use working jup.ag link
  if (isSMPPair(inputMint, outputMint)) {
    const sellMint = inputMint;
    const buyMint = outputMint;
    const jupUrl = `https://jup.ag/?sell=${sellMint}&buy=${buyMint}`;
    
    return Response.json({
      type: "jup_redirect",
      url: jupUrl,
      message: "SMP swap opened in Jupiter (best route for this token)"
    });
  }

  // Normal tokens → Jupiter on-chain swap
  try {
    return await handleJupiterSwap(userAddress, amount, inputMint, outputMint);
  } catch (error) {
    console.error("Swap API error:", error);
    return Response.json({ error: "internal_server_error", message: error.message }, { status: 500 });
  }
}

async function handleJupiterSwap(userAddress, amount, inputMint, outputMint) {
  const decimals = inputMint === TOKEN_MINTS.SOL ? 9 : 6;
  const rawAmount = new BN(Math.floor(amount * 10 ** decimals)).toString();

  const slippageBps = 100;

  const quoteUrl = `https://api.jup.ag/swap/v1/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${rawAmount}&slippageBps=${slippageBps}&restrictIntermediateTokens=false&onlyDirectRoutes=false&instructionVersion=V2`;

  const quoteResponse = await fetch(quoteUrl);
  if (!quoteResponse.ok) throw new Error(`Jupiter quote failed: ${await quoteResponse.text()}`);

  const quote = await quoteResponse.json();

  const swapResponse = await fetch("https://api.jup.ag/swap/v1/swap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: userAddress,
      wrapAndUnwrapSol: true,
      computeUnitPriceMicroLamports: 8000,
    }),
  });

  if (!swapResponse.ok) throw new Error("Jupiter swap failed");

  const swapResult = await swapResponse.json();

  return Response.json({
    transaction: swapResult.swapTransaction,
    lastValidBlockHeight: swapResult.lastValidBlockHeight
  });
}