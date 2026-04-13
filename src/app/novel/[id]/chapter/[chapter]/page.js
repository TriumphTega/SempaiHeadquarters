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
  createAssociatedTokenAccountInstruction,
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
  FaPlus,
  FaEdit,
  FaTrash,
  FaUpload,
  FaUserShield,
  FaGem,
  FaSun,
  FaMoon,
  FaImage,
  FaBullhorn,
  FaLock,
  FaRocket,
  FaCrown,
  FaVolumeUp,
  FaPause,
  FaPlay,
  FaStop,
  FaStar,
  FaChevronLeft,
  FaChevronRight,
  FaWallet,
  FaSpinner,
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

// Ad video configuration
const AD_VIDEO_PATH = "/ad_video.mp4"; // Update this with your video filename

const MIN_ATA_SOL = 0.00103928;
const MIN_USER_SOL = 0.001;
const poolAddress = "3duTFdX9wrGh3TatuKtorzChL697HpiufZDPnc44Yp33";
const meteoraApiUrl = `https://amm-v2.meteora.ag/pools?address=${poolAddress}`;
const USDC_AMOUNT = 0.0025; // $0.025 per chapter

// Revenue split wallet addresses
const FOUNDER_FUND_WALLET = new PublicKey("62PPSRhAk6hdn85MUoYAnUDisswZRfos68Zqf7N1QLkr");
const SEMPAI_HQ_WALLET = new PublicKey("4EeY4iDCp36yvLFvwhFhBrurKGJwNqLDzvM3PVsxrPdR");

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
  const [creatorAmount, sempaiHqAmount, founderFundAmount] = splitAmountWithResidual(
    paymentAmount,
    [50, 30, 20]
  );
  
  const instructions = [];
  
  if (!paymentMint) {
    // SOL transfer - 50% to creator, 30% to Sempai HQ, 20% to Founder Fund
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: userPublicKey,
        toPubkey: authorPublicKey,
        lamports: creatorAmount,
      }),
      SystemProgram.transfer({
        fromPubkey: userPublicKey,
        toPubkey: SEMPAI_HQ_WALLET,
        lamports: sempaiHqAmount,
      }),
      SystemProgram.transfer({
        fromPubkey: userPublicKey,
        toPubkey: FOUNDER_FUND_WALLET,
        lamports: founderFundAmount,
      })
    );
  } else {
    // Token transfer - 50% to creator, 30% to Sempai HQ, 20% to Founder Fund
    const userAta = getAssociatedTokenAddressSync(paymentMint, userPublicKey);
    const creatorAta = getAssociatedTokenAddressSync(paymentMint, authorPublicKey);
    const sempaiHqAta = getAssociatedTokenAddressSync(paymentMint, SEMPAI_HQ_WALLET, true);
    const founderFundAta = getAssociatedTokenAddressSync(paymentMint, FOUNDER_FUND_WALLET, true);

    let reroutedToFounderFund = 0;
    
    // Check if ATAs exist and route accordingly
    const [creatorAtaInfo, sempaiHqAtaInfo, founderFundAtaInfo] = await connection.getMultipleAccountsInfo([
      creatorAta,
      sempaiHqAta,
      founderFundAta,
    ]);

    // Check user's SOL balance for ATA creation costs
    const userBalance = await connection.getBalance(userPublicKey);
    const ataRentExemption = 0.00203928 * LAMPORTS_PER_SOL; // Approximate rent exemption
    const requiredSolForAtas = (!creatorAtaInfo ? ataRentExemption : 0) + (!sempaiHqAtaInfo ? ataRentExemption : 0);
    
    console.log("[createPaymentTransactionClient] User SOL balance:", userBalance / LAMPORTS_PER_SOL);
    console.log("[createPaymentTransactionClient] Required SOL for ATAs:", requiredSolForAtas / LAMPORTS_PER_SOL);

    // Creator - Create ATA if missing and user has enough SOL
    let creatorDestAta = creatorAta;
    let creatorDestAmount = creatorAmount;
    if (!creatorAtaInfo) {
      if (userBalance >= requiredSolForAtas) {
        console.log("[createPaymentTransactionClient] Creating Creator ATA");
        instructions.push(
          createAssociatedTokenAccountInstruction(
            userPublicKey, // payer
            creatorAta, // ata
            authorPublicKey, // owner
            paymentMint // mint
          )
        );
      } else {
        console.warn("[createPaymentTransactionClient] Insufficient SOL for Creator ATA, rerouting to Founder Fund");
        reroutedToFounderFund += creatorAmount;
        creatorDestAta = null;
        creatorDestAmount = 0;
      }
    }
    
    // Sempai HQ - Create ATA if missing and user has enough SOL
    let sempaiHqDestAta = sempaiHqAta;
    let sempaiHqDestAmount = sempaiHqAmount;
    if (!sempaiHqAtaInfo) {
      if (userBalance >= requiredSolForAtas) {
        console.log("[createPaymentTransactionClient] Creating Sempai HQ ATA");
        instructions.push(
          createAssociatedTokenAccountInstruction(
            userPublicKey, // payer
            sempaiHqAta, // ata
            SEMPAI_HQ_WALLET, // owner
            paymentMint // mint
          )
        );
      } else {
        console.warn("[createPaymentTransactionClient] Insufficient SOL for Sempai HQ ATA, rerouting to Founder Fund");
        reroutedToFounderFund += sempaiHqAmount;
        sempaiHqDestAta = null;
        sempaiHqDestAmount = 0;
      }
    }
    
    // Founder Fund must exist
    if (!founderFundAtaInfo) {
      throw new Error("Founder Fund wallet is missing ATA for this token");
    }

    // Build transfer instructions
    // IMPORTANT: Transfers must be from the user's ATA, signed by the user.
    // Creator
    if (creatorDestAta && creatorDestAmount > 0) {
      instructions.push(createTransferInstruction(userAta, creatorDestAta, userPublicKey, creatorDestAmount));
    }
    // Sempai HQ
    if (sempaiHqDestAta && sempaiHqDestAmount > 0) {
      instructions.push(createTransferInstruction(userAta, sempaiHqDestAta, userPublicKey, sempaiHqDestAmount));
    }

    // Founder Fund gets its share + any rerouted shares
    const totalFounderFundAmount = founderFundAmount + reroutedToFounderFund;
    if (totalFounderFundAmount > 0) {
      instructions.push(createTransferInstruction(userAta, founderFundAta, userPublicKey, totalFounderFundAmount));
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
  const [hasInsufficientSmp, setHasInsufficientSmp] = useState(false);
  const [hasUsedAdUnlockToday, setHasUsedAdUnlockToday] = useState(false);
  const [showAdOption, setShowAdOption] = useState(false);
  const [benefactorAccess, setBenefactorAccess] = useState(null);
  const [showBenefactorOption, setShowBenefactorOption] = useState(false);
  const [benefactorAnnouncements, setBenefactorAnnouncements] = useState([]);

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
      
      // Check if user has insufficient SMP for chapter unlock
      const requiredSmp = SMP_READ_COST / 10 ** SMP_DECIMALS;
      const insufficientSmp = onChain < requiredSmp;
      setHasInsufficientSmp(insufficientSmp);
      
      // Check ad unlock eligibility if user has insufficient SMP
      if (insufficientSmp && userData.id) {
        // Check ad unlock eligibility
        const isEligible = await checkAdUnlockEligibility(userData.id);
        setShowAdOption(isEligible);
      } else {
        setShowAdOption(false);
      }
      
      // Check for benefactor access
      const benefactorData = await checkBenefactorAccess();
      setBenefactorAccess(benefactorData);
      
      // Show benefactor option if no access and this is an advance chapter
      if (!benefactorData && advanceInfo?.is_advance) {
        setShowBenefactorOption(true);
      } else {
        setShowBenefactorOption(false);
      }
    } catch (error) {
      console.error("Error fetching user balances:", error);
      setError("Unable to load wallet balances.");
      setSmpBalance(0);
      setHasInsufficientSmp(false);
      setShowAdOption(false);
      setShowBenefactorOption(false);
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

      // Debug: Log transaction details before sending
      console.log("[processChapterPayment] Transaction details:", {
        instructions: transaction.instructions.length,
        feePayer: transaction.feePayer?.toBase58(),
        recentBlockhash: transaction.recentBlockhash,
        lamports: transaction.instructions.map(i => i.lamports || 0),
        instructionTypes: transaction.instructions.map(i => {
          if (i.programId.equals(TOKEN_PROGRAM_ID)) {
            return "Token";
          } else if (i.programId.equals(SystemProgram.programId)) {
            return "System";
          } else {
            return "Other";
          }
        })
      });

      // Estimate transaction cost
      try {
        const message = transaction.compileMessage();
        const estimatedFees = await connection.getFeeForMessage(message);
        console.log("[processChapterPayment] Estimated transaction fees:", estimatedFees?.value?.lamports);
      } catch (feeError) {
        console.error("[processChapterPayment] Error estimating fees:", feeError);
      }

      // Use the unified signAndSendTransaction function for both embedded and external wallets
      let signature;
      if (embeddedWallet || signAndSendTransaction) {
        console.log("[processChapterPayment] Using embedded wallet to sign and send");
        signature = await signAndSendTransaction(transaction);
      } else if (connected && sendTransaction) {
        console.log("[processChapterPayment] Using external wallet to send");
        signature = await sendTransaction(transaction, connection, {
          skipPreflight: false,
          preflightCommitment: "confirmed",
        });
      } else {
        throw new Error("No valid wallet available for signing the transaction.");
      }

      console.log("[processChapterPayment] Transaction sent with signature:", signature);

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
      // Revenue split: 50% creator, 30% Sempai HQ, 20% Founder Fund
      const totalPayment = 1000; // Total SMP tokens for $0.025
      const creatorReward = Math.floor(totalPayment * 0.5); // 500 tokens (50%)
      const sempaiHqReward = Math.floor(totalPayment * 0.3); // 300 tokens (30%)
      const founderFundReward = totalPayment - creatorReward - sempaiHqReward; // 200 tokens (20%)
      const numericBalance = Number(amethystBalance) || 0;
      if (numericBalance >= 5000000) readerReward = 250;
      else if (numericBalance >= 1000000) readerReward = 200;
      else if (numericBalance >= 500000) readerReward = 170;
      else if (numericBalance >= 250000) readerReward = 150;
      else if (numericBalance >= 100000) readerReward = 120;

      const newReaderBalance = (user.weekly_points || 0) + readerReward;
      const newAuthorBalance = (novelOwner.balance || 0) + creatorReward;

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
        // Creator (50%)
        {
          destination_user_id: novelOwner.id,
          event_type: "deposit",
          event_details: eventDetails,
          source_chain: "SOL",
          source_currency: "SMP",
          amount_change: creatorReward,
          wallet_address: novelOwner.wallet_address,
          source_user_id: "6f859ff9-3557-473c-b8ca-f23fd9f7af27",
          destination_chain: "SOL",
          metadata: { split_type: "creator", percentage: 50 }
        },
        // Sempai HQ (30%)
        {
          destination_user_id: "sempai-hq-system",
          event_type: "deposit",
          event_details: eventDetails,
          source_chain: "SOL",
          source_currency: "SMP",
          amount_change: sempaiHqReward,
          wallet_address: SEMPAI_HQ_WALLET.toString(),
          source_user_id: "6f859ff9-3557-473c-b8ca-f23fd9f7af27",
          destination_chain: "SOL",
          metadata: { split_type: "sempai-hq", percentage: 30 }
        },
        // Founder Fund (20%)
        {
          destination_user_id: "founder-fund-system",
          event_type: "deposit",
          event_details: eventDetails,
          source_chain: "SOL",
          source_currency: "SMP",
          amount_change: founderFundReward,
          wallet_address: FOUNDER_FUND_WALLET.toString(),
          source_user_id: "6f859ff9-3557-473c-b8ca-f23fd9f7af27",
          destination_chain: "SOL",
          metadata: { split_type: "founder-fund", percentage: 20 }
        },
        // User withdrawal
        {
          destination_user_id: user.id,
          event_type: "withdrawal",
          event_details: eventDetails,
          source_chain: "SOL",
          source_currency: "Token",
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

  const checkBenefactorAccess = async () => {
    if (!activeWalletAddress || !id) return null;
    
    try {
      const { data: benefactorData, error: benefactorError } = await supabase
        .from("benefactor_early_access")
        .select("*")
        .eq("benefactor_wallet", activeWalletAddress)
        .eq("novel_id", id)
        .eq("is_active", true)
        .single();
      
      if (benefactorError && benefactorError.code !== "PGRST116") {
        console.error("[checkBenefactorAccess] Error:", benefactorError.message);
        return null;
      }
      
      if (benefactorData) {
        // Check if access has expired
        if (new Date(benefactorData.expires_at) <= new Date()) {
          // Expire the access
          await supabase
            .from("benefactor_early_access")
            .update({ is_active: false })
            .eq("id", benefactorData.id);
          return null;
        }
        
        // Check remaining chapters
        if (benefactorData.chapters_remaining <= 0) {
          return null;
        }
        
        return benefactorData;
      }
      
      return null;
    } catch (error) {
      console.error("[checkBenefactorAccess] Error:", error.message);
      return null;
    }
  };

  const checkAdUnlockEligibility = async (currentUserId = null) => {
    const targetUserId = currentUserId || userId;
    if (!targetUserId || !id || !chapter) return false;
    try {
      const chapterNum = parseInt(chapter, 10);
      
      // Check if user has already used ad unlock today
      const today = new Date().toISOString().split('T')[0];
      const { data: todayUnlock, error: todayError } = await supabase
        .from("ad_based_unlocks")
        .select("id")
        .eq("user_id", targetUserId)
        .gte("ad_watched_at", today)
        .limit(1);
      
      if (todayError && todayError.code !== "PGRST116") throw new Error(todayError.message);
      
      const hasUsedToday = todayUnlock && todayUnlock.length > 0;
      setHasUsedAdUnlockToday(hasUsedToday);
      
      // Check if this specific chapter was already unlocked via ad
      const { data: chapterUnlock, error: chapterError } = await supabase
        .from("ad_based_unlocks")
        .select("id")
        .eq("user_id", targetUserId)
        .eq("novel_id", id)
        .eq("chapter_number", chapterNum)
        .single();
      
      if (chapterError && chapterError.code !== "PGRST116") throw new Error(chapterError.message);
      
      return !hasUsedToday && !chapterUnlock;
    } catch (error) {
      console.error("[checkAdUnlockEligibility] Error:", error.message);
      return false;
    }
  };

  const handleBenefactorUnlock = async (currency) => {
    if (!activeWalletAddress || !id || !chapter || isProcessing) {
      setError("Unable to process benefactor unlock. Please try again.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const chapterNum = parseInt(chapter, 10);
      
      // Check if user already has benefactor access
      const existingAccess = await checkBenefactorAccess();
      if (existingAccess) {
        setError("You already have benefactor access to this novel.");
        setIsProcessing(false);
        return;
      }

      // Check if novel has at least one published chapter (requirement for benefactor access)
      const { data: novelData, error: novelError } = await supabase
        .from("novels")
        .select("user_id, chaptertitles")
        .eq("id", id)
        .single();
      
      if (novelError || !novelData) {
        setError("Novel not found or access denied.");
        setIsProcessing(false);
        return;
      }
      
      if (!novelData.chaptertitles || novelData.chaptertitles.length === 0) {
        setError("Benefactor access requires at least one published chapter.");
        setIsProcessing(false);
        return;
      }

      setSuccessMessage("Processing benefactor payment...");
      
      // Process $1 payment based on currency
      let paymentResult;
      if (currency === "SOL") {
        paymentResult = await processSolanaPayment(1.00, "BENEFACTOR");
      } else if (currency === "USDC") {
        paymentResult = await processUSDCPayment(1.00, "BENEFACTOR");
      } else if (currency === "SMP") {
        paymentResult = await processSMPPayment(1.00, "BENEFACTOR");
      } else {
        throw new Error("Invalid currency selected");
      }

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || "Payment failed");
      }

      // Record benefactor access
      const { data: benefactorData, error: benefactorError } = await supabase
        .from("benefactor_early_access")
        .insert({
          benefactor_wallet: activeWalletAddress,
          novel_id: id,
          chapters_unlocked: 3,
          chapters_remaining: 3,
          payment_amount: 1.00,
          payment_currency: currency,
          transaction_id: paymentResult.signature || `BENEFACTOR_${Date.now()}`,
          paid_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + (14 * 24 * 60 * 60 * 1000)).toISOString(), // 14 days
          is_active: true,
        })
        .select()
        .single();

      if (benefactorError) throw new Error(`Failed to record benefactor access: ${benefactorError.message}`);

      // Update user's benefactor status
      const { data: currentUserData, error: userError } = await supabase
        .from("users")
        .select("is_benefactor, benefactor_level, total_benefactor_payments")
        .eq("id", user.id)
        .single();

      if (!userError && currentUserData) {
        const newTotalPayments = (currentUserData.total_benefactor_payments || 0) + 1.00;
        let newLevel = currentUserData.benefactor_level || 'bronze';
        
        // Determine benefactor level based on total payments
        if (newTotalPayments >= 50) {
          newLevel = 'platinum';
        } else if (newTotalPayments >= 20) {
          newLevel = 'gold';
        } else if (newTotalPayments >= 10) {
          newLevel = 'silver';
        } else {
          newLevel = 'bronze';
        }

        const { error: updateError } = await supabase
          .from("users")
          .update({
            is_benefactor: true,
            benefactor_level: newLevel,
            benefactor_since: currentUserData.benefactor_since || new Date().toISOString(),
            total_benefactor_payments: newTotalPayments
          })
          .eq("id", user.id);

        if (updateError) {
          console.warn("[handleBenefactorUnlock] Failed to update benefactor status:", updateError.message);
        } else {
          console.log("[handleBenefactorUnlock] Updated benefactor status:", { level: newLevel, total: newTotalPayments });
        }
      }

      // Record in chapter_payments for consistency
      const { error: paymentError } = await supabase
        .from("chapter_payments")
        .insert({
          wallet_address: activeWalletAddress,
          novel_id: id,
          chapter_number: chapterNum,
          payment_type: "BENEFACTOR",
          currency: currency,
          amount: 1.00,
          transaction_id: paymentResult.signature || `BENEFACTOR_${Date.now()}`,
          created_at: new Date().toISOString(),
        });

      if (paymentError) {
        console.warn("[handleBenefactorUnlock] Failed to record payment entry:", paymentError.message);
      }

      // Update benefactor access state
      setBenefactorAccess(benefactorData);
      setShowBenefactorOption(false);
      
      // Unlock the current chapter
      setIsLocked(false);
      setLocalUnlocked(true);
      setRecentlyUnlocked(true);
      
      setSuccessMessage("Benefactor access activated! You now have early access to 3 chapters for 14 days.");
      setTimeout(() => setSuccessMessage(""), 5000);
      
      // Keep chapter unlocked for 10 seconds to prevent re-locking during DB replication
      setTimeout(() => setRecentlyUnlocked(false), 10000);
      
    } catch (error) {
      console.error("[handleBenefactorUnlock] Error:", error);
      setError(`Benefactor unlock failed: ${error.message}`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAdBasedUnlock = async () => {
    if (!userId || !id || !chapter || isProcessing) {
      setError("Unable to process ad unlock. Please try again.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const chapterNum = parseInt(chapter, 10);
      
      // Check eligibility again
      const isEligible = await checkAdUnlockEligibility();
      if (!isEligible) {
        setError(hasUsedAdUnlockToday 
          ? "You have already used your free ad unlock for today. Come back tomorrow!" 
          : "This chapter was already unlocked via ad.");
        setIsProcessing(false);
        return;
      }

      // Helper function to complete the unlock process
      const completeAdUnlock = async () => {
        // Record the ad-based unlock
        const { data: sessionData } = await supabase.auth.getSession();
        const userEmail = sessionData?.session?.user?.email;
        
        if (!userEmail) {
          throw new Error("User session not found");
        }

        const { error: adUnlockError } = await supabase
          .from("ad_based_unlocks")
          .insert({
            user_id: userId,
            novel_id: id,
            chapter_number: chapterNum,
            unlocked_at: new Date().toISOString(),
            ad_watched_at: new Date().toISOString(),
          });

        if (adUnlockError) throw new Error(`Failed to record ad unlock: ${adUnlockError.message}`);

        // Record in chapter_payments as well for consistency
        const { error: paymentError } = await supabase
          .from("chapter_payments")
          .insert({
            wallet_address: userEmail,
            novel_id: id,
            chapter_number: chapterNum,
            payment_type: "AD_BASED",
            currency: "FREE",
            amount: 0,
            transaction_id: `AD_UNLOCK_${Date.now()}`,
            created_at: new Date().toISOString(),
          });

        if (paymentError) {
          console.warn("[handleAdBasedUnlock] Failed to record payment entry:", paymentError.message);
        }

        // Unlock the chapter
        setIsLocked(false);
        setLocalUnlocked(true);
        setRecentlyUnlocked(true);
        
        setSuccessMessage("Chapter unlocked successfully! You can read it now.");
        setTimeout(() => setSuccessMessage(""), 5000);
        
        // Update eligibility states
        await checkAdUnlockEligibility();
        
        // Keep chapter unlocked for 10 seconds to prevent re-locking during DB replication
        setTimeout(() => setRecentlyUnlocked(false), 10000);
      };

      // Play the actual video ad
      setSuccessMessage("Loading video ad...");
      await delay(1000);
      
      // Create and play video ad
      const videoAd = document.createElement('video');
      videoAd.src = AD_VIDEO_PATH;
      videoAd.style.position = 'fixed';
      videoAd.style.top = '50%';
      videoAd.style.left = '50%';
      videoAd.style.transform = 'translate(-50%, -50%)';
      videoAd.style.zIndex = '10000';
      videoAd.style.maxWidth = '90vw';
      videoAd.style.maxHeight = '90vh';
      videoAd.style.backgroundColor = 'black';
      videoAd.controls = true;
      videoAd.autoplay = true;
      
      // Create overlay container
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100vw';
      overlay.style.height = '100vh';
      overlay.style.backgroundColor = 'rgba(0,0,0,0.9)';
      overlay.style.zIndex = '9999';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      
      // Add video to overlay
      overlay.appendChild(videoAd);
      document.body.appendChild(overlay);
      
      setSuccessMessage("Watching video ad... Please wait for it to complete.");
      
      // Wait for video to finish playing
      return new Promise((resolve, reject) => {
        videoAd.onended = async () => {
          try {
            // Remove overlay
            document.body.removeChild(overlay);
            
            // Continue with unlock process
            await completeAdUnlock();
            resolve();
          } catch (error) {
            reject(error);
          }
        };
        
        videoAd.onerror = () => {
          document.body.removeChild(overlay);
          reject(new Error('Video ad failed to load'));
        };
        
        // Fallback timeout (60 seconds max for longer videos)
        setTimeout(() => {
          if (document.body.contains(overlay)) {
            document.body.removeChild(overlay);
            reject(new Error('Video ad timeout'));
          }
        }, 60000);
      }).catch(async (error) => {
        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
        }
        throw error;
      });
      
    } catch (error) {
      console.error("[handleAdBasedUnlock] Error:", error);
      setError(`Ad unlock failed: ${error.message}`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsProcessing(false);
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
        
        // Check for ad-based unlock
        const { data: adUnlock, error: adError } = await supabase
          .from("ad_based_unlocks")
          .select("id")
          .eq("user_id", userId)
          .eq("novel_id", id)
          .eq("chapter_number", chapterNum)
          .single();
        
        if (!adError && adUnlock) {
          setIsLocked(false);
          return;
        }
        
        // Check for benefactor access
        const benefactorData = await checkBenefactorAccess();
        if (benefactorData) {
          // Check if this chapter is within the benefactor's remaining chapters
          const { data: accessLog, error: logError } = await supabase
            .from("benefactor_access_log")
            .select("id")
            .eq("benefactor_access_id", benefactorData.id)
            .eq("chapter_number", chapterNum)
            .single();
          
          if (logError && logError.code !== "PGRST116") {
            console.error("[checkAccess] Benefactor log error:", logError.message);
          }
          
          if (!logError && accessLog) {
            // Chapter already accessed via benefactor
            setIsLocked(false);
            return;
          }
          
          if (benefactorData.chapters_remaining > 0) {
            // Grant access and log the chapter access
            setIsLocked(false);
            
            // Log the chapter access
            await supabase
              .from("benefactor_access_log")
              .insert({
                benefactor_access_id: benefactorData.id,
                novel_id: id,
                chapter_number: chapterNum,
                accessed_at: new Date().toISOString(),
              });
            
            // Update remaining chapters
            const newRemaining = benefactorData.chapters_remaining - 1;
            await supabase
              .from("benefactor_early_access")
              .update({ chapters_remaining: newRemaining })
              .eq("id", benefactorData.id);
            
            // Update local state
            setBenefactorAccess({ ...benefactorData, chapters_remaining: newRemaining });
            
            return;
          }
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
          console.error("[processChapterPayment] On-chain transaction error:", finalStatus?.value?.err);
          console.error("[processChapterPayment] Error details:", JSON.stringify(finalStatus?.value?.err, null, 2));
          throw new Error(`Transaction failed on-chain: ${JSON.stringify(finalStatus?.value?.err)}`);
        }
      }
      
      if (!landed) {
        console.error("[processChapterPayment] Transaction confirmation failed after all attempts");
        console.error("[processChapterPayment] Signature:", signature);
        console.error("[processChapterPayment] Final status:", finalStatus?.value);
        
        // Try to get more detailed error information
        try {
          const tx = await connection.getTransaction(signature, {
            commitment: "confirmed",
            maxSupportedTransactionVersion: 0
          });
          console.error("[processChapterPayment] Transaction details:", tx);
          
          if (tx?.meta?.err) {
            console.error("[processChapterPayment] Transaction error:", tx.meta.err);
            throw new Error(`Transaction failed: ${JSON.stringify(tx.meta.err)}`);
          }
        } catch (detailError) {
          console.error("[processChapterPayment] Error getting transaction details:", detailError);
        }
        
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
                {hasInsufficientSmp && showAdOption ? (
                  <>
                    <p className={styles.subMessage}>
                      <FaGem className={styles.gemIcon} /> You don't have enough SMP. Watch an ad to unlock for free!
                    </p>
                    <div className={styles.paymentOptions}>
                      <button
                        onClick={handleAdBasedUnlock}
                        className={`${styles.unlockButton} ${styles.adUnlock}`}
                        disabled={isProcessing || hasUsedAdUnlockToday}
                        title={hasUsedAdUnlockToday ? "Already used today" : "Watch an ad to unlock this chapter for free"}
                      >
                        {isProcessing ? (
                          <>
                            <FaSpinner className={`${styles.buttonIcon} ${styles.spinner}`} />
                            <span className={styles.buttonText}>Loading Ad...</span>
                          </>
                        ) : (
                          <>
                            <FaGem className={styles.buttonIcon} />
                            <span className={styles.buttonText}>
                              {hasUsedAdUnlockToday ? "Ad Unlock Used Today" : "Watch Ad - Free Unlock"}
                            </span>
                          </>
                        )}
                        <span className={styles.price}>One chapter per day</span>
                      </button>
                    </div>
                    <p className={styles.alternativeOption}>Or pay with SMP:</p>
                    <button
                      onClick={() => processChapterPayment("SINGLE", "SMP")}
                      className={styles.readWithSmpButton}
                      disabled={hasInsufficientSmp || isProcessing}
                      title={hasInsufficientSmp ? "Insufficient SMP balance" : "Pay with SMP tokens"}
                    >
                      {isProcessing ? (
                        <>
                          <FaSpinner className={`${styles.buttonIcon} ${styles.spinner}`} />
                          <span className={styles.buttonText}>Processing...</span>
                        </>
                      ) : (
                        <>
                          <FaGem className={styles.buttonIcon} />
                          <span className={styles.buttonText}>Read with {(SMP_READ_COST / 10 ** SMP_DECIMALS).toLocaleString()} SMP ($0.025)</span>
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => processChapterPayment("SINGLE", "SMP")}
                    className={styles.readWithSmpButton}
                    disabled={hasInsufficientSmp || isProcessing}
                    title={hasInsufficientSmp ? "Insufficient SMP balance" : "Pay with SMP tokens"}
                  >
                    {isProcessing ? (
                      <>
                        <FaSpinner className={`${styles.buttonIcon} ${styles.spinner}`} />
                        <span className={styles.buttonText}>Processing...</span>
                      </>
                    ) : (
                      <>
                        <FaGem className={styles.buttonIcon} />
                        <span className={styles.buttonText}>Read with {(SMP_READ_COST / 10 ** SMP_DECIMALS).toLocaleString()} SMP ($0.025)</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : (
              <>
                {showBenefactorOption && !benefactorAccess && (
                  <>
                    <p className={styles.subMessage}>
                      <FaStar className={styles.gemIcon} /> Get early access to 3 chapters for just $1!
                    </p>
                    <div className={styles.paymentOptions}>
                      <button
                        onClick={() => handleBenefactorUnlock("SOL")}
                        className={`${styles.unlockButton} ${styles.benefactorUnlock}`}
                        disabled={isProcessing}
                        title="Get early access to 3 chapters for $1"
                      >
                        {isProcessing ? (
                          <>
                            <FaSpinner className={`${styles.buttonIcon} ${styles.spinner}`} />
                            <span className={styles.buttonText}>Processing...</span>
                          </>
                        ) : (
                          <>
                            <FaStar className={styles.buttonIcon} />
                            <span className={styles.buttonText}>Early Access - $1</span>
                          </>
                        )}
                        <span className={styles.price}>3 chapters for 14 days</span>
                      </button>
                      <button
                        onClick={() => handleBenefactorUnlock("USDC")}
                        className={`${styles.unlockButton} ${styles.benefactorUnlock}`}
                        disabled={isProcessing}
                        title="Get early access to 3 chapters for $1 USDC"
                      >
                        {isProcessing ? (
                          <>
                            <FaSpinner className={`${styles.buttonIcon} ${styles.spinner}`} />
                            <span className={styles.buttonText}>Processing...</span>
                          </>
                        ) : (
                          <>
                            <FaStar className={styles.buttonIcon} />
                            <span className={styles.buttonText}>Early Access - $1 USDC</span>
                          </>
                        )}
                        <span className={styles.price}>3 chapters for 14 days</span>
                      </button>
                      <button
                        onClick={() => handleBenefactorUnlock("SMP")}
                        className={`${styles.unlockButton} ${styles.benefactorUnlock}`}
                        disabled={isProcessing}
                        title="Get early access to 3 chapters for $1 SMP"
                      >
                        {isProcessing ? (
                          <>
                            <FaSpinner className={`${styles.buttonIcon} ${styles.spinner}`} />
                            <span className={styles.buttonText}>Processing...</span>
                          </>
                        ) : (
                          <>
                            <FaStar className={styles.buttonIcon} />
                            <span className={styles.buttonText}>Early Access - $1 SMP</span>
                          </>
                        )}
                        <span className={styles.price}>3 chapters for 14 days</span>
                      </button>
                    </div>
                    <p className={styles.alternativeOption}>Or unlock with subscription:</p>
                  </>
                )}
                {benefactorAccess && (
                  <div className={styles.benefactorStatus}>
                    <FaStar className={styles.gemIcon} />
                    <span className={styles.statusText}>
                      Benefactor Access: {benefactorAccess.chapters_remaining}/3 chapters remaining
                    </span>
                    <span className={styles.expiryText}>
                      Expires: {new Date(benefactorAccess.expires_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
                <p className={styles.subMessage}>
                  <FaGem className={styles.gemIcon} /> Unlock with a subscription
                </p>
                <div className={styles.paymentOptions}>
                  <button
                    onClick={() => initiatePayment("3CHAPTERS", "SOL")}
                    className={`${styles.unlockButton} ${styles.threeChapters}`}
                    disabled={!canUnlockNextThree || !solPrice || isProcessing}
                    title={!canUnlockNextThree ? "Unlock previous chapters first" : !solPrice ? "Price unavailable" : ""}
                  >
                    {isProcessing ? (
                      <>
                        <FaSpinner className={`${styles.buttonIcon} ${styles.spinner}`} />
                        <span className={styles.buttonText}>Processing...</span>
                      </>
                    ) : (
                      <>
                        <FaRocket className={styles.buttonIcon} />
                        <span className={styles.buttonText}>3 Chapters (SOL)</span>
                      </>
                    )}
                    <span className={styles.price}>$3 / {threeChaptersSol} SOL</span>
                  </button>
                  <button
                    onClick={() => initiatePayment("FULL", "SOL")}
                    className={`${styles.unlockButton} ${styles.fullChapters}`}
                    disabled={!solPrice || isProcessing}
                    title={!solPrice ? "Price unavailable" : ""}
                  >
                    {isProcessing ? (
                      <>
                        <FaSpinner className={`${styles.buttonIcon} ${styles.spinner}`} />
                        <span className={styles.buttonText}>Processing...</span>
                      </>
                    ) : (
                      <>
                        <FaCrown className={styles.buttonIcon} />
                        <span className={styles.buttonText}>All Chapters (SOL)</span>
                      </>
                    )}
                    <span className={styles.price}>$15 / {fullChaptersSol} SOL</span>
                  </button>
                  <button
                    onClick={() => initiatePayment("3CHAPTERS", "USDC")}
                    className={`${styles.unlockButton} ${styles.threeChapters}`}
                    disabled={!canUnlockNextThree || isProcessing}
                    title={!canUnlockNextThree ? "Unlock previous chapters first" : ""}
                  >
                    {isProcessing ? (
                      <>
                        <FaSpinner className={`${styles.buttonIcon} ${styles.spinner}`} />
                        <span className={styles.buttonText}>Processing...</span>
                      </>
                    ) : (
                      <>
                        <FaRocket className={styles.buttonIcon} />
                        <span className={styles.buttonText}>3 Chapters (USDC)</span>
                      </>
                    )}
                    <span className={styles.price}>$3 / {threeChaptersUsdc} USDC</span>
                  </button>
                  <button
                    onClick={() => initiatePayment("FULL", "USDC")}
                    className={`${styles.unlockButton} ${styles.fullChapters}`}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <FaSpinner className={`${styles.buttonIcon} ${styles.spinner}`} />
                        <span className={styles.buttonText}>Processing...</span>
                      </>
                    ) : (
                      <>
                        <FaCrown className={styles.buttonIcon} />
                        <span className={styles.buttonText}>All Chapters (USDC)</span>
                      </>
                    )}
                    <span className={styles.price}>$15 / {fullChaptersUsdc} USDC</span>
                  </button>
                  <button
                    onClick={() => initiatePayment("3CHAPTERS", "SMP")}
                    className={`${styles.unlockButton} ${styles.threeChapters}`}
                    disabled={!canUnlockNextThree || !smpPrice || isProcessing}
                    title={!canUnlockNextThree ? "Unlock previous chapters first" : !smpPrice ? "SMP price unavailable" : ""}
                  >
                    {isProcessing ? (
                      <>
                        <FaSpinner className={`${styles.buttonIcon} ${styles.spinner}`} />
                        <span className={styles.buttonText}>Processing...</span>
                      </>
                    ) : (
                      <>
                        <FaRocket className={styles.buttonIcon} />
                        <span className={styles.buttonText}>3 Chapters (SMP)</span>
                      </>
                    )}
                    <span className={styles.price}>$3 / {threeChaptersSmp} SMP</span>
                  </button>
                  <button
                    onClick={() => initiatePayment("FULL", "SMP")}
                    className={`${styles.unlockButton} ${styles.fullChapters}`}
                    disabled={!smpPrice || isProcessing}
                    title={!smpPrice ? "SMP price unavailable" : ""}
                  >
                    {isProcessing ? (
                      <>
                        <FaSpinner className={`${styles.buttonIcon} ${styles.spinner}`} />
                        <span className={styles.buttonText}>Processing...</span>
                      </>
                    ) : (
                      <>
                        <FaCrown className={styles.buttonIcon} />
                        <span className={styles.buttonText}>All Chapters (SMP)</span>
                      </>
                    )}
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
              {embeddedWallet ? "Transaction will be signed automatically." : "Please approve the transaction in your wallet."}
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