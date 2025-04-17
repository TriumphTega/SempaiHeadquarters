"use client";

import { useEffect, useState, useCallback, useContext } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { supabase } from "../services/supabase/supabaseClient";
import { useRouter } from "next/navigation";
import { EmbeddedWalletContext } from "./EmbeddedWalletProvider";
import styles from "../styles/ConnectButton.module.css";
import { FaWallet, FaRocket, FaKey, FaCopy, FaCheckCircle, FaSpinner, FaTimes } from "react-icons/fa";

export default function ConnectButton() {
  const { connected, publicKey } = useWallet();
  const { wallet: embeddedWallet, createEmbeddedWallet, isLoading: embeddedLoading, error: embeddedError } = useContext(EmbeddedWalletContext);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userCreated, setUserCreated] = useState(false);
  const [showReferralPrompt, setShowReferralPrompt] = useState(false);
  const [showEmbeddedForm, setShowEmbeddedForm] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [privateKey, setPrivateKey] = useState(null);
  const [showPopup, setShowPopup] = useState(false);

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
            amount: 50000,
          });

        if (balanceError) {
          console.error("Error creating wallet balance:", balanceError.message);
          alert(`Danger: Failed to credit 50,000 SMP - ${balanceError.message}`); // Danger alert
          throw new Error(`Failed to create wallet balance: ${balanceError.message}`);
        }
        console.log("Wallet balance initialized successfully.");
        alert("Success: 50,000 SMP credited to your wallet!"); // Success alert
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
      setPrivateKey(newPrivateKey);
      setShowEmbeddedForm(false);
      setPassword("");
      setConfirmPassword("");
      setShowPopup(false);
    }
  };

  useEffect(() => {
    if (connected && publicKey) {
      createUserAndBalance(publicKey.toString());
      setShowPopup(false);
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
    setPrivateKey(null);
  };

  if (isLoading || embeddedLoading) {
    return (
      <div className={styles.loadingContainer}>
        <FaSpinner className={styles.spinner} />
        <span>Warping...</span>
      </div>
    );
  }

  if (error || embeddedError) {
    return (
      <div className={styles.errorContainer}>
        <p>Error: {error || embeddedError}</p>
        <button className={styles.retryButton} onClick={() => setError(null)}>
          <FaRocket /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className={styles.connectButtonWrapper}>
      {connected || embeddedWallet ? (
        embeddedWallet ? (
          <div className={styles.walletInfo}>
            <span>
              <FaWallet /> {embeddedWallet.publicKey.slice(0, 4)}...{embeddedWallet.publicKey.slice(-4)}
            </span>
            <button className={styles.disconnectButton} onClick={() => {
              localStorage.removeItem("embeddedWalletPublicKey");
              localStorage.removeItem("embeddedWalletSecretEncrypted");
              window.location.reload();
            }}>
              <FaTimes />
            </button>
          </div>
        ) : (
          <WalletMultiButton className={styles.walletButton}>
            <FaWallet className={styles.buttonIcon} />
          </WalletMultiButton>
        )
      ) : (
        <button
          className={styles.singleButton}
          onClick={() => setShowPopup(true)}
        >
          <FaWallet className={styles.buttonIcon} />
        </button>
      )}
      {(connected || embeddedWallet) && <span className={styles.connectedStatus}></span>}
      {userCreated && (
        <p className={styles.successMessage}>
          <FaCheckCircle /> Welcome!
        </p>
      )}

      {showPopup && !connected && !embeddedWallet && (
        <div className={styles.popupOverlay}>
          <div className={styles.popup}>
            <button className={styles.closeButton} onClick={() => setShowPopup(false)}>
              <FaTimes />
            </button>
            <h3>Choose Path</h3>
            <div className={styles.popupOptions}>
              <WalletMultiButton className={styles.popupWalletButton}>
                 Connect Wallet <FaWallet className={styles.buttonIcon} />
              </WalletMultiButton>
              <button
                className={styles.popupEmbeddedButton}
                onClick={() => {
                  setShowEmbeddedForm(true);
                  setShowPopup(false);
                }}
              >
                <FaRocket className={styles.buttonIcon} /> In-App Wallet
              </button>
              <button
                className={styles.cancelButton}
                onClick={() => setShowPopup(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showEmbeddedForm && !connected && !embeddedWallet && (
        <div className={styles.embeddedFormOverlay}>
          <div className={styles.embeddedForm}>
            <h3><FaKey /> Forge Key</h3>
            <p className={styles.securityNote}>
              Secure your cosmic key!
            </p>
            <form onSubmit={handleCreateEmbeddedWallet}>
              <input
                type="password"
                placeholder="Code"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
              />
              <input
                type="password"
                placeholder="Confirm"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={styles.input}
              />
              <button type="submit" className={styles.submitButton}>
                <FaRocket /> Create
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
            <h3><FaKey /> Your Key</h3>
            <p className={styles.securityNote}>
              Guard this well!
            </p>
            <textarea
              readOnly
              value={privateKey}
              className={styles.privateKeyText}
            />
            <button onClick={copyPrivateKey} className={styles.copyButton}>
              <FaCopy /> Copy
            </button>
          </div>
        </div>
      )}

      {showReferralPrompt && (
        <div className={styles.referralPromptOverlay}>
          <div className={styles.referralPrompt}>
            <h3 className={styles.promptTitle}>Greetings!</h3>
            <p className={styles.promptMessage}>
              Update profile for rewards!
            </p>
            <div className={styles.promptButtons}>
              <button className={styles.updateButton} onClick={handleProfileUpdate}>
                <FaRocket /> Update
              </button>
              <button className={styles.laterButton} onClick={handlePromptClose}>
                Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}