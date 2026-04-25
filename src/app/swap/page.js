"use client";

import { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, VersionedTransaction, Keypair } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, unpackAccount } from "@solana/spl-token";
import Link from "next/link";
import { AMETHYST_MINT_ADDRESS, SMP_MINT_ADDRESS, USDC_MINT_ADDRESS, RPC_URL } from "@/constants";
import { FaHome, FaBars, FaTimes, FaGem, FaExchangeAlt, FaWallet, FaSyncAlt, FaPaperPlane, FaQrcode } from "react-icons/fa";
import TreasuryBalance from "../../components/TreasuryBalance";
import styles from "../../styles/SwapPage.module.css";
import ConnectButton from "../../components/ConnectButton";
import { EmbeddedWalletContext } from "../../components/EmbeddedWalletProvider";
import BalanceModal from "../../components/BalanceModal";
import SendModal from "../../components/SendModal";

const connection = new Connection(RPC_URL, "confirmed");

// Define allowed tokens
const TOKEN_MINTS = {
  SOL: new PublicKey("So11111111111111111111111111111111111111112"),
  JUP: new PublicKey("JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN"),
  AMETHYST: AMETHYST_MINT_ADDRESS,
  SMP: SMP_MINT_ADDRESS,
  USDC: USDC_MINT_ADDRESS,
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
        balance = solBalance / 1_000_000_000; // 9 decimals
      } else {
        const ataAddress = getAssociatedTokenAddressSync(mintAddress, new PublicKey(activeWalletAddress));
        const ataInfo = await connection.getAccountInfo(ataAddress);
        if (ataInfo) {
          // ✅ FIXED: Correct parameters for unpackAccount (PublicKey first, then AccountInfo)
          const ata = unpackAccount(ataAddress, ataInfo);
          balance = Number(ata.amount) / 1_000_000; // 6 decimals (all non-SOL tokens here use 6)
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
      }).then((r) => r.json());

      const { transaction, swapTransaction: jupiterSwapTransaction, lastValidBlockHeight: jupiterBlockHeight, error: apiError, message } = response;

      if (apiError) {
        setError(`${apiError}: ${message || ""}`);
        return;
      }

      // Handle both V1 (swapTransaction) and V2 (transaction) response formats
      const actualTransaction = jupiterSwapTransaction || transaction;
      
      if (!actualTransaction) {
        throw new Error("No transaction received from server");
      }

      let deserializedTx;
      try {
        if (typeof actualTransaction === 'string') {
          const swapTransactionBuf = Buffer.from(actualTransaction, "base64");
          deserializedTx = VersionedTransaction.deserialize(swapTransactionBuf);
        } else if (actualTransaction instanceof Buffer) {
          deserializedTx = VersionedTransaction.deserialize(actualTransaction);
        } else if (actualTransaction.data) {
          // Jupiter V2 might return { data: "base64string", ... }
          const swapTransactionBuf = Buffer.from(actualTransaction.data, "base64");
          deserializedTx = VersionedTransaction.deserialize(swapTransactionBuf);
        } else {
          throw new Error("Unknown transaction format from Jupiter API");
        }
        
        console.log("Transaction deserialized successfully");
        console.log("Version:", deserializedTx.version);
      } catch (deserializeError) {
        console.error("Failed to deserialize transaction:", deserializeError);
        throw new Error(`Invalid transaction format from Jupiter API: ${deserializeError.message}`);
      }

      let signature;
      console.log("Wallet status:", { embeddedWallet, signTransaction, sendTransaction });

      if (embeddedWallet) {
        console.log("Using embedded wallet for signing");
        const secretKey = await getSecretKey();
        if (!secretKey) throw new Error("Failed to decrypt secret key. Please check your wallet setup.");
        const keypair = Keypair.fromSecretKey(secretKey);
        
        // Debug: Check if the keypair matches the taker address
        console.log("Keypair public key:", keypair.publicKey.toString());
        console.log("Expected taker address:", activeWalletAddress);
        
        if (keypair.publicKey.toString() !== activeWalletAddress) {
          throw new Error("Wallet address mismatch. Please ensure you're using the correct wallet.");
        }
        
        console.log("Signing transaction with keypair...");
        deserializedTx.sign([keypair]);
        
        console.log("Transaction signed successfully");
        console.log("Number of signatures:", deserializedTx.signatures.length);
        console.log("Signer public key:", keypair.publicKey.toString());
        
        // Verify the transaction is actually signed
        if (deserializedTx.signatures.length === 0) {
          throw new Error("Transaction was not signed - no signatures found");
        }
        
        console.log("Transaction signed, attempting to send...");
        
        try {
          const serializedTx = deserializedTx.serialize();
          console.log("Transaction serialized, length:", serializedTx.length);
          
          signature = await connection.sendRawTransaction(serializedTx, {
            skipPreflight: false,
            maxRetries: 3,
            preflightCommitment: 'confirmed',
          });
          
          console.log("Transaction sent with signature:", signature);
          
          // Validate signature is not the placeholder
          if (!signature || signature === '1111111111111111111111111111111111111111111111111111111111111111') {
            throw new Error("Invalid signature received from network");
          }
        } catch (sendError) {
          console.error("Send transaction error:", sendError);
          throw new Error(`Failed to send transaction: ${sendError.message}`);
        }
      } else if (signTransaction && sendTransaction) {
        console.log("Using external wallet for signing");
        const signedTransaction = await signTransaction(deserializedTx);
        signature = await sendTransaction(signedTransaction, connection, {
          skipPreflight: false,
          maxRetries: 2,
        });
      } else {
        throw new Error("Wallet signing method not available.");
      }

      // Get fresh blockhash for confirmation
      const { blockhash, lastValidBlockHeight: freshBlockHeight } = await connection.getLatestBlockhash();
      
      try {
        await connection.confirmTransaction({
          signature,
          blockhash,
          lastValidBlockHeight: freshBlockHeight,
          commitment: 'confirmed',
        });
      } catch (confirmError) {
        console.error("Transaction confirmation error:", confirmError);
        
        // Check if transaction was actually confirmed despite the error
        const status = await connection.getSignatureStatus(signature);
        if (status.value) {
          if (status.value.err) {
            throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
          } else if (status.value.confirmationStatus) {
            console.log("Transaction was confirmed despite error:", status.value.confirmationStatus);
          } else {
            throw new Error("Transaction confirmation status unknown");
          }
        } else {
          // If transaction expired, it might be due to old blockhash from Jupiter
          if (confirmError.message.includes('expired') || confirmError.message.includes('block height exceeded')) {
            throw new Error("Transaction expired due to network delay. Please try again.");
          } else {
            throw new Error(`Transaction confirmation failed: ${confirmError.message}`);
          }
        }
      }

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