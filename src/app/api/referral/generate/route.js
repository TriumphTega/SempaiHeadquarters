// src/app/api/referral/generate/route.js
import { supabase } from "../../../../services/supabase/supabaseClient";
import { v4 as uuidv4 } from "uuid";

export async function POST(req) {
  const { wallet_address } = await req.json();

  if (!wallet_address) {
    return new Response(JSON.stringify({ error: "Wallet address required" }), { status: 400 });
  }

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, referral_code")
    .eq("wallet_address", wallet_address)
    .single();

  if (userError || !user) {
    return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
  }

  if (user.referral_code) {
    return new Response(JSON.stringify({ referral_code: user.referral_code }), { status: 200 });
  }

  const referralCode = uuidv4().slice(0, 8);
  const { error: updateError } = await supabase
    .from("users")
    .update({ referral_code: referralCode })
    .eq("id", user.id);

  if (updateError) {
    return new Response(JSON.stringify({ error: "Failed to generate referral code" }), { status: 500 });
  }

  return new Response(JSON.stringify({ referral_code: referralCode }), { status: 200 });
}