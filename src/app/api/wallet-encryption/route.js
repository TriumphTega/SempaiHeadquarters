import { NextResponse } from "next/server";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { supabaseAdmin } from "../supabaseAdmin";

/*
 * Wallet key encrypt / decrypt proxy (Phase 0 lockdown).
 *
 *  · encrypt — anyone (reveals nothing)
 *  · decrypt — only a signed-in caller (Authorization: Bearer <access token>)
 *    decrypting a key whose wallet address is theirs. Ownership is proven
 *    from the plaintext: the secret key must genuinely derive its address,
 *    and that address must be one of the caller's wallets.
 *
 * WALLET_DECRYPT_REQUIRE_AUTH=false temporarily allows anonymous decrypts
 * (only while older mobile builds that still call this route are updating).
 */
const functionName = process.env.NEXT_PUBLIC_WALLET_FUNCTION || "wallet-encryption";
const requireAuth = process.env.WALLET_DECRYPT_REQUIRE_AUTH !== "false";
const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.NEXT_PUBLIC_SITE_URL || "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const reply = (body, status = 200) => NextResponse.json(body, { status, headers: corsHeaders });

const addressOfSecret = (plain) => {
  try {
    const t = String(plain || "").trim();
    const sk = t.startsWith("[") ? Uint8Array.from(JSON.parse(t)) : bs58.decode(t);
    if (sk.length !== 64) return null;
    // fromSecretKey validates that the seed derives the embedded public key.
    return Keypair.fromSecretKey(sk).publicKey.toBase58();
  } catch {
    return null;
  }
};

export async function OPTIONS() {
  return new NextResponse("ok", { status: 200, headers: corsHeaders });
}

export async function POST(request) {
  try {
    const { action, data } = await request.json();
    if (!["encrypt", "decrypt"].includes(action) || typeof data !== "string" || !data) {
      return reply({ error: "Invalid payload" }, 400);
    }

    let userId = null;
    let userToken = "";
    if (action === "decrypt") {
      const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
      if (!token) return reply({ error: "Sign in to unlock your wallet" }, 401);
      const { data: auth } = await supabaseAdmin.auth.getUser(token);
      userId = auth?.user?.id || null;
      if (!userId) return reply({ error: "Your session has expired — please sign in again" }, 401);
      userToken = token;
    }

    // Decrypt runs AS THE SIGNED-IN USER (the wallet function no longer
    // accepts the server key for decryption); encrypt may use the server key.
    const { data: result, error } = await supabaseAdmin.functions.invoke(functionName, {
      body: { action, data },
      ...(userToken ? { headers: { Authorization: `Bearer ${userToken}` } } : {}),
    });
    if (error) {
      console.error("[Wallet Encryption] function error:", error.message);
      return reply({ error: "Wallet service unavailable" }, 502);
    }
    if (typeof result?.result !== "string") return reply({ error: "Invalid function response" }, 502);

    if (action === "decrypt") {
      const address = addressOfSecret(result.result);
      const { data: rows } = await supabaseAdmin.from("user_wallets").select("address").eq("user_id", userId);
      const owned = new Set((rows || []).map((r) => r.address));
      if (!address || !owned.has(address)) {
        console.warn("[Wallet Encryption] refused decrypt: not the caller's wallet", { userId });
        return reply({ error: "This wallet does not belong to your account" }, 403);
      }
    }

    return reply({ result: result.result });
  } catch (e) {
    console.error("[Wallet Encryption] server error:", e?.message);
    return reply({ error: "Server error" }, 500);
  }
}
