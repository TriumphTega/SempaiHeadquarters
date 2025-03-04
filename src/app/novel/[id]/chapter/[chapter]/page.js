"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../../../services/supabase/supabaseClient";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Connection, SystemProgram, Transaction, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import DOMPurify from "dompurify";
import Head from "next/head";
import Link from "next/link";
import { FaHome, FaBars, FaTimes, FaBookOpen, FaVolumeUp, FaPause, FaPlay, FaStop, FaChevronLeft, FaChevronRight, FaGem, FaLock, FaRocket, FaCrown } from "react-icons/fa";
import LoadingPage from "../../../../../components/LoadingPage";
import CommentSection from "../../../../../components/Comments/CommentSection";
import UseAmethystBalance from "../../../../../components/UseAmethystBalance";
import styles from "../../../../../styles/ChapterPage.module.css";
import { RPC_URL } from "../../../../../constants";

const TARGET_WALLET = "HSxUYwGM3NFzDmeEJ6o4bhyn8knmQmq7PLUZ6nZs4F58";
const createDOMPurify = typeof window !== "undefined" ? DOMPurify : null;
const connection = new Connection(RPC_URL, "confirmed");

const fetchSolPrice = async () => {
  try {
    const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
    const data = await response.json();
    return data.solana.usd;
  } catch (error) {
    console.error("Error fetching SOL price:", error);
    throw new Error("Failed to fetch SOL price");
  }
};

