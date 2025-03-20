import { supabase } from "@/services/supabase/supabaseClient";
import { PublicKey } from "@solana/web3.js";
import { NextResponse } from "next/server";

export async function POST(request, { params }) {
  const chapterId = params.chapterId; // Matches [chapterId] folder
  const walletAddress = request.headers.get("x-wallet-address"); // From client header

  if (!walletAddress) {
    return NextResponse.json({ error: "Wallet not connected" }, { status: 401 });
  }

  // Validate walletAddress as a Solana public key
  let userPublicKey;
  try {
    userPublicKey = new PublicKey(walletAddress);
  } catch (e) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  // Fetch user ID from wallet address
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("wallet_address", walletAddress)
    .single();

  if (userError || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }
  const userId = user.id;

  // Check if already unlocked
  const { data: existing } = await supabase
    .from("unlocked_manga_chapters")
    .select("id")
    .eq("user_id", userId)
    .eq("chapter_id", chapterId)
    .single();

  if (existing) {
    return NextResponse.json({ message: "Chapter already unlocked" }, { status: 200 });
  }

  // Solana Pay setup (assuming USDC at $2.5)
  const recipient = new PublicKey("YOUR_TREASURY_PUBLIC_KEY"); // Replace with real treasury key
  const amount = 2.5; // $2.5 in USDC (adjust decimals: 2.5 * 10^6 for 6 decimals if needed)
  const reference = new PublicKey(userId); // Use user ID as reference

  const url = `solana:${recipient.toBase58()}?amount=${amount}&reference=${reference.toBase58()}&currency=USDC`; // Fixed typo

  // Return payment URL for client to handle
  return NextResponse.json(
    { paymentUrl: url, message: "Scan to pay $2.5 in USDC" },
    { status: 200 }
  );

  // Production flow (after client confirms tx):
  /*
  const { error } = await supabase
    .from("unlocked_manga_chapters")
    .insert({
      user_id: userId,
      chapter_id: chapterId,
      manga_id: (await supabase.from("manga_chapters").select("manga_id").eq("id", chapterId).single()).data?.manga_id,
      transaction_id: "ACTUAL_TX_SIGNATURE",
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Chapter unlocked successfully" }, { status: 200 });
  */
}