"use client";

import { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, VersionedTransaction, Keypair } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, unpackAccount } from "@solana/spl-token";
import Link from "next/link";
import { AMETHYST_MINT_ADDRESS, SMP_MINT_ADDRESS, USDC_MINT_ADDRESS, SKR_MINT_ADDRESS, RPC_URL } from "@/constants";
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
  SKR: SKR_MINT_ADDRESS,
};

// Token logos for display
const TOKEN_LOGOS = {
  SOL: "/images/sol-logo.png",
  JUP: "/images/jup-logo.png",
  USDC: "/images/usdc-logo.png",
  AMETHYST: "/images/amethyst-logo.jpeg",
  SMP: "/images/smp-logo.jpeg",
  SKR: "/images/skr-logo.png",
};

// Token names for display
const TOKEN_NAMES = {
  SOL: "Solana",
  JUP: "Jupiter",
  USDC: "USD Coin",
  AMETHYST: "Amethyst",
  SMP: "SMP",
  SKR: "SKR",
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
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const router = useRouter();

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.tokenDropdown')) {
        setShowFromDropdown(false);
        setShowToDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `API error: ${response.status}`);
    }

    // === SMP SPECIAL HANDLING (the essence of your dApp) ===
    if (data.type === "jup_redirect") {
      window.open(data.url, "_blank");
      setSuccessMessage("Opened Jupiter for SMP swap (best route)");
      setTimeout(() => setSuccessMessage(""), 4000);
      setLoading(false);
      return;
    }

    // Normal on-chain swap (other tokens)
    if (!data.transaction) {
      throw new Error("No transaction received from server");
    }

    const swapTransactionBuf = Buffer.from(data.transaction, "base64");
    const deserializedTx = VersionedTransaction.deserialize(swapTransactionBuf);

    // ... (your existing signing logic stays exactly the same) ...
    let signature;

    const isUsingEmbeddedWallet = !connected && embeddedWallet && activeWalletAddress === embeddedWallet.publicKey;

    if (isUsingEmbeddedWallet) {
      const secretKey = await getSecretKey();
      if (!secretKey) throw new Error("Failed to decrypt secret key.");
      const keypair = Keypair.fromSecretKey(secretKey);
      deserializedTx.sign([keypair]);
      const serializedTx = deserializedTx.serialize();
      signature = await connection.sendRawTransaction(serializedTx, { skipPreflight: false, maxRetries: 3 });
    } else if (signTransaction && sendTransaction) {
      const signedTransaction = await signTransaction(deserializedTx);
      signature = await sendTransaction(signedTransaction, connection, { skipPreflight: false, maxRetries: 2 });
    } else {
      throw new Error("Wallet signing method not available.");
    }

    const { blockhash, lastValidBlockHeight: freshBlockHeight } = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight: data.lastValidBlockHeight || freshBlockHeight,
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
                <div className={styles.tokenSelectWrapper}>
                  <img src={TOKEN_LOGOS[coinFrom]} alt={coinFrom} className={styles.tokenLogo} />
                  <select 
                    value={coinFrom} 
                    onChange={(e) => setCoinFrom(e.target.value)} 
                    className={styles.tokenSelect}
                  >
                    {Object.keys(TOKEN_MINTS).map((token) => (
                      <option key={token} value={token}>{TOKEN_NAMES[token]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>To</label>
                <div className={styles.tokenSelectWrapper}>
                  <img src={TOKEN_LOGOS[coinTo]} alt={coinTo} className={styles.tokenLogo} />
                  <select 
                    value={coinTo} 
                    onChange={(e) => setCoinTo(e.target.value)} 
                    className={styles.tokenSelect}
                  >
                    {Object.keys(TOKEN_MINTS).map((token) => (
                      <option key={token} value={token}>{TOKEN_NAMES[token]}</option>
                    ))}
                  </select>
                </div>
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