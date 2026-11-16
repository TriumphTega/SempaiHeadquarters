import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/app/api/supabaseAdmin";
import { requireUser } from "@/app/api/_lib/guard";

export async function POST(request) {
  const { user: caller, response: denied } = await requireUser(request);
  if (denied) return denied;
  try {
    const { oldWalletAddress, newWalletAddress, email, userId } = await request.json();

    if (!oldWalletAddress || !newWalletAddress || !email || !userId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (caller.id !== userId) {
      return NextResponse.json({ error: "You can only move your own account" }, { status: 403 });
    }

    // Verify the user owns the old wallet
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, wallet_address")
      .eq("id", userId)
      .eq("wallet_address", oldWalletAddress)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: "User verification failed" },
        { status: 403 }
      );
    }

    // Check if new wallet is already in use
    const { data: existingWallet, error: walletCheckError } = await supabase
      .from("users")
      .select("id")
      .eq("wallet_address", newWalletAddress)
      .single();

    if (existingWallet) {
      return NextResponse.json(
        { error: "New wallet address is already registered" },
        { status: 409 }
      );
    }

    // Update user with new wallet and email
    const { error: updateError } = await supabase
      .from("users")
      .update({
        wallet_address: newWalletAddress,
        email: email,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update wallet" },
        { status: 500 }
      );
    }

    // Log the migration
    const { error: logError } = await supabase
      .from("wallet_events")
      .insert([{
        wallet_address: oldWalletAddress,
        event_type: "wallet_migration",
        event_details: `Migrated from ${oldWalletAddress} to ${newWalletAddress}`,
        source_user_id: userId,
        destination_user_id: userId,
        timestamp: new Date().toISOString(),
      }]);

    return NextResponse.json({
      success: true,
      message: "Wallet migrated successfully",
      newWalletAddress,
      email,
    });
  } catch (error) {
    console.error("Wallet migration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
