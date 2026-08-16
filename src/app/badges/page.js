"use client";

import { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../services/supabase/supabaseClient";
import { EmbeddedWalletContext } from "../../components/EmbeddedWalletProvider";
import { FaGem, FaLock, FaShoppingCart } from "react-icons/fa";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import { PublicKey, Connection, Transaction, SystemProgram } from "@solana/web3.js";
import {
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import styles from "./badges.module.css";
import {
  RPC_URL,
  USDC_MINT_ADDRESS,
  SKR_MINT_ADDRESS,
  TREASURY_PUBLIC_KEY,
} from "../../constants";

export default function BadgesPage() {
  const { wallet: embeddedWallet, signAndSendTransaction } = useContext(EmbeddedWalletContext);
  const router = useRouter();
  const [badges, setBadges] = useState([]);
  const [userBadges, setUserBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [walletPublicKey, setWalletPublicKey] = useState("");
  const [embers, setEmbers] = useState([]);
  const [selectedToken, setSelectedToken] = useState("USDC");
  const [tokenPrices, setTokenPrices] = useState({ USDC: 1, SOL: 100, SKR: 1 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [balances, setBalances] = useState({ USDC: 0, SOL: 0, SKR: 0 });

  const tokens = [
    { id: "USDC", name: "USDC", logo: "/images/usdc-logo.png" },
    { id: "SOL", name: "SOL", logo: "/images/sol-logo.png" },
    { id: "SKR", name: "SKR", logo: "/images/skr-logo.png" },
  ];

  const connection = new Connection(RPC_URL, {
    commitment: "confirmed",
    httpHeaders: { "x-api-key": RPC_URL.split("=")[1] },
  });

  const activePublicKey = embeddedWallet?.publicKey ? new PublicKey(embeddedWallet.publicKey) : null;
  const activeWalletAddress = activePublicKey?.toString();
  const isWalletConnected = !!activePublicKey && !!activeWalletAddress;

  // Jupiter Price API configuration
  const SOL_MINT_ADDRESS = new PublicKey('So11111111111111111111111111111111111111112');
  const SKR_MINT_ADDRESS = new PublicKey('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU');
  const USDC_MINT_ADDRESS = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
  const PRICE_ENDPOINT = (ids) => `https://lite-api.jup.ag/price/v3?ids=${ids.join(',')}`;
  const QUOTE_ENDPOINT = (inputMint, amountBaseUnits) =>
    `https://lite-api.jup.ag/swap/v1/quote?inputMint=${inputMint}&outputMint=${USDC_MINT_ADDRESS.toString()}&amount=${amountBaseUnits}&slippageBps=50`;

  // Fetch quote-derived price for low-liquidity tokens
  async function fetchQuoteDerivedPrice(mint, decimals) {
    try {
      const amount = Math.round(10 ** decimals);
      const res = await fetch(QUOTE_ENDPOINT(mint, amount));
      if (!res.ok) return null;
      const data = await res.json();
      if (!data?.outAmount) return null;
      return Number(data.outAmount) / 10 ** 6;
    } catch (err) {
      console.error('[fetchQuoteDerivedPrice] Error:', err.message);
      return null;
    }
  }

  // Fetch real-time token prices from Jupiter
  const fetchPrices = async () => {
    try {
      const ids = [SOL_MINT_ADDRESS.toString(), SKR_MINT_ADDRESS.toString(), USDC_MINT_ADDRESS.toString()];
      const res = await fetch(PRICE_ENDPOINT(ids));
      if (!res.ok) throw new Error(`Price API error: ${res.status}`);
      const json = await res.json();

      let solPrice = json?.[SOL_MINT_ADDRESS.toString()]?.usdPrice || null;
      let skrPrice = json?.[SKR_MINT_ADDRESS.toString()]?.usdPrice || null;

      // Fallback to quote API for low-liquidity tokens
      if (!skrPrice) {
        skrPrice = await fetchQuoteDerivedPrice(SKR_MINT_ADDRESS.toString(), 6);
      }
      if (!solPrice) {
        solPrice = await fetchQuoteDerivedPrice(SOL_MINT_ADDRESS.toString(), 9);
      }

      setTokenPrices({
        USDC: 1,
        SOL: solPrice || 100,
        SKR: skrPrice || 1,
      });
    } catch (err) {
      console.error('[fetchPrices] Error:', err);
      setTokenPrices({ USDC: 1, SOL: 100, SKR: 1 });
    }
  };

  useEffect(() => {
    fetchPrices();
    // Refresh prices every 5 minutes
    const interval = setInterval(fetchPrices, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const convertPrice = (usdPrice) => {
    const tokenPrice = tokenPrices[selectedToken] || 1;
    const convertedAmount = (usdPrice / tokenPrice).toFixed(4);
    return selectedToken === 'USDC' ? `$${usdPrice}` : `${convertedAmount} ${selectedToken}`;
  };

  // Build ember particles
  useEffect(() => {
    const buildEmbers = (count = 18) =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 6}s`,
        duration: `${7 + Math.random() * 6}s`,
        size: 2 + Math.floor(Math.random() * 3),
        opacity: 0.3 + Math.random() * 0.6,
      }));
    setEmbers(buildEmbers(18));
  }, []);

  useEffect(() => {
    if (embeddedWallet) {
      setWalletPublicKey(embeddedWallet.publicKey?.toString() || "");
    }
  }, [embeddedWallet]);

  // Fetch token balances
  const fetchBalances = async () => {
    if (!activePublicKey) return;

    try {
      // Get SOL balance
      let solAmount = 0;
      try {
        const solBalance = await connection.getBalance(activePublicKey);
        solAmount = solBalance / 1e9;
      } catch (solErr) {
        console.error("[fetchBalances] SOL balance error:", solErr);
        solAmount = 0;
      }

      // Get USDC balance
      let usdcAmount = 0;
      try {
        const usdcAta = getAssociatedTokenAddressSync(USDC_MINT_ADDRESS, activePublicKey);
        const usdcAccount = await connection.getAccountInfo(usdcAta);
        if (usdcAccount && usdcAccount.data) {
          const dataView = new DataView(new Uint8Array(usdcAccount.data).buffer);
          usdcAmount = Number(dataView.getBigUint64(64, true)) / 1e6;
        }
      } catch (usdcErr) {
        console.error("[fetchBalances] USDC balance error:", usdcErr);
        usdcAmount = 0;
      }

      // Get SKR balance
      let skrAmount = 0;
      try {
        const skrAta = getAssociatedTokenAddressSync(SKR_MINT_ADDRESS, activePublicKey);
        const skrAccount = await connection.getAccountInfo(skrAta);
        if (skrAccount && skrAccount.data) {
          const dataView = new DataView(new Uint8Array(skrAccount.data).buffer);
          skrAmount = Number(dataView.getBigUint64(64, true)) / 1e6;
        }
      } catch (skrErr) {
        console.error("[fetchBalances] SKR balance error:", skrErr);
        skrAmount = 0;
      }

      setBalances({
        SOL: solAmount,
        USDC: usdcAmount,
        SKR: skrAmount,
      });
    } catch (err) {
      console.error("[fetchBalances] Error:", err);
      setBalances({ SOL: 0, USDC: 0, SKR: 0 });
    }
  };

  useEffect(() => {
    if (isWalletConnected) {
      fetchBalances();
      // Refresh balances every 30 seconds
      const interval = setInterval(fetchBalances, 30000);
      return () => clearInterval(interval);
    }
  }, [isWalletConnected]);

  useEffect(() => {
    fetchBadges();
    fetchUserBadges();
  }, [walletPublicKey]);

  const fetchBadges = async () => {
    try {
      const { data, error } = await supabase
        .from("badges")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBadges(data || []);
    } catch (err) {
      // If badges table doesn't exist, just set empty array
      console.log("Badges table not available yet:", err.message);
      setBadges([]);
    }
  };

  const fetchUserBadges = async () => {
    if (!walletPublicKey) return;

    try {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("wallet_address", walletPublicKey)
        .single();

      if (userError && userError.code !== "PGRST116") throw userError;

      if (userData) {
        const { data, error } = await supabase
          .from("user_badges")
          .select("*")
          .eq("user_id", userData.id);

        if (error) throw error;
        setUserBadges(data || []);
      }
    } catch (err) {
      // If user_badges table doesn't exist, just set empty array
      console.log("User badges table not available yet:", err.message);
      setUserBadges([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (badgeId) => {
    console.log("[handlePurchase] Wallet check:", {
      isWalletConnected,
      activePublicKey: activePublicKey?.toString(),
      hasSignAndSend: !!signAndSendTransaction,
      embeddedWallet: !!embeddedWallet,
    });

    if (!embeddedWallet || !activePublicKey || !signAndSendTransaction) {
      setError("Please connect your wallet to purchase badges.");
      return;
    }

    try {
      setIsProcessing(true);
      setError("");

      // Get badge details
      const { data: badge, error: badgeError } = await supabase
        .from("badges")
        .select("*")
        .eq("id", badgeId)
        .single();

      if (badgeError || !badge) throw new Error("Could not fetch badge details");

      // Check if already owned
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("wallet_address", activeWalletAddress)
        .single();

      if (userError || !userData) throw new Error("Could not fetch user data");

      const { data: existingBadge, error: existingError } = await supabase
        .from("user_badges")
        .select("*")
        .eq("user_id", userData.id)
        .eq("badge_id", badgeId)
        .maybeSingle();

      if (existingBadge) {
        setError("You already own this badge.");
        setIsProcessing(false);
        return;
      }

      // Calculate payment amount
      const usdAmount = badge.price;
      let paymentAmount = 0;
      let paymentMint = null;

      if (selectedToken === "USDC") {
        paymentMint = USDC_MINT_ADDRESS;
        paymentAmount = Math.floor(usdAmount * 1e6);
      } else if (selectedToken === "SOL") {
        const solPrice = tokenPrices.SOL || 100;
        paymentAmount = Math.floor(usdAmount * solPrice * 1e9);
      } else if (selectedToken === "SKR") {
        paymentMint = SKR_MINT_ADDRESS;
        const skrPrice = tokenPrices.SKR || 1;
        paymentAmount = Math.floor((usdAmount / skrPrice) * 1e6);
      } else {
        throw new Error(`Invalid currency: ${selectedToken}`);
      }

      const treasuryPublicKey = new PublicKey(TREASURY_PUBLIC_KEY);

      // Build transaction
      const transaction = new Transaction();

      if (!paymentMint) {
        // SOL transfer
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: activePublicKey,
            toPubkey: treasuryPublicKey,
            lamports: paymentAmount,
          })
        );
      } else {
        // Token transfer
        const userAta = getAssociatedTokenAddressSync(paymentMint, activePublicKey);
        const treasuryAta = getAssociatedTokenAddressSync(paymentMint, treasuryPublicKey, true);

        // Check if treasury ATA exists
        const treasuryAtaInfo = await connection.getAccountInfo(treasuryAta);
        if (!treasuryAtaInfo) {
          transaction.add(
            createAssociatedTokenAccountInstruction(
              activePublicKey,
              treasuryAta,
              treasuryPublicKey,
              paymentMint
            )
          );
        }

        transaction.add(
          createTransferInstruction(
            userAta,
            treasuryAta,
            activePublicKey,
            paymentAmount
          )
        );
      }

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = activePublicKey;

      const signature = await signAndSendTransaction(transaction);
      console.log("[handlePurchase] Transaction sent, signature:", signature);

      // Wait for transaction confirmation
      console.log("[handlePurchase] Waiting for transaction confirmation...");
      const confirmation = await connection.confirmTransaction(
        signature,
        "confirmed"
      );

      if (confirmation.value.err) {
        console.error("[handlePurchase] Transaction failed on-chain:", confirmation.value.err);
        const errorDetails = JSON.stringify(confirmation.value.err);
        console.error("[handlePurchase] Error details:", errorDetails);
        throw new Error(`Transaction failed: ${errorDetails}. Please check your token balance and try again.`);
      }

      console.log("[handlePurchase] Transaction confirmed successfully");

      // Record badge purchase
      const { error: insertError } = await supabase
        .from("user_badges")
        .insert({
          user_id: userData.id,
          badge_id: badgeId,
          acquired_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error("[handlePurchase] Database insertion error:", insertError);
        throw new Error(`Failed to record badge purchase: ${insertError.message}`);
      }

      // Refresh user badges
      fetchUserBadges();
      setError("");
      setIsProcessing(false);
    } catch (err) {
      console.error("[handlePurchase] Error:", err);
      setError(err.message || "Failed to purchase badge.");
      setIsProcessing(false);
      setTimeout(() => setError(null), 5000);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        {/* Ember Particles */}
        <div className={styles.emberContainer}>
          {embers.map((ember) => (
            <div
              key={ember.id}
              className={styles.ember}
              style={{
                left: ember.left,
                animationDelay: ember.delay,
                animationDuration: ember.duration,
                width: ember.size,
                height: ember.size,
                opacity: ember.opacity,
              }}
            />
          ))}
        </div>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          Loading badges...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Navbar />

      {/* Ember Particles */}
      <div className={styles.emberContainer}>
        {embers.map((ember) => (
          <div
            key={ember.id}
            className={styles.ember}
            style={{
              left: ember.left,
              animationDelay: ember.delay,
              animationDuration: ember.duration,
              width: ember.size,
              height: ember.size,
              opacity: ember.opacity,
            }}
          />
        ))}
      </div>

      <div className={styles.header}>
        <h1 className={styles.title}>Badges</h1>
      </div>

      {/* Token Selection */}
      <div className={styles.tokenSelector}>
        <h3 className={styles.tokenSelectorTitle}>Select Payment Token</h3>
        <div className={styles.tokenOptions}>
          {tokens.map((token) => (
            <div
              key={token.id}
              className={`${styles.tokenOption} ${selectedToken === token.id ? styles.selected : ""}`}
              onClick={() => setSelectedToken(token.id)}
            >
              <img src={token.logo} alt={token.name} className={styles.tokenLogo} />
              <div className={styles.tokenInfo}>
                <span className={styles.tokenName}>{token.name}</span>
                <span className={styles.tokenBalance}>
                  {isWalletConnected ? `${balances[token.id].toFixed(4)}` : '0.0000'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Your Badges</h2>
        {userBadges.length === 0 ? (
          <p className={styles.emptyMessage}>You don't have any badges yet.</p>
        ) : (
          <div className={styles.badgeGrid}>
            {userBadges.map((userBadge) => (
              <div key={userBadge.id} className={styles.badgeCard}>
                <div className={styles.badgeCardCornerTL}></div>
                <div className={styles.badgeCardCornerTR}></div>
                <div className={styles.badgeCardCornerBL}></div>
                <div className={styles.badgeCardCornerBR}></div>
                {userBadge.badges?.image_url ? (
                  <img 
                    src={userBadge.badges.image_url} 
                    alt={userBadge.badges.name} 
                    className={styles.badgeImage}
                  />
                ) : (
                  <div className={styles.badgeIcon}>
                    <FaGem />
                  </div>
                )}
                <h3 className={styles.badgeName}>{userBadge.badges?.name || "Unknown Badge"}</h3>
                <p className={styles.badgeDescription}>{userBadge.badges?.description || ""}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Available Badges</h2>
        {badges.length === 0 ? (
          <p className={styles.emptyMessage}>No badges available for purchase.</p>
        ) : (
          <div className={styles.badgeGrid}>
            {badges.map((badge) => (
              <div key={badge.id} className={styles.badgeCard}>
                <div className={styles.badgeCardCornerTL}></div>
                <div className={styles.badgeCardCornerTR}></div>
                <div className={styles.badgeCardCornerBL}></div>
                <div className={styles.badgeCardCornerBR}></div>
                {badge.image_url ? (
                  <img 
                    src={badge.image_url} 
                    alt={badge.name} 
                    className={styles.badgeImage}
                  />
                ) : (
                  <div className={styles.badgeIcon}>
                    <FaGem />
                  </div>
                )}
                <h3 className={styles.badgeName}>{badge.name}</h3>
                <p className={styles.badgeDescription}>{badge.description}</p>
                <div className={styles.badgePrice}>
                  {convertPrice(badge.price)}
                </div>
                <button
                  className={styles.purchaseButton}
                  onClick={() => handlePurchase(badge.id)}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <span>Processing...</span>
                  ) : (
                    <>
                      <FaShoppingCart /> Purchase with {selectedToken}
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