export default function ChapterPage() {
  const { id, chapter } = useParams();
  const router = useRouter();
  const { connected, publicKey, sendTransaction } = useWallet();
  const [novel, setNovel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [warningMessage, setWarningMessage] = useState("");
  const { balance } = UseAmethystBalance();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showConnectPopup, setShowConnectPopup] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [userId, setUserId] = useState(null);
  const [advanceInfo, setAdvanceInfo] = useState(null);
  const [canUnlockNextThree, setCanUnlockNextThree] = useState(false);
  const [solPrice, setSolPrice] = useState(null);

  useEffect(() => {
    const getSolPrice = async () => {
      try {
        const price = await fetchSolPrice();
        setSolPrice(price);
      } catch (err) {
        setError("Unable to fetch SOL price. Using default values.");
        setSolPrice(100);
      }
    };
    getSolPrice();
  }, []);

  const updateTokenBalance = useCallback(async () => {
    if (!publicKey || !novel || !chapter || !id) {
      console.warn("Missing required data for token update:", { publicKey, novel, chapter, id });
      return;
    }

    try {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, wallet_address, weekly_points")
        .eq("wallet_address", publicKey.toString())
        .single();

      if (userError || !userData) throw new Error("User not found");
      const user = userData;

      const chapterNum = parseInt(chapter, 10);

      const chapterAdvanceInfo = novel.advance_chapters
        ? novel.advance_chapters.find((c) => c.index === chapterNum) || { is_advance: false, free_release_date: null }
        : { is_advance: false, free_release_date: null };

      let hasValidAccess = !chapterAdvanceInfo.is_advance || (chapterAdvanceInfo.free_release_date && new Date(chapterAdvanceInfo.free_release_date) <= new Date());
      if (chapterAdvanceInfo.is_advance && !hasValidAccess) {
        const { data: unlock, error: unlockError } = await supabase
          .from("unlocked_story_chapters")
          .select("chapter_unlocked_till, expires_at, subscription_type")
          .eq("user_id", user.id)
          .eq("story_id", id)
          .single();

        if (unlockError && unlockError.code !== "PGRST116") throw unlockError;

        hasValidAccess = unlock &&
          (!unlock.expires_at || new Date(unlock.expires_at) > new Date()) &&
          (unlock.chapter_unlocked_till === -1 || unlock.chapter_unlocked_till >= chapterNum);

        if (!hasValidAccess) {
          console.log("User has no valid subscription for this advance chapter; skipping token update.");
          return;
        }
      }

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

      const teamId = "33e4387d-5964-4418-98e2-225630a4fcef";
      const { data: team, error: teamError } = await supabase
        .from("users")
        .select("id, wallet_address, balance")
        .eq("id", teamId)
        .single();

      if (teamError || !team) throw new Error("Team not found");

      const eventDetails = `${publicKey.toString()}${novel.title || "Untitled"}${chapter}`
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 255);

      if (!eventDetails) throw new Error("Failed to generate event details");

      const { data: existingEvents, error: eventError } = await supabase
        .from("wallet_events")
        .select("id")
        .eq("event_details", eventDetails)
        .eq("wallet_address", publicKey.toString())
        .limit(1);

      if (eventError) throw new Error(`Error checking wallet events: ${eventError.message}`);

      const existingEvent = existingEvents && existingEvents.length > 0 ? existingEvents[0] : null;
      if (existingEvent) {
        setWarningMessage("⚠️ You've been credited for this chapter before.");
        setTimeout(() => setWarningMessage(""), 5000);
        return;
      }

      let readerReward = 100;
      const authorReward = 50;
      const teamReward = 50;

      const numericBalance = Number(balance) || 0;
      if (numericBalance >= 5000000) readerReward = 250;
      else if (numericBalance >= 1000000) readerReward = 200;
      else if (numericBalance >= 500000) readerReward = 170;
      else if (numericBalance >= 250000) readerReward = 150;
      else if (numericBalance >= 100000) readerReward = 120;

      const newReaderBalance = (user.weekly_points || 0) + readerReward;
      const newAuthorBalance = (novelOwner.balance || 0) + authorReward;
      const newTeamBalance = (team.balance || 0) + teamReward;

      const updates = [];

      updates.push(
        supabase
          .from("users")
          .update({ weekly_points: newReaderBalance })
          .eq("id", user.id)
      );

      if (novelOwner.id !== user.id) {
        updates.push(
          supabase
            .from("users")
            .update({ balance: newAuthorBalance })
            .eq("id", novelOwner.id)
        );
      }

      if (team.id !== user.id && team.id !== novelOwner.id) {
        updates.push(
          supabase
            .from("users")
            .update({ balance: newTeamBalance })
            .eq("id", team.id)
        );
      }

      const results = await Promise.all(updates);
      for (const { error } of results) {
        if (error) throw new Error(`Error updating balance: ${error.message}`);
      }

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

      // Update novel_interactions
      const { data: interaction, error: interactionError } = await supabase
        .from("novel_interactions")
        .select("id, read_count")
        .eq("user_id", user.id)
        .eq("novel_id", id)
        .single();

      if (interactionError && interactionError.code !== "PGRST116") throw interactionError;

      if (interaction) {
        await supabase
          .from("novel_interactions")
          .update({
            last_read_at: new Date().toISOString(),
            read_count: interaction.read_count + 1,
          })
          .eq("id", interaction.id);
      } else {
        await supabase
          .from("novel_interactions")
          .insert({
            user_id: user.id,
            novel_id: id,
            last_read_at: new Date().toISOString(),
            read_count: 1,
          });
      }

      setSuccessMessage("Points credited successfully!");
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (error) {
      setError(error.message);
      console.error("Unexpected error in updateTokenBalance:", error);
    }
  }, [publicKey, novel, chapter, balance, id, setWarningMessage, setSuccessMessage, setError]);

  useEffect(() => {
    async function initialize() {
      const chapterNum = parseInt(chapter, 10);
      // Only show connect popup for chapters > 2 when not connected
      if (!connected && chapterNum > 2) {
        setShowConnectPopup(true);
        setLoading(false);
        return;
      }

      let { data: user, error: userError } = connected
        ? await supabase
            .from("users")
            .select("id")
            .eq("wallet_address", publicKey?.toString())
            .single()
        : { data: null, error: null };

      if (connected && userError && userError.code === "PGRST116") {
        const { data: newUser, error: insertError } = await supabase
          .from("users")
          .insert([{ wallet_address: publicKey.toString() }])
          .select("id")
          .single();

        if (insertError) {
          console.error("Error creating user:", insertError);
          setError("Failed to initialize user.");
          setLoading(false);
          return;
        }
        user = newUser;
      } else if (connected && userError) {
        console.error("Error fetching user:", userError);
        setError("Failed to fetch user.");
        setLoading(false);
        return;
      }

      setUserId(user?.id || null);
      await checkAccess(user?.id);
    }
    initialize();
  }, [connected, publicKey, id, chapter]);

  const checkAccess = async (userId) => {
    try {
      const { data: novelData, error: novelError } = await supabase
        .from("novels")
        .select("*")
        .eq("id", id)
        .single();

      if (novelError || !novelData) throw new Error(novelError?.message || "Novel not found");
      setNovel(novelData);

      const chapterNum = parseInt(chapter, 10);
      const totalChapters = Object.keys(novelData.chaptercontents || {}).length;
      const chapterAdvanceInfo = novelData.advance_chapters
        ? novelData.advance_chapters.find((c) => c.index === chapterNum) || { is_advance: false, free_release_date: null }
        : { is_advance: false, free_release_date: null };
      setAdvanceInfo(chapterAdvanceInfo);

      console.log("Checking access - Chapter:", chapterNum, "Total Chapters:", totalChapters, "Advance Info:", chapterAdvanceInfo);

      // Chapters 1 and 2 are always free unless marked as advance
      if (chapterNum <= 2) {
        if (!chapterAdvanceInfo.is_advance || (chapterAdvanceInfo.free_release_date && new Date(chapterAdvanceInfo.free_release_date) <= new Date())) {
          console.log("Chapter 1 or 2 is free or past release date, unlocking");
          setIsLocked(false);
          setCanUnlockNextThree(false);
          return;
        }
      }

      let allPreviousUnlocked = true;
      const advanceChapters = novelData.advance_chapters || [];
      for (let i = 0; i < chapterNum; i++) {
        const prevAdvanceInfo = advanceChapters.find((c) => c.index === i) || { is_advance: false, free_release_date: null };
        if (prevAdvanceInfo.is_advance && (!prevAdvanceInfo.free_release_date || new Date(prevAdvanceInfo.free_release_date) > new Date())) {
          if (!userId) {
            allPreviousUnlocked = false;
            break;
          }
          const { data: unlock, error: unlockError } = await supabase
            .from("unlocked_story_chapters")
            .select("chapter_unlocked_till, expires_at")
            .eq("user_id", userId)
            .eq("story_id", id)
            .single();

          if (unlockError && unlockError.code !== "PGRST116") throw unlockError;

          const hasUnlock = unlock && (!unlock.expires_at || new Date(unlock.expires_at) > new Date()) && unlock.chapter_unlocked_till >= i;
          if (!hasUnlock) {
            allPreviousUnlocked = false;
            break;
          }
        }
      }
      setCanUnlockNextThree(allPreviousUnlocked);
      console.log("Can unlock next three:", allPreviousUnlocked);

      if (!chapterAdvanceInfo.is_advance || (chapterAdvanceInfo.free_release_date && new Date(chapterAdvanceInfo.free_release_date) <= new Date())) {
        console.log("Chapter is free or past release date, unlocking");
        setIsLocked(false);
      } else if (userId) {
        const { data: unlock, error: unlockError } = await supabase
          .from("unlocked_story_chapters")
          .select("chapter_unlocked_till, expires_at, subscription_type")
          .eq("user_id", userId)
          .eq("story_id", id)
          .single();

        if (unlockError && unlockError.code !== "PGRST116") throw unlockError;

        if (unlock) {
          const expired = unlock.expires_at && new Date(unlock.expires_at) < new Date();
          console.log("Unlock Data:", unlock, "Expired:", expired);
          if (!expired) {
            if (unlock.chapter_unlocked_till === -1 || (unlock.chapter_unlocked_till >= chapterNum && chapterNum < totalChapters)) {
              console.log("Chapter is within unlocked range or full unlock, unlocking");
              setIsLocked(false);
              return;
            }
          }
        }
        console.log("Chapter is locked, no valid unlock");
        setIsLocked(true);
      } else {
        console.log("Chapter requires wallet connection and subscription");
        setIsLocked(true);
      }
    } catch (err) {
      console.error("Error checking access:", err);
      setError("Failed to load chapter access.");
      setIsLocked(true);
      setCanUnlockNextThree(false);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (subscriptionType) => {
    if (!publicKey) {
      alert("Please connect your wallet");
      return;
    }

    if (!solPrice) {
      setError("SOL price not available. Please try again later.");
      return;
    }

    try {
      const usdAmount = subscriptionType === "3CHAPTERS" ? 3 : 15;
      const solAmount = usdAmount / solPrice;
      const lamports = Math.round(solAmount * LAMPORTS_PER_SOL);

      console.log(`Subscription: ${subscriptionType}, USD: $${usdAmount}, SOL: ${solAmount}, Lamports: ${lamports}`);

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: publicKey,
      }).add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(TARGET_WALLET),
          lamports,
        })
      );

      const signature = await sendTransaction(transaction, connection, {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, "confirmed");

      const response = await fetch("/api/unlock-chapter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          story_id: id,
          subscription_type: subscriptionType,
          signature,
          userPublicKey: publicKey.toString(),
          current_chapter: parseInt(chapter, 10),
          sol_amount: solAmount,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        setIsLocked(false);
        setSuccessMessage(`Payment successful! ${subscriptionType === "FULL" ? "All chapters" : `Up to Chapter ${result.chapter_unlocked_till + 1} unlocked as released`}`);
        setTimeout(() => setSuccessMessage(""), 5000);
        await checkAccess(userId);
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error("Payment Error:", error);
      setError("Payment failed: " + error.message);
    }
  };

  const toggleMenu = () => {
    setMenuOpen((prev) => !prev);
    setShowConnectPopup(false);
  };

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

  useEffect(() => {
    fetchNovel();
  }, [fetchNovel]);

  useEffect(() => {
    if (!loading && novel && (connected || parseInt(chapter, 10) <= 2) && !isLocked) {
      if (connected) updateTokenBalance();
    }
  }, [loading, novel, connected, isLocked, chapter, updateTokenBalance]);

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

  const chapterNum = parseInt(chapter, 10);
  if (!connected && chapterNum > 2) {
    return (
      <div className={styles.connectPopupOverlay}>
        <div className={styles.connectPopup}>
          <button onClick={() => setShowConnectPopup(false)} className={styles.closePopupButton}>
            <FaTimes />
          </button>
          <h3 className={styles.popupTitle}>Access Denied</h3>
          <p className={styles.popupMessage}>Connect your wallet to read chapters beyond Chapter 2.</p>
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

  const releaseDateMessage = advanceInfo?.is_advance && advanceInfo?.free_release_date
    ? `This chapter is locked for free users until ${new Date(advanceInfo.free_release_date).toLocaleString()}.`
    : "This chapter is locked.";

  const sanitizedContent = createDOMPurify ? createDOMPurify.sanitize(chapterData) : chapterData;
  const paragraphs = sanitizedContent
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => `<p>${line.trim()}</p>`)
    .join("");

  const threeChaptersSol = solPrice ? (3 / solPrice).toFixed(4) : "Loading...";
  const fullChaptersSol = solPrice ? (15 / solPrice).toFixed(4) : "Loading...";

  return (
    <div className={`${styles.page} ${styles.dark}`}>
      <Head>
        <title>{`${novel.title} - ${chapterTitle}`}</title>
      </Head>

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

        {isLocked ? (
          <div className={styles.lockedContent}>
          <div className={styles.lockIconWrapper}>
            <FaLock className={styles.lockIcon} />
          </div>
          {advanceInfo?.is_advance ? (
            <p className={styles.message}>{releaseDateMessage }</p>
          ) : (
            <p className={styles.message}>
              <FaLock className={styles.messageIcon} /> This chapter is locked
            </p>
          )}
          <p className={styles.subMessage}>
            <FaGem className={styles.gemIcon} /> Unlock with a subscription (SOL)
          </p>
          <button
            onClick={() => handlePayment("3CHAPTERS")}
            className={`${styles.unlockButton} ${styles.threeChapters}`}
            disabled={!canUnlockNextThree || !solPrice}
            title={!canUnlockNextThree ? "Unlock previous chapters first" : ""}
          >
            <FaRocket className={styles.buttonIcon} />
            <span className={styles.buttonText}>Unlock 3 Chapters</span>
            <span className={styles.price}>$3 / {threeChaptersSol} SOL</span>
          </button>
          <button
            onClick={() => handlePayment("FULL")}
            className={`${styles.unlockButton} ${styles.fullChapters}`}
            disabled={!solPrice}
          >
            <FaCrown className={styles.buttonIcon} />
            <span className={styles.buttonText}>Unlock All Chapters</span>
            <span className={styles.price}>$15 / {fullChaptersSol} SOL</span>
          </button>
        </div>
        ) : (
          <>
            <div className={styles.chapterContent}>
              <div dangerouslySetInnerHTML={{ __html: paragraphs }} className={styles.contentText}></div>
            </div>

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
          </>
        )}
      </div>

      <footer className={styles.footer}>
        <p className={styles.footerText}>© 2025 Sempai HQ. All rights reserved.</p>
      </footer>
    </div>
  );
}