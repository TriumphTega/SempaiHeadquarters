"use client";

import { useState, useEffect, useContext, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, VersionedTransaction, Keypair } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, unpackAccount } from "@solana/spl-token";
import Link from "next/link";
import { AMETHYST_MINT_ADDRESS, SMP_MINT_ADDRESS, USDC_MINT_ADDRESS, SKR_MINT_ADDRESS, RPC_URL } from "@/constants";
import { FaGem, FaExchangeAlt, FaWallet, FaSyncAlt, FaPaperPlane, FaQrcode, FaChevronDown, FaExclamationCircle, FaCheckCircle, FaWifi, FaCheck, FaExclamationTriangle, FaCreditCard, FaTimes } from "react-icons/fa";
import TreasuryBalance from "../../components/TreasuryBalance";
import Navbar from "../../components/Navbar";
import styles from "../../styles/SwapPage.module.css";
import { EmbeddedWalletContext } from "../../components/EmbeddedWalletProvider";
import BalanceModal from "../../components/BalanceModal";
import SendModal from "../../components/SendModal";
import ReceiveModal from "../../components/ReceiveModal";

const connection = new Connection(RPC_URL, "confirmed");

// Jupiter Price API configuration
const SOL_MINT_ADDRESS = 'So11111111111111111111111111111111111112';
const PRICE_ENDPOINT = (ids) => `https://lite-api.jup.ag/price/v3?ids=${ids.join(',')}`;
const QUOTE_ENDPOINT = (inputMint, amountBaseUnits) =>
  `https://lite-api.jup.ag/swap/v1/quote?inputMint=${inputMint}&outputMint=${USDC_MINT_ADDRESS.toString()}&amount=${amountBaseUnits}&slippageBps=50`;

// Fetch price from Jupiter Quote API (fallback when v3 drops token)
async function fetchQuoteDerivedPrice(mint, decimals) {
  try {
    const amount = Math.round(10 ** decimals); // 1 whole token, in base units
    const res = await fetch(QUOTE_ENDPOINT(mint, amount));
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.outAmount) return null;
    return Number(data.outAmount) / 10 ** 6; // USDC has 6 decimals
  } catch (err) {
    console.error('[fetchQuoteDerivedPrice] Error:', err.message);
    return null;
  }
}

async function fetchSmpFallbackPrice() {
  try {
    const res = await fetch('/api/smp-fallback-price');
    if (!res.ok) {
      console.warn('[fetchSmpFallbackPrice] Web API unavailable');
      return null;
    }
    const data = await res.json();
    if (data?.fallbackPrice) return 1 / data.fallbackPrice;
    return null;
  } catch (err) {
    console.error('[fetchSmpFallbackPrice] Error:', err.message);
    return null;
  }
}

// Formatting helpers
const formatUsd = (value, opts = {}) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '--';
  const { compact = false } = opts;
  if (compact && value >= 1000) {
    return `$${Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value)}`;
  }
  const digits = value !== 0 && value < 1 ? 4 : 2;
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
};

const formatToken = (value, decimals = 4) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '0';
  return value.toLocaleString('en-US', { maximumFractionDigits: decimals });
};

