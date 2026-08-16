"use client";

import { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../services/supabase/supabaseClient";
import { useWallet } from "@solana/wallet-adapter-react";
import { EmbeddedWalletContext } from "../../components/EmbeddedWalletProvider";
import Link from "next/link";
import {
  FaWallet,
  FaExchangeAlt,
  FaEnvelope,
  FaCheckCircle,
  FaExclamationTriangle,
} from "react-icons/fa";
import ConnectButton from "../../components/ConnectButton";
import Navbar from "../../components/Navbar";
import styles from "../../styles/MigrateWallet.module.css";

export default function MigrateWallet() {
  const { connected, publicKey } = useWallet();
  const { wallet: embeddedWallet } = useContext(EmbeddedWalletContext);
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [currentWallet, setCurrentWallet] = useState("");
  const [newWalletAddress, setNewWalletAddress] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const activePublicKey = publicKey || (embeddedWallet ? embeddedWallet.publicKey : null);
  const isWalletConnected = connected || !!embeddedWallet;

  useEffect(() => {
    const fetchUserData = async () => {
      if (!isWalletConnected || !activePublicKey) return;

      try {
        const walletAddress = activePublicKey.toString();
        const { data, error } = await supabase
          .from("users")
          .select("id, wallet_address, email")
          .eq("wallet_address", walletAddress)
          .single();

        if (error) throw new Error(error.message);

        setUserId(data.id);
        setCurrentWallet(data.wallet_address);
        setEmail(data.email || "");
      } catch (err) {
        console.error("Error fetching user:", err);
        setError("Failed to load user data");
      }
    };

    fetchUserData();
  }, [isWalletConnected, activePublicKey]);

  const handleMigration = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!newWalletAddress.trim()) {
      setError("Please enter a new wallet address");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    if (newWalletAddress === currentWallet) {
      setError("New wallet address must be different from current wallet");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/migrate-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldWalletAddress: currentWallet,
          newWalletAddress: newWalletAddress.trim(),
          email: email.trim(),
          userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Migration failed");
      }

      setSuccess(
        `Wallet migrated successfully! Your new wallet address is ${data.newWalletAddress}. Please reconnect with your new wallet.`
      );

      // Clear form
      setNewWalletAddress("");

      // Redirect after 5 seconds
      setTimeout(() => {
        router.push("/");
      }, 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <Navbar />

      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.header}>
            <FaExchangeAlt className={styles.icon} />
            <h1>Migrate Your Wallet</h1>
            <p>
              Transfer your account to a new wallet address and link your email for account
              recovery
            </p>
          </div>

          {!isWalletConnected ? (
            <div className={styles.connectPrompt}>
              <FaWallet className={styles.walletIcon} />
              <p>Please connect your current wallet to proceed with migration</p>
              <ConnectButton />
            </div>
          ) : (
            <form onSubmit={handleMigration} className={styles.form}>
              <div className={styles.infoBox}>
                <FaWallet />
                <div>
                  <strong>Current Wallet:</strong>
                  <p>{currentWallet}</p>
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="newWallet">
                  <FaWallet /> New Wallet Address
                </label>
                <input
                  id="newWallet"
                  type="text"
                  value={newWalletAddress}
                  onChange={(e) => setNewWalletAddress(e.target.value)}
                  placeholder="Enter your new Solana wallet address"
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="email">
                  <FaEnvelope /> Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email for account recovery"
                  className={styles.input}
                  required
                />
                <small className={styles.helpText}>
                  This email will be used for account recovery if you lose access to your wallet
                </small>
              </div>

              {error && (
                <div className={styles.errorBox}>
                  <FaExclamationTriangle />
                  <p>{error}</p>
                </div>
              )}

              {success && (
                <div className={styles.successBox}>
                  <FaCheckCircle />
                  <p>{success}</p>
                </div>
              )}

              <div className={styles.warningBox}>
                <FaExclamationTriangle />
                <div>
                  <strong>Important:</strong>
                  <ul>
                    <li>Make sure you have access to the new wallet address</li>
                    <li>Your account data will be transferred to the new wallet</li>
                    <li>You will need to reconnect using the new wallet after migration</li>
                    <li>This action cannot be undone</li>
                  </ul>
                </div>
              </div>

              <button type="submit" className={styles.submitButton} disabled={loading}>
                {loading ? (
                  <span className={styles.spinner}></span>
                ) : (
                  <>
                    <FaExchangeAlt /> Migrate Wallet
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </main>

      <footer className={styles.footer}>
        <p>© 2025 Sempai HQ. All rights reserved.</p>
      </footer>
    </div>
  );
}
