"use client";

import { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, VersionedTransaction, Keypair } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, unpackAccount } from "@solana/spl-token";
import Link from "next/link";
import { AMETHYST_MINT_ADDRESS, SMP_MINT_ADDRESS, RPC_URL } from "@/constants";
import { FaHome, FaBars, FaTimes, FaGem, FaExchangeAlt, FaWallet, FaSyncAlt } from "react-icons/fa";
import TreasuryBalance from "../../components/TreasuryBalance";
import styles from "../../styles/SwapPage.module.css";
import ConnectButton from "../../components/ConnectButton";
import { EmbeddedWalletContext } from "../../components/EmbeddedWalletProvider";

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
  const { wallet: embeddedWallet, getSecretKey } = useContext(EmbeddedWalletContext);
  const activeWalletAddress = publicKey?.toString() || embeddedWallet?.publicKey;
  const isWalletConnected = connected || !!embeddedWallet;
  const [amount, setAmount] = useState("");
  const [coinFrom, setCoinFrom] = useState("AMETHYST");
  const [coinTo, setCoinTo] = useState("SMP");
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
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
      setError("Please enter a valid amount.");
      return;
    }
    if (!isWalletConnected) {
      setError("Please connect your wallet first.");
      return;
    }
    if (coinFrom === coinTo) {
      setError("Please select different tokens to swap.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage("");

    try {
      const inputMint = TOKEN_MINTS[coinFrom].toString();
      const outputMint = TOKEN_MINTS[coinTo].toString();
      console.log("Swapping:", { inputMint, outputMint, amount, activeWalletAddress });

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
        setError(`${error}: ${message}`);
        return;
      }

      const swapTransactionBuf = Buffer.from(transaction, "base64");
      const swapTransaction = VersionedTransaction.deserialize(swapTransactionBuf);

      let signature;
      console.log("Wallet status:", { embeddedWallet, signTransaction, sendTransaction });

      if (embeddedWallet) {
        console.log("Using embedded wallet for signing");
        const password = prompt("Enter your wallet password to proceed:");
        if (!password) throw new Error("Password required for embedded wallet.");
        const secretKey = getSecretKey(password);
        if (!secretKey) throw new Error("Failed to decrypt secret key. Invalid password?");
        const keypair = Keypair.fromSecretKey(secretKey);
        swapTransaction.sign([keypair]);
        signature = await connection.sendRawTransaction(swapTransaction.serialize(), {
          skipPreflight: false,
          maxRetries: 2,
        });
      } else if (signTransaction && sendTransaction) {
        console.log("Using external wallet for signing");
        const signedTransaction = await signTransaction(swapTransaction);
        signature = await sendTransaction(signedTransaction, connection, {
          skipPreflight: false,
          maxRetries: 2,
        });
      } else {
        console.error("No valid signing method available", { embeddedWallet });
        throw new Error("Wallet signing method not available.");
      }

      const latestBlockHash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature,
      });

      setSuccessMessage(`Swap successful! Signature: ${signature}`);
      setTimeout(() => setSuccessMessage(""), 5000);
      checkBalance();
    } catch (error) {
      console.error("Error swapping coins:", error);
      setError(`Swap failed: ${error.message}`);
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
              {error && (
                <div className={styles.errorMessage}>
                  {error}
                </div>
              )}
              {successMessage && (
                <div className={styles.successMessage}>
                  <FaGem /> {successMessage}
                </div>
              )}
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