// Price hook
function useTokenPrices() {
  const [prices, setPrices] = useState({});
  const [pricesLoading, setPricesLoading] = useState(true);
  const [pricesError, setPricesError] = useState(null);

  const fetchPrices = useCallback(async () => {
    try {
      setPricesError(null);
      const ids = Object.values(TOKEN_MINTS).map((mint) => mint.toString());
      const res = await fetch(PRICE_ENDPOINT(ids));
      if (!res.ok) throw new Error(`Price API error: ${res.status}`);
      const json = await res.json();

      const usdcUsdPrice = json?.[USDC_MINT_ADDRESS.toString()]?.usdPrice;
      if (!usdcUsdPrice) throw new Error('USDC price missing from response');

      const next = {};
      for (const [key, mint] of Object.entries(TOKEN_MINTS)) {
        const entry = json?.[mint.toString()];
        next[key] = entry?.usdPrice ? entry.usdPrice / usdcUsdPrice : null;
      }

      const missing = Object.entries(next).filter(([key, price]) => key !== 'USDC' && !price);
      if (missing.length) {
        const fallbacks = await Promise.all(
          missing.map(([key]) => fetchQuoteDerivedPrice(TOKEN_MINTS[key].toString(), TOKEN_DECIMALS[key]))
        );
        missing.forEach(([key], i) => {
          if (fallbacks[i]) next[key] = fallbacks[i];
        });

        if (!next.SMP) {
          const webFallback = await fetchSmpFallbackPrice();
          if (webFallback) {
            next.SMP = webFallback;
            console.log('[useTokenPrices] Using web API fallback for SMP price');
          }
        }
      }

      setPrices(next);
    } catch (err) {
      console.error('Error fetching prices:', err);
      setPricesError('Live prices unavailable');
    } finally {
      setPricesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  return { prices, pricesLoading, pricesError, refreshPrices: fetchPrices };
}

// Define allowed tokens
const TOKEN_MINTS = {
  SOL: new PublicKey("So11111111111111111111111111111111111111112"),
  JUP: new PublicKey("JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN"),
  USDC: USDC_MINT_ADDRESS,
  AMETHYST: AMETHYST_MINT_ADDRESS,
  SMP: SMP_MINT_ADDRESS,
  SKR: SKR_MINT_ADDRESS,
};

// Token logos and names
const TOKEN_LOGOS = {
  SOL: "/images/sol-logo.png",
  JUP: "/images/jup-logo.png",
  USDC: "/images/usdc-logo.png",
  AMETHYST: "/images/amethyst-logo.jpeg",
  SMP: "/images/smp-logo.jpeg",
  SKR: "/images/skr-logo.png",
};

const TOKEN_NAMES = {
  SOL: "Solana",
  JUP: "Jupiter",
  USDC: "USD Coin",
  AMETHYST: "Amethyst",
  SMP: "SMP",
  SKR: "SKR",
};

const TOKEN_DECIMALS = {
  SOL: 9,
  JUP: 6,
  USDC: 6,
  AMETHYST: 6,
  SMP: 6,
  SKR: 6,
};

export default function SwapPage() {
  const { connected, publicKey, sendTransaction, signTransaction } = useWallet();
  const { wallet: embeddedWallet, getSecretKey } = useContext(EmbeddedWalletContext);

  const activeWalletAddress = publicKey?.toString() || embeddedWallet?.publicKey;
  const isWalletConnected = connected || !!embeddedWallet;

  const { prices, pricesLoading, pricesError, refreshPrices } = useTokenPrices();

  const [amount, setAmount] = useState("");
  const [coinFrom, setCoinFrom] = useState("AMETHYST");
  const [coinTo, setCoinTo] = useState("SMP");
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showFromModal, setShowFromModal] = useState(false);
  const [showToModal, setShowToModal] = useState(false);
  const [showRampSuggestion, setShowRampSuggestion] = useState(false);
  const [allBalances, setAllBalances] = useState({});
  const [receiveAddress, setReceiveAddress] = useState('');

  const router = useRouter();
  const spinAnim = useRef(0);
  const [isSpinning, setIsSpinning] = useState(false);

  const checkAllBalances = useCallback(async () => {
    if (!activeWalletAddress) {
      setAllBalances({});
      return;
    }
    try {
      const balances = {};
      for (const [tokenKey, mintAddress] of Object.entries(TOKEN_MINTS)) {
        let bal = 0;
        if (tokenKey === 'SOL') {
          const solBalance = await connection.getBalance(new PublicKey(activeWalletAddress));
          bal = solBalance / 1_000_000_000;
        } else {
          const ataAddress = getAssociatedTokenAddressSync(mintAddress, new PublicKey(activeWalletAddress));
          const ataInfo = await connection.getAccountInfo(ataAddress);
          if (ataInfo) {
            const ata = unpackAccount(ataInfo, ataInfo);
            bal = Number(ata.amount) / 10 ** TOKEN_DECIMALS[tokenKey];
          }
        }
        balances[tokenKey] = bal;
      }
      setAllBalances(balances);
    } catch (err) {
      console.error('Error fetching all balances:', err);
      setAllBalances({});
    }
  }, [activeWalletAddress]);

  const checkBalance = async () => {
    if (!activeWalletAddress) return;
    try {
      const mintAddress = TOKEN_MINTS[coinFrom];
      let balance = 0;

      if (coinFrom === "SOL") {
        const solBalance = await connection.getBalance(new PublicKey(activeWalletAddress));
        balance = solBalance / 1_000_000_000;
      } else {
        const ataAddress = getAssociatedTokenAddressSync(mintAddress, new PublicKey(activeWalletAddress));
        const ataInfo = await connection.getAccountInfo(ataAddress);
        if (ataInfo) {
          const ata = unpackAccount(ataAddress, ataInfo);
          balance = Number(ata.amount) / 1_000_000;
        }
      }
      setBalance(balance);
    } catch (error) {
      console.error("Error fetching balance:", error);
      setBalance(0);
    }
  };

  useEffect(() => {
    if (isWalletConnected) checkBalance();
  }, [isWalletConnected, activeWalletAddress, coinFrom]);

  // Derived pricing values
  const priceFrom = prices[coinFrom];
  const priceTo = prices[coinTo];

  const inputUsdValue = useMemo(() => {
    const amt = parseFloat(amount);
    if (!amt || !priceFrom) return null;
    return amt * priceFrom;
  }, [amount, priceFrom]);

  const estimatedOutput = useMemo(() => {
    const amt = parseFloat(amount);
    if (!amt || !priceFrom || !priceTo) return null;
    return (amt * priceFrom) / priceTo;
  }, [amount, priceFrom, priceTo]);

  const exchangeRateLabel = useMemo(() => {
    if (!priceFrom || !priceTo) return null;
    return `1 ${coinFrom} ≈ ${formatToken(priceFrom / priceTo, 6)} ${coinTo}`;
  }, [priceFrom, priceTo, coinFrom, coinTo]);

  const portfolioUsdTotal = useMemo(() => {
    return Object.entries(allBalances).reduce((sum, [token, bal]) => {
      const p = prices[token];
      if (!p || !bal) return sum;
      return sum + bal * p;
    }, 0);
  }, [allBalances, prices]);

  const handleSwapDirection = () => {
    setCoinFrom(coinTo);
    setCoinTo(coinFrom);
    setAmount('');
  };

  const handleRefresh = () => {
    setIsSpinning(true);
    setTimeout(() => setIsSpinning(false), 500);
    refreshPrices();
    if (isWalletConnected) {
      checkBalance();
      checkAllBalances();
    }
  };

  const handleReceive = () => {
    setReceiveAddress(activeWalletAddress);
    setShowReceiveModal(true);
  };

  useEffect(() => {
    const handleOpenSendModal = () => setShowSendModal(true);
    window.addEventListener('openSendModal', handleOpenSendModal);
    return () => window.removeEventListener('openSendModal', handleOpenSendModal);
  }, []);

  const handleSwap = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (!isWalletConnected) {
      setError('Please connect your wallet to swap.');
      return;
    }
    if (coinFrom === coinTo) {
      setError('Please select different tokens to swap.');
      return;
    }
    if (parseFloat(amount) > balance) {
      setShowRampSuggestion(true);
      return;
    }

    // Open Jupiter in new tab (jup.ag doesn't allow iframe embedding)
    const inputMint = TOKEN_MINTS[coinFrom].toString();
    const outputMint = TOKEN_MINTS[coinTo].toString();
    const jupUrl = `https://jup.ag/swap/${inputMint}-${outputMint}?in=${amount}`;
    window.open(jupUrl, '_blank');
    setSuccessMessage('Opening Jupiter swap in new tab...');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  return (
    <div className={styles.page}>
      <Navbar />

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.screenHeader}>
          <h1 className={styles.headerTitle}>Swap</h1>
          <button onClick={handleRefresh} className={styles.headerIconButton} title="Refresh">
            <FaSyncAlt className={isSpinning ? styles.spinning : ''} />
          </button>
        </div>
      </header>

      {/* Messages */}
      {error && (
        <div className={styles.messageBanner}>
          <FaExclamationCircle />
          <span>{error}</span>
          <button onClick={() => setError(null)}><FaTimes /></button>
        </div>
      )}
      {successMessage && (
        <div className={`${styles.messageBanner} ${styles.successBanner}`}>
          <FaCheckCircle />
          <span>{successMessage}</span>
        </div>
      )}
      {pricesError && (
        <div className={`${styles.messageBanner} ${styles.warnBanner}`}>
          <FaWifi />
          <span>{pricesError || 'Live prices unavailable'} — showing last known values</span>
        </div>
      )}

      {/* Swap Form */}
      <main className={styles.main}>
        <div className={styles.swapCard}>
          {!isWalletConnected ? (
            <div className={styles.connectPrompt}>
              <FaWallet className={styles.walletIcon} />
              <p>Please connect your wallet to initiate a swap.</p>
              <ConnectButton className={styles.connectButtonPrompt} />
            </div>
          ) : (
            <div className={styles.swapForm}>
              {/* From */}
              <div className={styles.tokenPanel}>
                <div className={styles.tokenPanelTopRow}>
                  <span className={styles.label}>You pay</span>
                  <button onClick={checkBalance} className={styles.balancePill}>
                    <FaWallet />
                    <span className={styles.balancePillText}>{formatToken(balance)} {coinFrom}</span>
                  </button>
                </div>

                <div className={styles.tokenPanelRow}>
                  <input
                    className={styles.amountInput}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder="0.00"
                  />
                  <div className={styles.tokenPicker} onClick={() => setShowFromModal(true)}>
                    <img src={TOKEN_LOGOS[coinFrom]} alt={coinFrom} className={styles.tokenLogoSm} />
                    <span className={styles.tokenPickerText}>{coinFrom}</span>
                    <FaChevronDown />
                  </div>
                </div>

                <div className={styles.tokenPanelBottomRow}>
                  <span className={styles.usdValueText}>{inputUsdValue !== null ? formatUsd(inputUsdValue) : '$0.00'}</span>
                  <button onClick={() => setAmount(String(balance))} className={styles.maxText}>MAX</button>
                </div>
              </div>

              {/* Swap direction button */}
              <div className={styles.swapDirectionWrap}>
                <div className={styles.swapDirectionLine} />
                <button className={styles.swapDirectionButton} onClick={handleSwapDirection}>
                  <FaExchangeAlt style={{ transform: 'rotate(90deg)' }} />
                </button>
              </div>

              {/* To */}
              <div className={styles.tokenPanel}>
                <div className={styles.tokenPanelTopRow}>
                  <span className={styles.label}>You receive (est.)</span>
                  <span className={styles.priceTag}>
                    {pricesLoading ? 'Loading...' : priceTo ? formatUsd(priceTo) : '--'}
                  </span>
                </div>

                <div className={styles.tokenPanelRow}>
                  <span className={`${styles.amountInput} ${styles.amountOutput}`}>
                    {estimatedOutput !== null ? formatToken(estimatedOutput, 6) : '0.00'}
                  </span>
                  <div className={styles.tokenPicker} onClick={() => setShowToModal(true)}>
                    <img src={TOKEN_LOGOS[coinTo]} alt={coinTo} className={styles.tokenLogoSm} />
                    <span className={styles.tokenPickerText}>{coinTo}</span>
                    <FaChevronDown />
                  </div>
                </div>

                {exchangeRateLabel && (
                  <div className={styles.tokenPanelBottomRow}>
                    <span className={styles.rateText}>{exchangeRateLabel}</span>
                  </div>
                )}
              </div>

              {/* Swap button */}
              <button
                className={`${styles.swapButton} ${loading ? styles.disabledButton : ''}`}
                onClick={handleSwap}
                disabled={loading}
              >
                {loading ? (
                  <span className={styles.loadingSpinner}></span>
                ) : (
                  <>
                    <FaExchangeAlt />
                    <span>
                      {!amount ? 'Enter an amount' : coinFrom === coinTo ? 'Select different tokens' : 'Swap'}
                    </span>
                  </>
                )}
              </button>

              {/* Portfolio quick actions */}
              <div className={styles.portfolioSection}>
                <div className={styles.portfolioHeaderRow}>
                  <span className={styles.portfolioTitle}>Portfolio</span>
                  <span className={styles.portfolioTotal}>
                    {pricesLoading ? 'Loading…' : formatUsd(portfolioUsdTotal, { compact: true })}
                  </span>
                </div>
                <div className={styles.actionButtons}>
                  <div className={styles.portfolioButton}>
                    <button onClick={() => { checkAllBalances(); setShowBalanceModal(true); }} className={styles.portfolioButtonInner}>
                      <FaWallet />
                      <span>Balances</span>
                    </button>
                  </div>
                  <div className={styles.portfolioButton}>
                    <button onClick={() => setShowSendModal(true)} className={styles.portfolioButtonInner}>
                      <FaPaperPlane />
                      <span>Send</span>
                    </button>
                  </div>
                  <div className={styles.portfolioButton}>
                    <button onClick={handleReceive} className={styles.portfolioButtonInner}>
                      <FaQrcode />
                      <span>Receive</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Token Selection Modal */}
          {(showFromModal || showToModal) && (
            <div className={styles.modalOverlay} onClick={() => { setShowFromModal(false); setShowToModal(false); }}>
              <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={() => { setShowFromModal(false); setShowToModal(false); }}>
                  <FaTimes />
                </button>
                <h3 className={styles.modalTitle}>
                  {showFromModal ? 'Select token to pay with' : 'Select token to receive'}
                </h3>
                <div className={styles.modalTokenList}>
                  {Object.keys(TOKEN_MINTS).map((token) => {
                    const isSelected = showFromModal ? token === coinFrom : token === coinTo;
                    const isDisabled = showFromModal ? token === coinTo : token === coinFrom;
                    return (
                      <div
                        key={token}
                        className={`${styles.modalTokenItem} ${isSelected ? styles.tokenItemSelected : ''}`}
                        onClick={() => {
                          if (showFromModal) setCoinFrom(token);
                          else setCoinTo(token);
                          setShowFromModal(false);
                          setShowToModal(false);
                        }}
                        style={isDisabled ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                      >
                        <img src={TOKEN_LOGOS[token]} alt={token} className={styles.tokenLogo} />
                        <div className={styles.tokenInfo}>
                          <span className={styles.tokenName}>{TOKEN_NAMES[token]}</span>
                          <span className={styles.tokenSymbolMuted}>{token}</span>
                        </div>
                        <span className={styles.priceTag}>
                          {pricesLoading ? '...' : prices[token] ? formatUsd(prices[token]) : '--'}
                        </span>
                        {isSelected && <FaCheck className={styles.checkIcon} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <p className={styles.footerText}>© 2025 Sempai HQ. All rights reserved.</p>
      </footer>

      {/* Modals */}
      <BalanceModal isOpen={showBalanceModal} onClose={() => setShowBalanceModal(false)} activeWalletAddress={activeWalletAddress} />
      <SendModal isOpen={showSendModal} onClose={() => setShowSendModal(false)} activeWalletAddress={activeWalletAddress} />
      <ReceiveModal isOpen={showReceiveModal} onClose={() => setShowReceiveModal(false)} address={receiveAddress} />

      {/* Ramp Suggestion Modal */}
      {showRampSuggestion && (
        <div className={styles.modalOverlay} onClick={() => setShowRampSuggestion(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeButton} onClick={() => setShowRampSuggestion(false)}>
              <FaTimes />
            </button>
            <FaExclamationTriangle className={styles.warningIcon} />
            <h3 className={styles.modalTitle}>Insufficient Balance</h3>
            <p className={styles.modalMessage}>
              You don't have enough {coinFrom} to complete this swap. Would you like to buy more crypto using Ramp?
            </p>
            <button
              className={styles.submitButton}
              onClick={() => { setShowRampSuggestion(false); window.open('https://ramp.network', '_blank'); }}
            >
              <FaCreditCard />
              <span>Buy Crypto with Ramp</span>
            </button>
            <button className={styles.cancelButton} onClick={() => setShowRampSuggestion(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}