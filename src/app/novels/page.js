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
  FaEye,
  FaSearch,
  FaClock,
} from "react-icons/fa";
import ConnectButton from "../../components/ConnectButton";
import { v4 as uuidv4 } from "uuid";
import LoadingPage from "../../components/LoadingPage";
import { Transaction, Connection } from "@solana/web3.js";
import { RPC_URL } from "@/constants";
import styles from "../../styles/NovelsPage.module.css";

const TAG_OPTIONS = [
  { value: "Action", label: "Action" },
  { value: "Adult(18+)", label: "Adult(18+)" }, // Added Adult(18+) tag
  { value: "Adventure", label: "Adventure" },
  { value: "Comedy", label: "Comedy" },
  { value: "Drama", label: "Drama" },
  { value: "Fantasy", label: "Fantasy" },
  { value: "Horror", label: "Horror" },
  { value: "Mystery", label: "Mystery" },
  { value: "Romance", label: "Romance" },
  { value: "Sci-Fi", label: "Sci-Fi" },
  { value: "Slice of Life", label: "Slice of Life" },
  { value: "Supernatural", label: "Supernatural" },
  { value: "Thriller", label: "Thriller" },
  { value: "Historical", label: "Historical" },
  { value: "Sports", label: "Sports" },
  { value: "Psychological", label: "Psychological" },
  { value: "Shonen", label: "Shonen" },
  { value: "Shojo", label: "Shojo" },
  { value: "Seinen", label: "Seinen" },
  { value: "Josei", label: "Josei" },
];

