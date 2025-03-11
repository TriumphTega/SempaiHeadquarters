import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import fetch from "cross-fetch"; // Ensure installed: npm i cross-fetch
import { AMETHYST_MINT_ADDRESS, SMP_MINT_ADDRESS, RPC_URL } from "@/constants";

// Define allowed token mints
const TOKEN_MINTS = {
  SOL: new PublicKey("So11111111111111111111111111111111111111112"), // Wrapped SOL mint
  JUP: new PublicKey("JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN"), // Jupiter token mint
  AMETHYST: AMETHYST_MINT_ADDRESS,
  SMP: SMP_MINT_ADDRESS,
};

const connection = new Connection(RPC_URL);

export async function POST(req) {
  const body = await req.json();
  const { userAddress, amount, inputMint, outputMint } = body ?? {};

  let user;
  try {
    user = new PublicKey(userAddress);
  } catch (e) {
    return Response.json(
      {
        error: "invalid public key",
        message: `could not parse ${userAddress} as public key: ${e?.message}`,
      },
      { status: 400 }
    );
  }

  // Validate input and output mints
  const validMints = Object.values(TOKEN_MINTS).map((mint) => mint.toString());
  if (!validMints.includes(inputMint) || !validMints.includes(outputMint)) {
    return Response.json(
      {
        error: "invalid token",
        message: "Only SOL, JUP, AMETHYST, and SMP are supported for swapping.",
      },
      { status: 400 }
    );
  }

  if (inputMint === outputMint) {
    return Response.json(
      {
        error: "invalid swap",
        message: "Input and output tokens must be different.",
      },
      { status: 400 }
    );
  }

  // Convert amount to lamports (assuming 6 decimals for SMP/Amethyst, 9 for SOL/JUP)
  const decimals = inputMint === TOKEN_MINTS.SOL.toString() || inputMint === TOKEN_MINTS.JUP.toString() ? 9 : 6;
  const rawAmount = BigInt(Math.floor(amount * 10 ** decimals));

  try {
    // Step 1: Get a quote from Jupiter API
    const quoteResponse = await (
      await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${rawAmount}&slippageBps=50`
      )
    ).json();

    if (quoteResponse.error) {
      return Response.json(
        {
          error: "quote failed",
          message: quoteResponse.error,
        },
        { status: 400 }
      );
    }

    // Step 2: Get the serialized swap transaction
    const swapResponse = await (
      await fetch("https://quote-api.jup.ag/v6/swap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quoteResponse,
          userPublicKey: user.toString(),
          wrapAndUnwrapSol: inputMint === TOKEN_MINTS.SOL.toString() || outputMint === TOKEN_MINTS.SOL.toString(), // Handle SOL wrapping
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: {
            priorityLevelWithMaxLamports: {
              maxLamports: 10000000, // 0.01 SOL max priority fee
              priorityLevel: "high",
            },
          },
        }),
      })
    ).json();

    if (swapResponse.error) {
      return Response.json(
        {
          error: "swap transaction failed",
          message: swapResponse.error,
        },
        { status: 400 }
      );
    }

    const { swapTransaction } = swapResponse;

    // Step 3: Return the serialized transaction
    const transactionBuf = Buffer.from(swapTransaction, "base64");
    return Response.json({
      transaction: transactionBuf.toString("base64"),
    });
  } catch (error) {
    console.error("Swap API error:", error);
    return Response.json(
      {
        error: "internal server error",
        message: error.message,
      },
      { status: 500 }
    );
  }
}