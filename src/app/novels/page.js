"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useRouter } from "next/navigation";
import { supabase } from "../../services/supabase/supabaseClient";
import {
  FaHome,
  FaExchangeAlt,
  FaBars,
  FaTimes,
  FaFeather,
  FaWallet,
} from "react-icons/fa";
import ConnectButton from "../../components/ConnectButton";
import { v4 as uuidv4 } from "uuid";
import LoadingPage from "../../components/LoadingPage";
import CountdownTimer from "../../components/CountdownTimer";
import { Transaction, Connection } from "@solana/web3.js";
import { RPC_URL } from "@/constants";
import styles from "../../styles/NovelsPage.module.css";

export default function NovelsPage() {
  const { connected, publicKey, sendTransaction } = useWallet();
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [novels, setNovels] = useState([]);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [pendingWithdrawal, setPendingWithdrawal] = useState(0);
  const [weeklyPoints, setWeeklyPoints] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [walletPanelOpen, setWalletPanelOpen] = useState(false);
  const connection = new Connection(RPC_URL);

  const toggleMenu = () => setMenuOpen((prev) => !prev);
  const toggleWalletPanel = () => setWalletPanelOpen((prev) => !prev);

  const handleNavigation = (path) => {
    router.push(path);
  };

  const checkBalance = async () => {
    if (!publicKey) return;

    try {
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id, weekly_points")
        .eq("wallet_address", publicKey.toString())
        .single();

      if (userError || !user) throw new Error("User not found");

      const userId = user.id;
      setWeeklyPoints(user.weekly_points || 0);

      const { data: walletBalance, error: balanceError } = await supabase
        .from("wallet_balances")
        .select("amount")
        .eq("user_id", userId)
        .single();

      if (balanceError) throw new Error("Error fetching balance");
      setBalance(walletBalance?.amount || 0);

      const { data: pendingData, error: pendingError } = await supabase
        .from("pending_withdrawals")
        .select("amount")
        .eq("user_id", userId)
        .eq("status", "pending");

      if (pendingError) throw new Error("Error fetching pending withdrawals");
      const totalPending = pendingData.reduce(
        (sum, withdrawal) => sum + withdrawal.amount,
        0
      );
      setPendingWithdrawal(totalPending);

      setLoading(false);
    } catch (error) {
      console.error("Error in checkBalance:", error);
      setErrorMessage(error.message);
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!connected || !publicKey) {
      setErrorMessage("Wallet not connected.");
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      setErrorMessage("Enter a valid amount.");
      return;
    }

    if (amount < 2500) {
      setErrorMessage("Minimum withdrawal is 2500 SMP.");
      return;
    }

    if (amount > balance) {
      setErrorMessage("Insufficient balance.");
      return;
    }

    setErrorMessage("");
    setLoading(true);

    try {
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("wallet_address", publicKey.toString())
        .single();

      if (userError || !user) throw new Error("User not found");

      const userId = user.id;
      const withdrawalId = uuidv4();

      const { error: insertError } = await supabase
        .from("pending_withdrawals")
        .insert({
          id: withdrawalId,
          user_id: userId,
          amount,
          status: "pending",
          createdat: new Date().toISOString(),
        });

      if (insertError) throw new Error(`Insert failed: ${insertError.message}`);

      const response = await fetch("/api/withdraw/tx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withdrawalId }),
      });

      const { transaction, blockhashInfo, error, message } =
        await response.json();
      if (error) throw new Error(message || "Failed to generate transaction");

      const tx = Transaction.from(Buffer.from(transaction, "base64"));
      const signature = await sendTransaction(tx, connection);

      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash: blockhashInfo.blockhash,
        lastValidBlockHeight: blockhashInfo.lastValidBlockHeight,
      });

      if (confirmation.value.err) throw new Error("Transaction failed");

      const { error: updateBalanceError } = await supabase
        .from("wallet_balances")
        .update({ amount: balance - amount })
        .eq("user_id", userId);

      if (updateBalanceError) throw new Error("Failed to update balance");

      const { error: updateWithdrawalError } = await supabase
        .from("pending_withdrawals")
        .update({ status: "completed" })
        .eq("id", withdrawalId);

      if (updateWithdrawalError)
        throw new Error("Failed to update withdrawal status");

      setErrorMessage("Withdrawal completed!");
      setWithdrawAmount("");
      await checkBalance();
    } catch (error) {
      console.error("Withdrawal error:", error);
      setErrorMessage(`Withdrawal failed: ${error.message}`);
      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("wallet_address", publicKey.toString())
        .single();

      if (user) {
        await supabase
          .from("pending_withdrawals")
          .delete()
          .eq("id", withdrawalId)
          .eq("user_id", user.id);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchNovels = async () => {
    try {
      const { data, error } = await supabase
        .from("novels")
        .select(`
          id,
          title,
          image,
          user_id,
          users:user_id (name)
        `);

      if (error) throw new Error(`Failed to fetch novels: ${error.message}`);
      console.log("Fetched novels:", data);
      setNovels(data);
    } catch (error) {
      console.error("Error fetching novels:", error);
      setErrorMessage(error.message);
    }
  };

  useEffect(() => {
    if (connected && publicKey) {
      setLoading(true);
      Promise.all([checkBalance(), fetchNovels()]).finally(() =>
        setLoading(false)
      );
    } else {
      fetchNovels().finally(() => setLoading(false));
    }
  }, [connected, publicKey]);

  if (loading) return <LoadingPage />;

  return (
    <div className={styles.nexusContainer}>
      {/* Floating Navbar */}
      <nav className={styles.nexusNavbar}>
        <div className={styles.navbarContent}>
          <Link
            href="/"
            onClick={() => handleNavigation("/")}
            className={styles.nexusLogo}
          >
            <img
              src="/images/logo.jpg"
              alt="Sempai HQ"
              className={styles.logoImage}
            />
            <span className={styles.logoText}>Sempai HQ</span>
          </Link>
          <button className={styles.menuButton} onClick={toggleMenu}>
            {menuOpen ? <FaTimes /> : <FaBars />}
          </button>
          <div
            className={`${styles.navItems} ${menuOpen ? styles.navItemsOpen : ""}`}
          >
            <Link
              href="/"
              onClick={() => handleNavigation("/")}
              className={styles.navItem}
            >
              <FaHome /> Home
            </Link>
            <Link
              href="/swap"
              onClick={() => handleNavigation("/swap")}
              className={styles.navItem}
            >
              <FaExchangeAlt /> Swap
            </Link>
            <ConnectButton className={styles.connectBtn} />
          </div>
        </div>
      </nav>

      {/* Header */}
      <header className={styles.nexusHeader}>
        <h1 className={styles.headerTitle}>Digital Library Nexus</h1>
        <p className={styles.headerTagline}>Unlock the Multiverse of Imagination</p>
        <CountdownTimer />
      </header>

      {/* Novels Grid */}
      <main className={styles.nexusGrid}>
        {novels.length > 0 ? (
          novels.map((novel) => (
            <div key={novel.id} className={styles.novelCard}>
              <Link
                href={`/novel/${novel.id}`}
                onClick={() => handleNavigation(`/novel/${novel.id}`)}
                className={styles.novelLink}
              >
                <img
                  src={novel.image}
                  alt={novel.title}
                  className={styles.novelCover}
                />
                <h3 className={styles.novelName}>{novel.title}</h3>
              </Link>
              <div className={styles.writerContainer}>
                <Link
                  href={`/writers-profile/${novel.user_id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNavigation(`/writers-profile/${novel.user_id}`);
                  }}
                  className={styles.writerLink}
                >
                  <FaFeather className={styles.featherIcon} />
                  {novel.users?.name || "Unknown Writer"}
                </Link>
              </div>
            </div>
          ))
        ) : (
          <p className={styles.noNovels}>No stories detected in the nexus...</p>
        )}
      </main>

      {/* Floating Wallet Panel */}
      {connected ? (
        <div
          className={`${styles.walletPanel} ${
            walletPanelOpen ? styles.walletPanelOpen : ""
          }`}
        >
          <button
            className={styles.walletToggle}
            onClick={toggleWalletPanel}
            aria-label="Toggle wallet panel"
          >
            <FaWallet />
            <span className={styles.walletSummary}>
              {balance} SMP | {weeklyPoints} Pts
            </span>
          </button>
          <div className={styles.walletContent}>
            <div className={styles.walletInfo}>
              <p>
                <span className={styles.balanceLabel}>Balance:</span> {balance}{" "}
                SMP
              </p>
              <p>
                <span className={styles.pointsLabel}>Points:</span>{" "}
                {weeklyPoints}
              </p>
              {pendingWithdrawal > 0 && (
                <p className={styles.pendingText}>
                  Pending: {pendingWithdrawal} SMP
                </p>
              )}
            </div>
            <div className={styles.withdrawSection}>
              <input
                type="number"
                min="2500"
                max={balance}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Amount (Min: 2500)"
                className={styles.withdrawInput}
              />
              <div className={styles.withdrawActions}>
                <button
                  onClick={handleWithdraw}
                  disabled={loading}
                  className={styles.withdrawBtn}
                >
                  Withdraw
                </button>
                <button
                  onClick={checkBalance}
                  disabled={loading}
                  className={styles.refreshBtn}
                >
                  Refresh
                </button>
              </div>
              {errorMessage && (
                <p className={styles.errorText}>{errorMessage}</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.connectCallout}>
          <p>Connect your wallet to access premium features (first two chapters free)</p>
          <WalletMultiButton className={styles.walletConnectBtn} />
        </div>
      )}
    </div>
  );
}