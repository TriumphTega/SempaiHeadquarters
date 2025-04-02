"use client";

import { useState, useEffect, useContext } from "react"; // Added useContext
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, unpackAccount } from "@solana/spl-token";
import Link from "next/link";
import { AMETHYST_MINT_ADDRESS, SMP_MINT_ADDRESS, RPC_URL } from "@/constants";
import { FaHome, FaBars, FaTimes, FaGem, FaExchangeAlt, FaWallet, FaSyncAlt } from "react-icons/fa";
import TreasuryBalance from "../../components/TreasuryBalance";
import styles from "../../styles/SwapPage.module.css";
import ConnectButton from "../../components/ConnectButton";
import { EmbeddedWalletContext } from "../../components/EmbeddedWalletProvider"; // Added EmbeddedWalletContext

const connection = new Connection(RPC_URL);

// Define allowed tokens
const TOKEN_MINTS = {
  SOL: new PublicKey("So11111111111111111111111111111111111111112"),
  JUP: new PublicKey("JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN"),
  AMETHYST: AMETHYST_MINT_ADDRESS,
  SMP: SMP_MINT_ADDRESS,
};

export default function SwapPage() {
  const { connected, publicKey, sendTransaction, signTransaction } = useWallet();
  const { wallet: embeddedWallet, signAndSendTransaction } = useContext(EmbeddedWalletContext); // Access embedded wallet
  const activeWalletAddress = publicKey?.toString() || embeddedWallet?.publicKey; // Use either wallet
  const isWalletConnected = connected || !!embeddedWallet; // Check both wallet types
  const [amount, setAmount] = useState("");
  const [coinFrom, setCoinFrom] = useState("AMETHYST");
  const [coinTo, setCoinTo] = useState("SMP");
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  const checkBalance = async () => {
    if (!activeWalletAddress) return;

    try {
      const mintAddress = TOKEN_MINTS[coinFrom];
      let balance = 0;

      if (coinFrom === "SOL") {
        const solBalance = await connection.getBalance(new PublicKey(activeWalletAddress));
        balance = solBalance / 1_000_000_000; // 9 decimals
      } else {
        const ataAddress = getAssociatedTokenAddressSync(mintAddress, new PublicKey(activeWalletAddress));
        const ataInfo = await connection.getAccountInfo(ataAddress);
        if (ataInfo) {
          const ata = unpackAccount(ataAddress, ataInfo);
          balance = Number(ata.amount) / 1_000_000; // 6 decimals for SMP/Amethyst, adjust if JUP differs
        }
      }
      setBalance(balance);
    } catch (error) {
      console.error("Error fetching balance:", error);
      setBalance(0);
    }
  };

  useEffect(() => {
    if (isWalletConnected) checkBalance();
  }, [isWalletConnected, activeWalletAddress, coinFrom]);

  const handleSwap = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    if (!isWalletConnected) {
      alert("Please connect your wallet first.");
      return;
    }
    if (coinFrom === coinTo) {
      alert("Please select different tokens to swap.");
      return;
    }

    setLoading(true);

    try {
      const inputMint = TOKEN_MINTS[coinFrom].toString();
      const outputMint = TOKEN_MINTS[coinTo].toString();
      console.log("Swapping:", { inputMint, outputMint, amount });

      const response = await fetch("/api/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userAddress: activeWalletAddress,
          amount: parseFloat(amount),
          inputMint,
          outputMint,
        }),
      }).then((r) => r.json());

      console.log("API Response:", response);

      const { transaction, error, message } = response;

      if (error) {
        alert(`${error}: ${message}`);
        return;
      }

      const swapTransactionBuf = Buffer.from(transaction, "base64");
      const swapTransaction = VersionedTransaction.deserialize(swapTransactionBuf);

      let signature;
      if (embeddedWallet && signAndSendTransaction) {
        // Embedded wallet swap
        signature = await signAndSendTransaction(swapTransaction);
      } else if (signTransaction && sendTransaction) {
        // External wallet swap
        const signedTransaction = await signTransaction(swapTransaction);
        signature = await sendTransaction(signedTransaction, connection, {
          skipPreflight: false,
          maxRetries: 2,
        });
      } else {
        throw new Error("Wallet signing method not available.");
      }

      const latestBlockHash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature,
      });

      alert(`Swap successful! Signature: ${signature}`);
      checkBalance();
    } catch (error) {
      console.error("Error swapping coins:", error);
      alert("Swap failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  return (
    <div className={styles.page}>
      {/* Navbar */}
      <nav className={styles.navbar}>
        <div className={styles.navContainer}>
          <Link href="/" className={styles.logoLink}>
            <img src="/images/logo.jpeg" alt="Sempai HQ" className={styles.logo} />
            <span className={styles.logoText}>Sempai HQ</span>
          </Link>
          <button className={styles.menuToggle} onClick={toggleMenu}>
            <FaBars />
          </button>
          <div className={`${styles.navLinks} ${menuOpen ? styles.navLinksOpen : ""}`}>
            <Link href="/" className={styles.navLink}>
              <FaHome /> Home
            </Link>
            <Link href="/swap" className={styles.navLink}>
              <FaExchangeAlt /> Swap
            </Link>
            <ConnectButton className={styles.connectButton} />
          </div>
        </div>
      </nav>

      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>
          <FaGem /> Coin Swap
        </h1>
        <p className={styles.headerSubtitle}>Exchange your assets with precision and elegance.</p>
        <TreasuryBalance />
      </header>

      {/* Swap Form */}
      <main className={styles.main}>
        <div className={styles.swapCard}>
          {!isWalletConnected ? (
            <div className={styles.connectPrompt}>
              <FaWallet className={styles.walletIcon} />
              <p>Please connect your wallet to initiate a swap.</p>
              <ConnectButton className={styles.connectButtonPrompt} />
            </div>
          ) : (
            <div className={styles.swapForm}>
              <h2 className={styles.formTitle}>Swap Interface</h2>
              <div className={styles.balanceDisplay}>
                <FaGem /> Balance: {balance.toFixed(2)} {coinFrom}
                <button onClick={checkBalance} className={styles.refreshButton} title="Refresh Balance">
                  <FaSyncAlt />
                </button>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Amount</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="Enter amount"
                  className={styles.input}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>From</label>
                <select value={coinFrom} onChange={(e) => setCoinFrom(e.target.value)} className={styles.select}>
                  <option value="SOL">SOL</option>
                  <option value="JUP">JUP</option>
                  <option value="AMETHYST">Amethyst</option>
                  <option value="SMP">SMP</option>
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>To</label>
                <select value={coinTo} onChange={(e) => setCoinTo(e.target.value)} className={styles.select}>
                  <option value="SOL">SOL</option>
                  <option value="JUP">JUP</option>
                  <option value="AMETHYST">Amethyst</option>
                  <option value="SMP">SMP</option>
                </select>
              </div>

              <button onClick={handleSwap} className={styles.swapButton} disabled={loading}>
                {loading ? (
                  <span className={styles.swirlIcon}></span>
                ) : (
                  <>
                    <FaExchangeAlt /> Initiate Swap
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <p className={styles.footerText}>© 2025 Sempai HQ. All rights reserved.</p>
      </footer>
    </div>
  );
}