"use client";

import { useEffect, useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { supabase } from "../services/supabase/supabaseClient";
import { useRouter } from "next/navigation";
import styles from "../styles/ConnectButton.module.css";

export default function ConnectButton() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userCreated, setUserCreated] = useState(false);
  const [showReferralPrompt, setShowReferralPrompt] = useState(false);

  const createUserAndBalance = useCallback(async () => {
    if (!connected || !publicKey) return;

    setIsLoading(true);
    setError(null);
    setUserCreated(false);
    setShowReferralPrompt(false);

    try {
      const walletAddress = publicKey.toString();
      console.log("Wallet connected:", walletAddress);

      // Store wallet address in localStorage for persistence
      localStorage.setItem("walletAddress", walletAddress);

      // Check if the user already exists
      const { data: existingUser, error: fetchError } = await supabase
        .from("users")
        .select("id, referral_code, has_updated_profile")
        .eq("wallet_address", walletAddress)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        console.error("Error fetching user:", fetchError.message);
        throw new Error(`Failed to check user: ${fetchError.message}`);
      }

      let userId = existingUser?.id;
      const url = new URL(window.location.href); // Get referral code from URL directly
      const referralCodeFromUrl = url.searchParams.get("ref");
      let referredBy = null;

      // Handle referral logic
      if (referralCodeFromUrl && !existingUser) {
        const { data: referrer, error: referrerError } = await supabase
          .from("users")
          .select("wallet_address")
          .eq("referral_code", referralCodeFromUrl)
          .single();
        if (referrerError) {
          console.warn("Referrer lookup failed:", referrerError.message);
        } else {
          referredBy = referrer?.wallet_address || null;
        }
      }

      // If no user exists, create one
      if (!existingUser) {
        const newReferralCode = `${walletAddress.slice(0, 4)}${Math.random()
          .toString(36)
          .slice(2, 6)
          .toUpperCase()}`;
        const { data: newUser, error: insertError } = await supabase
          .from("users")
          .insert({
            wallet_address: walletAddress,
            isWriter: false,
            isSuperuser: false,
            referral_code: newReferralCode,
            referred_by: referredBy,
            has_updated_profile: false,
          })
          .select("id, referral_code")
          .single();

        if (insertError) {
          console.error("Error creating user:", insertError.message);
          throw new Error(`Failed to create user: ${insertError.message}`);
        }

        userId = newUser.id;
        console.log("New user created successfully:", newUser);
        setUserCreated(true);

        // Create wallet_balances entry with user_id
        const { error: balanceError } = await supabase
          .from("wallet_balances")
          .insert({
            user_id: userId,
            wallet_address: walletAddress,
            chain: "SOL",
            currency: "SMP",
            decimals: 6,
            amount: 0,
          });

        if (balanceError) {
          console.error("Error creating wallet balance:", balanceError.message);
          throw new Error(`Failed to create wallet balance: ${balanceError.message}`);
        }
        console.log("Wallet balance initialized successfully.");
      }

      // Check referral prompt conditions
      if (referralCodeFromUrl && !existingUser?.has_updated_profile) {
        setShowReferralPrompt(true);
      }
    } catch (err) {
      console.error("Error in createUserAndBalance:", err.message);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [connected, publicKey]);

  useEffect(() => {
    createUserAndBalance();
  }, [connected, publicKey, createUserAndBalance]);

  const handlePromptClose = () => {
    setShowReferralPrompt(false);
    router.push("/");
  };

  const handleProfileUpdate = () => {
    setShowReferralPrompt(false);
    router.push("/editprofile");
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <span>Connecting...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p>Error: {error}</p>
        <button className={styles.retryButton} onClick={createUserAndBalance}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={styles.connectButtonWrapper}>
      <WalletMultiButton className={styles.walletButton} />
      {connected && <span className={styles.connectedStatus}></span>}
      {userCreated && (
        <p className={styles.successMessage}>Welcome aboard! Your account is ready.</p>
      )}

      {showReferralPrompt && (
        <div className={styles.referralPromptOverlay}>
          <div className={styles.referralPrompt}>
            <h3 className={styles.promptTitle}>Welcome, New Adventurer!</h3>
            <p className={styles.promptMessage}>
              You’ve been referred by a friend! Complete your profile to unlock exclusive rewards and join the community.
            </p>
            <div className={styles.promptButtons}>
              <button className={styles.updateButton} onClick={handleProfileUpdate}>
                Update Profile Now
              </button>
              <button className={styles.laterButton} onClick={handlePromptClose}>
                Explore Home First
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}