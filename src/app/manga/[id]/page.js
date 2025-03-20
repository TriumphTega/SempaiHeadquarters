"use client";

import { useState, useEffect } from "react";
import { use } from "react"; // Added for unwrapping params Promise
import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { supabase } from "../../../services/supabase/supabaseClient";
import { FaHome, FaBars, FaTimes, FaBook, FaUser, FaWallet, FaCoins, FaStar, FaLock } from "react-icons/fa";
import ConnectButton from "../../../components/ConnectButton";
import LoadingPage from "../../../components/LoadingPage";
import DraggableWalletPanel from "../../../components/DraggableWalletPanel";
import styles from "../../../styles/MangaDetail.module.css";

export default function MangaDetail({ params }) {
  const { id } = use(params); // Unwrap params with React.use()
  const { connected, publicKey } = useWallet();
  const [manga, setManga] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [walletPanelOpen, setWalletPanelOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false); // Track dragging state
  const [balance, setBalance] = useState(0);
  const [weeklyPoints, setWeeklyPoints] = useState(0);

  const toggleMenu = () => setMenuOpen((prev) => !prev);
  const toggleWalletPanel = () => setWalletPanelOpen((prev) => !prev);

  const fetchMangaDetails = async () => {
    const { data: mangaData } = await supabase
      .from("manga")
      .select("id, title, cover_image, summary, user_id, users:user_id (name)")
      .eq("id", id)
      .single();
    setManga(mangaData);

    const { data: chaptersData } = await supabase
      .from("manga_chapters")
      .select("id, chapter_number, title, is_premium")
      .eq("manga_id", id)
      .order("chapter_number", { ascending: true });
    setChapters(chaptersData || []);
    setLoading(false);
  };

  const checkBalance = async () => {
    if (!publicKey) return;
    const { data: user } = await supabase
      .from("users")
      .select("id, weekly_points")
      .eq("wallet_address", publicKey.toString())
      .single();
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
    if (connected && publicKey) Promise.all([fetchMangaDetails(), checkBalance()]).finally(() => setLoading(false));
    else fetchMangaDetails();
  }, [id, connected, publicKey]);

  // Prevent page scrolling when dragging wallet panel
  useEffect(() => {
    if (isDragging) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto"; // Cleanup on unmount
    };
  }, [isDragging]);

  if (loading) return <LoadingPage />;
  if (!manga) return <div className={styles.page}>Manga not found.</div>;

  return (
    <div className={styles.page}>
      <div className={styles.backgroundAnimation}></div>
      <nav className={styles.navbar}>
        <Link href="/" className={styles.logo}>
          <FaBook className={styles.logoIcon} /> Sempai HQ
        </Link>
        <button className={styles.menuToggle} onClick={toggleMenu}>
          {menuOpen ? <FaTimes /> : <FaBars />}
        </button>
        <div className={`${styles.navLinks} ${menuOpen ? styles.navLinksOpen : ""}`}>
          <Link href="/" className={styles.navLink}><FaHome /> Home</Link>
          <Link href="/manga" className={styles.navLink}><FaBook /> Manga</Link>
          <Link href="/swap" className={styles.navLink}><FaCoins /> Swap</Link>
          <ConnectButton className={styles.connectButton} />
        </div>
      </nav>

      <main className={styles.main}>
        <section className={styles.header}>
          <img src={manga.cover_image} alt={manga.title} className={styles.cover} />
          <div className={styles.info}>
            <h1 className={styles.title}><FaStar className={styles.titleIcon} /> {manga.title}</h1>
            <p className={styles.artist}><FaUser /> {manga.users?.name || "Unknown Artist"}</p>
            <div className={styles.summary}>
              <h3><FaBook /> Summary</h3>
              <p>{manga.summary}</p>
            </div>
          </div>
        </section>

        <section className={styles.chapters}>
          <h2 className={styles.chapterTitle}><FaBook /> Chapters</h2>
          <div className={styles.chapterGrid}>
            {chapters.map((chapter) => (
              <Link
                key={chapter.id}
                href={`/manga/${id}/chapter/${chapter.id}`}
                className={styles.chapterItem}
              >
                <FaBook className={styles.chapterIcon} />
                {chapter.title} {chapter.is_premium && <FaLock className={styles.premiumIcon} />}
              </Link>
            ))}
          </div>
        </section>
      </main>

      {connected && (
        <DraggableWalletPanel
          connected={connected}
          balance={balance}
          weeklyPoints={weeklyPoints}
          toggleWalletPanel={toggleWalletPanel}
          walletPanelOpen={walletPanelOpen}
          onDragStart={() => setIsDragging(true)} // Add drag handlers
          onDragEnd={() => setIsDragging(false)}
        />
      )}

      <footer className={styles.footer}>
        <p><FaStar /> © 2025 SempaiHQ. All rights reserved.</p>
      </footer>
    </div>
  );
}