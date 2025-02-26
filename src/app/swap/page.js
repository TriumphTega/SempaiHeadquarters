"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, unpackAccount } from "@solana/spl-token";
import Link from "next/link";
import { supabase } from "../../services/supabase/supabaseClient";
import { AMETHYST_MINT_ADDRESS, RPC_URL } from "@/constants";
import { FaHome, FaBars, FaTimes, FaGem, FaExchangeAlt, FaWallet, FaSyncAlt } from "react-icons/fa";
import TreasuryBalance from "../../components/TreasuryBalance";
import LoadingPage from "../../components/LoadingPage";
import styles from "../../styles/SwapPage.module.css";
import ConnectButton from "../../components/ConnectButton";


const connection = new Connection(RPC_URL);

export default function SwapPage() {
  const { connected, publicKey, sendTransaction } = useWallet();
  const [amount, setAmount] = useState("");
  const [coinFrom, setCoinFrom] = useState("Amethyst");
  const [coinTo, setCoinTo] = useState("SMP");
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  const checkBalance = async () => {
    if (!publicKey) return;

    try {
      const amethystAtaAddress = getAssociatedTokenAddressSync(AMETHYST_MINT_ADDRESS, publicKey);
      const amethystAtaInfo = await connection.getAccountInfo(amethystAtaAddress);
      if (!amethystAtaInfo) {
        setBalance(0);
        return;
      }

      const amethystAta = unpackAccount(amethystAtaAddress, amethystAtaInfo);
      setBalance(Number(amethystAta.amount) / 1_000_000);
    } catch (error) {
      console.error("Error fetching balance:", error);
      setBalance(0);
    }
  };

  useEffect(() => {
    if (connected) checkBalance();
  }, [connected, publicKey]);

  const handleSwap = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    if (!connected) {
      alert("Please connect your wallet first.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/swap", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userAddress: publicKey.toString(), amethystAmount: parseFloat(amount) }),
      }).then((r) => r.json());

      const { transaction, error, message } = response;

      if (error) {
        alert(`${error}: ${message}`);
        return;
      }

      const signature = await sendTransaction(Transaction.from(Buffer.from(transaction, "base64")), connection);
      alert(`Swap successful! Signature: ${signature}`);
      checkBalance(); // Refresh balance after swap
    } catch (error) {
      console.error("Error swapping coins:", error);
      alert("Swap failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  if (loading) return <LoadingPage />;

  return (
    <div className={styles.page}>
      {/* Navbar */}
      <nav className={styles.navbar}>
        <div className={styles.navContainer}>
          <Link href="/" className={styles.logoLink}>
            <img src="/images/logo.jpg" alt="Sempai HQ" className={styles.logo} />
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
          {!connected ? (
            <div className={styles.connectPrompt}>
              <FaWallet className={styles.walletIcon} />
              <p>Please connect your wallet to initiate a swap.</p>
              <ConnectButton className={styles.connectButtonPrompt} />
            </div>
          ) : (
            <div className={styles.swapForm}>
              <h2 className={styles.formTitle}>Swap Interface</h2>
              <div className={styles.balanceDisplay}>
                <FaGem /> Balance: {balance.toFixed(2)} Amethyst
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
                  <option value="Amethyst">Amethyst</option>
                  <option value="SMP">SMP</option>
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>To</label>
                <select value={coinTo} onChange={(e) => setCoinTo(e.target.value)} className={styles.select}>
                  <option value="SMP">SMP</option>
                  <option value="Amethyst">Amethyst</option>
                </select>
              </div>

              <button onClick={handleSwap} className={styles.swapButton} disabled={loading}>
                <FaExchangeAlt /> {loading ? "Swapping..." : "Initiate Swap"}
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