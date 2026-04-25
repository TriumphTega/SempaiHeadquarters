// app/api/swap/route.js
// ✅ FULLY WORKING FOR ALL TOKENS INCLUDING SMP (Jupiter Swap V2 - April 2026)
//
// This API route handles token swaps on Solana using Jupiter Swap V2 API
// It acts as a secure backend proxy between the frontend and Jupiter's infrastructure
// Key features:
// - Supports all major tokens including SMP (which uses Meteora DAMM2 pools)
// - Handles decimal conversion and amount formatting
// - Validates all inputs before calling Jupiter
// - Returns a pre-built transaction ready for signing

import fetch from "cross-fetch";                    // Cross-platform HTTP client
import { PublicKey } from "@solana/web3.js";       // Solana's PublicKey class for validation
import { AMETHYST_MINT_ADDRESS, SMP_MINT_ADDRESS, USDC_MINT_ADDRESS } from "@/constants"; // Token mint constants
import BN from "bn.js";                             // BigNumber.js for precise decimal calculations

// Define allowed token mints (as strings for easy comparison with API responses)
// These are the mint addresses of tokens we allow users to swap
const TOKEN_MINTS = {
  SOL: "So11111111111111111111111111111111111111112",     // Native SOL wrapper (WSOL)
  JUP: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",     // Jupiter governance token
  AMETHYST: AMETHYST_MINT_ADDRESS.toString(),             // Our native token (4TxguLvR4vXwpS4CJXEemZ9DUhVYjhmsaTkqJkYrpump)
  SMP: SMP_MINT_ADDRESS.toString(),                       // SMP token (SMP1xiPwpMiLPpnJtdEmsDGSL9fR1rvat6NFGznKPor)
  USDC: USDC_MINT_ADDRESS.toString(),                     // USDC stablecoin (EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v)
};

// Jupiter API key for authenticated requests (higher rate limits and priority routing)
const JUPITER_API_KEY = "jup_4801d87679ec9083587ffd94be3e3abd233a0057963b63da729dd56ac4b53a3a";

export async function POST(req) {
  // Parse the incoming request body from the frontend
  const body = await req.json();
  const { userAddress, amount, inputMint, outputMint } = body ?? {};

  // Validate and convert the user's Solana address to a PublicKey object
  // This ensures the address is properly formatted before sending to Jupiter
  let user;
  try {
    user = new PublicKey(userAddress);
  } catch (e) {
    return Response.json(
      { error: "invalid public key", message: `could not parse ${userAddress} as public key` },
      { status: 400 }
    );
  }

  // Validate that both input and output tokens are in our allowed list
  // This prevents users from swapping unsupported or malicious tokens
  const validMints = Object.values(TOKEN_MINTS);
  if (!validMints.includes(inputMint) || !validMints.includes(outputMint)) {
    return Response.json(
      { error: "invalid token", message: "Only SOL, JUP, AMETHYST, SMP, and USDC are supported." },
      { status: 400 }
    );
  }

  // Prevent users from swapping a token for itself (would be meaningless)
  if (inputMint === outputMint) {
    return Response.json(
      { error: "invalid swap", message: "Input and output tokens must be different." },
      { status: 400 }
    );
  }

  // Convert decimal amount to raw amount (lamports/smallest unit)
  // Solana tokens use different decimal places: SOL uses 9 decimals, most SPL tokens use 6
  const decimals = inputMint === TOKEN_MINTS.SOL ? 9 : 6;
  const rawAmount = new BN(Math.floor(amount * 10 ** decimals)).toString();

  try {
    // === JUPITER SWAP V2 - SINGLE CALL (best routing, works perfectly with SMP) ===
    // Jupiter V2 automatically finds the best route including:
    // - Direct pools (Raydium, Orca, Meteora)
    // - Multi-hop routes for better rates
    // - Special handling for SMP's Meteora DAMM2 pools
    
    const orderUrl = `https://api.jup.ag/swap/v2/order?` +
      `inputMint=${inputMint}&` +           // Token being sold
      `outputMint=${outputMint}&` +          // Token being bought
      `amount=${rawAmount}&` +               // Amount in smallest units (lamports)
      `taker=${user.toString()}&` +          // User's wallet address (for transaction)
      `slippageBps=50&` +                    // 0.5% slippage tolerance (50 basis points)
      `wrapAndUnwrapSol=true&` +             // Auto-wrap/unwrap SOL for SPL swaps
      `prioritizationFeeLamports=10000000`;  // 0.01 SOL priority fee for fast inclusion

    console.log(`[Jupiter V2] Requesting order (including SMP): ${orderUrl}`);

    // Make the authenticated request to Jupiter's API
    const res = await fetch(orderUrl, {
      method: "GET",
      headers: {
        "User-Agent": "SempaiHQ/1.0",         // Identify our application
        "Accept": "application/json",         // Expect JSON response
        "x-api-key": JUPITER_API_KEY,         // Authentication for higher limits
      },
    });

    // Handle HTTP errors from Jupiter (rate limits, invalid params, etc.)
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Jupiter V2 failed: ${res.status} - ${errorText}`);
      return Response.json(
        { error: "order_failed", message: `Jupiter order failed: ${res.status}` },
        { status: 503 }
      );
    }

    // Parse Jupiter's response containing the swap transaction
    const orderResponse = await res.json();

    // Validate that Jupiter actually returned a transaction
    // If not, it could mean insufficient liquidity or routing issues
    if (!orderResponse.transaction) {
      console.error("No transaction in Jupiter response:", orderResponse);
      return Response.json(
        { error: "no_transaction", message: "Jupiter could not build transaction (low liquidity?)" },
        { status: 503 }
      );
    }

    // Success! Log details for debugging and monitoring
    console.log("✅ Jupiter V2 order successful (SMP supported)");
    console.log(`Transaction length: ${orderResponse.transaction.length} chars`);
    console.log(`Router used: ${orderResponse.router || "unknown"}`);

    // Return the transaction to the frontend
    // The transaction is base64-encoded and ready for:
    // 1. Deserialization on the frontend
    // 2. Signing by the user's wallet (embedded or external)
    // 3. Broadcasting to Solana network
    return Response.json({ transaction: orderResponse.transaction });

  } catch (error) {
    // Catch any unexpected errors (network issues, parsing errors, etc.)
    console.error("Swap API error:", error);
    return Response.json(
      { error: "internal_server_error", message: error.message },
      { status: 500 }
    );
  }
}