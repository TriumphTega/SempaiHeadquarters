"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useContext, useMemo } from "react";
import { supabase } from "../../../../../services/supabase/supabaseClient";
import {
  Connection,
  SystemProgram,
  Transaction,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createTransferInstruction,
  getOrCreateAssociatedTokenAccount,
  getAccount,
  getAssociatedTokenAddressSync,
  unpackAccount,
} from "@solana/spl-token";
import DOMPurify from "dompurify";
import Head from "next/head";
import Link from "next/link";
import {
  FaHome,
  FaBars,
  FaTimes,
  FaBookOpen,
  FaVolumeUp,
  FaPause,
  FaPlay,
  FaStop,
  FaChevronLeft,
  FaChevronRight,
  FaGem,
  FaLock,
  FaRocket,
  FaCrown,
  FaStar,
  FaWallet,
} from "react-icons/fa";
import LoadingPage from "../../../../../components/LoadingPage";
import CommentSection from "../../../../../components/Comments/CommentSection";
import UseAmethystBalance from "../../../../../components/UseAmethystBalance";
import styles from "../../../../../styles/ChapterPage.module.css";
import {
  RPC_URL,
  SMP_MINT_ADDRESS,
  AMETHYST_MINT_ADDRESS,
  TREASURY_PUBLIC_KEY,
} from "../../../../../constants";
import { EmbeddedWalletContext } from "@/components/EmbeddedWalletProvider";

const USDC_MINT_ADDRESS = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const SMP_DECIMALS = 6;
const TARGET_WALLET = TREASURY_PUBLIC_KEY;

const MIN_ATA_SOL = 0.00103928;
const MIN_USER_SOL = 0.001;
const poolAddress = "3duTFdX9wrGh3TatuKtorzChL697HpiufZDPnc44Yp33";
const meteoraApiUrl = `https://amm-v2.meteora.ag/pools?address=${poolAddress}`;
const USDC_AMOUNT = 0.0025; // $0.025 per chapter

// Treasury wallet addresses (same as mobile app)
const SQUADS_WALLET = new PublicKey("4EeY4iDCp36yvLFvwhFhBrurKGJwNqLDzvM3PVsxrPdR");
const TREASURY_WALLET = new PublicKey("62PPSRhAk6hdn85MUoYAnUDisswZRfos68Zqf7N1QLkr");

const connection = new Connection(RPC_URL, {
  commitment: "confirmed",
  httpHeaders: { "x-api-key": RPC_URL.split("=")[1] },
});

const createDOMPurify = typeof window !== "undefined" ? DOMPurify : null;

// Helper: Split payment amounts with residual handling
function splitAmountWithResidual(amount, ratios) {
  const totalRatio = ratios.reduce((a, b) => a + b, 0);
  const r = [];
  let runningTotal = 0;
  for (let i = 0; i < ratios.length - 1; i++) {
    r[i] = Math.floor((amount * ratios[i]) / totalRatio);
    runningTotal += r[i];
  }
  // Last recipient gets remaining to ensure total matches
  r[ratios.length - 1] = amount - runningTotal;
  return r;
}

