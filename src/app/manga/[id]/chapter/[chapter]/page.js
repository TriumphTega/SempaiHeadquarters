"use client";

import { useState, useEffect, useCallback, useContext } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase } from "../../../../../services/supabase/supabaseClient";
import { Connection, PublicKey } from "@solana/web3.js";
import { FaHome, FaBookOpen, FaLock, FaGem, FaDownload, FaStar } from "react-icons/fa";
import LoadingPage from "../../../../../components/LoadingPage";
import UseAmethystBalance from "../../../../../components/UseAmethystBalance";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import styles from "../../../../../styles/MangaChapter.module.css";
import { RPC_URL, SMP_MINT_ADDRESS } from "@/constants";
import MangaCommentSection from "../../../../../components/MangaCommentSection";
import { EmbeddedWalletContext } from "../../../../../components/EmbeddedWalletProvider";
import ConnectButton from "@/components/ConnectButton";

const MERCHANT_WALLET = new PublicKey("4EeY4iDCp36yvLFvwhFhBrurKGJwNqLDzvM3PVsxrPdR");
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const connection = new Connection(RPC_URL, "confirmed");
const TEAM_WALLET = new PublicKey("9JA3f2Nwx9wpgh2wAg8KQv2bSQGRvYwvyQbgTyPmB8nc");

