import { supabase } from "@/services/supabase/supabaseClient";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { RPC_URL, SKR_MINT_ADDRESS } from "@/constants";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

const TARGET_WALLET = "62PPSRhAk6hdn85MUoYAnUDisswZRfos68Zqf7N1QLkr";
const USDC_MINT_ADDRESS = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SMP_MINT_ADDRESS = "SMP1xiPwpMiLPpnJtdEmsDGSL9fR1rvat6NFGznKPor";
const SKR_MINT_ADDRESS_STRING = SKR_MINT_ADDRESS.toString();
const connection = new Connection(RPC_URL, "confirmed");

const fetchSolPrice = async () => {
  try {
    const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
    const data = await response.json();
    return data.solana.usd;
  } catch (error) {
    console.error("Error fetching SOL price:", error);
    return null;
  }
};

const fetchSmpPrice = async () => {
  try {
    const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=smp-token-id&vs_currencies=usd");
    const data = await response.json();
    return data["smp-token-id"]?.usd || null;
  } catch (error) {
    console.error("Error fetching SMP price:", error);
    return null;
  }
};

const fetchSkrPrice = async () => {
  try {
    const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=skr-token-id&vs_currencies=usd");
    const data = await response.json();
    return data["skr-token-id"]?.usd || null;
  } catch (error) {
    console.error("Error fetching SKR price:", error);
    return null;
  }
};

