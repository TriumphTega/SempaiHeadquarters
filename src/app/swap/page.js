"use client";

import { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, VersionedTransaction, Keypair } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, unpackAccount } from "@solana/spl-token";
import Link from "next/link";
import { AMETHYST_MINT_ADDRESS, SMP_MINT_ADDRESS, USDC_MINT_ADDRESS, RPC_URL } from "@/constants";
import { FaHome, FaBars, FaGem, FaExchangeAlt, FaWallet, FaSyncAlt, FaPaperPlane, FaQrcode } from "react-icons/fa";
import TreasuryBalance from "../../components/TreasuryBalance";
import styles from "../../styles/SwapPage.module.css";
import ConnectButton from "../../components/ConnectButton";
import { EmbeddedWalletContext } from "../../components/EmbeddedWalletProvider";
import BalanceModal from "../../components/BalanceModal";
import SendModal from "../../components/SendModal";

const connection = new Connection(RPC_URL, "confirmed");

// Define allowed tokens (mix of Jupiter and Meteora supported tokens)
const TOKEN_MINTS = {
  SOL: new PublicKey("So11111111111111111111111111111111111111112"),
  JUP: new PublicKey("JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN"),
  USDC: USDC_MINT_ADDRESS,
  AMETHYST: AMETHYST_MINT_ADDRESS,
  SMP: SMP_MINT_ADDRESS,
};

export default function SwapPage() {
  const { connected, publicKey, sendTransaction, signTransaction } = useWallet();
  const { wallet: embeddedWallet, getSecretKey, signAndSendTransaction } = useContext(EmbeddedWalletContext);
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
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const router = useRouter();

  const checkBalance = async () => {
    if (!activeWalletAddress) return;

    try {
      const mintAddress = TOKEN_MINTS[coinFrom];
      let balance = 0;

      if (coinFrom === "SOL") {
        const solBalance = await connection.getBalance(new PublicKey(activeWalletAddress));
        balance = solBalance / 1_000_000_000;
      } else {
        const ataAddress = getAssociatedTokenAddressSync(mintAddress, new PublicKey(activeWalletAddress));
        const ataInfo = await connection.getAccountInfo(ataAddress);
        if (ataInfo) {
          const ata = unpackAccount(ataAddress, ataInfo);
          balance = Number(ata.amount) / 1_000_000;
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

  useEffect(() => {
    const handleOpenSendModal = () => setShowSendModal(true);
    window.addEventListener('openSendModal', handleOpenSendModal);
    return () => window.removeEventListener('openSendModal', handleOpenSendModal);
  }, []);

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

      const response = await fetch("/api/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userAddress: activeWalletAddress,
          amount: parseFloat(amount),
          inputMint,
          outputMint,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `API error: ${response.status}`);
      }

      const { transaction, lastValidBlockHeight } = await response.json();

      if (!transaction) {
        throw new Error("No transaction received from server");
      }

      const swapTransactionBuf = Buffer.from(transaction, "base64");
      const deserializedTx = VersionedTransaction.deserialize(swapTransactionBuf);

      let signature;

      if (embeddedWallet) {
        const secretKey = await getSecretKey();
        if (!secretKey) throw new Error("Failed to decrypt secret key.");
        
        const keypair = Keypair.fromSecretKey(secretKey);
        if (keypair.publicKey.toString() !== activeWalletAddress) {
          throw new Error("Wallet address mismatch.");
        }
        
        deserializedTx.sign([keypair]);
        const serializedTx = deserializedTx.serialize();
        
        signature = await connection.sendRawTransaction(serializedTx, {
          skipPreflight: false,
          maxRetries: 3,
          preflightCommitment: 'confirmed',
        });
      } else if (signTransaction && sendTransaction) {
        const signedTransaction = await signTransaction(deserializedTx);
        signature = await sendTransaction(signedTransaction, connection, {
          skipPreflight: false,
          maxRetries: 2,
        });
      } else {
        throw new Error("Wallet signing method not available.");
      }

      const { blockhash, lastValidBlockHeight: freshBlockHeight } = await connection.getLatestBlockhash();
      const validBlockHeight = lastValidBlockHeight || freshBlockHeight;
      
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight: validBlockHeight,
        commitment: 'confirmed',
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
                  <option value="USDC">USDC</option>
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>To</label>
                <select value={coinTo} onChange={(e) => setCoinTo(e.target.value)} className={styles.select}>
                  <option value="SOL">SOL</option>
                  <option value="JUP">JUP</option>
                  <option value="AMETHYST">Amethyst</option>
                  <option value="SMP">SMP</option>
                  <option value="USDC">USDC</option>
                </select>
              </div>
              
              {/* Your Portfolio */}
              <div className={styles.portfolioSection}>
                <div className={styles.portfolioTitle}>Your Portfolio</div>
                <div className={styles.actionButtons}>
                  <button
                    onClick={() => setShowBalanceModal(true)}
                    className={styles.balanceButton}
                  >
                    <FaWallet /> View Balances
                  </button>
                  <button
                    onClick={() => setShowSendModal(true)}
                    className={styles.sendButton}
                  >
                    <FaPaperPlane /> Send
                  </button>
                  <button
                    onClick={() => setShowBalanceModal(true)}
                    className={styles.receiveButton}
                  >
                    <FaQrcode /> Receive
                  </button>
                </div>
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

      {/* Modals */}
      <BalanceModal 
        isOpen={showBalanceModal} 
        onClose={() => setShowBalanceModal(false)}
        activeWalletAddress={activeWalletAddress}
      />
      <SendModal 
        isOpen={showSendModal} 
        onClose={() => setShowSendModal(false)}
        activeWalletAddress={activeWalletAddress}
      />
    </div>
  );
}