export default function MangaChapter() {
  const { id: mangaId, chapter: chapterId } = useParams();
  const router = useRouter();
  const { connected, publicKey, sendTransaction } = useWallet();
  const { wallet: embeddedWallet, getSecretKey } = useContext(EmbeddedWalletContext);
  const activePublicKey = embeddedWallet?.publicKey ? new PublicKey(embeddedWallet.publicKey) : publicKey;
  const activeWalletAddress = activePublicKey?.toString();
  const isWalletConnected = !!activePublicKey;
  const [chapter, setChapter] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [transactionSignature, setTransactionSignature] = useState(null);
  const [solPrice, setSolPrice] = useState(null);
  const [usdcPrice] = useState(1);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [warningMessage, setWarningMessage] = useState("");
  const { balance } = UseAmethystBalance();
  const [userId, setUserId] = useState(null);
  const [isFirstChapter, setIsFirstChapter] = useState(false);
  const [userRating, setUserRating] = useState(null);
  const [averageRating, setAverageRating] = useState(null);
  const [showTransactionPopup, setShowTransactionPopup] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState(null);
  const [password, setPassword] = useState("");
  const [authorNote, setAuthorNote] = useState("");
  const [isEditingAuthorNote, setIsEditingAuthorNote] = useState(false);
  const [isAuthor, setIsAuthor] = useState(false);
  // Wallet panel state (replicated from RN MangaPageScreen)
  const [walletPanelOpen, setWalletPanelOpen] = useState(false);
  const [offChainSmp, setOffChainSmp] = useState(0);
  const [onChainSmp, setOnChainSmp] = useState(0);
  const [weeklyPoints, setWeeklyPoints] = useState(0);
  const [pendingWithdrawal, setPendingWithdrawal] = useState(0);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [walletError, setWalletError] = useState("");
  const SMP_DECIMALS = 6;

  const fetchPrices = async () => {
    try {
      const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
      const data = await response.json();
      return data.solana.usd || 150;
    } catch (error) {
      console.error("Error fetching SOL price:", error);
      return 150;
    }
  };

  // Fetch on-chain SMP balance (ATA) for active wallet
  const fetchOnChainSmp = useCallback(async () => {
    try {
      if (!activePublicKey) {
        setOnChainSmp(0);
        return;
      }
      const ata = getAssociatedTokenAddressSync(new PublicKey(SMP_MINT_ADDRESS), activePublicKey);
      const info = await connection.getAccountInfo(ata);
      if (!info) {
        setOnChainSmp(0);
        return;
      }
      const account = unpackAccount(ata, info);
      const amount = Number(account.amount) / 10 ** SMP_DECIMALS;
      setOnChainSmp(amount);
    } catch (e) {
      console.error("[fetchOnChainSmp]", e);
      setOnChainSmp(0);
    }
  }, [activePublicKey]);

  // Fetch off-chain SMP, points, and pending withdrawals
  const fetchOffChainSummary = useCallback(async () => {
    try {
      if (!activeWalletAddress) return;
      const { data: user, error: userErr } = await supabase
        .from("users")
        .select("id, weekly_points")
        .eq("wallet_address", activeWalletAddress)
        .single();
      if (userErr || !user) throw new Error(userErr?.message || "User not found");
      setUserId(user.id);
      setWeeklyPoints(user.weekly_points || 0);

      const { data: balanceRow } = await supabase
        .from("wallet_balances")
        .select("amount")
        .eq("user_id", user.id)
        .eq("currency", "SMP")
        .eq("chain", "SOL")
        .maybeSingle();
      setOffChainSmp(balanceRow?.amount || 0);

      const { data: pendingRows } = await supabase
        .from("pending_withdrawals")
        .select("amount")
        .eq("user_id", user.id)
        .eq("status", "pending");
      const totalPending = pendingRows?.reduce((s, r) => s + (r.amount || 0), 0) || 0;
      setPendingWithdrawal(totalPending);
    } catch (e) {
      console.error("[fetchOffChainSummary]", e);
      setWalletError(e.message || "Failed to load wallet summary");
      setTimeout(() => setWalletError(""), 5000);
    }
  }, [activeWalletAddress]);

  useEffect(() => {
    if (isWalletConnected) {
      fetchOffChainSummary();
    }
  }, [isWalletConnected, fetchOffChainSummary]);

  useEffect(() => {
    if (walletPanelOpen && isWalletConnected) {
      fetchOnChainSmp();
    }
  }, [walletPanelOpen, isWalletConnected, fetchOnChainSmp]);

  const MIN_WITHDRAWAL = 2500;
  const API_BASE_URL = "https://sempaihq.com";
  const handleWithdraw = async () => {
    try {
      if (!isWalletConnected || !activeWalletAddress) throw new Error("Please connect your wallet.");
      const amount = parseFloat(withdrawAmount);
      if (isNaN(amount) || amount < MIN_WITHDRAWAL) {
        throw new Error(`Withdrawal amount must be at least ${MIN_WITHDRAWAL} SMP.`);
      }
      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("wallet_address", activeWalletAddress)
        .single();
      if (!user) throw new Error("User not found");
      // Check off-chain balance
      if (offChainSmp < amount) {
        throw new Error(`Insufficient off-chain balance: ${offChainSmp.toLocaleString()} SMP available, need ${amount.toLocaleString()} SMP.`);
      }
      const resp = await fetch(`${API_BASE_URL}/api/withdraw-smp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, walletAddress: activeWalletAddress, amount }),
      });
      const text = await resp.text();
      let json;
      try { json = text ? JSON.parse(text) : {}; } catch { json = { error: text }; }
      if (!resp.ok || json?.error) throw new Error(json?.error || `Withdrawal failed: HTTP ${resp.status}`);
      setOffChainSmp((v) => v - amount);
      setWithdrawAmount("");
      setSuccessMessage(`Successfully withdrew ${amount.toLocaleString()} SMP to your wallet! Transaction signature: ${json.signature || "N/A"}`);
      setTimeout(() => setSuccessMessage(""), 8000);
      await fetchOffChainSummary();
    } catch (e) {
      setWalletError(e.message);
      setTimeout(() => setWalletError(""), 8000);
    }
  };

  useEffect(() => {
    const getInitialPrices = async () => {
      const sol = await fetchPrices();
      setSolPrice(sol);
    };
    getInitialPrices();
  }, []);

  const fetchChapter = async () => {
    const { data: chapterData } = await supabase
      .from("manga_chapters")
      .select("id, title, is_premium, price, manga_pages (image_url, page_number), manga (user_id), author_note")
      .eq("id", chapterId)
      .eq("manga_id", mangaId)
      .single();

    const { data: chaptersData } = await supabase
      .from("manga_chapters")
      .select("id, title, chapter_number")
      .eq("manga_id", mangaId)
      .order("chapter_number", { ascending: true });

    setChapter(chapterData);
    setChapters(chaptersData || []);
    if (chapterData) {
      const firstChapterId = chaptersData?.[0]?.id;
      const isFirst = chapterData.id === firstChapterId;
      setIsFirstChapter(isFirst);
      // No free-bypass: premium chapters always require payment/unlock. Non-premium still require wallet connection.
      setPaymentRequired(!!chapterData.is_premium);
      setAuthorNote(chapterData.author_note || "");
      
      // Check if current user is the author
      if (userId && chapterData.manga?.user_id === userId) {
        setIsAuthor(true);
      }
    }
    setLoading(false);
  };

  const fetchRatings = async () => {
    if (!userId || !chapter) return;
    const chapterNum = chapters.find((ch) => ch.id === chapterId)?.chapter_number;

    if (userRating === null) {
      const { data: userRatingData, error: userError } = await supabase
        .from("chapter_ratings")
        .select("rating")
        .eq("user_id", userId)
        .eq("content_type", "manga")
        .eq("content_id", mangaId)
        .eq("chapter_number", chapterNum)
        .single();
      if (userError && userError.code !== "PGRST116") {
        console.error("Error fetching user rating:", userError);
      } else {
        setUserRating(userRatingData?.rating || null);
      }
    }

    const { data: ratingsData, error: avgError } = await supabase
      .from("chapter_ratings")
      .select("rating")
      .eq("content_type", "manga")
      .eq("content_id", mangaId)
      .eq("chapter_number", chapterNum);
    if (avgError) {
      console.error("Error fetching average rating:", avgError);
    } else {
      const avg = ratingsData?.length
        ? ratingsData.reduce((sum, r) => sum + r.rating, 0) / ratingsData.length
        : null;
      setAverageRating(avg);
    }
  };

  useEffect(() => {
    if (!loading && chapter && (isFirstChapter || paymentConfirmed)) fetchRatings();
  }, [loading, chapter, isFirstChapter, paymentConfirmed]);

  const handleSaveAuthorNote = async () => {
    try {
      const { error } = await supabase
        .from("manga_chapters")
        .update({ author_note: authorNote })
        .eq("id", chapterId);

      if (error) throw error;
      setSuccessMessage("Author's note saved successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      setIsEditingAuthorNote(false);
    } catch (error) {
      setError("Failed to save author's note: " + error.message);
      setTimeout(() => setError(""), 5000);
    }
  };

  const handleRating = async (rating) => {
    if (!userId || !isWalletConnected) return;
    setUserRating(rating);
    const chapterNum = chapters.find((ch) => ch.id === chapterId)?.chapter_number;

    const { data, error } = await supabase
      .from("chapter_ratings")
      .upsert(
        {
          user_id: userId,
          content_type: "manga",
          content_id: mangaId,
          chapter_number: chapterNum,
          rating,
        },
        {
          onConflict: ["user_id", "content_type", "content_id", "chapter_number"],
        }
      );

    if (error) {
      console.error("Error saving rating:", error);
      setError("Failed to save rating. Please try again.");
      setUserRating(null);
      return;
    }
    await fetchRatings();
  };

  const initiatePayment = async (currency) => {
    // Redirect payments to Edge Function via proxy (no client signing)
    await handleEdgeUnlock(currency);
  };

  const handleEdgeUnlock = async (currency) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        setError("You must be signed in to unlock chapters.");
        setTimeout(() => setError(null), 5000);
        return;
      }
      const resp = await fetch("/api/unlock-manga-proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mangaId, chapterId, currency }),
      });
      const result = await resp.json();
      if (!resp.ok || !result?.success) {
        throw new Error(result?.error || "Unlock failed");
      }
      setPaymentConfirmed(true);
      setPaymentRequired(false);
      setSuccessMessage("Chapter unlocked successfully.");
      setTimeout(() => setSuccessMessage(""), 5000);
      // Re-check DB access to be safe
      await checkExistingPayment();
    } catch (e) {
      console.error("handleEdgeUnlock error:", e);
      setError(e.message || "Failed to process payment.");
      setTimeout(() => setError(null), 5000);
    }
  };

  const checkExistingPayment = async () => {
    if (!activeWalletAddress || !chapter) return;
    // Non-premium chapters don't need payment but still require wallet connection (handled in UI)
    if (!chapter.is_premium) {
      setPaymentConfirmed(true);
      setPaymentRequired(false);
      return;
    }
    // user_payments check by wallet
    const { data: paid, error: payErr } = await supabase
      .from("user_payments")
      .select("id")
      .eq("user_wallet", activeWalletAddress)
      .eq("chapter_id", chapterId)
      .eq("manga_id", mangaId)
      .limit(1);
    if (!payErr && Array.isArray(paid) && paid.length > 0) {
      setPaymentConfirmed(true);
      setPaymentRequired(false);
      return;
    }
    // unlocked_manga_chapters check by user_id
    try {
      const { data: userRow } = await supabase
        .from("users")
        .select("id")
        .eq("wallet_address", activeWalletAddress)
        .single();
      const uid = userRow?.id;
      if (!uid) return;
      const { data: unlocked, error: unlockErr } = await supabase
        .from("unlocked_manga_chapters")
        .select("id, expires_at")
        .eq("user_id", uid)
        .eq("manga_id", mangaId)
        .eq("chapter_id", chapterId)
        .limit(1);
      if (!unlockErr && Array.isArray(unlocked) && unlocked.length > 0) {
        const exp = unlocked[0].expires_at ? new Date(unlocked[0].expires_at) : null;
        if (!exp || exp > new Date()) {
          setPaymentConfirmed(true);
          setPaymentRequired(false);
          return;
        }
      }
    } catch (e) {
      console.warn("[checkExistingPayment unlocked]", e?.message || e);
    }
  };

  const handleDownload = async () => {
    if (!chapter?.manga_pages?.length) {
      setError("No pages available to download.");
      return;
    }

    setLoading(true);
    const zip = new JSZip();

    try {
      const fetchPromises = chapter.manga_pages.map(async (page, index) => {
        const response = await fetch(page.image_url);
        const blob = await response.blob();
        zip.file(`page_${index + 1}.jpg`, blob);
      });

      await Promise.all(fetchPromises);
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${chapter.title || "Chapter_" + chapterId}.zip`);
      setSuccessMessage("Chapter downloaded successfully!");
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (error) {
      setError("Failed to download chapter: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function initialize() {
      // Require wallet connection for ALL chapters
      if (!isWalletConnected || !activeWalletAddress) {
        setLoading(false);
        return;
      }
      if (isWalletConnected && activeWalletAddress) {
        let { data: user, error: userError } = await supabase
          .from("users")
          .select("id")
          .eq("wallet_address", activeWalletAddress)
          .single();

        if (userError && userError.code === "PGRST116") {
          const { data: newUser, error: insertError } = await supabase
            .from("users")
            .insert([{ wallet_address: activeWalletAddress }])
            .select("id")
            .single();
          if (insertError) {
            console.error("Error creating user:", insertError);
            setError("Failed to initialize user.");
            return;
          }
          user = newUser;
        } else if (userError) {
          console.error("Error fetching user:", userError);
          setError("Failed to fetch user.");
          return;
        }
        setUserId(user?.id || null);
      }
      await fetchChapter();
    }
    initialize();
  }, [isWalletConnected, activeWalletAddress, chapterId, mangaId]);

  useEffect(() => {
    if (isWalletConnected && chapter) checkExistingPayment();
  }, [isWalletConnected, activeWalletAddress, chapter]);

  const updateTokenBalance = useCallback(async () => {
    if (!activeWalletAddress || !chapter || !mangaId || !chapterId) return;

    try {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, wallet_address, weekly_points")
        .eq("wallet_address", activeWalletAddress)
        .single();

      if (userError || !userData) throw new Error("User not found");
      const user = userData;

      if (chapter.is_premium && !paymentConfirmed && !isFirstChapter) return;

      const { data: mangaOwnerData, error: mangaOwnerError } = await supabase
        .from("manga")
        .select("user_id")
        .eq("id", mangaId)
        .single();

      if (mangaOwnerError || !mangaOwnerData) throw new Error("Manga owner not found");
      const mangaOwnerId = mangaOwnerData.user_id;

      const { data: mangaOwner, error: mangaOwnerBalanceError } = await supabase
        .from("users")
        .select("id, wallet_address, balance")
        .eq("id", mangaOwnerId)
        .single();

      if (mangaOwnerBalanceError || !mangaOwner) throw new Error("Manga owner balance not found");

      const teamId = "33e4387d-5964-4418-98e2-225630a4fcef";
      const { data: team, error: teamError } = await supabase
        .from("users")
        .select("id, wallet_address, balance")
        .eq("id", teamId)
        .single();

      if (teamError || !team) throw new Error("Team not found");

      const eventDetails = `${activeWalletAddress}${chapter.title || "Untitled"}${chapterId}`
        .replace(/[^a-zA-Z0-9]/g, "")
        .substring(0, 255);

      const { data: existingEvents, error: eventError } = await supabase
        .from("wallet_events")
        .select("id")
        .eq("event_details", eventDetails)
        .eq("wallet_address", activeWalletAddress)
        .limit(1);

      if (eventError) throw new Error(`Error checking wallet events: ${eventError.message}`);

      if (existingEvents?.length > 0) {
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
      const newAuthorBalance = (mangaOwner.balance || 0) + authorReward;
      const newTeamBalance = (team.balance || 0) + teamReward;

      const updates = [
        supabase.from("users").update({ weekly_points: newReaderBalance }).eq("id", user.id),
        ...(mangaOwner.id !== user.id
          ? [supabase.from("users").update({ balance: newAuthorBalance }).eq("id", mangaOwner.id)]
          : []),
        ...(team.id !== user.id && team.id !== mangaOwner.id
          ? [supabase.from("users").update({ balance: newTeamBalance }).eq("id", team.id)]
          : []),
      ];

      const results = await Promise.all(updates);
      for (const { error } of results) {
        if (error) throw new Error(`Error updating balance: ${error.message}`);
      }

      const walletBalancesData = [
        {
          user_id: mangaOwner.id,
          chain: "SOL",
          currency: "Token",
          amount: newAuthorBalance,
          decimals: 0,
          wallet_address: mangaOwner.wallet_address,
        },
        {
          user_id: team.id,
          chain: "SOL",
          currency: "Token",
          amount: newTeamBalance,
          decimals: 0,
          wallet_address: TEAM_WALLET,
        },
      ];

      const { error: walletError } = await supabase.from("wallet_balances").upsert(walletBalancesData);
      if (walletError) throw new Error(`Error updating wallet balances: ${walletError.message}`);

      const walletEventsData = [
        {
          destination_user_id: user.id,
          event_type: "deposit",
          event_details: eventDetails,
          source_chain: "SOL",
          source_currency: "Token",
          amount_change: readerReward,
          wallet_address: activeWalletAddress,
          source_user_id: "6f859ff9-3557-473c-b8ca-f23fd9f7af27",
          destination_chain: "SOL",
        },
        {
          destination_user_id: mangaOwner.id,
          event_type: "deposit",
          event_details: eventDetails,
          source_chain: "SOL",
          source_currency: "Token",
          amount_change: authorReward,
          wallet_address: mangaOwner.wallet_address,
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
          wallet_address: TEAM_WALLET,
          source_user_id: "6f859ff9-3557-473c-b8ca-f23fd9f7af27",
          destination_chain: "SOL",
        },
      ];

      const { error: eventInsertError } = await supabase.from("wallet_events").insert(walletEventsData);
      if (eventInsertError) throw new Error(`Error inserting wallet events: ${eventInsertError.message}`);

      const { data: interaction, error: interactionError } = await supabase
        .from("manga_interactions")
        .select("id, read_count")
        .eq("user_id", user.id)
        .eq("manga_id", mangaId)
        .single();

      if (interactionError && interactionError.code !== "PGRST116") throw interactionError;

      if (interaction) {
        await supabase
          .from("manga_interactions")
          .update({
            last_read_at: new Date().toISOString(),
            read_count: interaction.read_count + 1,
          })
          .eq("id", interaction.id);
      } else {
        await supabase.from("manga_interactions").insert({
          user_id: user.id,
          manga_id: mangaId,
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
  }, [activeWalletAddress, chapter, mangaId, chapterId, balance, paymentConfirmed, isFirstChapter]);

  useEffect(() => {
    if (
      !loading &&
      chapter &&
      (isWalletConnected || isFirstChapter) &&
      (!chapter.is_premium || paymentConfirmed || isFirstChapter)
    ) {
      updateTokenBalance();
    }
  }, [loading, chapter, isWalletConnected, paymentConfirmed, isFirstChapter, updateTokenBalance]);

  const handleChapterChange = (e) => {
    router.push(`/manga/${mangaId}/chapter/${e.target.value}`);
  };

  const currentChapterIndex = chapters.findIndex((ch) => ch.id === chapterId);
  const prevChapter = currentChapterIndex > 0 ? chapters[currentChapterIndex - 1] : null;
  const nextChapter = currentChapterIndex < chapters.length - 1 ? chapters[currentChapterIndex + 1] : null;

  if (loading) return <LoadingPage />;
  if (!chapter) return <div className={styles.page}>Chapter not found.</div>;

  const chapterPrice = chapter?.price && chapter.price > 0 ? chapter.price : 2.5;
  const solAmount = solPrice ? (chapterPrice / solPrice).toFixed(5) : "Loading...";
  const usdcAmount = (chapterPrice / usdcPrice).toFixed(2);
  const canDownload = isWalletConnected && (!chapter.is_premium || paymentConfirmed);

  return (
    <div className={styles.page}>
      <div className={styles.backgroundAnimation}></div>
      <nav className={styles.navbar}>
        <Link href="/" className={styles.navLink}>
          <FaHome /> Home
        </Link>
        <Link href={`/manga/${mangaId}`} className={styles.navLink}>
          <FaBookOpen /> Manga Hub
        </Link>
        <ConnectButton className={styles.walletButton} />
      </nav>

      {isWalletConnected && (
        <div className={styles.walletPanel}>
          <button
            className={styles.navButton}
            onClick={() => setWalletPanelOpen((p) => !p)}
            style={{ margin: "10px 0" }}
          >
            {walletPanelOpen ? "Hide Wallet" : "Show Wallet"}
          </button>
          {walletPanelOpen && (
            <div className={styles.paymentSection}>
              <p>
                <strong>Wallet:</strong> {activeWalletAddress?.slice(0, 6)}...{activeWalletAddress?.slice(-4)}
              </p>
              <p>
                <strong>SMP (Off-chain):</strong> {offChainSmp.toLocaleString()}
              </p>
              <p>
                <strong>SMP (On-chain):</strong> {onChainSmp.toLocaleString(undefined, { maximumFractionDigits: 6 })}
              </p>
              <p>
                <strong>Points:</strong> {weeklyPoints.toLocaleString()}
              </p>
              {pendingWithdrawal > 0 && (
                <p>
                  <strong>Pending:</strong> {pendingWithdrawal.toLocaleString()} SMP
                </p>
              )}
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                <input
                  type="number"
                  placeholder={`Amount (Min: ${MIN_WITHDRAWAL})`}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className={styles.chapterSelect}
                  style={{ maxWidth: 220 }}
                />
                <button onClick={handleWithdraw} className={styles.navButton}>
                  Withdraw
                </button>
                <button onClick={fetchOffChainSummary} className={styles.navButton}>
                  Refresh
                </button>
              </div>
              {walletError && <div className={styles.error}>{walletError}</div>}
            </div>
          )}
        </div>
      )}

      <main className={styles.content}>
        <h1 className={styles.title}>{chapter.title}</h1>

        {successMessage && (
          <div className={styles.success}>
            <FaGem /> {successMessage}
          </div>
        )}
        {warningMessage && <div className={styles.warning}>{warningMessage}</div>}
        {error && <div className={styles.error}>{error}</div>}

        {!isWalletConnected ? (
          <div className={styles.paymentSection}>
            <FaLock className={styles.lockIcon} />
            <p>Please connect your wallet to read this chapter.</p>
            <ConnectButton className={styles.walletButton} />
          </div>
        ) : paymentRequired && !paymentConfirmed ? (
          <div className={styles.paymentSection}>
            <FaLock className={styles.lockIcon} />
            <p>Unlock this chapter for ${chapterPrice.toFixed(2)}</p>
            <div className={styles.paymentButtons}>
              <button onClick={() => initiatePayment("SOL")} disabled={!solPrice}>
                Pay {solAmount} SOL
              </button>
              <button onClick={() => initiatePayment("USDC")}>Pay {usdcAmount} USDC</button>
            </div>
            {transactionSignature && (
              <p>
                Tx:{" "}
                <a
                  href={`https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {transactionSignature.slice(0, 8)}...
                </a>
              </p>
            )}
          </div>
        ) : (
          <div className={styles.mangaContainer}>
            {chapter.manga_pages.map((page, index) => (
              <img key={index} src={page.image_url} alt={`Page ${index + 1}`} className={styles.mangaPage} />
            ))}
            <div className={styles.chapterNav}>
              {prevChapter && (
                <Link href={`/manga/${mangaId}/chapter/${prevChapter.id}`} className={styles.navButton}>
                  Previous
                </Link>
              )}
              <Link href={`/manga/${mangaId}`} className={styles.navButton}>
                Manga Hub
              </Link>
              {nextChapter && (
                <Link href={`/manga/${mangaId}/chapter/${nextChapter.id}`} className={styles.navButton}>
                  Next
                </Link>
              )}
            </div>
            <select value={chapterId} onChange={handleChapterChange} className={styles.chapterSelect}>
              {chapters.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.title || `Chapter ${ch.chapter_number}`}
                </option>
              ))}
            </select>
            {canDownload && (
              <button onClick={handleDownload} className={styles.downloadButton}>
                <FaDownload /> Download Chapter
              </button>
            )}
            {isWalletConnected && (isFirstChapter || paymentConfirmed) && (
              <div className={styles.ratingSection}>
                <div className={styles.userRating}>
                  <span>Your Rating: </span>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <FaStar
                      key={star}
                      className={`${styles.star} ${star <= (userRating || 0) ? styles.filledStar : ""}`}
                      onClick={() => handleRating(star)}
                    />
                  ))}
                </div>
                <div className={styles.averageRating}>
                  <span>Average Rating: </span>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <FaStar
                      key={star}
                      className={`${styles.star} ${star <= Math.round(averageRating || 0) ? styles.filledStar : ""}`}
                    />
                  ))}
                  {averageRating ? ` (${averageRating.toFixed(1)} / 5)` : " (No ratings yet)"}
                </div>
              </div>
            )}
            {isWalletConnected && (isFirstChapter || paymentConfirmed) && (
              <MangaCommentSection
                mangaId={mangaId}
                chapterId={chapterId}
                isWalletConnected={isWalletConnected}
                activePublicKey={activePublicKey}
              />
            )}

            {/* Author's Note Section */}
            {isWalletConnected && (isFirstChapter || paymentConfirmed) && (
              <div className={styles.authorNoteSection}>
                <h3 className={styles.authorNoteTitle}>Author's Note</h3>
                {isAuthor ? (
                  <>
                    {isEditingAuthorNote ? (
                      <div className={styles.authorNoteEdit}>
                        <textarea
                          value={authorNote}
                          onChange={(e) => setAuthorNote(e.target.value)}
                          placeholder="Add a note for your readers..."
                          className={styles.authorNoteTextarea}
                          rows={4}
                        />
                        <div className={styles.authorNoteActions}>
                          <button onClick={handleSaveAuthorNote} className={styles.saveButton}>
                            Save Note
                          </button>
                          <button onClick={() => setIsEditingAuthorNote(false)} className={styles.cancelButton}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.authorNoteDisplay}>
                        {authorNote ? (
                          <p className={styles.authorNoteText}>{authorNote}</p>
                        ) : (
                          <p className={styles.authorNoteEmpty}>No author's note yet.</p>
                        )}
                        <button onClick={() => setIsEditingAuthorNote(true)} className={styles.editButton}>
                          Edit Note
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className={styles.authorNoteDisplay}>
                    {authorNote ? (
                      <p className={styles.authorNoteText}>{authorNote}</p>
                    ) : (
                      <p className={styles.authorNoteEmpty}>No author's note for this chapter.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {showTransactionPopup && transactionDetails && (
        <div className={styles.transactionPopupOverlay}>
          <div className={styles.transactionPopup}>
            <button
              onClick={() => {
                setShowTransactionPopup(false);
                setPassword("");
              }}
              className={styles.closePopupButton}
            >
              ✕
            </button>
            <h3 className={styles.popupTitle}>Confirm Transaction</h3>
            <p className={styles.popupMessage}>
              You are about to unlock this chapter for:
            </p>
            <div className={styles.transactionDetails}>
              <p>
                <strong>Amount:</strong> {transactionDetails.displayAmount} {transactionDetails.currency}
              </p>
              <p>
                <strong>USD Value:</strong> ${transactionDetails.usdAmount.toFixed(2)}
              </p>
              <p>
                <strong>Wallet:</strong> {activeWalletAddress?.slice(0, 6)}...{activeWalletAddress?.slice(-4)}
              </p>
              <p>
                <strong>To:</strong> {MERCHANT_WALLET.toString().slice(0, 6)}...{MERCHANT_WALLET.toString().slice(-4)}
              </p>
            </div>
            {embeddedWallet && (
              <div className={styles.passwordInput}>
                <label>Wallet Password:</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-control"
                  placeholder="Enter your password"
                />
              </div>
            )}
            <div className={styles.popupButtons}>
              <button
                onClick={confirmPayment}
                className={`${styles.confirmButton} btn btn-primary`}
              >
                Confirm Payment
              </button>
              <button
                onClick={() => {
                  setShowTransactionPopup(false);
                  setPassword("");
                }}
                className={`${styles.cancelButton} btn btn-secondary`}
              >
                Cancel
              </button>
            </div>
            <p className={styles.popupNote}>
              {embeddedWallet ? "Enter your password to proceed." : "Please approve the transaction in your wallet."}
            </p>
          </div>
        </div>
      )}

      <footer className={styles.footer}>
        <p>© 2025 SempaiHQ. All rights reserved.</p>
      </footer>
    </div>
  );
}