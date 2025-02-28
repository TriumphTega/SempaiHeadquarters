"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../../../services/supabase/supabaseClient";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import DOMPurify from "dompurify";
import Head from "next/head";
import Link from "next/link";
import { FaHome, FaBars, FaTimes, FaBookOpen, FaVolumeUp, FaPause, FaPlay, FaStop, FaChevronLeft, FaChevronRight, FaGem } from "react-icons/fa";
import LoadingPage from "../../../../../components/LoadingPage";
import CommentSection from "../../../../../components/Comments/CommentSection";
import UseAmethystBalance from "../../../../../components/UseAmethystBalance";
import styles from "../../../../../styles/ChapterPage.module.css";

const createDOMPurify = typeof window !== "undefined" ? DOMPurify : null;

export default function ChapterPage({ params }) {
  const { id, chapter } = useParams();
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  const [novel, setNovel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [warningMessage, setWarningMessage] = useState("");
  const { balance } = UseAmethystBalance();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showConnectPopup, setShowConnectPopup] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    async function checkUnlock() {
        const res = await fetch("/api/unlock-chapter", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: "USER_ID", // Replace with actual user ID
                novelId: id,
                chapterNumber: chapter,
            }),
        });

        const data = await res.json();
        if (data.error) {
            setIsLocked(true);
        }
        setLoading(false);
    }

    checkUnlock();
}, [id, chapter]);

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
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      setNovel(data);
    } catch (error) {
      console.error("Error fetching novel:", error);
      setError("Failed to load chapter.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Update token balance
  const updateTokenBalance = useCallback(async () => {
    if (!publicKey || !novel || !chapter) {
      console.warn("Missing required data for token update:", { publicKey, novel, chapter });
      return;
    }
  
    try {
      // Fetch user data
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, wallet_address, weekly_points")
        .eq("wallet_address", publicKey.toString())
        .single();
  
      if (userError || !userData) throw new Error("User not found");
  
      const user = userData;
  
      // Fetch novel owner data
      const { data: novelOwnerData, error: novelOwnerError } = await supabase
        .from("novels")
        .select("user_id")
        .eq("id", novel.id)
        .single();
  
      if (novelOwnerError || !novelOwnerData) throw new Error("Novel owner not found");
  
      const novelOwnerId = novelOwnerData.user_id;
      const { data: novelOwner, error: novelOwnerBalanceError } = await supabase
        .from("users")
        .select("id, wallet_address, balance")
        .eq("id", novelOwnerId)
        .single();
  
      if (novelOwnerBalanceError || !novelOwner) throw new Error("Novel owner balance not found");
  
      // Fetch team data
      const teamId = "33e4387d-5964-4418-98e2-225630a4fcef";
      const { data: team, error: teamError } = await supabase
        .from("users")
        .select("id, wallet_address, balance")
        .eq("id", teamId)
        .single();
  
      if (teamError || !team) throw new Error("Team not found");
  
      // Define eventDetails with sanitization
      const eventDetails = `${publicKey.toString()}${novel.title || "Untitled"}${chapter}`
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 255);
      if (!eventDetails) throw new Error("Failed to generate event details");
  
      // Check for existing event (fixing the multiple/no rows issue)
      const { data: existingEvents, error: eventError } = await supabase
        .from("wallet_events")
        .select("id")
        .eq("event_details", eventDetails)
        .eq("wallet_address", publicKey.toString())
        .limit(1); // Explicitly limit to 1 row to avoid multiple rows error
  
      if (eventError) throw new Error(`Error checking wallet events: ${eventError.message}`);
  
      const existingEvent = existingEvents && existingEvents.length > 0 ? existingEvents[0] : null;
      if (existingEvent) {
        setWarningMessage("⚠️ You've been credited for this chapter before.");
        setTimeout(() => setWarningMessage(""), 5000);
        return;
      }
  
      // Calculate rewards based on balance
      let readerReward = 100;
      const authorReward = 50;
      const teamReward = 50;
  
      const numericBalance = Number(balance) || 0;
      if (numericBalance >= 5000000) readerReward = 250;
      else if (numericBalance >= 1000000) readerReward = 200;
      else if (numericBalance >= 500000) readerReward = 170;
      else if (numericBalance >= 250000) readerReward = 150;
      else if (numericBalance >= 100000) readerReward = 120;
  
      // Update balances
      const newReaderBalance = (user.weekly_points || 0) + readerReward;
      const newAuthorBalance = (novelOwner.balance || 0) + authorReward;
      const newTeamBalance = (team.balance || 0) + teamReward;
  
      const { error: updateError } = await supabase
        .from("users")
        .upsert([
          { id: user.id, weekly_points: newReaderBalance },
          { id: novelOwner.id, balance: newAuthorBalance },
          { id: team.id, balance: newTeamBalance },
        ]);
  
      if (updateError) throw new Error(`Error updating balances: ${updateError.message}`);
  
      // Update wallet balances
      const walletBalancesData = [
        {
          user_id: novelOwner.id,
          chain: "SOL",
          currency: "Token",
          amount: newAuthorBalance,
          decimals: 0,
          wallet_address: novelOwner.wallet_address,
        },
        {
          user_id: team.id,
          chain: "SOL",
          currency: "Token",
          amount: newTeamBalance,
          decimals: 0,
          wallet_address: "9JA3f2Nwx9wpgh2wAg8KQv2bSQGRvYwvyQbgTyPmB8nc",
        },
      ];
  
      const { error: walletError } = await supabase
        .from("wallet_balances")
        .upsert(walletBalancesData);
  
      if (walletError) throw new Error(`Error updating wallet balances: ${walletError.message}`);
  
      // Insert wallet events
      const walletEventsData = [
        {
          destination_user_id: user.id,
          event_type: "deposit",
          event_details: eventDetails,
          source_chain: "SOL",
          source_currency: "Token",
          amount_change: readerReward,
          wallet_address: publicKey.toString(),
          source_user_id: "6f859ff9-3557-473c-b8ca-f23fd9f7af27",
          destination_chain: "SOL",
        },
        {
          destination_user_id: novelOwner.id,
          event_type: "deposit",
          event_details: eventDetails,
          source_chain: "SOL",
          source_currency: "Token",
          amount_change: authorReward,
          wallet_address: novelOwner.wallet_address,
          source_user_id: "6f859ff9-3557-473c-b8ca-f23fd9f7af27",
          destination_chain: "SOL",
        },
        {
          destination_user_id: team.id,
          event_type: "deposit",
          event_details: eventDetails,
          source_chain: "SOL",
          source_currency: "Token",
          amount_change: teamReward,
          wallet_address: "9JA3f2Nwx9wpgh2wAg8KQv2bSQGRvYwvyQbgTyPmB8nc",
          source_user_id: "6f859ff9-3557-473c-b8ca-f23fd9f7af27",
          destination_chain: "SOL",
        },
      ];
  
      const { error: eventInsertError } = await supabase
        .from("wallet_events")
        .insert(walletEventsData);
  
      if (eventInsertError) throw new Error(`Error inserting wallet events: ${eventInsertError.message}`);
  
      setSuccessMessage("Points credited successfully!");
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (error) {
      setError(error.message);
      console.error("Unexpected error in updateTokenBalance:", error);
    }
  }, [publicKey, novel, chapter, balance]);

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
          <p className={styles.popupMessage}>Connect your wallet to read this chapter.</p>
          <WalletMultiButton className={styles.connectWalletButton} />
          <Link href="/" onClick={() => router.push("/")} className={styles.backHomeLink}>
            <FaHome /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const chapterData = novel?.chaptercontents?.[chapter];
  const chapterTitle = novel?.chaptertitles?.[chapter];
  const chapterKeys = Object.keys(novel?.chaptercontents || {});
  const currentChapterIndex = chapterKeys.indexOf(chapter);
  const prevChapter = currentChapterIndex > 0 ? chapterKeys[currentChapterIndex - 1] : null;
  const nextChapter = currentChapterIndex < chapterKeys.length - 1 ? chapterKeys[currentChapterIndex + 1] : null;

  if (!novel || !chapterData) {
    return (
      <div className={styles.errorContainer}>
        <h2 className={styles.errorText}>Chapter Not Found</h2>
        <Link href="/" onClick={() => router.push("/")} className={styles.backHomeButton}>
          <FaHome /> Back to Home
        </Link>
      </div>
    );
  }

  // Process chapter content to handle \n as new paragraphs
  const sanitizedContent = createDOMPurify ? createDOMPurify.sanitize(chapterData) : chapterData;
  const paragraphs = sanitizedContent
    .split("\n") // Split by \n
    .filter(line => line.trim() !== "") // Remove empty lines
    .map(line => `<p>${line.trim()}</p>`) // Wrap each line in <p> tags
    .join(""); // Join back into a single string

  return (
    
    <div className={`${styles.page} ${styles.dark}`}>
      <Head>
        <title>{`${novel.title} - ${chapterTitle}`}</title>
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
      <div className={styles.chapterContainer}>
        <div className={styles.headerSection}>
          <h1 className={styles.chapterTitle}>{chapterTitle}</h1>
          <div className={styles.audioControls}>
            <button onClick={() => readText(chapterData)} className={styles.audioButton}>
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

        {/* Improved Chapter Content */}
        <div className={styles.chapterContent}>
          <div dangerouslySetInnerHTML={{ __html: paragraphs }} className={styles.contentText}></div>
        </div>

        {/* Navigation */}
        <div className={styles.navigation}>
          {prevChapter ? (
            <Link href={`/novel/${id}/chapter/${prevChapter}`} onClick={() => router.push(`/novel/${id}/chapter/${prevChapter}`)} className={styles.navButton}>
              <FaChevronLeft /> Previous
            </Link>
          ) : <div />}
          <Link href={`/novel/${id}`} onClick={() => router.push(`/novel/${id}`)} className={styles.navButton}>
            <FaBookOpen /> Back to Novel
          </Link>
          {nextChapter ? (
            <Link href={`/novel/${id}/chapter/${nextChapter}`} onClick={() => router.push(`/novel/${id}/chapter/${nextChapter}`)} className={styles.navButton}>
              Next <FaChevronRight />
            </Link>
          ) : <div />}
        </div>

        {/* Chapter Selector */}
        <div className={styles.chapterSelector}>
          <label className={styles.selectorLabel}><FaBookOpen /> Jump to Chapter:</label>
          <select
            value={chapter}
            onChange={(e) => router.push(`/novel/${id}/chapter/${e.target.value}`)}
            className={styles.selector}
          >
            {chapterKeys.map((ch, index) => (
              <option key={ch} value={ch}>
                {novel?.chaptertitles?.[ch] || `Chapter ${index + 1}`}
              </option>
            ))}
          </select>
        </div>

        <CommentSection novelId={novel.id} chapter={chapterTitle} />
      </div>

      <footer className={styles.footer}>
        <p className={styles.footerText}>© 2025 Sempai HQ. All rights reserved.</p>
      </footer>
    </div>
  );
}