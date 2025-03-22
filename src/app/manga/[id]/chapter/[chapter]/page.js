"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { supabase } from "../../../../../services/supabase/supabaseClient";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createTransferInstruction } from "@solana/spl-token";
import { FaHome, FaBookOpen, FaLock, FaGem, FaDownload, FaStar } from "react-icons/fa";
import LoadingPage from "../../../../../components/LoadingPage";
import UseAmethystBalance from "../../../../../components/UseAmethystBalance";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import styles from "../../../../../styles/MangaChapter.module.css";
import { RPC_URL } from "@/constants";
import MangaCommentSection from "../../../../../components/MangaCommentSection"; // Import the new component

const MERCHANT_WALLET = new PublicKey("3p1HL3nY5LUNwuAj6dKLRiseSU93UYRqYPGbR7LQaWd5");
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const connection = new Connection(RPC_URL, "confirmed");
const TEAM_WALLET = "9JA3f2Nwx9wpgh2wAg8KQv2bSQGRvYwvyQbgTyPmB8nc";

export default function MangaChapter() {
  const { id: mangaId, chapter: chapterId } = useParams();
  const router = useRouter();
  const { connected, publicKey, sendTransaction } = useWallet();
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
      .select("id, title, is_premium, manga_pages (image_url, page_number), manga (user_id)")
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
      setIsFirstChapter(chapterData.id === firstChapterId);
      if (chapterData.is_premium && !isFirstChapter) setPaymentRequired(true);
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

  const handleRating = async (rating) => {
    if (!userId || !connected) return;
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

  const getAssociatedTokenAddress = async (owner, mint) => {
    return await PublicKey.findProgramAddress(
      [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
    );
  };

  const handlePayment = async (currency) => {
    if (!publicKey || !connected) {
      alert("Please connect your wallet first.");
      return;
    }

    const usdAmount = 2.5;
    let amount, decimals, mint;

    const attemptTransaction = async (maxRetries = 2) => {
      for (let i = 0; i <= maxRetries; i++) {
        try {
          const freshSolPrice = await fetchPrices();
          setSolPrice(freshSolPrice);

          if (currency === "SOL") {
            amount = Math.round((usdAmount / freshSolPrice) * LAMPORTS_PER_SOL);
            decimals = 9;

            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
            const transaction = new Transaction({
              recentBlockhash: blockhash,
              feePayer: publicKey,
            }).add(
              SystemProgram.transfer({
                fromPubkey: publicKey,
                toPubkey: MERCHANT_WALLET,
                lamports: amount,
              })
            );

            const signature = await sendTransaction(transaction, connection, { skipPreflight: false });
            await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
            setTransactionSignature(signature);
            await processUnlock(signature, amount / LAMPORTS_PER_SOL, currency);
            return;
          } else if (currency === "USDC") {
            mint = USDC_MINT;
            decimals = 6;
            amount = Math.round((usdAmount / usdcPrice) * 10 ** decimals);

            const sourceATA = (await getAssociatedTokenAddress(publicKey, mint))[0];
            const destATA = (await getAssociatedTokenAddress(MERCHANT_WALLET, mint))[0];

            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
            const transaction = new Transaction({
              recentBlockhash: blockhash,
              feePayer: publicKey,
            }).add(
              createTransferInstruction(sourceATA, destATA, publicKey, amount, [], TOKEN_PROGRAM_ID)
            );

            const signature = await sendTransaction(transaction, connection, { skipPreflight: false });
            await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
            setTransactionSignature(signature);
            await processUnlock(signature, amount / 10 ** decimals, currency);
            return;
          }
        } catch (error) {
          console.error(`Attempt ${i + 1} failed:`, error);
          if (i === maxRetries) {
            setError(`Payment failed after ${maxRetries + 1} attempts: ${error.message}`);
            throw error;
          }
          if (error.message.includes("Extension context invalidated")) {
            alert("Wallet connection lost. Please reconnect and try again.");
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    };

    try {
      await attemptTransaction();
    } catch (error) {
      console.error(`${currency} Payment Error:`, error);
    }
  };

  const processUnlock = async (signature, amount, currency) => {
    try {
      const payload = {
        user_wallet: publicKey.toString(),
        manga_id: mangaId,
        chapter_id: chapterId,
        signature,
        amount,
        currency,
      };
      const response = await fetch("/api/unlock-manga-chapter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (response.ok) {
        setPaymentConfirmed(true);
        setPaymentRequired(false);
        setSuccessMessage("Payment successful! Chapter unlocked.");
        setTimeout(() => setSuccessMessage(""), 5000);
        await supabase.from("user_payments").insert({
          user_wallet: publicKey.toString(),
          chapter_id: chapterId,
          manga_id: mangaId,
          paid_at: new Date().toISOString(),
          payment_method: currency,
        });
      } else {
        setError(result.error || "Failed to unlock chapter.");
      }
    } catch (error) {
      setError("Failed to process unlock: " + error.message);
    }
  };

  const checkExistingPayment = async () => {
    if (!publicKey || !chapter?.is_premium || isFirstChapter) return;
    const { data } = await supabase
      .from("user_payments")
      .select("id")
      .eq("user_wallet", publicKey.toString())
      .eq("chapter_id", chapterId)
      .eq("manga_id", mangaId)
      .maybeSingle();
    if (data) {
      setPaymentConfirmed(true);
      setPaymentRequired(false);
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
      if (connected && publicKey) {
        let { data: user, error: userError } = await supabase
          .from("users")
          .select("id")
          .eq("wallet_address", publicKey.toString())
          .single();

        if (userError && userError.code === "PGRST116") {
          const { data: newUser, error: insertError } = await supabase
            .from("users")
            .insert([{ wallet_address: publicKey.toString() }])
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
  }, [connected, publicKey, chapterId, mangaId]);

  useEffect(() => {
    if (chapter?.is_premium && connected && !isFirstChapter) checkExistingPayment();
  }, [connected, publicKey, chapter, isFirstChapter]);

  const updateTokenBalance = useCallback(async () => {
    if (!publicKey || !chapter || !mangaId || !chapterId) return;

    try {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, wallet_address, weekly_points")
        .eq("wallet_address", publicKey.toString())
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

      const eventDetails = `${publicKey.toString()}${chapter.title || "Untitled"}${chapterId}`
        .replace(/[^a-zA-Z0-9]/g, "")
        .substring(0, 255);

      const { data: existingEvents, error: eventError } = await supabase
        .from("wallet_events")
        .select("id")
        .eq("event_details", eventDetails)
        .eq("wallet_address", publicKey.toString())
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
          wallet_address: publicKey.toString(),
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
  }, [publicKey, chapter, mangaId, chapterId, balance, paymentConfirmed, isFirstChapter]);

  useEffect(() => {
    if (
      !loading &&
      chapter &&
      (connected || isFirstChapter) &&
      (!chapter.is_premium || paymentConfirmed || isFirstChapter)
    ) {
      updateTokenBalance();
    }
  }, [loading, chapter, connected, paymentConfirmed, isFirstChapter, updateTokenBalance]);

  const handleChapterChange = (e) => {
    router.push(`/manga/${mangaId}/chapter/${e.target.value}`);
  };

  const currentChapterIndex = chapters.findIndex((ch) => ch.id === chapterId);
  const prevChapter = currentChapterIndex > 0 ? chapters[currentChapterIndex - 1] : null;
  const nextChapter = currentChapterIndex < chapters.length - 1 ? chapters[currentChapterIndex + 1] : null;

  if (loading) return <LoadingPage />;
  if (!chapter) return <div className={styles.page}>Chapter not found.</div>;

  const solAmount = solPrice ? (2.5 / solPrice).toFixed(5) : "Loading...";
  const usdcAmount = (2.5 / usdcPrice).toFixed(2);
  const canDownload = connected && (isFirstChapter || (chapter.is_premium && paymentConfirmed));

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
        <WalletMultiButton className={styles.walletButton} />
      </nav>

      <main className={styles.content}>
        <h1 className={styles.title}>{chapter.title}</h1>

        {successMessage && (
          <div className={styles.success}>
            <FaGem /> {successMessage}
          </div>
        )}
        {warningMessage && <div className={styles.warning}>{warningMessage}</div>}
        {error && <div className={styles.error}>{error}</div>}

        {!connected && !isFirstChapter ? (
          <div className={styles.paymentSection}>
            <FaLock className={styles.lockIcon} />
            <p>Please connect your wallet to read this chapter.</p>
            <WalletMultiButton className={styles.walletButton} />
          </div>
        ) : paymentRequired && !paymentConfirmed ? (
          <div className={styles.paymentSection}>
            <FaLock className={styles.lockIcon} />
            <p>Unlock this chapter for $2.5</p>
            <div className={styles.paymentButtons}>
              <button onClick={() => handlePayment("SOL")} disabled={!solPrice}>
                Pay {solAmount} SOL
              </button>
              <button onClick={() => handlePayment("USDC")}>Pay {usdcAmount} USDC</button>
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
                  {ch.title || `Chapter ${ch.id}`}
                </option>
              ))}
            </select>
            {canDownload && (
              <button onClick={handleDownload} className={styles.downloadButton}>
                <FaDownload /> Download Chapter
              </button>
            )}
            {connected && (isFirstChapter || paymentConfirmed) && (
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
            {/* Add MangaCommentSection here */}
            {connected && (isFirstChapter || paymentConfirmed) && (
              <MangaCommentSection mangaId={mangaId} chapterId={chapterId} />
            )}
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <p>© 2025 SempaiHQ. All rights reserved.</p>
      </footer>
    </div>
  );
}