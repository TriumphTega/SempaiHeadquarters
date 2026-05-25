// src/app/novels/page.js
"use client";

import { useState, useEffect, useContext } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
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
  FaSpinner,
  FaGem,
  FaStar,
} from "react-icons/fa";
import ConnectButton from "../../components/ConnectButton";
import { v4 as uuidv4 } from "uuid";
import LoadingPage from "../../components/LoadingPage";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, unpackAccount } from "@solana/spl-token";
import { RPC_URL, SMP_MINT_ADDRESS, AMETHYST_MINT_ADDRESS } from "@/constants";
import { EmbeddedWalletContext } from "../../components/EmbeddedWalletProvider";
import styles from "../../styles/NovelsPage.module.css";

const TAG_OPTIONS = [
  { value: "Action", label: "Action" },
  { value: "Adult(18+)", label: "Adult(18+)" },
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

const MIN_WITHDRAWAL = 2500;

export default function NovelsPage() {
  const { connected, publicKey } = useWallet();
  const { wallet: embeddedWallet } = useContext(EmbeddedWalletContext);
  const activePublicKey = publicKey || (embeddedWallet ? embeddedWallet.publicKey : null);
  const isWalletConnected = connected || !!embeddedWallet;
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [smpBalance, setSmpBalance] = useState(null);
  const [amethystBalance, setAmethystBalance] = useState(null);
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
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [showProfileWarning, setShowProfileWarning] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false); // New state for success popup
  const [successDetails, setSuccessDetails] = useState({ amount: 0, signature: "" }); // Store withdrawal details
  const connection = new Connection(RPC_URL, "confirmed");

  const toggleMenu = () => setMenuOpen((prev) => !prev);
  const toggleWalletPanel = () => setWalletPanelOpen((prev) => !prev);

  const handleNavigation = (path) => router.push(path);

  const fetchSmpBalanceOnChain = async () => {
    if (!activePublicKey) return 0;
    
    try {
      const smpMintPublicKey = SMP_MINT_ADDRESS;
      const userPublicKey = new PublicKey(activePublicKey);

      console.log("[fetchSmpBalanceOnChain] Fetching SMP balance for:", activePublicKey.toString());
      console.log("[fetchSmpBalanceOnChain] SMP Mint Address:", smpMintPublicKey.toString());

      const ataAddress = getAssociatedTokenAddressSync(smpMintPublicKey, userPublicKey);
      console.log("[fetchSmpBalanceOnChain] ATA Address:", ataAddress.toString());
      
      const ataInfo = await connection.getAccountInfo(ataAddress);
      console.log("[fetchSmpBalanceOnChain] ATA Info exists:", !!ataInfo);
      
      let blockchainSmpBalance = 0;
      if (ataInfo) {
        const ata = unpackAccount(ataAddress, ataInfo);
        console.log("[fetchSmpBalanceOnChain] Raw amount:", ata.amount.toString());
        blockchainSmpBalance = Number(ata.amount) / 1_000_000; // Convert from base units to SMP (6 decimals)
        console.log("[fetchSmpBalanceOnChain] Converted balance:", blockchainSmpBalance);
      } else {
        console.log("[fetchSmpBalanceOnChain] No ATA found, balance is 0");
      }

      console.log("[fetchSmpBalanceOnChain] Final SMP balance:", blockchainSmpBalance);
      return blockchainSmpBalance;
    } catch (err) {
      console.error("[fetchSmpBalanceOnChain] Error fetching SMP balance from wallet:", err);
      return 0;
    }
  };

  const checkBalance = async () => {
    if (!isWalletConnected || !activePublicKey) return;
    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("id, weekly_points, name, email, x_account, x_verified_at")
        .eq("wallet_address", activePublicKey.toString())
        .single();

      if (error || !user) throw new Error("User not found");
      setWeeklyPoints(user.weekly_points || 0);

      // SMP balance now fetched directly from wallet (same as Amethyst)
      const onChainSmp = await fetchSmpBalanceOnChain();
      setSmpBalance(onChainSmp ?? 0);
      
      // Fetch and cache Amethyst balance from blockchain (using same method as swap page)
      try {
        const amethystMintPublicKey = AMETHYST_MINT_ADDRESS;
        const userPublicKey = new PublicKey(activePublicKey);

        // Use the same method as swap page
        const ataAddress = getAssociatedTokenAddressSync(amethystMintPublicKey, userPublicKey);
        const ataInfo = await connection.getAccountInfo(ataAddress);
        
        let blockchainAmethystBalance = 0;
        if (ataInfo) {
          const ata = unpackAccount(ataAddress, ataInfo);
          blockchainAmethystBalance = Math.floor(Number(ata.amount) / Math.pow(10, 6)); // 6 decimals for Amethyst, convert to integer
        }

        // Update the cache in database
        const { error: updateError } = await supabase
          .from("amethyst_balances")
          .upsert({
            user_id: user.id,
            wallet_address: activePublicKey.toString(),
            amethyst_balance: blockchainAmethystBalance,
            last_updated: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });

        if (updateError) {
          console.error("[checkBalance] Error updating Amethyst cache:", updateError);
        } else {
          console.log("[checkBalance] Updated Amethyst cache to:", blockchainAmethystBalance);
        }

        setAmethystBalance(blockchainAmethystBalance);
      } catch (err) {
        console.error("[checkBalance] Error fetching Amethyst balance:", err);
        setAmethystBalance(0);
      }

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

  const handleWithdraw = async () => {
    if (!isWalletConnected || !activePublicKey) {
      setErrorMessage("Please connect your wallet.");
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < MIN_WITHDRAWAL) {
      setErrorMessage(`Withdrawal amount must be at least ${MIN_WITHDRAWAL} SMP.`);
      return;
    }

    try {
      setIsWithdrawing(true);
      setErrorMessage("");

      // Fetch user data
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id, name, email, x_account, x_verified_at")
        .eq("wallet_address", activePublicKey.toString())
        .single();

      if (userError || !user) throw new Error("User not found");

      // Check if required fields are present
      if (!user.name || !user.email || !user.x_account || !user.x_verified_at) {
        setShowProfileWarning(true);
        setIsWithdrawing(false);
        return;
      }

      // Check off-chain balance
      const { data: walletBalance, error: balanceError } = await supabase
        .from("wallet_balances")
        .select("amount")
        .eq("user_id", user.id)
        .eq("currency", "SMP")
        .eq("chain", "SOL")
        .single();

      if (balanceError || !walletBalance) throw new Error("Wallet balance not found");
      if (walletBalance.amount < amount) {
        throw new Error(`Insufficient balance: ${walletBalance.amount.toLocaleString()} SMP available, need ${amount.toLocaleString()} SMP`);
      }

      // Call server-side withdrawal API
      const response = await fetch("/api/withdraw-smp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          walletAddress: activePublicKey.toString(),
          amount,
        }),
      });

      if (!response.ok) {
        let errorText;
        try {
          errorText = await response.text();
          console.log("API response body:", errorText);
          errorText = errorText || `HTTP error ${response.status}`;
        } catch (e) {
          errorText = `HTTP error ${response.status} (no response body)`;
        }
        throw new Error(`Withdrawal failed: ${errorText}`);
      }

      let result;
      try {
        result = await response.json();
      } catch (e) {
        console.error("Failed to parse JSON:", await response.text().catch(() => "No body"));
        throw new Error("Invalid server response: Expected JSON");
      }

      if (result.error) {
        throw new Error(result.error);
      }

      // Update state
      const newBalance = walletBalance.amount - amount;
      setBalance(newBalance);
      setWithdrawAmount("");
      setSuccessDetails({ amount, signature: result.signature });
      setShowSuccessPopup(true); // Show success popup
    } catch (error) {
      console.error("Withdrawal error:", error);
      setErrorMessage(error.message);
    } finally {
      setIsWithdrawing(false);
    }
  };

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
          viewers_count,
          users:user_id (name)
        `)
        .eq("is_visible", true);

      if (novelsError) throw new Error(`Failed to fetch novels: ${novelsError.message}`);

      setNovels(novelsData);
      setFilteredNovels(novelsData);
    } catch (error) {
      console.error("Error fetching novels:", error);
      setErrorMessage(error.message);
    }
  };

  const filterNovels = () => {
    let result = novels;
    if (searchQuery) {
      result = result.filter((novel) => {
        const titleMatch = novel.title ? novel.title.toLowerCase().includes(searchQuery.toLowerCase()) : false;
        const authorMatch = novel.users?.name ? novel.users.name.toLowerCase().includes(searchQuery.toLowerCase()) : false;
        return titleMatch || authorMatch;
      });
    }
    if (selectedTag) {
      result = result.filter((novel) => novel.tags?.includes(selectedTag));
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
    if (isWalletConnected && activePublicKey) {
      setLoading(true);
      Promise.all([checkBalance(), fetchNovels()]).finally(() =>
        setLoading(false)
      );
    } else {
      fetchNovels().finally(() => setLoading(false));
    }
  }, [isWalletConnected, activePublicKey]);

  if (loading) return <LoadingPage />;

  return (
    <div className={styles.libraryContainer}>
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
                <Link href={`/profile/${novel.user_id}`} className={styles.authorLink}>
                  <FaFeather /> {novel.users?.name || "Unknown"}
                </Link>
                <span><FaEye /> {novel.viewers_count.toLocaleString()}</span>
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

      {isWalletConnected && (
        <div className={styles.balanceFloat}>
          <div className={styles.balanceItem}>
            <FaWallet className={styles.balanceIcon} />
            <span>SMP: {smpBalance !== null ? smpBalance.toLocaleString() : "Loading..."}</span>
          </div>
          <div className={styles.balanceItem}>
            <FaGem className={styles.balanceIcon} />
            <span>Amethyst: {amethystBalance !== null ? amethystBalance.toLocaleString() : "Loading..."}</span>
          </div>
          <div className={styles.balanceItem}>
            <FaStar className={styles.balanceIcon} />
            <span>Points: {weeklyPoints !== null ? weeklyPoints.toLocaleString() : "Loading..."}</span>
          </div>
        </div>
      )}
    </div>
  );
}