// Helper: Create payment transaction on client side
async function createPaymentTransactionClient({ paymentMint, paymentAmount, userPublicKey, authorPublicKey, smpMintAddress }) {
  const [authorAmount, treasuryAmount, squadsAmount, burnAmount] = splitAmountWithResidual(
    paymentAmount,
    [30, 30, 25, 15]
  );
  
  const instructions = [];
  
  if (!paymentMint) {
    // SOL transfer
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: userPublicKey,
        toPubkey: authorPublicKey,
        lamports: authorAmount,
      }),
      SystemProgram.transfer({
        fromPubkey: userPublicKey,
        toPubkey: TREASURY_WALLET,
        lamports: treasuryAmount + burnAmount,
      }),
      SystemProgram.transfer({
        fromPubkey: userPublicKey,
        toPubkey: SQUADS_WALLET,
        lamports: squadsAmount,
      })
    );
  } else {
    // Token transfer
    const userAta = getAssociatedTokenAddressSync(paymentMint, userPublicKey);
    const authorAta = getAssociatedTokenAddressSync(paymentMint, authorPublicKey);
    const treasuryAta = getAssociatedTokenAddressSync(paymentMint, TREASURY_WALLET, true);
    const squadsAta = getAssociatedTokenAddressSync(paymentMint, SQUADS_WALLET, true);

    let reroutedToTreasury = 0;
    
    // Check if ATAs exist and route accordingly
    const [authorAtaInfo, squadsAtaInfo, treasuryAtaInfo] = await connection.getMultipleAccountsInfo([
      authorAta,
      squadsAta,
      treasuryAta,
    ]);

    // Author
    let authorDestAta = authorAta;
    let authorDestAmount = authorAmount;
    if (!authorAtaInfo) {
      console.warn("[createPaymentTransactionClient] Author ATA missing, rerouting to treasury");
      reroutedToTreasury += authorAmount;
      authorDestAta = null;
      authorDestAmount = 0;
    }
    
    // Squads
    let squadsDestAta = squadsAta;
    let squadsDestAmount = squadsAmount;
    if (!squadsAtaInfo) {
      console.warn("[createPaymentTransactionClient] Squads ATA missing, rerouting to treasury");
      reroutedToTreasury += squadsAmount;
      squadsDestAta = null;
      squadsDestAmount = 0;
    }
    
    // Treasury must exist
    if (!treasuryAtaInfo) {
      throw new Error("Treasury wallet is missing ATA for this token");
    }

    // Build transfer instructions
    // IMPORTANT: Transfers must be from the user's ATA, signed by the user.
    // Author
    if (authorDestAta && authorDestAmount > 0) {
      instructions.push(createTransferInstruction(userAta, authorDestAta, userPublicKey, authorDestAmount));
    }
    // Squads
    if (squadsDestAta && squadsDestAmount > 0) {
      instructions.push(createTransferInstruction(userAta, squadsDestAta, userPublicKey, squadsDestAmount));
    }

    // Treasury gets its share + burn + any rerouted shares
    const totalTreasuryAmount = treasuryAmount + burnAmount + reroutedToTreasury;
    if (totalTreasuryAmount > 0) {
      instructions.push(createTransferInstruction(userAta, treasuryAta, userPublicKey, totalTreasuryAmount));
    }

    // Burn SMP tokens if applicable (burn is performed from user's ATA)
    if (smpMintAddress && paymentMint.equals(smpMintAddress) && burnAmount > 0) {
      const { createBurnInstruction } = await import("@solana/spl-token");
      instructions.push(createBurnInstruction(userAta, paymentMint, userPublicKey, burnAmount));
    }
  }

  const tx = new Transaction();
  tx.add(...instructions);
  tx.feePayer = userPublicKey;
  return tx;
}

