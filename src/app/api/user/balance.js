// src/app/api/user/balance.js
import { supabase } from "../../../services/supabase/supabaseClient";

export async function GET(req) {
  const url = new URL(req.url);
  const wallet_address = url.searchParams.get("wallet_address");

  if (!wallet_address) {
    return new Response(JSON.stringify({ error: "Wallet address required" }), { status: 400 });
  }

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("wallet_address", wallet_address)
    .single();

  if (!user) {
    return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
  }

  const { data, error } = await supabase
    .from("wallet_balances")
    .select("amount")
    .eq("user_id", user.id)
    .eq("chain", "SOL")
    .eq("currency", "SMP")
    .single();

  if (error && error.code !== "PGRST116") { // Ignore "no rows" error
    return new Response(JSON.stringify({ error: "Failed to fetch balance" }), { status: 500 });
  }

  return new Response(JSON.stringify({ balance: data?.amount || 0 }), { status: 200 });
}