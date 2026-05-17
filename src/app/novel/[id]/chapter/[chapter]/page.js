"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useContext, useMemo } from "react";
import { supabase } from "../../../../../services/supabase/supabaseClient";
import { InlineUserDisplay } from "@/components/UserDisplay";
import BenefactorPricing from "@/components/BenefactorPricing";
import { PublicKey, Connection, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import ReadingTracker from "../../../../../services/porp/ReadingTracker";
import PoRPStatus from "../../../../../components/PoRP/PoRPStatus";
import ComprehensionChallenge from "../../../../../components/PoRP/ComprehensionChallenge";
import PoRPDashboard from "../../../../../components/PoRP/PoRPDashboard";
import { balanceCache } from "../../../../../services/balance/BalanceCache";
import { balanceUpdater } from "../../../../../services/balance/BalanceUpdater";
import {
  TOKEN_PROGRAM_ID,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getOrCreateAssociatedTokenAccount,
  getAccount,
  getAssociatedTokenAddress,
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
const SEMPAI_HQ_WALLET = new PublicKey("4ZFvgNZygfiCSAS4aKBbQEgwJgBq5fRT9oLAH56GrF6H");

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

  const [amethystBalance, setAmethystBalance] = useState(null);

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
  
  // PoRP tracking state
  const [readingTracker, setReadingTracker] = useState(null);
  const [porpSessionActive, setPorpSessionActive] = useState(false);
  const [sessionReceipt, setSessionReceipt] = useState(null);
  const [showPoRPStatus, setShowPoRPStatus] = useState(true);
  
  // PoRP Layer 2 - Challenge state
  const [challengeData, setChallengeData] = useState(null);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  
  // PoRP Layer 4 - Dashboard state
  const [showPoRPDashboard, setShowPoRPDashboard] = useState(false);

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // PoRP tracking functions
  const initializePoRPTracking = useCallback(async () => {
    console.log('[PoRP Debug] initializePoRPTracking called with:', {
      id,
      chapter,
      porpSessionActive,
      isWalletConnected
    });
    
    // Only start PoRP tracking if user has wallet connected (external or embedded)
    if (!id || !chapter || porpSessionActive || !isWalletConnected) {
      console.log('[PoRP] Skipping tracking - wallet not connected or session already active', {
        hasId: !!id,
        hasChapter: !!chapter,
        sessionActive: porpSessionActive,
        walletConnected: isWalletConnected
      });
      return;
    }
    
    try {
      console.log('[PoRP] Starting tracking with params:', { 
        id, 
        chapter, 
        chapterParsed: parseInt(chapter, 10), 
        activeWalletAddress,
        isWalletConnected 
      });
      
      const tracker = new ReadingTracker();
      const sessionId = await tracker.startSession(id, parseInt(chapter, 10), activeWalletAddress);
      
      // Handle case where session couldn't be started (e.g., not authenticated)
      if (!sessionId) {
        console.log('[PoRP] Session not started - wallet may not be connected');
        return;
      }
      
      setReadingTracker(tracker);
      setPorpSessionActive(true);
      console.log(`[PoRP] Session initialized: ${sessionId}`);
    } catch (error) {
      console.error('[PoRP] Failed to initialize tracking:', error);
      // Don't block user experience if PoRP fails
    }
  }, [id, chapter, porpSessionActive, isWalletConnected]);

  const completePoRPTracking = useCallback(async () => {
    if (!readingTracker || !porpSessionActive) return;
    
    try {
      // Try to complete session with challenge
      const result = await readingTracker.completeSessionWithChallenge(id, parseInt(chapter, 10), activeWalletAddress);
      
      if (result.requiresChallenge) {
        console.log('[PoRP] Challenge required, showing challenge modal');
        setChallengeData({
          challenge: result.challenge,
          sessionId: result.sessionId
        });
        setShowChallengeModal(true);
        return; // Don't cleanup yet, wait for challenge completion
      } else {
        // No challenge required, session completed normally
        setSessionReceipt(result.receipt);
        console.log('[PoRP] Session completed, receipt issued:', result.receipt?.receipt_id);
        setPorpSessionActive(false);
        setReadingTracker(null);
      }
    } catch (error) {
      console.error('[PoRP] Failed to complete session:', error);
      setPorpSessionActive(false);
      setReadingTracker(null);
    }
  }, [readingTracker, porpSessionActive, activeWalletAddress, id, chapter]);

  // Handle challenge submission
  const handleChallengeSubmit = useCallback(async (userAnswer, responseTime) => {
    if (!challengeData || !readingTracker) return;
    
    try {
      console.log('[PoRP] Submitting challenge answer:', { userAnswer, responseTime });
      
      const result = await readingTracker.submitChallengeAnswer(
        challengeData.challenge.id, 
        userAnswer, 
        responseTime
      );
      
      console.log('[PoRP] Challenge result:', result);
      
      if (result.canProceed) {
        // Challenge passed or skipped, complete the session
        const receipt = await readingTracker.completeSession(activeWalletAddress);
        setSessionReceipt(receipt);
        console.log('[PoRP] Session completed after challenge, receipt issued:', receipt?.receipt_id);
      } else {
        console.log('[PoRP] Challenge failed, but user can proceed');
        // Still allow session completion even if challenge failed
        const receipt = await readingTracker.completeSession(activeWalletAddress);
        setSessionReceipt(receipt);
        console.log('[PoRP] Session completed despite failed challenge, receipt issued:', receipt?.receipt_id);
      }
      
      // Close challenge modal and cleanup
      setShowChallengeModal(false);
      setChallengeData(null);
      setPorpSessionActive(false);
      setReadingTracker(null);
      
    } catch (error) {
      console.error('[PoRP] Failed to handle challenge submission:', error);
      // Still cleanup on error
      setShowChallengeModal(false);
      setChallengeData(null);
      setPorpSessionActive(false);
      setReadingTracker(null);
    }
  }, [challengeData, readingTracker, activeWalletAddress]);

  // Handle challenge modal close
  const handleChallengeClose = useCallback(() => {
    console.log('[PoRP] Challenge modal closed by user');
    setShowChallengeModal(false);
    setChallengeData(null);
    
    // Complete session without challenge when user closes modal
    if (readingTracker && porpSessionActive) {
      completePoRPTracking();
    }
  }, [readingTracker, porpSessionActive, completePoRPTracking]);

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

  const fetchSmpBalanceOnChain = useCallback(async () => {
    if (!activeWalletAddress) return 0;
    
    try {
      // Use cached balance instead of direct RPC call
      const cachedBalance = await balanceCache.getBalance(activeWalletAddress, 'SMP', 'SOL');
      console.log("SMP balance from cache:", cachedBalance);
      return cachedBalance;
    } catch (error) {
      console.error("Error fetching SMP balance from cache:", error);
      // Fallback to 0 if cache fails
      return 0;
    }
  }, [activeWalletAddress]);

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
      
      // Fetch and cache Amethyst balance from blockchain (using same method as swap page)
      try {
        const amethystMintPublicKey = AMETHYST_MINT_ADDRESS;
        const userPublicKey = new PublicKey(activeWalletAddress);

        // Use the same method as swap page
        const ataAddress = getAssociatedTokenAddressSync(amethystMintPublicKey, userPublicKey);
        const ataInfo = await connection.getAccountInfo(ataAddress);
        
        let blockchainAmethystBalance = 0;
        if (ataInfo) {
          const ata = unpackAccount(ataAddress, ataInfo);
          blockchainAmethystBalance = Math.floor(Number(ata.amount) / Math.pow(10, 6)); // 6 decimals for Amethyst, convert to integer
        }

        // Update the cache in database
        const { error: updateError } = await supabase
          .from("amethyst_balances")
          .upsert({
            user_id: userData.id,
            wallet_address: activeWalletAddress,
            amethyst_balance: blockchainAmethystBalance,
            last_updated: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });

        if (updateError) {
          console.error("[fetchUserBalances] Error updating Amethyst cache:", updateError);
        } else {
          console.log("[fetchUserBalances] Updated Amethyst cache to:", blockchainAmethystBalance);
        }

        setAmethystBalance(blockchainAmethystBalance);
      } catch (err) {
        console.error("[fetchUserBalances] Error fetching Amethyst balance:", err);
        setAmethystBalance(0);
      }
      
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
      
      // Show benefactor option if no access (for any locked chapter)
      if (!benefactorData) {
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
      
      // Fetch Amethyst balance directly from blockchain to ensure accuracy
      let currentAmethystBalance = 0;
      try {
        console.log("[Chapter Unlock] Starting Amethyst balance fetch...");
        const amethystMintPublicKey = AMETHYST_MINT_ADDRESS;
        const userPublicKey = new PublicKey(activeWalletAddress);
        
        const ataAddress = getAssociatedTokenAddressSync(amethystMintPublicKey, userPublicKey);
        const ataInfo = await connection.getAccountInfo(ataAddress);
        
        if (ataInfo) {
          const ata = unpackAccount(ataAddress, ataInfo);
          currentAmethystBalance = Math.floor(Number(ata.amount) / Math.pow(10, 6));
          console.log(`[Chapter Unlock] Blockchain Amethyst balance: ${currentAmethystBalance}`);
        } else {
          console.log("[Chapter Unlock] No ATA found for Amethyst");
        }
      } catch (err) {
        console.error("[Chapter Unlock] Error fetching Amethyst balance:", err);
        currentAmethystBalance = Number(amethystBalance) || 0; // Fallback to state
      }
      
      const numericBalance = currentAmethystBalance;
      
      // Debug logging to see actual values
      console.log(`[Chapter Unlock] Fetched Amethyst Balance: ${currentAmethystBalance}, Type: ${typeof currentAmethystBalance}, Numeric: ${numericBalance}`);
      
      if (numericBalance >= 5000000) readerReward = 250;
      else if (numericBalance >= 1000000) readerReward = 200;
      else if (numericBalance >= 500000) readerReward = 170;
      else if (numericBalance >= 250000) readerReward = 150;
      else if (numericBalance >= 100000) readerReward = 120;
      
      console.log(`[Chapter Unlock] Final Reader Reward: ${readerReward} (for ${numericBalance} Amethyst)`);

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
      // First 3 chapters are free and don't require wallet connection
      if (chapterNum <= 2) {
        let { data: novelData, error: novelError } = await supabase
          .from("novels")
          .select("*")
          .eq("id", id)
          .single();
        if (novelError || !novelData) {
          console.error("Novel fetch error:", novelError);
          setError(`Novel not found: ${novelError?.message || "Unknown error"}`);
          setLoading(false);
          return;
        }
        setNovel(novelData);
        setIsLocked(false);
        setLoading(false);
        return;
      }

      // Require wallet connection for chapters 4+
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
      // First get the novel to find the writer (author)
      const { data: novelData, error: novelError } = await supabase
        .from("novels")
        .select("user_id")
        .eq("id", id)
        .single();
      
      if (novelError || !novelData) {
        console.error("[checkBenefactorAccess] Error fetching novel:", novelError?.message);
        return null;
      }

      const writerId = novelData.user_id;

      // Check for active subscription to this writer
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from("writer_subscriptions")
        .select("*")
        .eq("benefactor_wallet", activeWalletAddress)
        .eq("writer_id", writerId)
        .eq("is_active", true)
        .single();
      
      if (subscriptionError && subscriptionError.code !== "PGRST116") {
        console.error("[checkBenefactorAccess] Error:", subscriptionError.message);
        return null;
      }
      
      if (subscriptionData) {
        // Check if subscription has expired
        if (new Date(subscriptionData.expires_at) <= new Date()) {
          // Expire the subscription
          await supabase
            .from("writer_subscriptions")
            .update({ is_active: false })
            .eq("id", subscriptionData.id);
          
          return null;
        }
        
        // Check remaining chapters (only applies to non-gold plans)
        if (subscriptionData.chapters_remaining <= 0 && subscriptionData.plan_type !== 'gold') {
          return null;
        }
        
        return subscriptionData;
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

const processSmpPayment = async (paymentAmount, novelId, paymentMint = SMP_MINT_ADDRESS) => {
  try {
    console.log(`[processSmpPayment] Starting payment → Mint: ${paymentMint.toBase58()} | Amount: ${paymentAmount}`);

    if (!activeWalletAddress || !id || !activePublicKey || !signAndSendTransaction) {
      return { success: false, error: "Please connect your wallet and try again." };
    }

    // Get novel author wallet
    const { data: novelData, error: novelError } = await supabase
      .from("novels")
      .select("user_id")
      .eq("id", novelId)
      .single();

    if (novelError || !novelData) {
      return { success: false, error: "Could not fetch novel data" };
    }

    const { data: authorData, error: authorError } = await supabase
      .from("users")
      .select("wallet_address")
      .eq("id", novelData.user_id)
      .single();

    if (authorError || !authorData?.wallet_address) {
      return { success: false, error: "Could not fetch author wallet" };
    }

    const authorPublicKey = new PublicKey(authorData.wallet_address);

    console.log(`[processSmpPayment] Building transaction for ${paymentAmount} units of ${paymentMint.toBase58()}`);

    // Build transaction (now correctly uses the passed paymentMint)
    const transaction = await createPaymentTransactionClient({
      paymentMint,
      paymentAmount,
      userPublicKey: activePublicKey,
      authorPublicKey,
      smpMintAddress: paymentMint,   // kept for backward compatibility
    });

    // Get fresh blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = activePublicKey;

    // Sign and send
    console.log("[processSmpPayment] Signing and sending transaction...");
    const signature = await signAndSendTransaction(transaction);
    console.log("[processSmpPayment] Transaction sent, signature:", signature);

    // Wait for confirmation
    const start = Date.now();
    let landed = false;

    while (Date.now() - start < 10000) {
      const statusResp = await connection.getSignatureStatus(signature);
      const status = statusResp?.value;

      if (status?.err) throw new Error("Transaction failed on-chain.");
      if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") {
        landed = true;
        break;
      }
      await delay(500);
    }

    if (!landed) {
      const finalStatus = await connection.getSignatureStatus(signature, { searchTransactionHistory: true });
      if (finalStatus?.value?.confirmationStatus === "confirmed" || finalStatus?.value?.confirmationStatus === "finalized") {
        landed = true;
      } else if (finalStatus?.value?.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(finalStatus?.value?.err)}`);
      }
    }

    if (!landed) throw new Error("Transaction not confirmed yet. Please try again.");

    console.log("[processSmpPayment] Transaction confirmed successfully");
    return { success: true, signature };

  } catch (error) {
    console.error("[processSmpPayment] Error:", error);
    return { success: false, error: error.message };
  }
};

 const handleBenefactorUnlock = async (plan) => {
  if (!activeWalletAddress || !id || !chapter || isProcessing) {
    setError("Unable to process benefactor unlock. Please try again.");
    return;
  }

  setIsProcessing(true);
  setError(null);
  setSuccessMessage("");

  try {
    const pricingTiers = {
      blue:  { price: 1,   chapters: 3,   name: "Blue" },
      iron:  { price: 2,   chapters: 6,   name: "Iron" },
      silver: { price: 3,   chapters: 10,  name: "Silver" },
      gold:  { price: 5,   chapters: 999, name: "Gold" },
    };

    const tier = pricingTiers[plan.id];
    if (!tier) throw new Error("Invalid plan selected");

    const existingAccess = await checkBenefactorAccess();
    if (existingAccess) {
      setError("You already have an active subscription to this writer.");
      return;
    }

    setSuccessMessage(`Processing ${tier.name} writer subscription...`);

    // ==================== BENEFACATOR ONLY: USDC / SOL / SKR ====================
    const currency = "USDC";   // ← Change to "SOL" or "SKR" to test other currencies

    let paymentAmount = 0;
    let paymentMint = null;

    if (currency === "USDC") {
      paymentMint = USDC_MINT_ADDRESS;
      paymentAmount = Math.floor(tier.price * 1_000_000);
    } else if (currency === "SOL") {
      paymentAmount = Math.floor(tier.price * (solPrice || 100) * 1_000_000_000);
    } else if (currency === "SKR") {
      paymentMint = SKR_MINT_ADDRESS;
      paymentAmount = Math.ceil(tier.price * 1_000_000_000);
    }

    console.log(`[Benefactor] Paying ${tier.price} USD with ${currency} (${paymentAmount} units)`);

    // Pass the correct mint as third parameter
    const paymentResult = await processSmpPayment(paymentAmount, id, paymentMint);

    if (!paymentResult.success) {
      throw new Error(paymentResult.error || "Payment failed");
    }

    // Record subscription
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) throw new Error("You must be signed in.");

    const response = await fetch("/api/benefactor-payment-proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        novelId: id,
        planType: plan.id,
        signature: paymentResult.signature,
        userPublicKey: activeWalletAddress,
        currency: currency,
        amount: tier.price,
      }),
    });

    const result = await response.json();

    if (!response.ok) throw new Error(result.error || "Failed to activate subscription");

    // Success
    const benefactorData = await checkBenefactorAccess();
    setBenefactorAccess(benefactorData);
    setShowBenefactorOption(false);
    
    setIsLocked(false);
    setLocalUnlocked(true);
    setRecentlyUnlocked(true);

    const accessMessage = tier.chapters === 999 
      ? `${tier.name} writer subscription activated! Unlimited access for 30 days.`
      : `${tier.name} writer subscription activated! Early access to ${tier.chapters} chapters for 14 days.`;
    
    setSuccessMessage(accessMessage);
    setTimeout(() => setSuccessMessage(""), 6000);
    setTimeout(() => setRecentlyUnlocked(false), 10000);

  } catch (error) {
    console.error("[handleBenefactorUnlock] Error:", error);
    setError(`Benefactor unlock failed: ${error.message}`);
    setTimeout(() => setError(null), 6000);
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
        
        // Check for writer subscription access
        const subscriptionData = await checkBenefactorAccess();
        if (subscriptionData) {
          // Check if this chapter has already been accessed under this subscription
          const { data: accessLog, error: logError } = await supabase
            .from("writer_access_log")
            .select("id")
            .eq("subscription_id", subscriptionData.id)
            .eq("novel_id", id)
            .eq("chapter_number", chapterNum)
            .single();

          if (logError && logError.code !== "PGRST116") {
            console.error("[checkAccess] Writer access log error:", logError.message);
          }

          if (!logError && accessLog) {
            // Chapter already accessed via writer subscription
            setIsLocked(false);
            return;
          }

          // For unlimited access (gold plan) or remaining chapters > 0, grant access
          if (subscriptionData.plan_type === 'gold' || subscriptionData.chapters_remaining > 0) {
            // Grant access and log the chapter access
            setIsLocked(false);

            // Log the chapter access
            await supabase
              .from("writer_access_log")
              .insert({
                subscription_id: subscriptionData.id,
                novel_id: id,
                chapter_number: chapterNum,
                accessed_at: new Date().toISOString(),
              });

            // Only decrement if not gold (unlimited)
            if (subscriptionData.plan_type !== 'gold') {
              const newRemaining = subscriptionData.chapters_remaining - 1;
              await supabase
                .from("writer_subscriptions")
                .update({ chapters_remaining: newRemaining })
                .eq("id", subscriptionData.id);

              // Update local state
              setBenefactorAccess({ ...subscriptionData, chapters_remaining: newRemaining });
            }

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
  }, [id]);

  // Listen for PoRP dashboard open events
  useEffect(() => {
    const handleOpenDashboard = () => {
      console.log('[ChapterPage] Opening PoRP dashboard');
      setShowPoRPDashboard(true);
    };

    const handleDashboardEvent = (event) => {
      console.log('[ChapterPage] Received openPoRPDashboard event', event);
      console.log('[ChapterPage] Setting showPoRPDashboard to true');
      setShowPoRPDashboard(true);
      console.log('[ChapterPage] showPoRPDashboard state updated');
    };

    window.addEventListener('openPoRPDashboard', handleDashboardEvent);
    
    return () => {
      window.removeEventListener('openPoRPDashboard', handleDashboardEvent);
    };
  }, []);

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
    console.log('[PoRP Debug] Chapter unlock status:', {
      isLocked,
      isWalletConnected,
      userId,
      chapter,
      id
    });
    
    if (!isLocked) {
      fetchRatings();
      // Initialize PoRP tracking when chapter is unlocked and user is authenticated
      if (isWalletConnected && userId) {
        console.log('[PoRP Debug] All conditions met, initializing PoRP tracking...');
        initializePoRPTracking();
      } else {
        console.log('[PoRP Debug] Chapter unlocked but missing requirements:', {
          walletConnected: isWalletConnected,
          hasUserId: !!userId
        });
      }
    } else {
      // Complete PoRP session when chapter is locked
      console.log('[PoRP Debug] Chapter is locked, completing any active session');
      completePoRPTracking();
    }
  }, [isLocked, initializePoRPTracking, completePoRPTracking, isWalletConnected, userId]);

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

      // Sign and send transaction (now includes confirmation)
      console.log("[processChapterPayment] Signing and sending transaction...");
      const signature = await signAndSendTransaction(transaction);
      console.log("[processChapterPayment] Transaction sent and confirmed, signature:", signature);

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
      
      // Proactively update cached balance after payment
      if (currency === 'SMP') {
        const paymentAmountSmp = paymentAmount / Math.pow(10, SMP_DECIMALS);
        await balanceUpdater.updateAfterChapterPayment(activeWalletAddress, paymentAmountSmp, 'SMP');
      }
      
      // Fetch updated balance after payment
      await fetchUserBalances();
      
      // Calculate and apply Amethyst multiplier bonus for weekly points
      try {
        // Get user data for weekly points update
        const { data: sessionData } = await supabase.auth.getSession();
        const userEmail = sessionData?.session?.user?.email;
        
        if (userEmail) {
          const { data: userData } = await supabase
            .from("users")
            .select("id, weekly_points")
            .eq("email", userEmail)
            .single();
          
          if (userData) {
            // Calculate Amethyst bonus based on current balance
            let readerReward = 100; // Base reward
            const numericBalance = Number(amethystBalance) || 0;
            
            console.log(`[processChapterPayment] Amethyst Balance for bonus: ${numericBalance}`);
            
            if (numericBalance >= 5000000) readerReward = 250;
            else if (numericBalance >= 1000000) readerReward = 200;
            else if (numericBalance >= 500000) readerReward = 170;
            else if (numericBalance >= 250000) readerReward = 150;
            else if (numericBalance >= 100000) readerReward = 120;
            
            console.log(`[processChapterPayment] Final Reader Reward: ${readerReward} (for ${numericBalance} Amethyst)`);
            
            // Update weekly points with Amethyst bonus
            const newReaderBalance = (userData.weekly_points || 0) + readerReward;
            const { error: updateError } = await supabase
              .from("users")
              .update({ weekly_points: newReaderBalance })
              .eq("id", userData.id);
            
            if (updateError) {
              console.error("[processChapterPayment] Error updating weekly points:", updateError);
            } else {
              console.log(`[processChapterPayment] Updated weekly points to: ${newReaderBalance}`);
              setWeeklyPoints(newReaderBalance);
              
              // Show success message with the correct reward
              setSuccessMessage(
                `Payment successful! ${(SMP_READ_COST / 10 ** SMP_DECIMALS).toLocaleString()} SMP sent on-chain. You earned ${readerReward} points.`
              );
              setTimeout(() => setSuccessMessage(""), 5000);
            }
          }
        }
      } catch (err) {
        console.error("[processChapterPayment] Error calculating Amethyst bonus:", err);
      }
      
      // Check if Amethyst balance was updated in the database
      setTimeout(async () => {
        try {
          // Get user data to get user ID
          const { data: sessionData } = await supabase.auth.getSession();
          const userEmail = sessionData?.session?.user?.email;
          
          if (!userEmail) {
            console.log("[AmethystCheck] No user session found");
            return;
          }
          
          // Get user ID from users table
          const { data: userData } = await supabase
            .from("users")
            .select("id")
            .eq("email", userEmail)
            .single();
          
          if (!userData) {
            console.log("[AmethystCheck] User not found in database");
            return;
          }
          
          const { data: amethystData } = await supabase
            .from("amethyst_balances")
            .select("amethyst_balance, last_updated")
            .eq("user_id", userData.id)
            .single();
          
          if (amethystData) {
            console.log("[AmethystCheck] Database Amethyst balance:", amethystData.amethyst_balance, "Last updated:", amethystData.last_updated);
          } else {
            console.log("[AmethystCheck] No Amethyst balance record found for user:", userData.id);
          }
        } catch (err) {
          console.error("[AmethystCheck] Error checking Amethyst balance:", err);
        }
      }, 2000); // Check 2 seconds after payment
      
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
    
    // Cleanup PoRP tracking when component unmounts
    return () => {
      if (readingTracker && porpSessionActive) {
        completePoRPTracking();
      }
    };
  }, [fetchNovel, fetchPrices, readingTracker, porpSessionActive, completePoRPTracking]);

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
            <FaGem className={styles.balanceIcon} />
            <span>Amethyst: {amethystBalance !== null ? amethystBalance.toLocaleString() : "Loading..."}</span>
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
                
                {showBenefactorOption && !benefactorAccess && (
                  <BenefactorPricing onSelectPlan={handleBenefactorUnlock} isProcessing={isProcessing} />
                )}
                
                {benefactorAccess && (
                  <div className={styles.benefactorStatus}>
                    <FaStar className={styles.gemIcon} />
                    <span className={styles.statusText}>
                      Writer Subscription: {benefactorAccess.plan_type?.toUpperCase()} Plan
                    </span>
                    {benefactorAccess.plan_type !== 'gold' && (
                      <span className={styles.statusText}>
                        {benefactorAccess.chapters_remaining}/{benefactorAccess.chapters_unlocked} chapters remaining
                      </span>
                    )}
                    <span className={styles.expiryText}>
                      Expires: {new Date(benefactorAccess.expires_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <>
                {showBenefactorOption && !benefactorAccess && (
                  <BenefactorPricing onSelectPlan={handleBenefactorUnlock} isProcessing={isProcessing} />
                )}
                {benefactorAccess && (
                  <div className={styles.benefactorStatus}>
                    <FaStar className={styles.gemIcon} />
                    <span className={styles.statusText}>
                      Writer Subscription: {benefactorAccess.plan_type?.toUpperCase()} Plan
                    </span>
                    {benefactorAccess.plan_type !== 'gold' && (
                      <span className={styles.statusText}>
                        {benefactorAccess.chapters_remaining}/{benefactorAccess.chapters_unlocked} chapters remaining
                      </span>
                    )}
                    <span className={styles.expiryText}>
                      Expires: {new Date(benefactorAccess.expires_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
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

      {/* PoRP Status Indicator */}
      {showPoRPStatus && (porpSessionActive || sessionReceipt) && (
        <PoRPStatus
          isActive={porpSessionActive}
          receipt={sessionReceipt}
          onDismiss={() => setShowPoRPStatus(false)}
        />
      )}

      {/* PoRP Layer 2 - Comprehension Challenge Modal */}
      {showChallengeModal && challengeData && (
        <ComprehensionChallenge
          challenge={challengeData.challenge}
          onSubmit={handleChallengeSubmit}
          onClose={handleChallengeClose}
        />
      )}

      {/* PoRP Layer 4 - Dashboard Modal */}
      {showPoRPDashboard && (
        <>
          {console.log('[ChapterPage] Rendering PoRPDashboard with showPoRPDashboard:', showPoRPDashboard)}
          <PoRPDashboard
            userAddress={activeWalletAddress}
            isOpen={showPoRPDashboard}
            onClose={() => {
              console.log('[ChapterPage] Closing PoRP dashboard');
              setShowPoRPDashboard(false);
            }}
          />
        </>
      )}
    </div>
  );
}