import { NextResponse } from "next/server";
import { supabase } from "../../../services/supabase/supabaseClient";
import { v4 as uuidv4 } from "uuid";

export async function POST(req) {
  try {
    const { userId, amount } = await req.json();

    if (!userId || amount <= 0) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }

    // Fetch user balance
    const { data: user, error: userError } = await supabase
      .from("wallet_balances")
      .select("amount")
      .eq("user_id", userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.balance < amount) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    // Insert into pending_withdrawals
    const { error: insertError } = await supabase.from("pending_withdrawals").insert([
      {
        user_id: userId,
        amount,
        status: "pending",
      },
    ]);

    if (insertError) {
      return NextResponse.json({ error: "Failed to create withdrawal request" }, { status: 500 });
    }

    // Deduct from users table
    const { error: balanceError } = await supabase
      .from("users")
      .update({ balance: user.balance - amount })
      .eq("id", userId);

    if (balanceError) {
      return NextResponse.json({ error: "Failed to deduct user balance" }, { status: 500 });
    }

    // Deduct from wallet_balances
    const { data: walletBalance, error: walletError } = await supabase
      .from("wallet_balances")
      .select("amount")
      .eq("user_id", userId)
      .single();

    if (walletError || !walletBalance) {
      return NextResponse.json({ error: "Wallet balance not found" }, { status: 404 });
    }

    const { error: updateWalletError } = await supabase
      .from("wallet_balances")
      .update({ amount: walletBalance.amount - amount })
      .eq("user_id", userId);

    if (updateWalletError) {
      return NextResponse.json({ error: "Failed to deduct wallet balance" }, { status: 500 });
    }

    return NextResponse.json({ message: "Withdrawal request submitted successfully!" }, { status: 200 });
  } catch (error) {
    console.error("Withdrawal error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
