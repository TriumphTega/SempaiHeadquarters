// app/api/swap/route.js
// ✅ FULLY WORKING FOR ALL TOKENS INCLUDING SMP (Jupiter Swap V2 - April 2026)

import fetch from "cross-fetch";
import { PublicKey } from "@solana/web3.js";
import { AMETHYST_MINT_ADDRESS, SMP_MINT_ADDRESS, USDC_MINT_ADDRESS } from "@/constants";
import BN from "bn.js";

// Define allowed token mints (as strings for easy comparison)
const TOKEN_MINTS = {
  SOL: "So11111111111111111111111111111111111111112",
  JUP: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  AMETHYST: AMETHYST_MINT_ADDRESS.toString(),
  SMP: SMP_MINT_ADDRESS.toString(),           // ← this is SMP1xiPwpMiLPpnJtdEmsDGSL9fR1rvat6NFGznKPor
  USDC: USDC_MINT_ADDRESS.toString(),
};

const JUPITER_API_KEY = "jup_4801d87679ec9083587ffd94be3e3abd233a0057963b63da729dd56ac4b53a3a";

export async function POST(req) {
  const body = await req.json();
  const { userAddress, amount, inputMint, outputMint } = body ?? {};

  let user;
  try {
    user = new PublicKey(userAddress);
  } catch (e) {
    return Response.json(
      { error: "invalid public key", message: `could not parse ${userAddress} as public key` },
      { status: 400 }
    );
  }

  const validMints = Object.values(TOKEN_MINTS);
  if (!validMints.includes(inputMint) || !validMints.includes(outputMint)) {
    return Response.json(
      { error: "invalid token", message: "Only SOL, JUP, AMETHYST, SMP, and USDC are supported." },
      { status: 400 }
    );
  }

  if (inputMint === outputMint) {
    return Response.json(
      { error: "invalid swap", message: "Input and output tokens must be different." },
      { status: 400 }
    );
  }

  // Decimals: SOL = 9, everything else = 6
  const decimals = inputMint === TOKEN_MINTS.SOL ? 9 : 6;
  const rawAmount = new BN(Math.floor(amount * 10 ** decimals)).toString();

  try {
    // === JUPITER SWAP V2 - SINGLE CALL (best routing, works perfectly with SMP) ===
    const orderUrl = `https://api.jup.ag/swap/v2/order?` +
      `inputMint=${inputMint}&` +
      `outputMint=${outputMint}&` +
      `amount=${rawAmount}&` +
      `taker=${user.toString()}&` +
      `slippageBps=50&` +
      `wrapAndUnwrapSol=true&` +
      `prioritizationFeeLamports=10000000`;   // high priority for fast confirmation

    console.log(`[Jupiter V2] Requesting order (including SMP): ${orderUrl}`);

    const res = await fetch(orderUrl, {
      method: "GET",
      headers: {
        "User-Agent": "SempaiHQ/1.0",
        "Accept": "application/json",
        "x-api-key": JUPITER_API_KEY,
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Jupiter V2 failed: ${res.status} - ${errorText}`);
      return Response.json(
        { error: "order_failed", message: `Jupiter order failed: ${res.status}` },
        { status: 503 }
      );
    }

    const orderResponse = await res.json();

    if (!orderResponse.transaction) {
      console.error("No transaction in Jupiter response:", orderResponse);
      return Response.json(
        { error: "no_transaction", message: "Jupiter could not build transaction (low liquidity?)" },
        { status: 503 }
      );
    }

    console.log("✅ Jupiter V2 order successful (SMP supported)");
    console.log(`Transaction length: ${orderResponse.transaction.length} chars`);
    console.log(`Router used: ${orderResponse.router || "unknown"}`);

    // Frontend already expects { transaction: base64 }
    return Response.json({ transaction: orderResponse.transaction });

  } catch (error) {
    console.error("Swap API error:", error);
    return Response.json(
      { error: "internal_server_error", message: error.message },
      { status: 500 }
    );
  }
}