// components/ConnectButton.js
"use client";

import { useEffect, useState, useCallback, useContext } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { supabase } from "../services/supabase/supabaseClient";
import { useRouter } from "next/navigation";
import { EmbeddedWalletContext } from "./EmbeddedWalletProvider";
import styles from "../styles/ConnectButton.module.css";

export default function ConnectButton() {
  const { connected, publicKey } = useWallet(); // External wallet
  const { wallet: embeddedWallet, createEmbeddedWallet, isLoading: embeddedLoading, error: embeddedError } = useContext(EmbeddedWalletContext);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userCreated, setUserCreated] = useState(false);
  const [showReferralPrompt, setShowReferralPrompt] = useState(false);
  const [showEmbeddedForm, setShowEmbeddedForm] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [privateKey, setPrivateKey] = useState(null); // Store private key temporarily

  const createUserAndBalance = useCallback(async (walletAddress) => {
    if (!walletAddress) return;

    setIsLoading(true);
    setError(null);
    setUserCreated(false);
    setShowReferralPrompt(false);

    try {
      console.log("Wallet connected:", walletAddress);
      localStorage.setItem("walletAddress", walletAddress);

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
      const url = new URL(window.location.href);
      const referralCodeFromUrl = url.searchParams.get("ref");
      let referredBy = null;

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

      if (referralCodeFromUrl && !existingUser?.has_updated_profile) {
        setShowReferralPrompt(true);
      }
    } catch (err) {
      console.error("Error in createUserAndBalance:", err.message);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCreateEmbeddedWallet = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long!");
      return;
    }
    const result = await createEmbeddedWallet(password);
    if (result) {
      const { publicKey, privateKey: newPrivateKey } = result;
      await createUserAndBalance(publicKey);
      setPrivateKey(newPrivateKey); // Show private key to user
      setShowEmbeddedForm(false);
      setPassword("");
      setConfirmPassword("");
    }
  };

  useEffect(() => {
    if (connected && publicKey) {
      createUserAndBalance(publicKey.toString());
    }
  }, [connected, publicKey, createUserAndBalance]);

  const handlePromptClose = () => {
    setShowReferralPrompt(false);
    router.push("/");
  };

  const handleProfileUpdate = () => {
    setShowReferralPrompt(false);
    router.push("/editprofile");
  };

  const copyPrivateKey = () => {
    navigator.clipboard.writeText(privateKey);
    alert("Private key copied to clipboard! Store it securely.");
    setPrivateKey(null); // Clear after copying
  };

  if (isLoading || embeddedLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <span>Connecting...</span>
      </div>
    );
  }

  if (error || embeddedError) {
    return (
      <div className={styles.errorContainer}>
        <p>Error: {error || embeddedError}</p>
        <button className={styles.retryButton} onClick={() => setError(null)}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={styles.connectButtonWrapper}>
      {connected ? (
        <WalletMultiButton className={styles.walletButton} />
      ) : embeddedWallet ? (
        <div className={styles.walletInfo}>
          <span>Connected: {embeddedWallet.publicKey.slice(0, 4)}...{embeddedWallet.publicKey.slice(-4)}</span>
          <button className={styles.disconnectButton} onClick={() => {
            localStorage.removeItem("embeddedWalletPublicKey");
            localStorage.removeItem("embeddedWalletSecretEncrypted");
            window.location.reload(); // Simplistic disconnect
          }}>
            Disconnect
          </button>
        </div>
      ) : (
        <>
          <WalletMultiButton className={styles.walletButton} />
          <button
            className={styles.embeddedButton}
            onClick={() => setShowEmbeddedForm(true)}
          >
            Create In-App Wallet
          </button>
        </>
      )}
      {(connected || embeddedWallet) && <span className={styles.connectedStatus}></span>}
      {userCreated && (
        <p className={styles.successMessage}>Welcome aboard! Your account is ready.</p>
      )}

      {showEmbeddedForm && !connected && !embeddedWallet && (
        <div className={styles.embeddedFormOverlay}>
          <div className={styles.embeddedForm}>
            <h3>Create Your Wallet</h3>
            <p className={styles.securityNote}>
              Your private key will be generated client-side. No one, including developers, can access it. Save it securely!
            </p>
            <form onSubmit={handleCreateEmbeddedWallet}>
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
              />
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={styles.input}
              />
              <button type="submit" className={styles.submitButton}>
                Create Wallet
              </button>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setShowEmbeddedForm(false)}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      {privateKey && (
        <div className={styles.privateKeyOverlay}>
          <div className={styles.privateKeyBox}>
            <h3>Your Private Key</h3>
            <p className={styles.securityNote}>
              Save this securely! It’s your only way to recover your wallet. We don’t store it.
            </p>
            <textarea
              readOnly
              value={privateKey}
              className={styles.privateKeyText}
            />
            <button onClick={copyPrivateKey} className={styles.copyButton}>
              Copy & Close
            </button>
          </div>
        </div>
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