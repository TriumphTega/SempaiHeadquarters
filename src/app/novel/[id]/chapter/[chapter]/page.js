"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useContext } from "react";
import { supabase } from "../../../../../services/supabase/supabaseClient";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Connection, SystemProgram, Transaction, PublicKey, LAMPORTS_PER_SOL, Keypair } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createTransferInstruction } from "@solana/spl-token";
import DOMPurify from "dompurify";
import Head from "next/head";
import Link from "next/link";
import { FaHome, FaBars, FaTimes, FaBookOpen, FaVolumeUp, FaPause, FaPlay, FaStop, FaChevronLeft, FaChevronRight, FaGem, FaLock, FaRocket, FaCrown, FaStar, FaWallet } from "react-icons/fa";
import LoadingPage from "../../../../../components/LoadingPage";
import CommentSection from "../../../../../components/Comments/CommentSection";
import UseAmethystBalance from "../../../../../components/UseAmethystBalance";
import styles from "../../../../../styles/ChapterPage.module.css";
import { RPC_URL, SMP_MINT_ADDRESS } from "../../../../../constants";
import { EmbeddedWalletContext } from "../../../../../components/EmbeddedWalletProvider";

const TARGET_WALLET = "HSxUYwGM3NFzDmeEJ6o4bhyn8knmQmq7PLUZ6nZs4F58";
const USDC_MINT_ADDRESS = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const createDOMPurify = typeof window !== "undefined" ? DOMPurify : null;
const connection = new Connection(RPC_URL, "confirmed");

