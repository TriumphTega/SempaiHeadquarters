"use client";
import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { FaGem, FaLock, FaCheckCircle } from "react-icons/fa";
import styles from "../../styles/Subscribe.module.css";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function Subscribe() {
  const { publicKey, sendTransaction, connected } = useWallet();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [treasuryWallet, setTreasuryWallet] = useState(null);

  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  useEffect(() => {
    async function fetchTreasuryPublicKey() {
      try {
        const res = await fetch("/api/treasury-public-key");
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setTreasuryWallet(new PublicKey(data.publicKey));
      } catch (error) {
        console.error("Failed to fetch treasury public key:", error.message);
        setMessage("Error loading subscription service.");
      }
    }
    fetchTreasuryPublicKey();
  }, []);

  async function handleSubscribe(plan) {
    if (!publicKey || !connected) {
      setMessage("Please connect your wallet first.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const amount = plan === "3_chapters" ? 0.1 * 1e9 : 0.5 * 1e9; // Lamports
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: treasuryWallet,
          lamports: amount,
        })
      );

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "confirmed");

      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicKey: publicKey.toString(),
          plan,
          transactionSignature: signature,
          novelId: "your_novel_id_here", // Pass dynamically if needed
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (data.error) {
        setMessage(data.error);
      } else {
        setMessage("Subscription successful! Redirecting...");
        setTimeout(() => window.location.reload(), 2000); // Refresh to update chapter access
      }
    } catch (err) {
      console.error("Subscription error:", err);
      setLoading(false);
      setMessage("Payment failed. Please try again.");
    }
  }

  if (!treasuryWallet) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Subscribe for Premium Chapters</h1>
        <p>{message || "Loading treasury wallet..."}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>
        Unlock Exclusive Chapters <FaGem />
      </h1>
      {!connected && (
        <div className={styles.walletPrompt}>
          <FaLock /> Connect your wallet to subscribe
          <WalletMultiButton className={styles.walletButton} />
        </div>
      )}
      {connected && (
        <div className={styles.planGrid}>
          <div className={styles.planCard}>
            <h2>3 Chapters</h2>
            <p className={styles.planPrice}>0.1 SOL</p>
            <button
              onClick={() => handleSubscribe("3_chapters")}
              disabled={loading}
              className={styles.button}
            >
              {loading ? "Processing..." : "Subscribe"}
            </button>
          </div>
          <div className={styles.planCard}>
            <h2>All Chapters</h2>
            <p className={styles.planPrice}>0.5 SOL</p>
            <button
              onClick={() => handleSubscribe("all_chapters")}
              disabled={loading}
              className={styles.button}
            >
              {loading ? "Processing..." : "Subscribe"}
            </button>
          </div>
        </div>
      )}
      {message && (
        <p className={`${styles.message} ${message.includes("successful") ? styles.success : styles.error}`}>
          {message.includes("successful") ? <FaCheckCircle /> : <FaLock />}
          {message}
        </p>
      )}
    </div>
  );
}