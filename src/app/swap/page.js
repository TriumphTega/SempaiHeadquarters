"use client";

import { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  Connection,
  PublicKey,
  VersionedTransaction,
  Keypair,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction
} from "@solana/web3.js";
import { getAssociatedTokenAddressSync, unpackAccount, createTransferInstruction, getAccount, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
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
  const [showATAConfirmation, setShowATAConfirmation] = useState(false);
  const [ataCreationCost, setAtaCreationCost] = useState(0);
  const [pendingSwapTransaction, setPendingSwapTransaction] = useState(null);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const router = useRouter();

  const checkBalance = async () => {
    if (!activeWalletAddress) return;

    try {
      let balance = 0;

      if (coinFrom === "SOL") {
        balance = (await connection.getBalance(new PublicKey(activeWalletAddress))) / LAMPORTS_PER_SOL;
      } else {
        const mintAddress = TOKEN_MINTS[coinFrom];
        if (!mintAddress) return;

        const ataAddress = getAssociatedTokenAddressSync(mintAddress, new PublicKey(activeWalletAddress));
        const ataInfo = await connection.getAccountInfo(ataAddress);

        if (ataInfo) {
          // FIXED: Correct parameters for unpackAccount (PublicKey first, then AccountInfo)
          const ata = unpackAccount(ataAddress, ataInfo);
          balance = Number(ata.amount) / 1_000_000; // 6 decimals (all non-SOL tokens here use 6)
        }
      }
      setBalance(balance);
    } catch (error) {
      // Ignore 429 rate limit errors - just keep last known balance
      if (error.message && error.message.includes('429')) {
        console.log('Rate limited, keeping last balance');
        return;
      }
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

  const handleATAConfirmation = async () => {
    setLoading(true);
    setShowATAConfirmation(false);
    setError(null);

    try {
      const swapData = pendingSwapTransaction;
      if (!swapData) throw new Error("No pending swap transaction");

      console.log("[handleATAConfirmation] Proceeding with swap after ATA creation confirmation");

      // Continue with the original swap logic
      const response = await fetch("/api/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userAddress: activeWalletAddress,
          amount: swapData.amount,
          inputMint: swapData.inputMint,
          outputMint: swapData.outputMint,
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
        } else {
          deserializedTx = actualTransaction;
        }
      } catch (deserializeError) {
        console.error("Transaction deserialization error:", deserializeError);
        throw new Error("Failed to deserialize swap transaction");
      }

      // Add ATA creation instruction if needed
      const wallet = new PublicKey(activeWalletAddress);
      const outputTokenMint = TOKEN_MINTS[swapData.coinTo];
      const outputATA = getAssociatedTokenAddressSync(outputTokenMint, wallet);
      
      // Check if we need to create ATA (this should be true since we're in this flow)
      const needsATA = !(await checkAtaExists(outputTokenMint, wallet));
      
      if (needsATA) {
        console.log("[handleATAConfirmation] Adding ATA creation to swap transaction");
        
        // Convert VersionedTransaction to regular Transaction to add ATA instruction
        const legacyTx = new Transaction();
        legacyTx.add(...deserializedTx.message.instructions);
        legacyTx.recentBlockhash = deserializedTx.message.recentBlockhash;
        legacyTx.feePayer = deserializedTx.message.staticAccountKeys[0];
        
        // Add ATA creation instruction at the beginning
        const ataInstruction = createAssociatedTokenAccountInstruction(
          wallet,        // Payer
          outputATA,      // ATA address
          wallet,        // Owner
          outputTokenMint // Mint
        );
        
        legacyTx.instructions.unshift(ataInstruction);
        deserializedTx = legacyTx;
      }

      // Rest of the signing and sending logic (same as original)
      let signature;
      
      if (embeddedWallet) {
        console.log("Using embedded wallet for signing");
        const secretKey = await getSecretKey();
        if (!secretKey) throw new Error("Failed to decrypt secret key. Please check your wallet setup.");
        const keypair = Keypair.fromSecretKey(secretKey);
        
        if (keypair.publicKey.toString() !== wallet.toString()) {
          throw new Error("Wallet address mismatch. Please ensure you're using the correct wallet.");
        }
        
        signature = await sendAndConfirmTransaction(connection, deserializedTx, [keypair], {
          skipPreflight: false,
          maxRetries: 2,
        });
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
        
        const status = await connection.getSignatureStatus(signature);
        if (status.value) {
          if (status.value.err) {
            throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
          } else if (status.value.confirmationStatus) {
            console.log("Transaction was confirmed despite error:", status.value.confirmationStatus);
          }
        } else {
          throw new Error("Transaction confirmation failed and status is unavailable");
        }
      }

      setSuccessMessage(`Swap completed successfully! Signature: ${signature}`);
      setAmount("");
      setTimeout(() => setSuccessMessage(""), 5000);
      await checkBalance();
    } catch (error) {
      console.error("Swap error:", error);
      setError(`Swap failed: ${error.message}`);
    } finally {
      setLoading(false);
      setPendingSwapTransaction(null);
    }
  };

  // Helper to Check if ATA Exists
  const checkAtaExists = async (mint, owner) => {
    try {
      const ata = getAssociatedTokenAddressSync(mint, owner);
      await getAccount(connection, ata);
      return true;
    } catch (e) {
      if (e.name === "TokenAccountNotFoundError") {
        return false;
      }
      throw e;
    }
  };

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

      // Check if user has ATA for output token (e.g., SMP when swapping to SMP)
      console.log("[handleSwap] Checking ATA for output token:", coinTo);
      const wallet = new PublicKey(activeWalletAddress);
      const outputTokenMint = TOKEN_MINTS[coinTo];
      
      const hasOutputATA = await checkAtaExists(outputTokenMint, wallet);
      if (!hasOutputATA) {
        console.log("[handleSwap] User needs ATA for", coinTo);
        
        // Calculate ATA creation cost
        const rentExemption = await connection.getMinimumBalanceForRentExemption(165); // ATA size
        const ataCostSOL = rentExemption / 1_000_000_000;
        
        console.log("[handleSwap] ATA creation cost:", ataCostSOL, "SOL");
        
        // Store pending swap details and show confirmation
        setPendingSwapTransaction({
          inputMint,
          outputMint,
          amount: parseFloat(amount),
          coinFrom,
          coinTo,
          ataCost: ataCostSOL
        });
        setAtaCreationCost(ataCostSOL);
        setShowATAConfirmation(true);
        setLoading(false);
        return; // Exit here, wait for user confirmation
      }

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

              <button
                onClick={handleSwap}
                className={styles.swapButton}
                disabled={loading}
              >
                {loading ? (
                  <span className={styles.swirlIcon}></span>
                ) : (
                  <>
                    <FaExchangeAlt />
                    Initiate Swap
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <p className={styles.footerText}> 2025 Sempai HQ. All rights reserved.</p>
      </footer>

      {/* Balance Modal */}
      <BalanceModal
        isOpen={showBalanceModal}
        onClose={() => setShowBalanceModal(false)}
        activeWalletAddress={activeWalletAddress}
      />

      {/* Send Modal */}
      <SendModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        activeWalletAddress={activeWalletAddress}
      />

      {/* ATA Creation Confirmation Modal for Swaps */}
      {showATAConfirmation && (
        <>
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
          }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(20,20,28,0.95), rgba(12,12,18,0.98))',
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '420px',
              width: '90%',
              border: '1px solid rgba(243,99,22,0.2)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(243,99,22,0.1)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(243,99,22,0.2), rgba(255,98,0,0.15))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(243,99,22,0.3)',
                }}>
                  <FaExchangeAlt size={20} color="#f36316" />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '20px', fontWeight: '600' }}>
                    Create Token Account
                  </h3>
                  <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: '14px' }}>
                    Required for {pendingSwapTransaction?.coinTo || 'token'} swap
                  </p>
                </div>
              </div>

              <div style={{
                background: 'rgba(243,99,22,0.1)',
                border: '1px solid rgba(243,99,22,0.2)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
              }}>
                <p style={{ margin: '0 0 12px', color: '#9ca3af', fontSize: '14px' }}>
                  You need a token account to receive {pendingSwapTransaction?.coinTo || 'tokens'}.
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#fff', fontSize: '16px', fontWeight: '500' }}>
                    Account creation cost:
                  </span>
                  <span style={{ color: '#f36316', fontSize: '18px', fontWeight: '600' }}>
                    {ataCreationCost.toFixed(6)} SOL
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => {
                    setShowATAConfirmation(false);
                    setPendingSwapTransaction(null);
                    setLoading(false);
                  }}
                  style={{
                    flex: 1,
                    padding: '14px 20px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#9ca3af',
                    fontSize: '16px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleATAConfirmation}
                  style={{
                    flex: 1,
                    padding: '14px 20px',
                    background: 'linear-gradient(135deg, #f36316, #ff6200)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 16px rgba(243,99,22,0.2)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(243,99,22,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(243,99,22,0.2)';
                  }}
                >
                  {loading ? 'Creating...' : 'Create & Swap'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}