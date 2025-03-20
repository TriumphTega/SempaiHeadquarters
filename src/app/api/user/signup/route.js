// src/app/api/user/signup/route.js
import { supabase } from "../../../../services/supabase/supabaseClient";

export async function POST(req) {
  const { wallet_address, referral_code } = await req.json();

  if (!wallet_address) {
    return new Response(JSON.stringify({ error: "Wallet address required" }), { status: 400 });
  }

  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("wallet_address", wallet_address)
    .single();

  if (existingUser) {
    return new Response(JSON.stringify({ error: "User already exists" }), { status: 400 });
  }

  let inviterId = null;
  if (referral_code) {
    const { data: inviter, error: inviterError } = await supabase
      .from("users")
      .select("id")
      .eq("referral_code", referral_code)
      .single();

    if (inviterError || !inviter) {
      return new Response(JSON.stringify({ error: "Invalid referral code" }), { status: 400 });
    }
    inviterId = inviter.id;
  }

  const { data: newUser, error: insertError } = await supabase
    .from("users")
    .insert({ wallet_address, referred_by: referral_code })
    .select("id")
    .single();

  if (insertError || !newUser) {
    return new Response(JSON.stringify({ error: "Failed to create user" }), { status: 500 });
  }

  if (inviterId) {
    const REWARD_AMOUNT = 10; // 10 tokens as an example
    const CHAIN = "SOL";
    const CURRENCY = "SMP";
    const DECIMALS = 6;

    // Check and update inviter's balance
    const { data: inviterBalance } = await supabase
      .from("wallet_balances")
      .select("amount")
      .eq("user_id", inviterId)
      .eq("chain", CHAIN)
      .eq("currency", CURRENCY)
      .single();

    if (inviterBalance) {
      await supabase
        .from("wallet_balances")
        .update({ amount: inviterBalance.amount + REWARD_AMOUNT })
        .eq("user_id", inviterId)
        .eq("chain", CHAIN)
        .eq("currency", CURRENCY);
    } else {
      await supabase
        .from("wallet_balances")
        .insert({
          user_id: inviterId,
          chain: CHAIN,
          currency: CURRENCY,
          amount: REWARD_AMOUNT,
          decimals: DECIMALS,
          wallet_address,
        });
    }

    // Set invitee's balance
    await supabase
      .from("wallet_balances")
      .insert({
        user_id: newUser.id,
        chain: CHAIN,
        currency: CURRENCY,
        amount: REWARD_AMOUNT,
        decimals: DECIMALS,
        wallet_address,
      });

    await supabase
      .from("referrals")
      .insert({ inviter_id: inviterId, invitee_id: newUser.id, reward_claimed: true });
  }

  return new Response(JSON.stringify({ message: "User created", user_id: newUser.id }), { status: 201 });
}