export default function ChapterPage() {
  const { id, chapter } = useParams();
  const router = useRouter();
  const { wallet: embeddedWallet, signAndSendTransaction } = useContext(EmbeddedWalletContext);

  const activePublicKey = useMemo(() => {
    return embeddedWallet?.publicKey ? new PublicKey(embeddedWallet.publicKey) : null;
  }, [embeddedWallet?.publicKey]);

  const activeWalletAddress = activePublicKey?.toString();
  const isWalletConnected = !!activePublicKey;

  const { balance: amethystBalance } = UseAmethystBalance();

  const [novel, setNovel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [warningMessage, setWarningMessage] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showConnectPopup, setShowConnectPopup] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [userId, setUserId] = useState(null);
  const [advanceInfo, setAdvanceInfo] = useState(null);
  const [canUnlockNextThree, setCanUnlockNextThree] = useState(false);
  const [solPrice, setSolPrice] = useState(100);
  const [smpPrice, setSmpPrice] = useState(0.01);
  const [userRating, setUserRating] = useState(null);
  const [averageRating, setAverageRating] = useState(null);
  const [showTransactionPopup, setShowTransactionPopup] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState(null);
  const [readingMode, setReadingMode] = useState("free");
  const [smpBalance, setSmpBalance] = useState(null);
  const [weeklyPoints, setWeeklyPoints] = useState(null);
  const usdcPrice = 1;
  const [localUnlocked, setLocalUnlocked] = useState(false);
  const [recentlyUnlocked, setRecentlyUnlocked] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Meteora helpers (mobile parity)
  const fetchPoolData = useCallback(async () => {
    try {
      const resp = await fetch(meteoraApiUrl);
      if (!resp.ok) throw new Error(`Meteora HTTP ${resp.status}`);
      const arr = await resp.json();
      const pool = arr?.[0];
      if (!pool) {
        console.warn("[fetchPoolData] No pool data returned");
        return null;
      }
      return pool;
    } catch (error) {
      console.error("[fetchPoolData] Error:", error);
      return null;
    }
  }, []);

  const calculateSolPriceInUsd = useCallback((pool) => {
    if (!pool || !pool.pool_token_amounts || !pool.pool_token_usd_amounts) {
      console.warn("[calculateSolPriceInUsd] Invalid pool data, using fallback");
      return 100; // Fallback SOL price
    }
    const solAmount = parseFloat(pool.pool_token_amounts[1]);
    const solUsd = parseFloat(pool.pool_token_usd_amounts[1]);
    if (solAmount <= 0 || solUsd <= 0 || isNaN(solAmount) || isNaN(solUsd)) {
      console.warn("[calculateSolPriceInUsd] Invalid pool amounts, using fallback");
      return 100; // Fallback SOL price
    }
    return solUsd / solAmount;
  }, []);

  const calculateSmpPerSol = useCallback((pool) => {
    if (!pool || !pool.pool_token_amounts) {
      console.warn("[calculateSmpPerSol] Invalid pool data, using fallback");
      return 328861621.646602; // Fallback SMP per SOL
    }
    const smpAmount = parseFloat(pool.pool_token_amounts[0]);
    const solAmount = parseFloat(pool.pool_token_amounts[1]);
    if (smpAmount <= 0 || solAmount <= 0 || isNaN(smpAmount) || isNaN(solAmount)) {
      console.warn("[calculateSmpPerSol] Invalid pool amounts, using fallback");
      return 328861621.646602; // Fallback SMP per SOL
    }
    return smpAmount / solAmount;
  }, []);

  const convertUsdcToSmp = useCallback(async (usdcAmount) => {
    const pool = await fetchPoolData();
    const solUsd = calculateSolPriceInUsd(pool);
    const smpPerSol = calculateSmpPerSol(pool);
    const solAmount = usdcAmount / solUsd;
    return solAmount * smpPerSol;
  }, [fetchPoolData, calculateSolPriceInUsd, calculateSmpPerSol]);

  const fetchPrices = useCallback(async () => {
    try {
      const cacheKey = "priceCacheWeb";
      const cacheExpiry = 5 * 60 * 1000;
      const cached = typeof window !== "undefined" ? localStorage.getItem(cacheKey) : null;
      if (cached) {
        try {
          const { timestamp, solPrice: cSol, smpPrice: cSmp } = JSON.parse(cached);
          if (Date.now() - timestamp < cacheExpiry && cSol > 0 && cSmp > 0) {
            setSolPrice(cSol);
            setSmpPrice(cSmp);
            return;
          }
        } catch {
          // ignore
        }
      }

      let sol = 100;
      let smp = 0.01;
      const smpAmount = await convertUsdcToSmp(USDC_AMOUNT);
      if (smpAmount && smpAmount > 0) {
        smp = USDC_AMOUNT / smpAmount;
        const pool = await fetchPoolData();
        sol = calculateSolPriceInUsd(pool);
      }
      setSolPrice(sol);
      setSmpPrice(smp);
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "priceCacheWeb",
          JSON.stringify({ timestamp: Date.now(), solPrice: sol, smpPrice: smp })
        );
      }
    } catch (error) {
      console.error("[fetchPrices] Error:", error);
      setSolPrice(100);
      setSmpPrice(0.01);
    }
  }, [convertUsdcToSmp, fetchPoolData, calculateSolPriceInUsd]);

  const fetchSmpBalanceOnChain = useCallback(async (retryCount = 3, retryDelay = 1000) => {
    if (!activeWalletAddress || !activePublicKey) return 0;
    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        const ataAddress = getAssociatedTokenAddressSync(SMP_MINT_ADDRESS, activePublicKey);
        console.log("Fetching SMP balance for ATA:", ataAddress.toString());
        const ataInfo = await connection.getAccountInfo(ataAddress);
        if (!ataInfo) {
          console.log("No ATA found for SMP, returning 0 balance");
          return 0;
        }
        const ata = unpackAccount(ataAddress, ataInfo);
        const balance = Number(ata.amount) / 10 ** SMP_DECIMALS;
        console.log("On-chain SMP balance:", balance);
        return balance;
      } catch (error) {
        console.error(`Attempt ${attempt} - Error fetching on-chain SMP balance:`, error);
        if (attempt === retryCount || error.message.includes("403")) {
          setError("Unable to fetch SMP balance due to network restrictions.");
          setTimeout(() => setError(null), 5000);
          return 0;
        }
        await delay(retryDelay * attempt);
      }
    }
  }, [activeWalletAddress, activePublicKey]);

  // $0.025 worth of SMP in base units
  const SMP_READ_COST = useMemo(() => {
    if (!smpPrice || smpPrice <= 0) return 25_000_000; // fallback base units (0.025 / 0.001 = 25)
    return Math.ceil((USDC_AMOUNT / smpPrice) * 10 ** SMP_DECIMALS);
  }, [smpPrice]);

  const fetchUserBalances = useCallback(async () => {
    if (!activeWalletAddress) return;
    try {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, weekly_points")
        .eq("wallet_address", activeWalletAddress)
        .single();
      if (userError) throw new Error(`Error fetching user data: ${userError.message}`);
      setUserId(userData.id);
      setWeeklyPoints(userData.weekly_points || 0);

      // Display on-chain balance in UI
      const onChain = await fetchSmpBalanceOnChain();
      setSmpBalance(onChain ?? 0);
    } catch (error) {
      console.error("Error fetching user balances:", error);
      setError("Unable to load wallet balances.");
      setSmpBalance(0);
      setTimeout(() => setError(null), 5000);
    }
  }, [activeWalletAddress, fetchSmpBalanceOnChain]);

  useEffect(() => {
    if (isWalletConnected) fetchUserBalances();
  }, [isWalletConnected, fetchUserBalances]);

  const updateTokenBalance = useCallback(async () => {
    if (!activeWalletAddress || !novel || !chapter || !id || readingMode !== "paid") {
      return;
    }
    try {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, weekly_points")
        .eq("wallet_address", activeWalletAddress)
        .single();
      if (userError || !userData) throw new Error("User not found");
      const user = userData;

      const chapterNum = parseInt(chapter, 10);
      const chapterAdvanceInfo =
        novel.advance_chapters?.find((c) => c.index === chapterNum) || {
          is_advance: false,
          free_release_date: null,
        };

      let hasValidAccess =
        !chapterAdvanceInfo.is_advance ||
        (chapterAdvanceInfo.free_release_date &&
          new Date(chapterAdvanceInfo.free_release_date) <= new Date());
      if (chapterAdvanceInfo.is_advance && !hasValidAccess) {
        const { data: unlock, error: unlockError } = await supabase
          .from("unlocked_story_chapters")
          .select("chapter_unlocked_till, expires_at, subscription_type")
          .eq("user_id", user.id)
          .eq("story_id", id)
          .single();
        if (unlockError && unlockError.code !== "PGRST116") throw unlockError;

        hasValidAccess =
          unlock &&
          (!unlock.expires_at || new Date(unlock.expires_at) > new Date()) &&
          (unlock.chapter_unlocked_till === -1 || unlock.chapter_unlocked_till >= chapterNum);
        if (!hasValidAccess) return;
      }

      // Check Supabase balance first (source of truth)
      const { data: walletBalance, error: balanceError } = await supabase
        .from("wallet_balances")
        .select("amount")
        .eq("wallet_address", activeWalletAddress)
        .eq("currency", "SMP")
        .single();
      if (balanceError || !walletBalance) throw new Error("Wallet balance not found");
      const requiredSmp = SMP_READ_COST / 10 ** SMP_DECIMALS;
      if (walletBalance.amount < requiredSmp)
        throw new Error("Insufficient SMP balance: " + walletBalance.amount.toLocaleString() + " SMP");

      // Removed on-chain balance verification and sync messaging by request

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

      const eventDetails = `${activeWalletAddress}${novel.title || "Untitled"}${chapter}`
        .replace(/[^a-zA-Z0-9]/g, "")
        .substring(0, 255);
      if (!eventDetails) throw new Error("Failed to generate event details");

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

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      const destATA = await getOrCreateAssociatedTokenAccount(
        connection,
        activePublicKey,
        SMP_MINT_ADDRESS,
        new PublicKey(TARGET_WALLET)
      );
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: activePublicKey,
      }).add(
        createTransferInstruction(
          sourceATA.address,
          destATA.address,
          activePublicKey,
          SMP_READ_COST,
          [],
          TOKEN_PROGRAM_ID
        )
      );

      let signature;
      if (embeddedWallet) {
        const password = prompt("Enter your wallet password to proceed:");
        if (!password) throw new Error("Password required for embedded wallet.");
        const secretKey = getSecretKey(password);
        if (!secretKey) throw new Error("Failed to decrypt secret key. Invalid password?");
        const keypair = Keypair.fromSecretKey(secretKey);
        transaction.sign(keypair);
        signature = await connection.sendRawTransaction(transaction.serialize());
      } else if (connected && sendTransaction) {
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

      // Update Supabase balance after successful transaction
      const newSmpBalance = walletBalance.amount - requiredSmp;
      const { error: updateError } = await supabase
        .from("wallet_balances")
        .update({ amount: newSmpBalance })
        .eq("wallet_address", activeWalletAddress)
        .eq("currency", "SMP");
      if (updateError) throw new Error(`Error updating Supabase balance: ${updateError.message}`);

      let readerReward = 100;
      const authorReward = 500;
      const numericBalance = Number(amethystBalance) || 0;
      if (numericBalance >= 5000000) readerReward = 250;
      else if (numericBalance >= 1000000) readerReward = 200;
      else if (numericBalance >= 500000) readerReward = 170;
      else if (numericBalance >= 250000) readerReward = 150;
      else if (numericBalance >= 100000) readerReward = 120;

      const newReaderBalance = (user.weekly_points || 0) + readerReward;
      const newAuthorBalance = (novelOwner.balance || 0) + authorReward;

      const updates = [
        supabase
          .from("users")
          .update({ weekly_points: newReaderBalance })
          .eq("id", user.id),
      ];
      if (novelOwner.id !== user.id) {
        updates.push(
          supabase
            .from("users")
            .update({ balance: newAuthorBalance })
            .eq("id", novelOwner.id)
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
          currency: "SMP",
          amount: newAuthorBalance,
          decimals: 0,
          wallet_address: novelOwner.wallet_address,
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
          source_currency: "SMP",
          amount_change: authorReward,
          wallet_address: novelOwner.wallet_address,
          source_user_id: "6f859ff9-3557-473c-b8ca-f23fd9f7af27",
          destination_chain: "SOL",
        },
        {
          destination_user_id: user.id,
          event_type: "withdrawal",
          event_details: eventDetails,
          source_chain: "SOL",
          source_currency: "SMP",
          amount_change: -requiredSmp,
          wallet_address: activeWalletAddress,
          source_user_id: user.id,
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

      setSuccessMessage(
        `Payment successful! ${(SMP_READ_COST / 10 ** SMP_DECIMALS).toLocaleString()} SMP sent on-chain. You earned ${readerReward} points.`
      );
      setSmpBalance(newSmpBalance);
      setWeeklyPoints(newReaderBalance);
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (error) {
      setError(
        error.message.includes("insufficient funds") || error.message.includes("Insufficient SMP balance")
          ? `Not enough SMP tokens in your wallet: ${error.message}`
          : `Payment failed: ${error.message}`
      );
      console.error("Error in updateTokenBalance:", error);
      setTimeout(() => setError(null), 5000);
    }
  }, [
    activeWalletAddress,
    novel,
    chapter,
    id,
    readingMode,
    activePublicKey,
    amethystBalance,
  ]);

  const handleReadWithSMP = async () => {
    if (!isWalletConnected) {
      setError("Please connect your wallet to read with SMP.");
      return;
    }
    setReadingMode("paid");
    await processChapterPayment("SINGLE", "SMP");
  };

  useEffect(() => {
    async function initialize() {
      const chapterNum = parseInt(chapter, 10);
      // Require wallet connection for ALL chapters
      if (!isWalletConnected) {
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
  }, [isWalletConnected, activeWalletAddress, id, chapter, recentlyUnlocked]);

  const checkChapterPayment = async (chapterNum) => {
    if (!activeWalletAddress || !id) return false;
    try {
      // Get the user's email from auth session (this matches what's stored in DB)
      const { data: sessionData } = await supabase.auth.getSession();
      const userEmail = sessionData?.session?.user?.email;
      
      if (!userEmail) {
        console.warn("[checkChapterPayment] No user email found");
        return false;
      }
      
      const { data, error } = await supabase
        .from("chapter_payments")
        .select("id")
        .eq("wallet_address", userEmail)
        .eq("novel_id", id)
        .eq("chapter_number", chapterNum)
        .single();
      if (error && error.code !== "PGRST116") throw new Error(error.message);
      return !!data;
    } catch (error) {
      console.error("[checkChapterPayment] Error:", error.message);
      return false;
    }
  };

  const checkAccess = async (userId) => {
    try {
      // If we've just unlocked via this session, trust the local flag to avoid race conditions
      if (localUnlocked) {
        setIsLocked(false);
        return;
      }
      
      // Prevent re-locking if recently unlocked (payment just succeeded)
      if (recentlyUnlocked) {
        setIsLocked(false);
        return;
      }
      
      const { data: novelData, error: novelError } = await supabase
        .from("novels")
        .select("*")
        .eq("id", id)
        .single();
      if (novelError || !novelData) throw new Error(novelError?.message || "Novel not found");
      setNovel(novelData);

      const chapterNum = parseInt(chapter, 10);
      const totalChapters = Object.keys(novelData.chaptercontents || {}).length;

      // Free preview: first 3 chapters are unlocked by default
      if (!Number.isNaN(chapterNum) && chapterNum <= 2) {
        setIsLocked(false);
        return;
      }

      const chapterAdvanceInfo =
        novelData.advance_chapters?.find((c) => c.index === chapterNum) || {
          is_advance: false,
          free_release_date: null,
        };
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

      // No free-bypass: even earliest chapters require unlock

      let allPreviousUnlocked = true;
      const advanceChapters = novelData.advance_chapters || [];
      for (let i = 0; i < chapterNum; i++) {
        const prevAdvanceInfo =
          advanceChapters.find((c) => c.index === i) || {
            is_advance: false,
            free_release_date: null,
          };
        if (
          prevAdvanceInfo.is_advance &&
          (!prevAdvanceInfo.free_release_date ||
            new Date(prevAdvanceInfo.free_release_date) > new Date())
        ) {
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

          const hasUnlock =
            unlock &&
            (!unlock.expires_at || new Date(unlock.expires_at) > new Date()) &&
            unlock.chapter_unlocked_till >= i;
          if (!hasUnlock) {
            allPreviousUnlocked = false;
            break;
          }
        }
      }
      setCanUnlockNextThree(allPreviousUnlocked);

      // Enforce paywall: ALL chapters require payment/subscription unlock

      // If user is authenticated, check per-chapter payment first
      if (userId) {
        const isPaid = await checkChapterPayment(chapterNum);
        if (isPaid) {
          setIsLocked(false);
          return;
        }
      }

      // For advance chapters, allow subscription unlocks
      if (userId) {
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
            if (
              unlock.chapter_unlocked_till === -1 ||
              unlock.chapter_unlocked_till >= chapterNum
            ) {
              setIsLocked(false);
              return;
            }
          }
        }
      }
      setIsLocked(true);
    } catch (err) {
      console.error("Error checking access:", err);
      setError("Failed to load chapter access.");
      setIsLocked(true);
      setCanUnlockNextThree(false);
    } finally {
      setLoading(false);
    }
  };

  // Reset local unlocked flag when navigating to a different chapter
  useEffect(() => {
    // Reset all states to ensure clean slate for new chapter
    setLocalUnlocked(false);
    setRecentlyUnlocked(false);
    setError(null);
    setSuccessMessage("");
    setWarningMessage("");
    setIsProcessing(false);
    setLoading(true); // Start loading for new chapter
    
    // Force checkAccess to run after a short delay
    const timer = setTimeout(() => {
      if (userId) {
        checkAccess(userId);
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [chapter, id]);

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
      .upsert(
        {
          user_id: userId,
          content_type: "novel",
          content_id: id,
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

  // removed corrupted helper; not needed after switching to proxy flow

  const processChapterPayment = async (subscriptionType, currency) => {
    console.log("[processChapterPayment] Starting payment process...");
    
    if (!activeWalletAddress || !id || !chapter || !activePublicKey || !signAndSendTransaction) {
      setError("Please connect your wallet and try again.");
      setTimeout(() => setError(null), 5000);
      setIsProcessing(false);
      return false;
    }

    setIsProcessing(true);
    setError(null);
    setSuccessMessage("");
    setWarningMessage("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        setError("You must be signed in to unlock chapters.");
        setTimeout(() => setError(null), 5000);
        setIsProcessing(false);
        return false;
      }

      // Free preview: prevent payment attempt for chapters 0,1,2
      const currentChapterNum = parseInt(chapter, 10);
      if (!Number.isNaN(currentChapterNum) && currentChapterNum <= 2) {
        setIsLocked(false);
        return true;
      }

      // Check if already paid
      const chapterNum = currentChapterNum;
      const isPaid = await checkChapterPayment(chapterNum);
      if (isPaid && subscriptionType === "SINGLE") {
        console.log("[processChapterPayment] Chapter already paid");
        setIsLocked(false);
        setIsProcessing(false);
        return true;
      }

      // Fetch author data for payment
      const { data: novelData, error: novelError } = await supabase
        .from("novels")
        .select("user_id")
        .eq("id", id)
        .single();
      
      if (novelError || !novelData) {
        throw new Error("Could not fetch novel data");
      }

      const { data: authorData, error: authorError } = await supabase
        .from("users")
        .select("wallet_address")
        .eq("id", novelData.user_id)
        .single();

      if (authorError || !authorData?.wallet_address) {
        throw new Error("Could not fetch author wallet");
      }

      const authorPublicKey = new PublicKey(authorData.wallet_address);

      // Calculate payment amount (same as mobile app)
      const usdAmount = 0.0025;
      let paymentAmount = 0;
      let paymentMint = null;

      if (currency === "USDC") {
        paymentMint = USDC_MINT_ADDRESS;
        paymentAmount = Math.floor(usdAmount * 1e6);
      } else if (currency === "SOL") {
        paymentAmount = Math.floor(usdAmount * solPrice * 1e9);
      } else if (currency === "SMP") {
        paymentMint = SMP_MINT_ADDRESS;
        paymentAmount = Math.ceil((usdAmount / smpPrice) * 10 ** SMP_DECIMALS);
      } else {
        throw new Error(`Invalid currency: ${currency}`);
      }

      console.log("[processChapterPayment] Payment amount:", paymentAmount, currency);

      // Build transaction client-side
      console.log("[processChapterPayment] Building transaction...");
      const transaction = await createPaymentTransactionClient({
        paymentMint,
        paymentAmount,
        userPublicKey: activePublicKey,
        authorPublicKey,
        smpMintAddress: paymentMint,
      });

      // Get fresh blockhash RIGHT before calling signAndSendTransaction (like mobile app)
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = activePublicKey;

      // Sign and send transaction
      console.log("[processChapterPayment] Signing and sending transaction...");
      const signature = await signAndSendTransaction(transaction);
      console.log("[processChapterPayment] Transaction sent, signature:", signature);

      const start = Date.now();
      let landed = false;
      console.log("[processChapterPayment] Starting confirmation poll for signature:", signature);
      
      while (Date.now() - start < 10000) { // 10 seconds instead of 5
        const statusResp = await connection.getSignatureStatus(signature);
        const status = statusResp?.value;
        console.log(`[processChapterPayment] Status check ${Math.floor((Date.now() - start) / 1000)}s:`, {
          confirmationStatus: status?.confirmationStatus,
          err: status?.err,
          slot: status?.slot
        });
        
        if (status?.err) {
          throw new Error("Transaction failed on-chain.");
        }
        if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") {
          landed = true;
          break;
        }
        await delay(500);
      }
      
      if (!landed) {
        // Last resort: check transaction status directly
        console.log("[processChapterPayment] Transaction not confirmed in 10s, checking status directly...");
        const finalStatus = await connection.getSignatureStatus(signature, {
          searchTransactionHistory: true
        });
        console.log("[processChapterPayment] Final status check:", finalStatus?.value);
        
        if (finalStatus?.value?.confirmationStatus === "confirmed" || finalStatus?.value?.confirmationStatus === "finalized") {
          landed = true;
        } else if (finalStatus?.value?.err) {
          throw new Error("Transaction failed on-chain.");
        }
      }
      
      if (!landed) {
        console.error("[processChapterPayment] Transaction confirmation failed after all attempts");
        throw new Error("Transaction not confirmed yet. Please try again.");
      }

      console.log("[processChapterPayment] Transaction landed, recording payment...");

      // Record payment in database via edge function
      const requestBody = {
        novelId: id,
        chapterId: parseInt(chapter, 10), // Send as number like mobile app
        paymentType: subscriptionType,
        currency,
        signature,
        transactionId: signature, // Add transactionId field
      };
      
      try {
        const resp = await fetch("/api/unlock-chapter-proxy", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        });
        
        console.log("[processChapterPayment] Edge function response status:", resp.status);
        
        const result = await resp.json();
        console.log("[processChapterPayment] Edge function response:", result);
        
        if (!resp.ok) {
          console.error("[processChapterPayment] Edge function error:", result.error || "Unknown error");
          console.warn("[processChapterPayment] Payment succeeded but database recording failed");
        } else if (result?.error) {
          console.error("[processChapterPayment] Edge function returned error:", result.error);
        }
      } catch (dbError) {
        console.error("[processChapterPayment] Database recording error:", dbError.message);
        console.warn("[processChapterPayment] Payment succeeded but database recording failed");
      }

      setIsLocked(false);
      setLocalUnlocked(true);
      setRecentlyUnlocked(true);
      
      // Fetch updated balance after payment
      await fetchUserBalances();
      
      // Keep chapter unlocked for 10 seconds to prevent re-locking during DB replication
      setTimeout(() => setRecentlyUnlocked(false), 10000);
      
      setSuccessMessage("Chapter unlocked successfully.");
      setTimeout(() => setSuccessMessage(""), 5000);
      return true;
    } catch (e) {
      console.error("[processChapterPayment] Error:", e);
      setError(e.message || "Failed to process payment.");
      setTimeout(() => setError(null), 5000);
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmPayment = async () => {
    if (!transactionDetails) return;
    const { subscriptionType, currency } = transactionDetails;
    try {
      await processChapterPayment(subscriptionType, currency);
    } finally {
      setShowTransactionPopup(false);
      setTransactionDetails(null);
    }
  };

  const processUnlock = async (subscriptionType, signature, amount, currency) => {
    try {
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
        setSuccessMessage(
          subscriptionType === "FULL"
            ? "All chapters unlocked!"
            : `Up to Chapter ${result.chapter_unlocked_till + 1} unlocked as released`
        );
        setTimeout(() => setSuccessMessage(""), 5000);
        await checkAccess(userId);
      } else {
        throw new Error(result.error || "Failed to unlock chapters.");
      }
    } catch (error) {
      console.error("Unlock API error:", error);
      setError(`Failed to unlock chapters: ${error.message}`);
      setTimeout(() => setError(null), 5000);
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
    if (typeof window !== "undefined") {
      fetchPrices();
    }
  }, [fetchNovel, fetchPrices]);

  // Do not run any client-side on-chain transfer after unlock.
  // The unlock is processed by the edge function and reflected in DB; we only re-check access via DB.

  const readText = (text) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    } else {
      setError("Your browser does not support text-to-speech.");
      setTimeout(() => setError(null), 5000);
    }
  };

  const pauseText = () => window.speechSynthesis.pause();
  const resumeText = () => window.speechSynthesis.resume();
  const stopText = () => window.speechSynthesis.cancel();

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

  const threeChaptersSol = solPrice ? (3 / solPrice).toFixed(4) : "N/A";
  const fullChaptersSol = solPrice ? (15 / solPrice).toFixed(4) : "N/A";
  const threeChaptersUsdc = (3 / usdcPrice).toFixed(2);
  const fullChaptersUsdc = (15 / usdcPrice).toFixed(2);
  const threeChaptersSmp = smpPrice ? (3 / smpPrice).toFixed(2) : "N/A";
  const fullChaptersSmp = smpPrice ? (15 / smpPrice).toFixed(2) : "N/A";

  return (
    <div className={`${styles.page} ${styles.dark}`}>
      <Head>
        <title>{`${novel.title} - ${chapterTitle}`}</title>
      </Head>

      {isWalletConnected && (
        <div className={styles.balanceFloat}>
          <div className={styles.balanceItem}>
            <FaWallet className={styles.balanceIcon} />
            <span>SMP: {smpBalance !== null ? smpBalance.toLocaleString() : "Loading..."}</span>
          </div>
          <div className={styles.balanceItem}>
            <FaStar className={styles.balanceIcon} />
            <span>Points: {weeklyPoints !== null ? weeklyPoints.toLocaleString() : "Loading..."}</span>
          </div>
        </div>
      )}

      <nav className={styles.navbar}>
        <div className={styles.navContainer}>
          <Link href="/" onClick={() => router.push("/")} className={styles.logoLink}>
            <img src="/images/logo.jpeg" alt="Sempai HQ" className={styles.logo} />
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
          {!isLocked && (
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
          )}
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
            {!advanceInfo?.is_advance ? (
              <div className={styles.centerAction}>
                <button
                  onClick={() => processChapterPayment("SINGLE", "SMP")}
                  className={styles.readWithSmpButton}
                >
                  <FaGem className={styles.buttonIcon} /> Read with {(SMP_READ_COST / 10 ** SMP_DECIMALS).toLocaleString()} SMP ($0.025)
                </button>
              </div>
            ) : (
              <>
                <p className={styles.subMessage}>
                  <FaGem className={styles.gemIcon} /> Unlock with a subscription
                </p>
                <div className={styles.paymentOptions}>
                  <button
                    onClick={() => initiatePayment("3CHAPTERS", "SOL")}
                    className={`${styles.unlockButton} ${styles.threeChapters}`}
                    disabled={!canUnlockNextThree || !solPrice}
                    title={!canUnlockNextThree ? "Unlock previous chapters first" : !solPrice ? "Price unavailable" : ""}
                  >
                    <FaRocket className={styles.buttonIcon} />
                    <span className={styles.buttonText}>3 Chapters (SOL)</span>
                    <span className={styles.price}>$3 / {threeChaptersSol} SOL</span>
                  </button>
                  <button
                    onClick={() => initiatePayment("FULL", "SOL")}
                    className={`${styles.unlockButton} ${styles.fullChapters}`}
                    disabled={!solPrice}
                    title={!solPrice ? "Price unavailable" : ""}
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
              </>
            )}
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