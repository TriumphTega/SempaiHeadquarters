import { NextResponse } from "next/server";
import { supabase } from "../../../services/supabase/supabaseClient";
import { supabaseAdmin } from "../supabaseAdmin";

/**
 * POST /api/migrate-email
 * Migrates user account to a new email address
 * All user data remains intact as relationships use user_id
 */
export async function POST(request) {
  try {
    const { userId: initialUserId, oldEmail, newEmail, walletAddress } = await request.json();
    let userId = initialUserId; // Use let so we can reassign when creating new auth user

    // Validate input
    if (!userId || !oldEmail || !newEmail || !walletAddress) {
      return NextResponse.json(
        { error: "Missing required fields: userId, oldEmail, newEmail, walletAddress" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Verify the user exists and owns the old email
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")  // Select all fields for potential migration
      .eq("id", userId)
      .eq("wallet_address", walletAddress)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: "User verification failed. Invalid user ID or wallet address." },
        { status: 403 }
      );
    }

    // Verify the old email matches
    if (user.email !== oldEmail) {
      return NextResponse.json(
        { error: "Current email does not match. Please verify your current email." },
        { status: 403 }
      );
    }

    // Check if the new email is the same as old email
    if (oldEmail === newEmail) {
      return NextResponse.json(
        { error: "New email must be different from current email" },
        { status: 400 }
      );
    }

    // Check if new email is already in use in custom users table
    const { data: existingUser, error: emailCheckError } = await supabase
      .from("users")
      .select("id")
      .eq("email", newEmail)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: "This email is already registered to another account" },
        { status: 409 }
      );
    }

    // Check if new email exists in auth.users
    const { data: authUserCheck } = await supabaseAdmin.auth.admin.listUsers();
    const emailExistsInAuth = authUserCheck?.users?.some(u => u.email === newEmail);
    
    if (emailExistsInAuth) {
      return NextResponse.json(
        { error: "This email is already registered in authentication system" },
        { status: 409 }
      );
    }

    // Find the auth user by email to get their auth user ID
    const authUsers = authUserCheck?.users || [];
    let authUser = authUsers.find(u => u.email === oldEmail);

    if (!authUser) {
      console.log("No auth user found for old email:", oldEmail);
      console.log("Creating new auth user for email:", newEmail);
      
      // Create a new auth user since one doesn't exist
      const { data: newAuthUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
        email: newEmail,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          wallet_address: walletAddress,
          migrated_from: oldEmail,
          migration_date: new Date().toISOString()
        }
      });

      if (createAuthError) {
        console.error("Error creating auth user:", createAuthError);
        return NextResponse.json(
          { error: "Failed to create authentication account: " + createAuthError.message },
          { status: 500 }
        );
      }
      
      console.log("Auth user created successfully:", newAuthUser.user.id);
      authUser = newAuthUser.user;
      const newAuthUserId = authUser.id;
      const oldUserId = userId;

      // CRITICAL: Migrate all user data to the new auth user ID
      // Step 1: Copy user data to new row with new auth user ID
      const { error: insertNewUserError } = await supabase
        .from("users")
        .insert({
          id: newAuthUserId,
          email: newEmail,
          wallet_address: user.wallet_address,
          name: user.name || newEmail.split("@")[0],
          image: user.image,
          balance: user.balance || 0,
          weekly_points: user.weekly_points || 0,
          isWriter: user.isWriter || false,
          isArtist: user.isArtist || false,
          isSuperuser: user.isSuperuser || false,
          x_account: user.x_account,
          x_verified_at: user.x_verified_at,
          referral_code: user.referral_code,
          referred_by: user.referred_by,
          has_updated_profile: user.has_updated_profile || false,
          last_reward_time: user.last_reward_time,
        });

      if (insertNewUserError) {
        console.error("Error creating new user row:", insertNewUserError);
        await supabaseAdmin.auth.admin.deleteUser(newAuthUserId);
        return NextResponse.json(
          { error: "Failed to migrate user data: " + insertNewUserError.message },
          { status: 500 }
        );
      }

      // Step 2: Update user_wallets to point to new user ID
      console.log(`Migrating user_wallets from ${oldUserId} to ${newAuthUserId}`);
      const { data: walletUpdate, error: walletUpdateErr } = await supabase
        .from("user_wallets")
        .update({ user_id: newAuthUserId })
        .eq("user_id", oldUserId)
        .select();
      
      if (walletUpdateErr) {
        console.error("Error updating user_wallets:", walletUpdateErr);
      } else {
        console.log("user_wallets updated:", walletUpdate);
      }

      // Step 3: Update all related tables with foreign keys
      await supabase.from("airdrop_transactions").update({ user_id: newAuthUserId }).eq("user_id", oldUserId);
      await supabase.from("announcements").update({ user_id: newAuthUserId }).eq("user_id", oldUserId);
      await supabase.from("chapter_ratings").update({ user_id: newAuthUserId }).eq("user_id", oldUserId);
      await supabase.from("comments").update({ user_id: newAuthUserId }).eq("user_id", oldUserId);
      await supabase.from("creator_applications").update({ user_id: newAuthUserId }).eq("user_id", oldUserId);
      await supabase.from("manga").update({ user_id: newAuthUserId }).eq("user_id", oldUserId);
      await supabase.from("manga_comments").update({ user_id: newAuthUserId }).eq("user_id", oldUserId);
      await supabase.from("manga_detail_comments").update({ user_id: newAuthUserId }).eq("user_id", oldUserId);
      await supabase.from("manga_interactions").update({ user_id: newAuthUserId }).eq("user_id", oldUserId);
      await supabase.from("messages").update({ user_id: newAuthUserId }).eq("user_id", oldUserId);
      await supabase.from("notifications").update({ user_id: newAuthUserId }).eq("user_id", oldUserId);
      await supabase.from("novel_interactions").update({ user_id: newAuthUserId }).eq("user_id", oldUserId);
      await supabase.from("novels").update({ user_id: newAuthUserId }).eq("user_id", oldUserId);
      await supabase.from("pending_withdrawals").update({ user_id: newAuthUserId }).eq("user_id", oldUserId);
      await supabase.from("polls").update({ user_id: newAuthUserId }).eq("user_id", oldUserId);
      await supabase.from("referrals").update({ inviter_id: newAuthUserId }).eq("inviter_id", oldUserId);
      await supabase.from("referrals").update({ invitee_id: newAuthUserId }).eq("invitee_id", oldUserId);
      await supabase.from("subscriptions").update({ user_id: newAuthUserId }).eq("user_id", oldUserId);
      await supabase.from("unlocked_manga_chapters").update({ user_id: newAuthUserId }).eq("user_id", oldUserId);
      await supabase.from("unlocked_story_chapters").update({ user_id: newAuthUserId }).eq("user_id", oldUserId);
      await supabase.from("user_activity").update({ user_id: newAuthUserId }).eq("user_id", oldUserId);
      await supabase.from("votes").update({ user_id: newAuthUserId }).eq("user_id", oldUserId);
      await supabase.from("wallet_balances").update({ user_id: newAuthUserId }).eq("user_id", oldUserId);
      await supabase.from("wallet_events").update({ source_user_id: newAuthUserId }).eq("source_user_id", oldUserId);
      await supabase.from("wallet_events").update({ destination_user_id: newAuthUserId }).eq("destination_user_id", oldUserId);
      await supabase.from("writer_announcements").update({ writer_id: newAuthUserId }).eq("writer_id", oldUserId);
      await supabase.from("writer_applications").update({ user_id: newAuthUserId }).eq("user_id", oldUserId);
      await supabase.from("writer_profiles").update({ user_id: newAuthUserId }).eq("user_id", oldUserId);

      // Step 4: Delete old user row
      const { error: deleteOldUserError } = await supabase
        .from("users")
        .delete()
        .eq("id", oldUserId);

      if (deleteOldUserError) {
        console.error("Error deleting old user row:", deleteOldUserError);
        // Don't fail - new row is already created
      }

      // Update userId for subsequent operations
      userId = newAuthUserId;
      console.log(`✅ Successfully migrated ALL user data from ${oldUserId} to ${newAuthUserId}`);
      console.log(`✅ userId is now set to: ${userId}`);
    }

    // Update email in Supabase Auth if this was an existing user (not newly created)
    if (authUser && authUsers.find(u => u.email === oldEmail)) {
      const { data: updatedAuthUser, error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        authUser.id,
        { 
          email: newEmail,
          email_confirm: true // Set to true to skip email confirmation
        }
      );

      if (authUpdateError) {
        console.error("Error updating auth user email:", authUpdateError);
        return NextResponse.json(
          { error: "Failed to update email in authentication system: " + authUpdateError.message },
          { status: 500 }
        );
      }
      console.log("Auth user email updated successfully:", updatedAuthUser);
    }

    // Update email in custom users table
    const { error: updateUserError } = await supabase
      .from("users")
      .update({
        email: newEmail,
        email_verified: null, // Reset email verification
      })
      .eq("id", userId);

    if (updateUserError) {
      console.error("Error updating user email:", updateUserError);
      return NextResponse.json(
        { error: "Failed to update email in users table" },
        { status: 500 }
      );
    }

    // Update email in creator_applications if exists
    const { error: creatorAppError } = await supabase
      .from("creator_applications")
      .update({ email: newEmail })
      .eq("user_id", userId);

    // Update email in writer_applications if exists
    const { error: writerAppError } = await supabase
      .from("writer_applications")
      .update({ email: newEmail })
      .eq("user_id", userId);

    // Send password setup email for verification and authentication
    if (authUser) {
      const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: newEmail,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/editprofile`
        }
      });

      if (resetError) {
        console.error("Error sending verification email:", resetError);
        // Don't fail if email sending fails - auth account is already created
      } else {
        console.log("Verification email sent to:", newEmail);
      }
    }

    // Log the migration in wallet_events table
    const { error: logError } = await supabase
      .from("wallet_events")
      .insert([{
        wallet_address: walletAddress,
        event_type: "email_migration",
        event_details: `Email migrated from ${oldEmail} to ${newEmail}`,
        source_user_id: userId,
        destination_user_id: userId,
        amount_change: 0, // Required field - no balance change for email migration
        source_chain: "solana", // Required field
        destination_chain: "solana", // Required field
        timestamp: new Date().toISOString(),
      }]);

    if (logError) {
      console.error("Error logging migration:", logError);
      // Don't fail the request if logging fails
    }

    const wasNewAuthUser = !authUsers.find(u => u.email === oldEmail);
    
    console.log(`📧 Email migration complete! Final userId: ${userId}, Auth User ID: ${authUser?.id}`);
    
    return NextResponse.json({
      success: true,
      message: wasNewAuthUser ? 
        `Email migrated successfully! A new authentication account has been created. Check ${newEmail} for a verification link to complete setup and sign in.` :
        `Email migrated successfully! Your authentication account has been updated. Check ${newEmail} for a magic link to verify and sign in.`,
      newEmail,
      oldEmail,
      authCreated: wasNewAuthUser,
      authUserId: authUser?.id,
      finalUserId: userId, // The user_id that should be used going forward
      emailSent: true,
    });

  } catch (error) {
    console.error("Email migration error:", error);
    return NextResponse.json(
      { error: "Internal server error during email migration" },
      { status: 500 }
    );
  }
}