export async function POST(req) {
  try {
    const { user_id, novel_id, plan_type, signature, userPublicKey, amount, currency, solPrice, smpPrice, skrPrice } = await req.json();
    console.log("Request Body:", { user_id, novel_id, plan_type, signature, userPublicKey, amount, currency, solPrice, smpPrice, skrPrice });

    // Define pricing tiers
    const pricingTiers = {
      blue: { price: 1, chapters: 3, name: "Blue" },
      iron: { price: 2, chapters: 6, name: "Iron" },
      silver: { price: 3, chapters: 10, name: "Silver" },
      gold: { price: 5, chapters: 999, name: "Gold" }, // 999 = unlimited
    };

    const tier = pricingTiers[plan_type];
    if (!tier) {
      console.log("Validation failed: Invalid plan type:", plan_type);
      return new Response(JSON.stringify({ error: "Invalid plan type" }), { status: 400 });
    }

    // Support SMP and SKR currencies
    if (currency !== "SMP" && currency !== "SKR") {
      console.log("Validation failed: Only SMP and SKR supported");
      return new Response(JSON.stringify({ error: "Only SMP and SKR supported" }), { status: 400 });
    }

    let expectedAmount, decimals, mint, tokenPrice;

    if (currency === "SMP") {
      if (!smpPrice) {
        console.log("Validation failed: SMP price not provided");
        return new Response(JSON.stringify({ error: "SMP price not provided" }), { status: 400 });
      }
      expectedAmount = tier.price / smpPrice;
      decimals = 9;
      mint = SMP_MINT_ADDRESS;
      tokenPrice = smpPrice;
      console.log("SMP expected amount:", expectedAmount);
    } else if (currency === "SKR") {
      if (!skrPrice) {
        console.log("Validation failed: SKR price not provided");
        return new Response(JSON.stringify({ error: "SKR price not provided" }), { status: 400 });
      }
      expectedAmount = tier.price / skrPrice;
      decimals = 9;
      mint = SKR_MINT_ADDRESS_STRING;
      tokenPrice = skrPrice;
      console.log("SKR expected amount:", expectedAmount);
    }

    const tolerance = 0.02;
    const minAmount = amount * (1 - tolerance);
    const maxAmount = amount * (1 + tolerance);
    console.log("Expected amount range (with tolerance):", minAmount, "-", maxAmount);

    let tx = null;
    for (let i = 0; i < 3; i++) {
      tx = await connection.getTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
      if (tx) break;
      console.log(`Attempt ${i + 1}: Transaction not found yet, retrying...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    if (!tx) {
      console.log("Validation failed: Transaction not found after retries:", signature);
      return new Response(JSON.stringify({ error: "Invalid transaction: not found" }), { status: 400 });
    }

    if (!tx.meta || tx.meta.err) {
      console.log("Validation failed: Transaction meta error:", tx.meta?.err);
      return new Response(JSON.stringify({ error: "Invalid transaction: failed on chain" }), { status: 400 });
    }

    const senderIndex = tx.transaction.message.accountKeys.findIndex(
      (key) => key.toBase58() === userPublicKey
    );
    const receiverIndex = tx.transaction.message.accountKeys.findIndex(
      (key) => key.toBase58() === TARGET_WALLET
    );

    if (senderIndex === -1 || receiverIndex === -1) {
      console.log("Validation failed: Sender or receiver not found in transaction accounts:", {
        senderIndex,
        receiverIndex,
      });
      return new Response(JSON.stringify({ error: "Invalid transaction: sender or receiver missing" }), { status: 400 });
    }

    const preTokenBalances = tx.meta.preTokenBalances?.find(b => b.mint === mint && b.accountIndex === senderIndex);
    const postTokenBalances = tx.meta.postTokenBalances?.find(b => b.mint === mint && b.accountIndex === receiverIndex);
    if (!preTokenBalances || !postTokenBalances) {
      console.log("Validation failed: Token balances not found:", { preTokenBalances, postTokenBalances });
      return new Response(JSON.stringify({ error: "Invalid token transfer" }), { status: 400 });
    }

    const amountTransferred = (preTokenBalances.uiTokenAmount.uiAmount - (postTokenBalances.uiTokenAmount.uiAmount || 0)) ||
                       (postTokenBalances.uiTokenAmount.uiAmount / (10 ** decimals));
    console.log("Token transferred:", amountTransferred);

    console.log("Comparing amount transferred:", amountTransferred, "to expected range:", minAmount, "-", maxAmount);
    if (amountTransferred < minAmount || amountTransferred > maxAmount) {
      console.log("Validation failed: Incorrect payment amount:", { expected: amount, actual: amountTransferred });
      return new Response(JSON.stringify({ error: "Incorrect payment amount" }), { status: 400 });
    }

    if (tx.transaction.message.accountKeys[receiverIndex].toBase58() !== TARGET_WALLET) {
      console.log("Validation failed: Invalid recipient:", tx.transaction.message.accountKeys[receiverIndex].toBase58());
      return new Response(JSON.stringify({ error: "Invalid recipient" }), { status: 400 });
    }

    // Check if novel has at least one published chapter
    const { data: novelData, error: novelError } = await supabase
      .from("novels")
      .select("user_id, chaptertitles")
      .eq("id", novel_id)
      .single();

    if (novelError || !novelData) {
      console.log("Validation failed: Novel not found:", novelError);
      return new Response(JSON.stringify({ error: "Novel not found" }), { status: 404 });
    }

    if (!novelData.chaptertitles || novelData.chaptertitles.length === 0) {
      console.log("Validation failed: Novel has no published chapters");
      return new Response(JSON.stringify({ error: "Benefactor access requires at least one published chapter" }), { status: 400 });
    }

    // Check if user already has benefactor access
    const { data: existingAccess } = await supabase
      .from("benefactor_early_access")
      .select("*")
      .eq("benefactor_wallet", userPublicKey)
      .eq("novel_id", novel_id)
      .eq("is_active", true)
      .single();

    if (existingAccess) {
      console.log("Validation failed: User already has benefactor access");
      return new Response(JSON.stringify({ error: "You already have benefactor access to this novel" }), { status: 400 });
    }

    // Record benefactor access
    const expires_at = tier.chapters === 999 ? null : new Date(Date.now() + (14 * 24 * 60 * 60 * 1000)).toISOString();

    const benefactorData = {
      benefactor_wallet: userPublicKey,
      novel_id,
      chapters_unlocked: tier.chapters,
      chapters_remaining: tier.chapters,
      payment_amount: tier.price,
      payment_currency: currency,
      transaction_id: signature,
      paid_at: new Date().toISOString(),
      expires_at,
      is_active: true,
    };

    const { data: benefactorInsert, error: benefactorError } = await supabase
      .from("benefactor_early_access")
      .insert(benefactorData)
      .select()
      .single();

    if (benefactorError) throw new Error(`Failed to record benefactor access: ${benefactorError.message}`);

    // Update user's benefactor status
    const { data: currentUserData, error: userError } = await supabase
      .from("users")
      .select("is_benefactor, benefactor_level, total_benefactor_payments")
      .eq("id", user_id)
      .single();

    if (!userError && currentUserData) {
      const newTotalPayments = (currentUserData.total_benefactor_payments || 0) + tier.price;
      let newLevel = currentUserData.benefactor_level || 'bronze';

      // Determine benefactor level based on total payments
      if (newTotalPayments >= 50) {
        newLevel = 'platinum';
      } else if (newTotalPayments >= 20) {
        newLevel = 'gold';
      } else if (newTotalPayments >= 10) {
        newLevel = 'silver';
      } else {
        newLevel = 'bronze';
      }

      const { error: updateError } = await supabase
        .from("users")
        .update({
          is_benefactor: true,
          benefactor_level: newLevel,
          benefactor_since: currentUserData.benefactor_since || new Date().toISOString(),
          total_benefactor_payments: newTotalPayments
        })
        .eq("id", user_id);

      if (updateError) {
        console.warn("[benefactor-payment] Failed to update benefactor status:", updateError.message);
      } else {
        console.log("[benefactor-payment] Updated benefactor status:", { level: newLevel, total: newTotalPayments });
      }
    }

    console.log("Benefactor payment successful:", benefactorData);
    return new Response(
      JSON.stringify({
        message: "Benefactor access activated successfully!",
        plan_type,
        chapters_unlocked: tier.chapters,
        expires_at,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("API Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