export default function ChapterPage() {
  const { id, chapter } = useParams();
  const router = useRouter();
  const { connected, publicKey, sendTransaction } = useWallet(); // External wallet (e.g., Phantom)
  const { wallet: embeddedWallet, getSecretKey } = useContext(EmbeddedWalletContext); // Embedded wallet

  // Determine active wallet (prioritize embedded wallet if available)
  const activePublicKey = embeddedWallet?.publicKey ? new PublicKey(embeddedWallet.publicKey) : publicKey;
  const activeWalletAddress = activePublicKey?.toString();
  const isWalletConnected = !!activePublicKey;

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
  const [smpPrice, setSmpPrice] = useState(null);
  const usdcPrice = 1; // USDC is pegged to $1
  const [userRating, setUserRating] = useState(null);
  const [averageRating, setAverageRating] = useState(null);
  const [showTransactionPopup, setShowTransactionPopup] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState(null);

  const fetchPrices = async () => {
    const fetchSolPrice = async () => {
      try {
        const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
        const data = await response.json();
        return data.solana.usd;
      } catch (error) {
        console.error("Error fetching SOL price:", error);
        return null;
      }
    };

    const fetchSmpPrice = async () => {
      try {
        const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=smp-token-id&vs_currencies=usd");
        const data = await response.json();
        return data["smp-token-id"]?.usd || null;
      } catch (error) {
        console.error("Error fetching SMP price:", error);
        return null;
      }
    };

    const [sol, smp] = await Promise.all([fetchSolPrice(), fetchSmpPrice()]);
    return { solPrice: sol || 100, smpPrice: smp }; // Default SOL to 100 if fetch fails
  };

  useEffect(() => {
    const getInitialPrices = async () => {
      const { solPrice: initialSol, smpPrice: initialSmp } = await fetchPrices();
      setSolPrice(initialSol);
      setSmpPrice(initialSmp);
    };
    getInitialPrices();
  }, []);

  const updateTokenBalance = useCallback(async () => {
    if (!activeWalletAddress || !novel || !chapter || !id) {
      console.warn("Missing required data for token update:", { activeWalletAddress, novel, chapter, id });
      return;
    }

    try {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, wallet_address, weekly_points")
        .eq("wallet_address", activeWalletAddress)
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

      const eventDetails = `${activeWalletAddress}${novel.title || "Untitled"}${chapter}`
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 255);

      if (!eventDetails) throw new Error("Failed to generate event details");

      const { data: existingEvents, error: eventError } = await supabase
        .from("wallet_events")
        .select("id")
        .eq("event_details", eventDetails)
        .eq("wallet_address", activeWalletAddress)
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
          wallet_address: activeWalletAddress,
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
  }, [activeWalletAddress, novel, chapter, balance, id]);

  useEffect(() => {
    async function initialize() {
      const chapterNum = parseInt(chapter, 10);
      if (!isWalletConnected && chapterNum > 2) {
        setShowConnectPopup(true);
        setLoading(false);
        return;
      }

      let { data: user, error: userError } = isWalletConnected
        ? await supabase
            .from("users")
            .select("id")
            .eq("wallet_address", activeWalletAddress)
            .single()
        : { data: null, error: null };

      if (isWalletConnected && userError && userError.code === "PGRST116") {
        const { data: newUser, error: insertError } = await supabase
          .from("users")
          .insert([{ wallet_address: activeWalletAddress }])
          .select("id")
          .single();

        if (insertError) {
          console.error("Error creating user:", insertError);
          setError("Failed to initialize user.");
          setLoading(false);
          return;
        }
        user = newUser;
      } else if (isWalletConnected && userError) {
        console.error("Error fetching user:", userError);
        setError("Failed to fetch user.");
        setLoading(false);
        return;
      }

      setUserId(user?.id || null);
      await checkAccess(user?.id);
    }
    initialize();
  }, [isWalletConnected, activeWalletAddress, id, chapter]);

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

      if (!isLocked) {
        const { data: currentNovel, error: fetchError } = await supabase
          .from("novels")
          .select("viewers_count")
          .eq("id", id)
          .single();
        if (!fetchError) {
          await supabase
            .from("novels")
            .update({ viewers_count: (currentNovel.viewers_count || 0) + 1 })
            .eq("id", id);
        }
      }

      if (chapterNum <= 2) {
        if (!chapterAdvanceInfo.is_advance || (chapterAdvanceInfo.free_release_date && new Date(chapterAdvanceInfo.free_release_date) <= new Date())) {
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

      if (!chapterAdvanceInfo.is_advance || (chapterAdvanceInfo.free_release_date && new Date(chapterAdvanceInfo.free_release_date) <= new Date())) {
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
          if (!expired) {
            if (unlock.chapter_unlocked_till === -1 || (unlock.chapter_unlocked_till >= chapterNum && chapterNum < totalChapters)) {
              setIsLocked(false);
              return;
            }
          }
        }
        setIsLocked(true);
      } else {
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

  const fetchRatings = async () => {
    if (!userId) return;
    const chapterNum = parseInt(chapter, 10);

    if (userRating === null) {
      const { data: userRatingData, error: userError } = await supabase
        .from("chapter_ratings")
        .select("rating")
        .eq("user_id", userId)
        .eq("content_type", "novel")
        .eq("content_id", id)
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
      .eq("content_type", "novel")
      .eq("content_id", id)
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
    if (!isLocked) fetchRatings();
  }, [isLocked]);

  const handleRating = async (rating) => {
    if (!userId || !isWalletConnected) return;
    setUserRating(rating);
    const chapterNum = parseInt(chapter, 10);

    const { data, error } = await supabase
      .from("chapter_ratings")
      .upsert({
        user_id: userId,
        content_type: "novel",
        content_id: id,
        chapter_number: chapterNum,
        rating
      }, {
        onConflict: ["user_id", "content_type", "content_id", "chapter_number"]
      });

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
      [
        owner.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
    );
  };

  const initiatePayment = async (subscriptionType, currency) => {
    if (!activeWalletAddress || !activePublicKey) {
      setError("Please connect your wallet");
      return;
    }

    const usdAmount = subscriptionType === "3CHAPTERS" ? 3 : 15;
    let amount, decimals, mint, displayAmount;

    try {
      const { solPrice: freshSolPrice, smpPrice: freshSmpPrice } = await fetchPrices();
      setSolPrice(freshSolPrice);
      setSmpPrice(freshSmpPrice);

      if (currency === "SOL") {
        if (!freshSolPrice) throw new Error("SOL price not available");
        amount = Math.round((usdAmount / freshSolPrice) * LAMPORTS_PER_SOL);
        decimals = 9;
        displayAmount = (amount / LAMPORTS_PER_SOL).toFixed(4);
      } else {
        const price = currency === "USDC" ? usdcPrice : freshSmpPrice;
        if (!price) throw new Error(`${currency} price not available`);
        mint = currency === "USDC" ? USDC_MINT_ADDRESS : SMP_MINT_ADDRESS;
        decimals = currency === "USDC" ? 6 : 9;
        amount = Math.round((usdAmount / price) * (10 ** decimals));
        displayAmount = (amount / (10 ** decimals)).toFixed(2);
      }

      setTransactionDetails({
        subscriptionType,
        currency,
        amount,
        displayAmount,
        decimals,
        mint,
      });
      setShowTransactionPopup(true);
    } catch (error) {
      console.error("Error initiating payment:", error);
      setError(`Failed to initiate payment: ${error.message}`);
    }
  };

  const confirmPayment = async () => {
    if (!transactionDetails) return;

    const { subscriptionType, currency, amount, decimals, mint } = transactionDetails;

    if (!activePublicKey) {
      setError("No wallet selected. Please connect a wallet and try again.");
      setShowTransactionPopup(false);
      return;
    }

    try {
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      let signature;

      const balance = await connection.getBalance(activePublicKey);
      const minBalanceRequired = currency === "SOL" ? amount + 5000 : 5000; // Add 5000 lamports for fee

      if (balance < minBalanceRequired) {
        throw new Error(
          `Insufficient SOL balance: ${balance / LAMPORTS_PER_SOL} SOL available, need at least ${(minBalanceRequired / LAMPORTS_PER_SOL).toFixed(6)} SOL`
        );
      }

      if (currency === "SOL") {
        const transaction = new Transaction({
          recentBlockhash: blockhash,
          feePayer: activePublicKey,
        }).add(
          SystemProgram.transfer({
            fromPubkey: activePublicKey,
            toPubkey: new PublicKey(TARGET_WALLET),
            lamports: amount,
          })
        );

        if (embeddedWallet) {
          console.log("Using embedded wallet for SOL transaction");
          const password = prompt("Enter your wallet password to proceed:"); // Replace with secure input method
          if (!password) throw new Error("Password required for embedded wallet.");
          const secretKey = getSecretKey(password);
          if (!secretKey) throw new Error("Failed to decrypt secret key. Invalid password?");
          const keypair = Keypair.fromSecretKey(secretKey);
          transaction.sign(keypair);
          signature = await connection.sendRawTransaction(transaction.serialize());
        } else if (connected && sendTransaction) {
          console.log("Using external wallet for SOL transaction");
          signature = await sendTransaction(transaction, connection, {
            skipPreflight: false,
            preflightCommitment: "confirmed",
          });
        } else {
          throw new Error("No valid wallet available for signing the transaction.");
        }

        await connection.confirmTransaction(
          { signature, blockhash, lastValidBlockHeight },
          "confirmed"
        );
        await processUnlock(subscriptionType, signature, amount / LAMPORTS_PER_SOL, currency);
      } else {
        const sourceATA = (await getAssociatedTokenAddress(activePublicKey, mint))[0];
        const destATA = (await getAssociatedTokenAddress(new PublicKey(TARGET_WALLET), mint))[0];

        const transaction = new Transaction({
          recentBlockhash: blockhash,
          feePayer: activePublicKey,
        }).add(
          createTransferInstruction(
            sourceATA,
            destATA,
            activePublicKey,
            amount,
            [],
            TOKEN_PROGRAM_ID
          )
        );

        if (embeddedWallet) {
          console.log("Using embedded wallet for token transaction");
          const password = prompt("Enter your wallet password to proceed:"); // Replace with secure input method
          if (!password) throw new Error("Password required for embedded wallet.");
          const secretKey = getSecretKey(password);
          if (!secretKey) throw new Error("Failed to decrypt secret key. Invalid password?");
          const keypair = Keypair.fromSecretKey(secretKey);
          transaction.sign(keypair);
          signature = await connection.sendRawTransaction(transaction.serialize());
        } else if (connected && sendTransaction) {
          console.log("Using external wallet for token transaction");
          signature = await sendTransaction(transaction, connection, {
            skipPreflight: false,
            preflightCommitment: "confirmed",
          });
        } else {
          throw new Error("No valid wallet available for signing the transaction.");
        }

        await connection.confirmTransaction(
          { signature, blockhash, lastValidBlockHeight },
          "confirmed"
        );
        await processUnlock(subscriptionType, signature, amount / (10 ** decimals), currency);
      }
    } catch (error) {
      console.error(`${currency} Payment Error:`, error);
      setError(`Payment failed: ${error.message}`);
    } finally {
      setShowTransactionPopup(false);
      setTransactionDetails(null);
    }
  };

  const processUnlock = async (subscriptionType, signature, amount, currency) => {
    console.log("Sending to /api/unlock-chapter:", {
      user_id: userId,
      story_id: id,
      subscription_type: subscriptionType,
      signature,
      userPublicKey: activeWalletAddress,
      current_chapter: parseInt(chapter, 10),
      amount,
      currency,
      solPrice,
      smpPrice,
    });

    const response = await fetch("/api/unlock-chapter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        story_id: id,
        subscription_type: subscriptionType,
        signature,
        userPublicKey: activeWalletAddress,
        current_chapter: parseInt(chapter, 10),
        amount,
        currency,
        solPrice,
        smpPrice,
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
      console.error("Unlock API error:", result.error);
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
    if (!loading && novel && (isWalletConnected || parseInt(chapter, 10) <= 2) && !isLocked) {
      if (isWalletConnected) updateTokenBalance();
    }
  }, [loading, novel, isWalletConnected, isLocked, chapter, updateTokenBalance]);

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
  if (!isWalletConnected && chapterNum > 2) {
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
  const threeChaptersUsdc = (3 / usdcPrice).toFixed(2);
  const fullChaptersUsdc = (15 / usdcPrice).toFixed(2);
  const threeChaptersSmp = smpPrice ? (3 / smpPrice).toFixed(2) : "N/A";
  const fullChaptersSmp = smpPrice ? (15 / smpPrice).toFixed(2) : "N/A";

  return (
    <div className={`${styles.page} ${styles.dark}`}>
      <Head>
        <title>{`${novel.title} - ${chapterTitle}`}</title>
      </Head>

      <nav className={styles.navbar}>
        <div className={styles.navContainer}>
          <Link href="/" onClick={() => router.push("/")} className={styles.logoLink}>
            <img src="/images/logo.png" alt="Sempai HQ" className={styles.logo} />
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
              <FaGem className={styles.gemIcon} /> Unlock with a subscription
            </p>
            <div className={styles.paymentOptions}>
              <button
                onClick={() => initiatePayment("3CHAPTERS", "SOL")}
                className={`${styles.unlockButton} ${styles.threeChapters}`}
                disabled={!canUnlockNextThree || !solPrice}
                title={!canUnlockNextThree ? "Unlock previous chapters first" : ""}
              >
                <FaRocket className={styles.buttonIcon} />
                <span className={styles.buttonText}>3 Chapters (SOL)</span>
                <span className={styles.price}>$3 / {threeChaptersSol} SOL</span>
              </button>
              <button
                onClick={() => initiatePayment("FULL", "SOL")}
                className={`${styles.unlockButton} ${styles.fullChapters}`}
                disabled={!solPrice}
              >
                <FaCrown className={styles.buttonIcon} />
                <span className={styles.buttonText}>All Chapters (SOL)</span>
                <span className={styles.price}>$15 / {fullChaptersSol} SOL</span>
              </button>
              <button
                onClick={() => initiatePayment("3CHAPTERS", "USDC")}
                className={`${styles.unlockButton} ${styles.threeChapters}`}
                disabled={!canUnlockNextThree}
                title={!canUnlockNextThree ? "Unlock previous chapters first" : ""}
              >
                <FaRocket className={styles.buttonIcon} />
                <span className={styles.buttonText}>3 Chapters (USDC)</span>
                <span className={styles.price}>$3 / {threeChaptersUsdc} USDC</span>
              </button>
              <button
                onClick={() => initiatePayment("FULL", "USDC")}
                className={`${styles.unlockButton} ${styles.fullChapters}`}
              >
                <FaCrown className={styles.buttonIcon} />
                <span className={styles.buttonText}>All Chapters (USDC)</span>
                <span className={styles.price}>$15 / {fullChaptersUsdc} USDC</span>
              </button>
              <button
                onClick={() => initiatePayment("3CHAPTERS", "SMP")}
                className={`${styles.unlockButton} ${styles.threeChapters}`}
                disabled={!canUnlockNextThree || !smpPrice}
                title={!canUnlockNextThree ? "Unlock previous chapters first" : !smpPrice ? "SMP price unavailable" : ""}
              >
                <FaRocket className={styles.buttonIcon} />
                <span className={styles.buttonText}>3 Chapters (SMP)</span>
                <span className={styles.price}>$3 / {threeChaptersSmp} SMP</span>
              </button>
              <button
                onClick={() => initiatePayment("FULL", "SMP")}
                className={`${styles.unlockButton} ${styles.fullChapters}`}
                disabled={!smpPrice}
                title={!smpPrice ? "SMP price unavailable" : ""}
              >
                <FaCrown className={styles.buttonIcon} />
                <span className={styles.buttonText}>All Chapters (SMP)</span>
                <span className={styles.price}>$15 / {fullChaptersSmp} SMP</span>
              </button>
            </div>
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

            {isWalletConnected && !isLocked && (
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

            <CommentSection novelId={novel.id} chapter={chapterTitle} />
          </>
        )}
      </div>

      {showTransactionPopup && transactionDetails && (
        <div className={styles.transactionPopupOverlay}>
          <div className={styles.transactionPopup}>
            <button
              onClick={() => setShowTransactionPopup(false)}
              className={styles.closePopupButton}
            >
              <FaTimes />
            </button>
            <h3 className={styles.popupTitle}>
              <FaWallet className="me-2" /> Confirm Transaction
            </h3>
            <p className={styles.popupMessage}>
              You are about to unlock{" "}
              {transactionDetails.subscriptionType === "3CHAPTERS" ? "3 chapters" : "all chapters"} for:
            </p>
            <div className={styles.transactionDetails}>
              <p>
                <strong>Amount:</strong> {transactionDetails.displayAmount} {transactionDetails.currency}
              </p>
              <p>
                <strong>USD Value:</strong> ${transactionDetails.subscriptionType === "3CHAPTERS" ? "3" : "15"}
              </p>
              <p>
                <strong>Wallet:</strong> {activeWalletAddress.slice(0, 6)}...{activeWalletAddress.slice(-4)}
              </p>
              <p>
                <strong>To:</strong> {TARGET_WALLET.slice(0, 6)}...{TARGET_WALLET.slice(-4)}
              </p>
            </div>
            <div className={styles.popupButtons}>
              <button
                onClick={confirmPayment}
                className={`${styles.confirmButton} btn btn-primary`}
              >
                Confirm Payment
              </button>
              <button
                onClick={() => setShowTransactionPopup(false)}
                className={`${styles.cancelButton} btn btn-secondary`}
              >
                Cancel
              </button>
            </div>
            <p className={styles.popupNote}>
              {embeddedWallet ? "You will be prompted for your password." : "Please approve the transaction in your wallet."}
            </p>
          </div>
        </div>
      )}

      <footer className={styles.footer}>
        <p className={styles.footerText}>© 2025 Sempai HQ. All rights reserved.</p>
      </footer>
    </div>
  );
}