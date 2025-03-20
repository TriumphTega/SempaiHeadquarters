"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useRouter } from "next/navigation";
import { supabase } from "../../services/supabase/supabaseClient";
import { FaHome, FaBars, FaTimes, FaPaintBrush, FaWallet, FaExchangeAlt } from "react-icons/fa";
import ConnectButton from "../../components/ConnectButton";
import LoadingPage from "../../components/LoadingPage";
import styles from "../../styles/MangaHome.module.css";

function DraggableWalletPanel({ connected, balance, weeklyPoints, toggleWalletPanel, walletPanelOpen }) {
  const [position, setPosition] = useState({ x: window.innerWidth - 340, y: window.innerHeight - 100 }); // Default bottom-right
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const panelRef = useRef(null);

  // Mouse events
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const newX = e.clientX - startPos.x;
    const newY = e.clientY - startPos.y;
    setPosition({
      x: Math.max(0, Math.min(newX, window.innerWidth - panelRef.current.offsetWidth)),
      y: Math.max(0, Math.min(newY, window.innerHeight - panelRef.current.offsetHeight)),
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Touch events for mobile
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setStartPos({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const newX = touch.clientX - startPos.x;
    const newY = touch.clientY - startPos.y;
    setPosition({
      x: Math.max(0, Math.min(newX, window.innerWidth - panelRef.current.offsetWidth)),
      y: Math.max(0, Math.min(newY, window.innerHeight - panelRef.current.offsetHeight)),
    });
  };

  const handleTouchEnd = () => setIsDragging(false);

  return (
    <div
      ref={panelRef}
      className={`${styles.walletPanel} ${walletPanelOpen ? styles.walletPanelOpen : ""} ${isDragging ? styles.dragging : ""}`}
      style={{ top: `${position.y}px`, left: `${position.x}px` }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {connected ? (
        <>
          <button className={styles.walletToggle} onClick={toggleWalletPanel}>
            <FaWallet /> <span className={styles.walletSummary}>{balance} SMP | {weeklyPoints} Pts</span>
          </button>
          <div className={styles.walletContent}>
            <p><span className={styles.balanceLabel}>Balance:</span> {balance} SMP</p>
            <p><span className={styles.pointsLabel}>Points:</span> {weeklyPoints}</p>
          </div>
        </>
      ) : (
        <div className={styles.connectCallout}>
          <p>Connect your wallet to explore premium manga worlds</p>
          <WalletMultiButton className={styles.walletConnectBtn} />
        </div>
      )}
    </div>
  );
}

export default function MangaHome() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const [mangaList, setMangaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [walletPanelOpen, setWalletPanelOpen] = useState(false);
  const [balance, setBalance] = useState(0);
  const [weeklyPoints, setWeeklyPoints] = useState(0);

  const toggleMenu = () => setMenuOpen((prev) => !prev);
  const toggleWalletPanel = () => setWalletPanelOpen((prev) => !prev);

  const fetchManga = async () => {
    const { data, error } = await supabase
      .from("manga")
      .select("id, title, cover_image, summary, user_id, users:user_id (name)");
    if (error) console.error("Error fetching manga:", error);
    setMangaList(data || []);
    setLoading(false);
  };

  const checkBalance = async () => {
    if (!publicKey) return;
    const { data: user } = await supabase.from("users").select("id, weekly_points").eq("wallet_address", publicKey.toString()).single();
    if (user) {
      setWeeklyPoints(user.weekly_points || 0);
      const { data: walletBalance } = await supabase
        .from("wallet_balances")
        .select("amount")
        .eq("user_id", user.id)
        .eq("currency", "SMP")
        .eq("chain", "SOL")
        .single();
      setBalance(walletBalance?.amount || 0);
    }
  };

  useEffect(() => {
    setLoading(true);
    if (connected && publicKey) Promise.all([fetchManga(), checkBalance()]).finally(() => setLoading(false));
    else fetchManga();
  }, [connected, publicKey]);

  if (loading) return <LoadingPage />;

  return (
    <div className={styles.cosmicContainer}>
      <nav className={styles.cosmicNavbar}>
        <div className={styles.navbarContent}>
          <Link href="/" className={styles.cosmicLogo}>
            <img src="/images/logo.jpg" alt="Sempai HQ" className={styles.logoImage} />
            <span className={styles.logoText}>Sempai HQ</span>
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

      <header className={styles.cosmicHeader}>
        <h1 className={styles.headerTitle}>Manga Cosmos</h1>
        <p className={styles.headerTagline}>Journey Through Infinite Panels</p>
      </header>

      <main className={styles.cosmicGrid}>
        {mangaList.map((manga) => (
          <div key={manga.id} className={styles.mangaCard}>
            <Link href={`/manga/${manga.id}`} className={styles.mangaLink}>
              <img src={manga.cover_image} alt={manga.title} className={styles.mangaCover} />
              <div className={styles.mangaOverlay}>
                <h3 className={styles.mangaTitle}>{manga.title}</h3>
                <p className={styles.mangaSummary}>{manga.summary.slice(0, 100)}...</p>
              </div>
            </Link>
            <div className={styles.artistContainer}>
              <Link href={`/artists-profile/${manga.user_id}`} className={styles.artistLink}>
                <FaPaintBrush className={styles.brushIcon} /> {manga.users?.name || "Unknown Artist"}
              </Link>
            </div>
          </div>
        ))}
      </main>

      <DraggableWalletPanel
        connected={connected}
        balance={balance}
        weeklyPoints={weeklyPoints}
        toggleWalletPanel={toggleWalletPanel}
        walletPanelOpen={walletPanelOpen}
      />
    </div>
  );
}