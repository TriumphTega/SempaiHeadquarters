import { NextResponse } from "next/server";
import { supabase } from "../../../services/supabase/supabaseClient";
import { supabaseAdmin } from "../supabaseAdmin";

/**
 * POST /api/link-wallet-to-email
 * Links an existing wallet-only account to an authenticated email account
 * This allows decentralized users to add email for account recovery
 */
export async function POST(request) {
  try {
    const { walletAddress, authUserId, signature } = await request.json();

    // Validate input
    if (!walletAddress || !authUserId) {
      return NextResponse.json(
        { error: "Missing required fields: walletAddress, authUserId" },
        { status: 400 }
      );
    }

    // Get auth user details
    const { data: authUserData, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(authUserId);
    
    if (authUserError || !authUserData?.user) {
      return NextResponse.json(
        { error: "Invalid auth user ID" },
        { status: 403 }
      );
    }

    const authUser = authUserData.user;
    const email = authUser.email;

    console.log(`🔗 Linking wallet ${walletAddress} to email ${email} (${authUserId})`);

    // Check if wallet exists in user_wallets
    const { data: existingWallet, error: walletCheckError } = await supabase
      .from("user_wallets")
      .select("user_id, address")
      .eq("address", walletAddress)
      .maybeSingle();

    if (walletCheckError) {
      console.error("Error checking wallet:", walletCheckError);
      return NextResponse.json(
        { error: "Failed to check wallet status" },
        { status: 500 }
      );
    }

    // Check if wallet-only user exists
    const { data: walletOnlyUser, error: userCheckError } = await supabase
      .from("users")
      .select("*")
      .eq("wallet_address", walletAddress)
      .maybeSingle();

    if (!walletOnlyUser) {
      return NextResponse.json(
        { error: "No account found for this wallet address" },
        { status: 404 }
      );
    }

    const oldUserId = walletOnlyUser.id;

    // Check if auth user already has data
    const { data: authUserExists, error: authUserCheckError } = await supabase
      .from("users")
      .select("id")
      .eq("id", authUserId)
      .maybeSingle();

    if (authUserExists) {
      return NextResponse.json(
        { error: "This email account already has data. Cannot merge accounts automatically. Please contact support." },
        { status: 409 }
      );
    }

    console.log(`✅ Wallet-only user found: ${oldUserId}, linking to auth user: ${authUserId}`);

    // Step 1: Temporarily change old user's email and wallet to avoid conflicts
    const tempEmail = `temp_${oldUserId}@migration.temp`;
    const tempWallet = `TEMP_${oldUserId}`;
    
    await supabase
      .from("users")
      .update({ 
        email: tempEmail, 
        wallet_address: tempWallet 
      })
      .eq("id", oldUserId);

    console.log("✅ Temporarily changed old user identifiers");

    // Step 2: Create new user row with auth user ID
    const { error: insertNewUserError } = await supabase
      .from("users")
      .insert({
        id: authUserId,
        email: email,
        wallet_address: walletAddress,
        name: walletOnlyUser.name || email.split("@")[0],
        image: authUser.user_metadata?.avatar_url || walletOnlyUser.image,
        balance: walletOnlyUser.balance || 0,
        weekly_points: walletOnlyUser.weekly_points || 0,
        isWriter: walletOnlyUser.isWriter || false,
        isArtist: walletOnlyUser.isArtist || false,
        isSuperuser: walletOnlyUser.isSuperuser || false,
        x_account: walletOnlyUser.x_account,
        x_verified_at: walletOnlyUser.x_verified_at,
        referral_code: walletOnlyUser.referral_code,
        referred_by: walletOnlyUser.referred_by,
        has_updated_profile: walletOnlyUser.has_updated_profile || false,
        last_reward_time: walletOnlyUser.last_reward_time,
      });

    if (insertNewUserError) {
      console.error("Error creating new user row:", insertNewUserError);
      // Rollback temp changes
      await supabase
        .from("users")
        .update({ 
          email: walletOnlyUser.email, 
          wallet_address: walletAddress 
        })
        .eq("id", oldUserId);
      
      return NextResponse.json(
        { error: "Failed to link wallet to email: " + insertNewUserError.message },
        { status: 500 }
      );
    }

    console.log("✅ Created new user row with auth ID");

    // Step 3: Update user_wallets to point to new auth user ID
    if (existingWallet) {
      const { error: walletUpdateErr } = await supabase
        .from("user_wallets")
        .update({ 
          user_id: authUserId,
          linked_at: new Date().toISOString(),
          linked_via: 'manual_link'
        })
        .eq("user_id", oldUserId);

      if (walletUpdateErr) {
        console.error("Error updating user_wallets:", walletUpdateErr);
      } else {
        console.log("✅ Updated user_wallets");
      }
    }

    // Step 4: Update all related tables with foreign keys
    await supabase.from("airdrop_transactions").update({ user_id: authUserId }).eq("user_id", oldUserId);
    await supabase.from("announcements").update({ user_id: authUserId }).eq("user_id", oldUserId);
    await supabase.from("chapter_ratings").update({ user_id: authUserId }).eq("user_id", oldUserId);
    await supabase.from("comments").update({ user_id: authUserId }).eq("user_id", oldUserId);
    await supabase.from("creator_applications").update({ user_id: authUserId }).eq("user_id", oldUserId);
    await supabase.from("manga").update({ user_id: authUserId }).eq("user_id", oldUserId);
    await supabase.from("manga_comments").update({ user_id: authUserId }).eq("user_id", oldUserId);
    await supabase.from("manga_detail_comments").update({ user_id: authUserId }).eq("user_id", oldUserId);
    await supabase.from("manga_interactions").update({ user_id: authUserId }).eq("user_id", oldUserId);
    await supabase.from("messages").update({ user_id: authUserId }).eq("user_id", oldUserId);
    await supabase.from("notifications").update({ user_id: authUserId }).eq("user_id", oldUserId);
    await supabase.from("novel_interactions").update({ user_id: authUserId }).eq("user_id", oldUserId);
    await supabase.from("novels").update({ user_id: authUserId }).eq("user_id", oldUserId);
    await supabase.from("pending_withdrawals").update({ user_id: authUserId }).eq("user_id", oldUserId);
    await supabase.from("polls").update({ user_id: authUserId }).eq("user_id", oldUserId);
    await supabase.from("referrals").update({ inviter_id: authUserId }).eq("inviter_id", oldUserId);
    await supabase.from("referrals").update({ invitee_id: authUserId }).eq("invitee_id", oldUserId);
    await supabase.from("subscriptions").update({ user_id: authUserId }).eq("user_id", oldUserId);
    await supabase.from("unlocked_manga_chapters").update({ user_id: authUserId }).eq("user_id", oldUserId);
    await supabase.from("unlocked_story_chapters").update({ user_id: authUserId }).eq("user_id", oldUserId);
    await supabase.from("user_activity").update({ user_id: authUserId }).eq("user_id", oldUserId);
    await supabase.from("votes").update({ user_id: authUserId }).eq("user_id", oldUserId);
    await supabase.from("wallet_balances").update({ user_id: authUserId }).eq("user_id", oldUserId);
    await supabase.from("wallet_events").update({ source_user_id: authUserId }).eq("source_user_id", oldUserId);
    await supabase.from("wallet_events").update({ destination_user_id: authUserId }).eq("destination_user_id", oldUserId);
    await supabase.from("writer_announcements").update({ writer_id: authUserId }).eq("writer_id", oldUserId);
    await supabase.from("writer_applications").update({ user_id: authUserId }).eq("user_id", oldUserId);
    await supabase.from("writer_profiles").update({ user_id: authUserId }).eq("user_id", oldUserId);

    console.log("✅ Updated all related tables");

    // Step 5: Delete old user row
    const { error: deleteOldUserError } = await supabase
      .from("users")
      .delete()
      .eq("id", oldUserId);

    if (deleteOldUserError) {
      console.error("Error deleting old user row:", deleteOldUserError);
    } else {
      console.log("✅ Deleted old user row");
    }

    // Log the linking event
    await supabase
      .from("wallet_events")
      .insert([{
        wallet_address: walletAddress,
        event_type: "wallet_email_link",
        event_details: `Wallet ${walletAddress} linked to email ${email}`,
        source_user_id: authUserId,
        destination_user_id: authUserId,
        amount_change: 0,
        source_chain: "solana",
        destination_chain: "solana",
        timestamp: new Date().toISOString(),
      }]);

    console.log(`🎉 Successfully linked wallet ${walletAddress} to email ${email}`);

    return NextResponse.json({
      success: true,
      message: `Wallet successfully linked to ${email}! You can now sign in with your email and access your wallet.`,
      userId: authUserId,
      email,
      walletAddress,
    });

  } catch (error) {
    console.error("Wallet linking error:", error);
    return NextResponse.json(
      { error: "Internal server error during wallet linking" },
      { status: 500 }
    );
  }
}