export default function NovelsPage() {
  const { connected, publicKey, sendTransaction } = useWallet();
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [novels, setNovels] = useState([]);
  const [filteredNovels, setFilteredNovels] = useState([]);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [pendingWithdrawal, setPendingWithdrawal] = useState(0);
  const [weeklyPoints, setWeeklyPoints] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [walletPanelOpen, setWalletPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [timeLeft, setTimeLeft] = useState(null);
  const connection = new Connection(RPC_URL);

  const toggleMenu = () => setMenuOpen((prev) => !prev);
  const toggleWalletPanel = () => setWalletPanelOpen((prev) => !prev);

  const handleNavigation = (path) => router.push(path);

  const checkBalance = async () => {
    if (!publicKey) return;
    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("id, weekly_points")
        .eq("wallet_address", publicKey.toString())
        .single();

      if (error || !user) throw new Error("User not found");
      setWeeklyPoints(user.weekly_points || 0);

      const { data: walletBalance } = await supabase
        .from("wallet_balances")
        .select("amount")
        .eq("user_id", user.id)
        .eq("currency", "SMP")
        .eq("chain", "SOL")
        .single();

      setBalance(walletBalance?.amount || 0);

      const { data: pendingData } = await supabase
        .from("pending_withdrawals")
        .select("amount")
        .eq("user_id", user.id)
        .eq("status", "pending");

      const totalPending = pendingData?.reduce((sum, w) => sum + w.amount, 0) || 0;
      setPendingWithdrawal(totalPending);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => { /* Same as before, omitted for brevity */ };

  const fetchNovels = async () => {
    try {
      const { data: novelsData, error: novelsError } = await supabase
        .from("novels")
        .select(`
          id,
          title,
          image,
          summary,
          tags,
          user_id,
          users:user_id (name)
        `);

      if (novelsError) throw new Error(`Failed to fetch novels: ${novelsError.message}`);

      const { data: interactionsData, error: interactionsError } = await supabase
        .from("novel_interactions")
        .select("novel_id, user_id");

      if (interactionsError) throw new Error(`Failed to fetch interactions: ${interactionsError.message}`);

      const viewerCounts = interactionsData.reduce((acc, { novel_id, user_id }) => {
        if (!acc[novel_id]) acc[novel_id] = new Set();
        acc[novel_id].add(user_id);
        return acc;
      }, {});

      const enrichedNovels = novelsData.map((novel) => ({
        ...novel,
        uniqueViewers: viewerCounts[novel.id] ? viewerCounts[novel.id].size : 0,
      }));

      setNovels(enrichedNovels);
      setFilteredNovels(enrichedNovels);
    } catch (error) {
      console.error("Error fetching novels:", error);
      setErrorMessage(error.message);
    }
  };

  const filterNovels = () => {
    let result = novels;
    if (searchQuery) {
      result = result.filter(
        (novel) =>
          novel.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          novel.users?.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (selectedTag) {
      result = result.filter((novel) =>
        novel.tags?.includes(selectedTag)
      );
    }
    setFilteredNovels(result);
  };

  useEffect(() => {
    async function fetchCountdown() {
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "weekly_reward_timer")
        .single();

      if (error || !data) {
        setTimeLeft("Unknown");
      } else {
        const lastResetTime = new Date(data.value);
        const nextResetTime = getNextSundayMidnight(lastResetTime);
        updateCountdown(nextResetTime);
      }
    }

    function getNextSundayMidnight(lastResetTime) {
      const nextSunday = new Date(lastResetTime);
      nextSunday.setDate(lastResetTime.getDate() + ((7 - lastResetTime.getDay()) % 7 || 7));
      nextSunday.setHours(0, 0, 0, 0);
      return nextSunday;
    }

    function updateCountdown(endTime) {
      const interval = setInterval(() => {
        const now = new Date();
        const timeDiff = endTime - now;

        if (timeDiff <= 0) {
          clearInterval(interval);
          setTimeLeft("🔄 Resetting...");
          resetTimer();
        } else {
          const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((timeDiff / (1000 * 60 * 60)) % 24);
          const minutes = Math.floor((timeDiff / (1000 * 60)) % 60);
          const seconds = Math.floor((timeDiff / 1000) % 60);
          setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        }
      }, 1000);

      return () => clearInterval(interval);
    }

    async function resetTimer() {
      const newTime = new Date().toISOString();
      const { error } = await supabase
        .from("settings")
        .update({ value: newTime })
        .eq("key", "weekly_reward_timer");

      if (error) {
        console.error("Timer reset failed:", error.message);
        setTimeLeft("Error");
      } else {
        fetchCountdown();
      }
    }

    fetchCountdown();
  }, []);

  useEffect(() => {
    filterNovels();
  }, [searchQuery, selectedTag, novels]);

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
    <div className={styles.libraryContainer}>
      {/* Navbar */}
      <nav className={styles.libraryNavbar}>
        <div className={styles.navbarContent}>
          <Link href="/" className={styles.libraryLogo}>
            <img src="/images/logo.jpeg" alt="SempaiHQ" className={styles.logoImage} />
            <span className={styles.logoText}>SempaiHQ Library</span>
          </Link>
          <button className={styles.menuButton} onClick={toggleMenu}>
            {menuOpen ? <FaTimes /> : <FaBars />}
          </button>
          <div className={`${styles.navItems} ${menuOpen ? styles.navItemsOpen : ""}`}>
            <Link href="/" className={styles.navItem}><FaHome /> Home</Link>
            <Link href="/swap" className={styles.navItem}><FaExchangeAlt /> Swap</Link>
            <ConnectButton className={styles.connectBtn} />
          </div>
        </div>
      </nav>

      {/* Rewards Belt */}
      <div className={styles.rewardsBelt}>
        <div className={styles.beltContent}>
          {/* <span className={styles.rewardItem}>
            🎉 Weekly Reward: Users will be rewarded <strong>2,000,000 SMP Tokens</strong> every week based on points! 🌟
          </span> */}
          <span className={styles.rewardItem}>
            👑 Our First chapter contest is Live. 🏆
          </span>
        </div>
      </div>

      {/* Header with Search */}
      <header className={styles.libraryHeader}>
        <h1 className={styles.headerTitle}>SempaiHQ Library</h1>
        <p className={styles.headerTagline}>Unlock the Nexus of Imagination</p>
        <div className={styles.searchBar}>
          <FaSearch className={styles.searchIcon} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or author..."
            className={styles.searchInput}
          />
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className={styles.tagSelect}
          >
            <option value="">All Tags</option>
            {TAG_OPTIONS.map((tag) => (
              <option key={tag.value} value={tag.value}>{tag.label}</option>
            ))}
          </select>
        </div>
      </header>

      {/* Novels Grid */}
      <main className={styles.libraryGrid}>
        {filteredNovels.length > 0 ? (
          filteredNovels.map((novel) => (
            <div key={novel.id} className={styles.bookCard}>
              <Link href={`/novel/${novel.id}`} className={styles.bookLink}>
                <img src={novel.image} alt={novel.title} className={styles.bookCover} />
                <div className={styles.bookInfo}>
                  <h3 className={styles.bookTitle}>{novel.title}</h3>
                  <p className={styles.bookSummary}>{novel.summary?.substring(0, 100)}...</p>
                </div>
              </Link>
              <div className={styles.bookMeta}>
                <Link href={`/writers-profile/${novel.user_id}`} className={styles.authorLink}>
                  <FaFeather /> {novel.users?.name || "Unknown"}
                </Link>
                <span><FaEye /> {novel.uniqueViewers}</span>
                {novel.tags?.includes("Adult(18+)") && (
                  <span className={styles.adultTag}>18+ Adult</span>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className={styles.noBooks}>No novels found in the library...</p>
        )}
      </main>

      {/* Wallet Panel */}
      {connected && (
        <div className={`${styles.walletPanel} ${walletPanelOpen ? styles.walletPanelOpen : ""}`}>
          <button className={styles.walletToggle} onClick={toggleWalletPanel}>
            <FaWallet />
            <span className={styles.walletSummary}>{balance} SMP | {weeklyPoints} Pts</span>
          </button>
          <div className={styles.walletCountdown}>
            <FaClock /> <span>{timeLeft || "Loading..."}</span>
          </div>
          <div className={styles.walletContent}>
            <div className={styles.walletInfo}>
              <p><span>Balance:</span> {balance} SMP</p>
              <p><span>Points:</span> {weeklyPoints}</p>
              {pendingWithdrawal > 0 && <p>Pending: {pendingWithdrawal} SMP</p>}
            </div>
            <div className={styles.withdrawSection}>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Amount (Min: 2500)"
                className={styles.withdrawInput}
              />
              <div className={styles.withdrawActions}>
                <button onClick={handleWithdraw} disabled={loading}>Withdraw</button>
                <button onClick={checkBalance} disabled={loading}>Refresh</button>
              </div>
              {errorMessage && <p className={styles.errorText}>{errorMessage}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}