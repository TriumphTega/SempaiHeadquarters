"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../../services/supabase/supabaseClient";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import DOMPurify from "dompurify";
import Head from "next/head";
import Link from "next/link";
import { FaHome, FaBars, FaTimes, FaBookOpen, FaVolumeUp, FaPause, FaPlay, FaStop, FaGem } from "react-icons/fa";
import LoadingPage from "../../../../components/LoadingPage";
import NovelCommentSection from "../../../../components/Comments/NovelCommentSection";
import styles from "../../../../styles/NovelSummaryPage.module.css";

const createDOMPurify = typeof window !== "undefined" ? DOMPurify : null;

export default function NovelSummaryPage() {
  const { id } = useParams();
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  const [novel, setNovel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [warningMessage, setWarningMessage] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showConnectPopup, setShowConnectPopup] = useState(false);

  // Toggle mobile menu
  const toggleMenu = () => {
    setMenuOpen((prev) => !prev);
    setShowConnectPopup(false);
  };

  // Fetch novel data
  const fetchNovel = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("novels")
        .select("title, summary")
        .eq("id", id)
        .single();
      if (error) throw error;
      setNovel(data);
    } catch (error) {
      console.error("Error fetching novel:", error);
      setError("Failed to load summary.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Update token balance
  const updateTokenBalance = useCallback(async () => {
    if (!publicKey || !novel) return;

    try {
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id, wallet_address, balance")
        .eq("wallet_address", publicKey.toString())
        .single();

      if (userError || !user) throw new Error("User not found");

      const eventDetails = `${publicKey}${novel.title}Summary`;
      const { data: existingEvent, error: eventError } = await supabase
        .from("wallet_events")
        .select("id")
        .eq("event_details", eventDetails)
        .eq("wallet_address", publicKey.toString())
        .maybeSingle();

      if (eventError && eventError.code !== "PGRST116") throw new Error("Error checking wallet events");

      if (existingEvent) {
        setWarningMessage("⚠️ You've been credited for this summary before.");
        setTimeout(() => setWarningMessage(""), 5000);
        return;
      }

      const newBalance = (user.balance || 0) + 50;
      const { error: balanceError } = await supabase
        .from("users")
        .update({ balance: newBalance })
        .eq("id", user.id);

      if (balanceError) throw new Error("Error updating balance");

      const { error: walletBalanceError } = await supabase
        .from("wallet_balances")
        .upsert([{ user_id: user.id, chain: "SOL", currency: "Token", amount: newBalance, decimals: 0, wallet_address: publicKey.toString() }]);

      if (walletBalanceError) throw new Error("Error updating wallet balance");

      const { error: walletEventError } = await supabase
        .from("wallet_events")
        .insert([{ destination_user_id: user.id, event_type: "deposit", event_details, source_chain: "SOL", source_currency: "Token", amount_change: 50, wallet_address: publicKey.toString(), source_user_id: "6f859ff9-3557-473c-b8ca-f23fd9f7af27", destination_chain: "SOL" }]);

      if (walletEventError) throw new Error("Error inserting wallet event");

      setSuccessMessage("Tokens credited for reading this summary!");
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (error) {
      setError(error.message);
      console.error("Unexpected error:", error);
    }
  }, [publicKey, novel]);

  // Initial fetch and token update
  useEffect(() => {
    if (!connected) {
      setShowConnectPopup(true);
      setLoading(false);
      return;
    }
    fetchNovel();
  }, [connected, fetchNovel]);

  useEffect(() => {
    if (!loading && novel && connected) updateTokenBalance();
  }, [loading, novel, connected, updateTokenBalance]);

  // Text-to-speech controls
  const readText = (text) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    } else {
      setError("Your browser does not support text-to-speech.");
    }
  };

  const pauseText = () => window.speechSynthesis.pause();
  const resumeText = () => window.speechSynthesis.resume();
  const stopText = () => window.speechSynthesis.cancel();

  if (loading) return <LoadingPage />;

  if (!connected) {
    return (
      <div className={styles.connectPopupOverlay}>
        <div className={styles.connectPopup}>
          <button onClick={() => setShowConnectPopup(false)} className={styles.closePopupButton}>
            <FaTimes />
          </button>
          <h3 className={styles.popupTitle}>Access Denied</h3>
          <p className={styles.popupMessage}>Connect your wallet to view this summary.</p>
          <WalletMultiButton className={styles.connectWalletButton} />
          <Link href="/" onClick={() => router.push("/")} className={styles.backHomeLink}>
            <FaHome /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (error || !novel) {
    return (
      <div className={styles.errorContainer}>
        <h2 className={styles.errorText}>Summary Not Found</h2>
        <Link href="/" onClick={() => router.push("/")} className={styles.backHomeButton}>
          <FaHome /> Back to Home
        </Link>
      </div>
    );
  }

  const sanitizedContent = createDOMPurify ? createDOMPurify.sanitize(novel.summary) : novel.summary;

  return (
    <div className={`${styles.page} ${styles.dark}`}>
      <Head>
        <title>{`${novel.title} - Summary`}</title>
      </Head>

      {/* Futuristic Navbar */}
      <nav className={styles.navbar}>
        <div className={styles.navContainer}>
          <Link href="/" onClick={() => router.push("/")} className={styles.logoLink}>
            <img src="/images/logo.jpg" alt="Sempai HQ" className={styles.logo} />
            <span className={styles.logoText}>Sempai HQ</span>
          </Link>
          <button className={styles.menuToggle} onClick={toggleMenu}>
            <FaBars />
          </button>
          <div className={`${styles.navLinks} ${menuOpen ? styles.navLinksOpen : ""}`}>
            <Link href="/" onClick={() => router.push("/")} className={styles.navLink}>
              <FaHome className={styles.navIcon} /> Home
            </Link>
            <Link href={`/novel/${id}`} onClick={() => router.push(`/novel/${id}`)} className={styles.navLink}>
              <FaBookOpen className={styles.navIcon} /> Novel Hub
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className={styles.summaryContainer}>
        <div className={styles.headerSection}>
          <h1 className={styles.summaryTitle}>{novel.title} - Summary</h1>
          <div className={styles.audioControls}>
            <button onClick={() => readText(novel.summary)} className={styles.audioButton}>
              <FaVolumeUp /> Read Aloud
            </button>
            <button onClick={pauseText} className={styles.audioButton}>
              <FaPause /> Pause
            </button>
            <button onClick={resumeText} className={styles.audioButton}>
              <FaPlay /> Resume
            </button>
            <button onClick={stopText} className={styles.audioButton}>
              <FaStop /> Stop
            </button>
          </div>
          {successMessage && (
            <div className={styles.successMessage}>
              <FaGem /> {successMessage}
            </div>
          )}
          {warningMessage && (
            <div className={styles.warningMessage}>
              {warningMessage}
            </div>
          )}
          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}
        </div>

        <div className={styles.summaryContent}>
          <div dangerouslySetInnerHTML={{ __html: sanitizedContent }} className={styles.contentText}></div>
        </div>

        <div className={styles.navigation}>
          <Link href={`/novel/${id}`} onClick={() => router.push(`/novel/${id}`)} className={styles.navButton}>
            <FaBookOpen /> Back to Novel
          </Link>
        </div>

        <NovelCommentSection novelId={id} />
      </div>

      <footer className={styles.footer}>
        <p className={styles.footerText}>© 2025 Sempai HQ. All rights reserved.</p>
      </footer>
    </div>
  );
}