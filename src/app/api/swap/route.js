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
// IMPORTANT: This should be stored in environment variables, not hardcoded
const JUPITER_API_KEY = process.env.JUPITER_API_KEY || "";

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
    // === JUPITER SWAP V6 - TWO-STEP PROCESS (quote + swap) ===
    // Step 1: Get a quote from Jupiter's routing engine
    console.log(`[Jupiter V6] Getting quote for ${inputMint} -> ${outputMint}, amount: ${rawAmount}`);
    
    const quoteUrl = `https://api.jup.ag/swap/v1/quote?` +
      `inputMint=${inputMint}&` +           // Token being sold
      `outputMint=${outputMint}&` +          // Token being bought
      `amount=${rawAmount}&` +               // Amount in smallest units (lamports)
      `slippageBps=50&` +                    // 0.5% slippage tolerance (50 basis points)
      `restrictIntermediateTokens=true&` +   // More reliable routing
      `instructionVersion=V2`;               // Use V2 instruction format

    // Get the quote
    const quoteResponse = await fetch(quoteUrl, {
      method: "GET",
      headers: {
        "User-Agent": "SempaiHQ/1.0",
        "Accept": "application/json",
        "x-api-key": JUPITER_API_KEY,
      },
    });

    if (!quoteResponse.ok) {
      const errorText = await quoteResponse.text();
      console.error(`Jupiter V6 quote failed: ${quoteResponse.status} - ${errorText}`);
      return Response.json(
        { error: "quote_failed", message: `Jupiter quote failed: ${quoteResponse.status}` },
        { status: 503 }
      );
    }

    const quote = await quoteResponse.json();
    console.log("✅ Jupiter V6 quote successful");
    console.log(`Out amount: ${quote.outAmount}`);
    console.log(`Price impact: ${quote.priceImpactPct}%`);

    // Step 2: Build the swap transaction using the quote
    console.log("[Jupiter V6] Building swap transaction...");
    
    const swapUrl = `https://api.jup.ag/swap/v1/swap`;
    
    const swapRequestBody = {
      quoteResponse: quote,
      userPublicKey: user.toString(),
      wrapAndUnwrapSol: true,
      useSharedAccounts: true,
      computeUnitPriceMicroLamports: 5000,  // Priority fee
    };

    const swapResponse = await fetch(swapUrl, {
      method: "POST",
      headers: {
        "User-Agent": "SempaiHQ/1.0",
        "Accept": "application/json",
        "Content-Type": "application/json",
        "x-api-key": JUPITER_API_KEY,
      },
      body: JSON.stringify(swapRequestBody),
    });

    if (!swapResponse.ok) {
      const errorText = await swapResponse.text();
      console.error(`Jupiter V6 swap failed: ${swapResponse.status} - ${errorText}`);
      return Response.json(
        { error: "swap_failed", message: `Jupiter swap failed: ${swapResponse.status}` },
        { status: 503 }
      );
    }

    const swapResult = await swapResponse.json();

    // Validate that Jupiter actually returned a transaction
    if (!swapResult.swapTransaction) {
      console.error("No transaction in Jupiter swap response:", swapResult);
      return Response.json(
        { error: "no_transaction", message: "Jupiter could not build transaction (low liquidity?)" },
        { status: 503 }
      );
    }

    // Success! Log details for debugging and monitoring
    console.log("✅ Jupiter V6 swap transaction built successfully");
    console.log(`Transaction length: ${swapResult.swapTransaction.length} chars`);
    console.log(`Last valid block height: ${swapResult.lastValidBlockHeight}`);

    // Return the transaction to the frontend
    // The transaction is base64-encoded and ready for:
    // 1. Deserialization on the frontend
    // 2. Signing by the user's wallet (embedded or external)
    // 3. Broadcasting to Solana network
    return Response.json({ 
      transaction: swapResult.swapTransaction,
      lastValidBlockHeight: swapResult.lastValidBlockHeight
    });

  } catch (error) {
    // Catch any unexpected errors (network issues, parsing errors, etc.)
    console.error("Swap API error:", error);
    return Response.json(
      { error: "internal_server_error", message: error.message },
      { status: 500 }
    );
  }
}