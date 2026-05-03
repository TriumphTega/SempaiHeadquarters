"use client";

import { useState, useEffect, useContext, useCallback, useMemo } from "react";
import { Connection, PublicKey, VersionedTransaction, Keypair, Transaction, SystemProgram, sendAndConfirmTransaction } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAssociatedTokenAddressSync, createTransferInstruction, getAccount, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import { AMETHYST_MINT_ADDRESS, SMP_MINT_ADDRESS, USDC_MINT_ADDRESS, RPC_URL } from "@/constants";
import { FaTimes, FaGem, FaCoins, FaDollarSign, FaPaperPlane, FaShieldAlt, FaChartLine } from "react-icons/fa";
import { EmbeddedWalletContext } from "./EmbeddedWalletProvider";
import { useWallet } from "@solana/wallet-adapter-react";
import WithdrawalReputationService from "@/services/porp/WithdrawalReputationService";
import optimizedBalanceCache from "@/services/balance/OptimizedBalanceCache";

const connection = new Connection(RPC_URL);

// Initialize balance cache with connection
optimizedBalanceCache.setConnection(connection);

const TOKEN_MINTS = {
  SOL: { mint: new PublicKey("So11111111111111111111111111111111111111112"), decimals: 9, symbol: "SOL", icon: <FaCoins /> },
  JUP: { mint: new PublicKey("JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN"), decimals: 6, symbol: "JUP", icon: <FaGem /> },
  AMETHYST: { mint: AMETHYST_MINT_ADDRESS, decimals: 6, symbol: "AMETHYST", icon: <FaGem /> },
  SMP: { mint: SMP_MINT_ADDRESS, decimals: 6, symbol: "SMP", icon: <FaGem /> },
  USDC: { mint: USDC_MINT_ADDRESS, decimals: 6, symbol: "USDC", icon: <FaDollarSign /> },
};

// Debounce function to prevent rapid calls
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default function SendModalOptimized({ isOpen, onClose, activeWalletAddress }) {
  const { connected, publicKey, sendTransaction, signTransaction } = useWallet();
  const { wallet: embeddedWallet, getSecretKey } = useContext(EmbeddedWalletContext);
  const [selectedToken, setSelectedToken] = useState("SOL");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showATAConfirmation, setShowATAConfirmation] = useState(false);
  const [ataCreationCost, setAtaCreationCost] = useState(0);
  const [pendingTransaction, setPendingTransaction] = useState(null);
  
  // PoRP Layer 3 - Withdrawal Reputation State
  const [withdrawalService] = useState(() => new WithdrawalReputationService());
  const [reputationInfo, setReputationInfo] = useState(null);
  const [withdrawalCheck, setWithdrawalCheck] = useState(null);
  const [showReputationWarning, setShowReputationWarning] = useState(false);
  const [amountUSD, setAmountUSD] = useState(0);

  // Optimized balance fetching with caching and debouncing
  const fetchBalanceOptimized = useCallback(async () => {
    if (!activeWalletAddress) {
      console.log('[SendModalOptimized] No active wallet address');
      return;
    }

    try {
      console.log(`[SendModalOptimized] Fetching optimized balance for ${selectedToken}`);
      const token = TOKEN_MINTS[selectedToken];
      const userPublicKey = new PublicKey(activeWalletAddress);
      
      const balance = await optimizedBalanceCache.getBalance(
        userPublicKey,
        selectedToken,
        token.mint
      );
      
      console.log(`[SendModalOptimized] Balance fetched: ${balance} ${selectedToken}`);
      setBalance(balance);
      setError("");
    } catch (error) {
      console.error('[SendModalOptimized] Error fetching balance:', error);
      setBalance(0);
      setError(`Failed to fetch ${selectedToken} balance: ${error.message}`);
    }
  }, [activeWalletAddress, selectedToken]);

  // Debounced version to prevent rapid calls
  const debouncedFetchBalance = useMemo(
    () => debounce(fetchBalanceOptimized, 1000),
    [fetchBalanceOptimized]
  );

  // Preload balances for all tokens when modal opens
  const preloadAllBalances = useCallback(async () => {
    if (!activeWalletAddress) return;

    try {
      console.log('[SendModalOptimized] Preloading all token balances...');
      const userPublicKey = new PublicKey(activeWalletAddress);
      
      const requests = Object.entries(TOKEN_MINTS).map(([symbol, token]) => ({
        address: userPublicKey,
        tokenSymbol: symbol,
        mintAddress: token.mint
      }));
      
      const results = await optimizedBalanceCache.getMultipleBalances(requests);
      
      // Update current token balance immediately
      const currentBalance = results.get(`${activeWalletAddress}-${selectedToken}`);
      if (currentBalance !== undefined) {
        setBalance(currentBalance);
      }
      
      console.log('[SendModalOptimized] All balances preloaded');
    } catch (error) {
      console.error('[SendModalOptimized] Error preloading balances:', error);
    }
  }, [activeWalletAddress, selectedToken]);

  useEffect(() => {
    if (isOpen && activeWalletAddress) {
      // Preload all balances when modal opens
      preloadAllBalances();
      fetchReputationInfo();
    }
  }, [isOpen, activeWalletAddress]);

  // Update USD value when amount or token changes (no RPC calls)
  useEffect(() => {
    if (amount && selectedToken) {
      updateUSDValue();
    } else {
      setAmountUSD(0);
    }
  }, [amount, selectedToken]);

  // Check withdrawal eligibility when amount changes
  useEffect(() => {
    if (amountUSD > 0 && reputationInfo) {
      checkWithdrawalEligibility();
    }
  }, [amountUSD, reputationInfo]);

  // PoRP Layer 3 - Withdrawal Reputation Functions
  const fetchReputationInfo = async () => {
    try {
      console.log('[SendModalOptimized] Fetching reputation info for:', activeWalletAddress);
      const info = await withdrawalService.getUserReputationTier(activeWalletAddress);
      setReputationInfo(info);
      console.log('[SendModalOptimized] Reputation info loaded:', info);
    } catch (error) {
      console.error('[SendModalOptimized] Error fetching reputation info:', error);
    }
  };

  const updateUSDValue = async () => {
    try {
      const amountFloat = parseFloat(amount);
      if (isNaN(amountFloat) || amountFloat <= 0) {
        setAmountUSD(0);
        return;
      }
      
      const usdValue = await withdrawalService.convertTokenToUSD(selectedToken, amountFloat);
      setAmountUSD(usdValue);
    } catch (error) {
      console.error('[SendModalOptimized] Error converting to USD:', error);
      setAmountUSD(0);
    }
  };

  const checkWithdrawalEligibility = async () => {
    try {
      console.log('[SendModalOptimized] Checking withdrawal eligibility:', { amountUSD, token: selectedToken });
      const check = await withdrawalService.checkWithdrawalEligibility(
        activeWalletAddress, 
        amountUSD, 
        selectedToken
      );
      setWithdrawalCheck(check);
      
      if (!check.canWithdraw) {
        setShowReputationWarning(true);
      } else {
        setShowReputationWarning(false);
      }
      
      console.log('[SendModalOptimized] Withdrawal eligibility check:', check);
    } catch (error) {
      console.error('[SendModalOptimized] Error checking withdrawal eligibility:', error);
    }
  };

  // Optimized ATA existence check with caching
  const checkAtaExists = async (mint, owner) => {
    console.log("[SendModalOptimized] Checking ATA existence for mint:", mint.toString(), "owner:", owner.toString());
    try {
      const ata = getAssociatedTokenAddressSync(mint, owner);
      console.log("[SendModalOptimized] ATA address calculated:", ata.toString());
      
      // Try to get from cache first
      try {
        await getAccount(connection, ata);
        console.log("[SendModalOptimized] ATA exists:", ata.toString());
        return true;
      } catch (e) {
        if (e.name === "TokenAccountNotFoundError") {
          console.log("[SendModalOptimized] ATA does not exist for owner:", owner.toString());
          return false;
        }
        console.error("[SendModalOptimized] Failed to check ATA:", e.message, e.name);
        throw e;
      }
    } catch (error) {
      console.error("[SendModalOptimized] Error in ATA check:", error);
      throw error;
    }
  };

  const handleSend = async () => {
    console.log("[SendModalOptimized] ========== SEND PROCESS STARTED ==========");
    console.log("[SendModalOptimized] Send button clicked");
    console.log("[SendModalOptimized] Current state:", {
      amount,
      recipientAddress,
      balance,
      selectedToken,
      activeWalletAddress,
      loading
    });
    
    if (!amount || parseFloat(amount) <= 0) {
      console.log("[SendModalOptimized] Validation failed: Invalid amount");
      setError("Please enter a valid amount.");
      return;
    }
    if (!recipientAddress) {
      console.log("[SendModalOptimized] Validation failed: No recipient address");
      setError("Please enter a recipient address.");
      return;
    }
    if (parseFloat(amount) > balance) {
      console.log("[SendModalOptimized] Validation failed: Insufficient balance");
      setError("Insufficient balance.");
      return;
    }

    // PoRP Layer 3 - Withdrawal Reputation Check
    if (withdrawalCheck && !withdrawalCheck.canWithdraw) {
      console.log("[SendModalOptimized] Validation failed: Withdrawal not permitted by reputation system");
      setError(withdrawalCheck.reason);
      return;
    }

    console.log("[SendModalOptimized] Validation passed, starting send process");
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      console.log("[SendModalOptimized] Getting token information...");
      const token = TOKEN_MINTS[selectedToken];
      if (!token) {
        throw new Error(`Invalid token selected: ${selectedToken}`);
      }
      console.log("[SendModalOptimized] Token info:", { symbol: token.symbol, mint: token.mint.toString(), decimals: token.decimals });
      
      console.log("[SendModalOptimized] Calculating raw amount...");
      const rawAmount = Math.floor(parseFloat(amount) * Math.pow(10, token.decimals));
      console.log("[SendModalOptimized] Raw amount:", rawAmount, "from amount:", amount);
      
      console.log("[SendModalOptimized] Creating PublicKey objects...");
      const recipient = new PublicKey(recipientAddress);
      const sender = new PublicKey(activeWalletAddress);

      let transaction = new Transaction();

      if (selectedToken === "SOL") {
        console.log("[SendModalOptimized] Processing SOL transfer...");
        const solAmount = Math.floor(parseFloat(amount) * 1_000_000_000);
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: sender,
            toPubkey: recipient,
            lamports: solAmount,
          })
        );
      } else {
        console.log("[SendModalOptimized] Processing SPL token transfer...");
        const senderAta = getAssociatedTokenAddressSync(token.mint, sender);
        const recipientAta = getAssociatedTokenAddressSync(token.mint, recipient);

        console.log("[SendModalOptimized] Checking recipient ATA...");
        const recipientAtaExists = await checkAtaExists(token.mint, recipient);
        if (!recipientAtaExists) {
          console.log("[SendModalOptimized] Recipient ATA doesn't exist, calculating cost...");
          const rentExemption = await connection.getMinimumBalanceForRentExemption(165);
          const ataCostSOL = rentExemption / 1_000_000_000;
          
          console.log("[SendModalOptimized] Recipient needs ATA creation, cost:", ataCostSOL, "SOL");
          setAtaCreationCost(ataCostSOL);
          
          const tx = {
            sender,
            recipient,
            token,
            rawAmount,
            needsAtaCreation: true,
            recipientAta
          };
          
          setPendingTransaction(tx);
          setShowATAConfirmation(true);
          setLoading(false);
          return;
        }

        console.log("[SendModalOptimized] Adding transfer instruction...");
        transaction.add(
          createTransferInstruction(senderAta, recipientAta, sender, rawAmount)
        );
      }

      console.log("[SendModalOptimized] Transaction instructions count:", transaction.instructions.length);

      console.log("[SendModalOptimized] Getting latest blockhash...");
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = sender;
      console.log("[SendModalOptimized] Transaction prepared:", { blockhash, feePayer: sender.toString() });

      let signature;
      if (connected && sendTransaction) {
        console.log("[SendModalOptimized] Using wallet adapter signing method");
        const signedTransaction = await signTransaction(transaction);
        console.log("[SendModalOptimized] Transaction signed with wallet adapter, sending...");
        signature = await sendTransaction(signedTransaction, connection, {
          skipPreflight: false,
          maxRetries: 2,
        });
      } else if (embeddedWallet) {
        console.log("[SendModalOptimized] Using embedded wallet signing");
        console.log("[SendModalOptimized] Getting secret key...");
        const secretKey = await getSecretKey();
        if (!secretKey) throw new Error("Failed to decrypt secret key. Please check your wallet setup.");
        const keypair = Keypair.fromSecretKey(secretKey);
        
        console.log("[SendModalOptimized] Keypair public key:", keypair.publicKey.toString());
        console.log("[SendModalOptimized] Expected sender address:", sender.toString());
        
        if (keypair.publicKey.toString() !== sender.toString()) {
          throw new Error("Wallet address mismatch. Please ensure you're using the correct wallet.");
        }
        
        console.log("[SendModalOptimized] About to send and confirm transaction...");
        signature = await sendAndConfirmTransaction(connection, transaction, [keypair], {
          skipPreflight: false,
          maxRetries: 2,
        });
      } else {
        throw new Error("Wallet signing method not available.");
      }

      console.log("[SendModalOptimized] Confirming transaction on-chain...");
      await connection.confirmTransaction({
        blockhash,
        lastValidBlockHeight,
        signature,
      });
      console.log("[SendModalOptimized] Transaction fully confirmed");

      // PoRP Layer 3 - Record withdrawal for reputation tracking
      try {
        console.log("[SendModalOptimized] Recording withdrawal for reputation system...");
        await withdrawalService.recordWithdrawal(activeWalletAddress, amountUSD, selectedToken, signature);
        console.log("[SendModalOptimized] Withdrawal recorded successfully");
      } catch (recordError) {
        console.error("[SendModalOptimized] Failed to record withdrawal:", recordError);
        // Don't fail the transaction if recording fails
      }

      console.log("[SendModalOptimized] Updating UI with success...");
      setSuccessMessage(`Tokens sent successfully! Signature: ${signature}`);
      setAmount("");
      setRecipientAddress("");
      setTimeout(() => setSuccessMessage(""), 5000);
      
      // Clear cache for sender to force refresh on next open
      optimizedBalanceCache.clearCacheForAddress(activeWalletAddress);
      
    } catch (error) {
      console.error("[SendModalOptimized] Error in send process:", error);
      setError(`Failed to send tokens: ${error.message}`);
    } finally {
      console.log("[SendModalOptimized] Cleaning up loading state...");
      setLoading(false);
      console.log("[SendModalOptimized] ========== SEND PROCESS COMPLETED ==========");
    }
  };

  const handleATAConfirmation = async () => {
    if (!pendingTransaction) return;

    console.log("[SendModalOptimized] ========== ATA CREATION PROCESS STARTED ==========");
    setLoading(true);
    setError("");

    try {
      const tx = pendingTransaction;
      let transaction = new Transaction();

      if (selectedToken !== "SOL") {
        console.log("[SendModalOptimized] Adding ATA creation instruction...");
        transaction.add(
          createAssociatedTokenAccountInstruction(
            tx.sender,
            tx.recipientAta,
            tx.recipient,
            tx.token.mint
          )
        );

        console.log("[SendModalOptimized] Adding transfer instruction...");
        transaction.add(
          createTransferInstruction(
            getAssociatedTokenAddressSync(tx.token.mint, tx.sender),
            tx.recipientAta,
            tx.sender,
            tx.rawAmount
          )
        );
      }

      console.log("[SendModalOptimized] Getting latest blockhash...");
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = tx.sender;
      console.log("[SendModalOptimized] Transaction prepared:", { blockhash, feePayer: tx.sender.toString() });

      let signature;
      if (connected && sendTransaction) {
        console.log("[SendModalOptimized] Using wallet adapter signing");
        const signedTransaction = await signTransaction(transaction);
        console.log("[SendModalOptimized] Transaction signed, sending...");
        signature = await sendTransaction(signedTransaction, connection, {
          skipPreflight: false,
          maxRetries: 2,
        });
      } else if (embeddedWallet) {
        console.log("[SendModalOptimized] Using embedded wallet signing");
        const secretKey = await getSecretKey();
        if (!secretKey) throw new Error("Failed to decrypt secret key. Please check your wallet setup.");
        const keypair = Keypair.fromSecretKey(secretKey);
        
        console.log("[SendModalOptimized] About to send and confirm transaction...");
        signature = await sendAndConfirmTransaction(connection, transaction, [keypair], {
          skipPreflight: false,
          maxRetries: 2,
        });
      } else {
        throw new Error("Wallet signing method not available.");
      }

      console.log("[SendModalOptimized] Transaction sent with signature:", signature);
      
      console.log("[SendModalOptimized] Confirming transaction on-chain...");
      await connection.confirmTransaction({
        blockhash,
        lastValidBlockHeight,
        signature,
      });
      console.log("[SendModalOptimized] Transaction fully confirmed");

      console.log("[SendModalOptimized] Updating UI state...");
      setSuccessMessage(`Tokens sent successfully! Signature: ${signature}`);
      setAmount("");
      setRecipientAddress("");
      setTimeout(() => setSuccessMessage(""), 5000);
      
      // Clear cache for sender to force refresh on next open
      optimizedBalanceCache.clearCacheForAddress(activeWalletAddress);
      
    } catch (error) {
      console.error("[SendModalOptimized] Error:", error);
      setError(`Failed to send tokens: ${error.message}`);
    } finally {
      console.log("[SendModalOptimized] Cleaning up...");
      setLoading(false);
      setPendingTransaction(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @keyframes sendModalBackdropIn { from { opacity:0; } to { opacity:1; } }
        @keyframes sendModalContainerIn { from { opacity:0; transform:scale(0.92) translateY(20px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes sendSpinOrange { to { transform:rotate(360deg); } }
        @keyframes borderRotateSend { from { filter: hue-rotate(0deg); } to { filter: hue-rotate(360deg); } }
      `}</style>

      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 99999,
        animation: 'sendModalBackdropIn 0.3s cubic-bezier(0.22,1,0.36,1)',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(20,20,28,0.95), rgba(12,12,18,0.98))',
          borderRadius: '20px',
          padding: '32px',
          maxWidth: '480px',
          width: '100%',
          border: '1px solid rgba(243,99,22,0.2)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(243,99,22,0.1)',
          animation: 'sendModalContainerIn 0.4s cubic-bezier(0.22,1,0.36,1)',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
              Send Tokens
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '1.5rem',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '8px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none';
                e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
              }}
            >
              <FaTimes />
            </button>
          </div>

          {/* Token Selection */}
          <div style={{ marginBottom: '20px', position: 'relative', zIndex: 10 }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px', color: 'rgba(255,255,255,0.35)' }}>Select Token</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {Object.entries(TOKEN_MINTS).map(([symbol, token]) => (
                <button
                  key={symbol}
                  onClick={() => {
                    setSelectedToken(symbol);
                    debouncedFetchBalance(); // Use debounced version
                  }}
                  style={{
                    padding: '12px 8px',
                    borderRadius: '12px',
                    border: selectedToken === symbol ? '2px solid rgba(243,99,22,0.6)' : '1px solid rgba(255,255,255,0.1)',
                    background: selectedToken === symbol ? 'rgba(243,99,22,0.1)' : 'rgba(255,255,255,0.05)',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = selectedToken === symbol ? 'rgba(243,99,22,0.2)' : 'rgba(255,255,255,0.1)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = selectedToken === symbol ? 'rgba(243,99,22,0.1)' : 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ fontSize: '16px' }}>{token.icon}</div>
                  <span>{symbol}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Balance Display */}
          <div style={{
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
            position: 'relative',
            zIndex: 10,
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(243,99,22,0.08)',
            backdropFilter: 'blur(8px)',
          }}>
            <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '4px', color: 'rgba(255,255,255,0.3)', margin: '0 0 4px 0' }}>Available Balance</p>
            <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
              {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} {selectedToken}
            </p>
          </div>

          {/* PoRP Layer 3 - Reputation & USD Display */}
          {reputationInfo && (
            <div style={{
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              position: 'relative',
              zIndex: 10,
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(243,99,22,0.08)',
              backdropFilter: 'blur(8px)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '4px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
                    <FaShieldAlt style={{ marginRight: '4px', color: 'rgba(243,99,22,0.7)' }} />
                    Withdrawal Tier
                  </p>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', margin: 0, textTransform: 'capitalize' }}>
                    {reputationInfo.tier}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '4px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
                    Daily Limit
                  </p>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(243,99,22,0.9)', margin: 0 }}>
                    ${reputationInfo.limits.maxWithdrawalUSD}
                  </p>
                </div>
              </div>
              {amountUSD > 0 && (
                <div style={{ 
                  paddingTop: '8px', 
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.6)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Amount (USD):</span>
                    <span style={{ 
                      fontWeight: 600, 
                      color: amountUSD > reputationInfo.limits.maxWithdrawalUSD ? '#ff7b7b' : '#42d675' 
                    }}>
                      ${amountUSD.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recipient Address */}
          <div style={{ marginBottom: '16px', position: 'relative', zIndex: 10 }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px', color: 'rgba(255,255,255,0.35)' }}>Recipient Address</label>
            <input
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="Enter wallet address"
              style={{
                width: '100%',
                borderRadius: '12px',
                padding: '14px 16px',
                fontSize: '14px',
                color: '#fff',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(243,99,22,0.18)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
                transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(243,99,22,0.45)';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(243,99,22,0.08), inset 0 1px 0 rgba(255,255,255,0.03)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(243,99,22,0.18)';
                e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.03)';
              }}
            />
          </div>

          {/* Amount */}
          <div style={{ marginBottom: '24px', position: 'relative', zIndex: 10 }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px', color: 'rgba(255,255,255,0.35)' }}>Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              style={{
                width: '100%',
                borderRadius: '12px',
                padding: '14px 16px',
                fontSize: '14px',
                color: '#fff',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(243,99,22,0.18)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
                transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(243,99,22,0.45)';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(243,99,22,0.08), inset 0 1px 0 rgba(255,255,255,0.03)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(243,99,22,0.18)';
                e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.03)';
              }}
            />
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div style={{
              marginBottom: '20px',
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#fca5a5',
              fontSize: '13px',
              position: 'relative',
              zIndex: 10,
            }}>
              {error}
            </div>
          )}

          {successMessage && (
            <div style={{
              marginBottom: '20px',
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.2)',
              color: '#86efac',
              fontSize: '13px',
              position: 'relative',
              zIndex: 10,
            }}>
              {successMessage}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', position: 'relative', zIndex: 10 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                color: '#fff',
                padding: '14px 16px',
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: '14px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={loading}
              style={{
                flex: 1,
                color: '#fff',
                padding: '14px 16px',
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: '14px',
                position: 'relative',
                overflow: 'hidden',
                background: loading ? 'rgba(243,99,22,0.3)' : 'linear-gradient(135deg, rgba(243,99,22,0.9), rgba(255,98,0,0.85), rgba(200,60,10,0.9))',
                boxShadow: '0 4px 16px rgba(243,99,22,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
                border: '1px solid rgba(243,99,22,0.25)',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(243,99,22,0.3), inset 0 1px 0 rgba(255,255,255,0.15)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(243,99,22,0.2), inset 0 1px 0 rgba(255,255,255,0.1)';
              }}
            >
              {loading ? (
                <>
                  <span style={{
                    display: 'inline-block',
                    width: '16px', height: '16px',
                    border: '2px solid rgba(255,255,255,0.15)',
                    borderTopColor: 'rgba(255,255,255,0.9)',
                    borderRadius: '50%',
                    animation: 'sendSpinOrange 0.8s cubic-bezier(0.45,0.05,0.55,0.95) infinite',
                  }} />
                  Sending...
                </>
              ) : (
                <>
                  <FaPaperPlane size={13} /> Send
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ATA Creation Confirmation Modal */}
      {showATAConfirmation && (
        <>
          {console.log("[ATA Modal] Rendering modal, showATAConfirmation:", showATAConfirmation)}
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(255,0,0,0.5)', // Red background for debugging
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            border: '5px solid yellow', // Yellow border for debugging
          }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(20,20,28,0.95), rgba(12,12,18,0.98))',
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '420px',
              width: '90%',
              border: '1px solid rgba(243,99,22,0.2)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(243,99,22,0.1)',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(243,99,22,0.2), rgba(255,98,0,0.15))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(243,99,22,0.3)',
              }}>
                <FaGem size={20} style={{ color: 'rgba(243,99,22,0.9)' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>
                  Create Token Account
                </h3>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '4px 0 0 0' }}>
                  Recipient needs a token account
                </p>
              </div>
            </div>

            <div style={{
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: '1px solid rgba(243,99,22,0.1)',
            }}>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: '0 0 8px 0', lineHeight: '1.5' }}>
                The recipient doesn't have a token account for {selectedToken}. You'll need to pay for its creation.
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Creation Cost
                </span>
                <span style={{ fontSize: '16px', fontWeight: 700, color: 'rgba(243,99,22,0.9)' }}>
                  {ataCreationCost.toFixed(6)} SOL
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowATAConfirmation(false);
                  setPendingTransaction(null);
                }}
                style={{
                  flex: 1,
                  color: '#fff',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '14px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleATAConfirmation}
                disabled={loading}
                style={{
                  flex: 1,
                  color: '#fff',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '14px',
                  background: loading ? 'rgba(243,99,22,0.3)' : 'linear-gradient(135deg, rgba(243,99,22,0.9), rgba(255,98,0,0.85))',
                  boxShadow: '0 4px 16px rgba(243,99,22,0.2)',
                  border: '1px solid rgba(243,99,22,0.25)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(243,99,22,0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(243,99,22,0.2)';
                }}
              >
                {loading ? 'Creating...' : 'Create & Send'}
              </button>
            </div>
            </div>
          </div>
        </>
      )}

      {/* PoRP Layer 3 - Withdrawal Reputation Warning Modal */}
      {showReputationWarning && withdrawalCheck && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(20,20,28,0.98), rgba(12,12,18,0.99))',
            borderRadius: '20px',
            padding: '32px',
            maxWidth: '460px',
            width: '90%',
            border: '1px solid rgba(239,68,68,0.3)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(239,68,68,0.15)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.15))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(239,68,68,0.3)',
              }}>
                <FaShieldAlt size={20} style={{ color: 'rgba(239,68,68,0.9)' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>
                  Withdrawal Restricted
                </h3>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '4px 0 0 0' }}>
                  Anti-dump protection active
                </p>
              </div>
            </div>

            <div style={{
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: '1px solid rgba(239,68,68,0.1)',
            }}>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: '0 0 12px 0', lineHeight: '1.5' }}>
                {withdrawalCheck.reason}
              </p>
              
              {withdrawalCheck.maxAmount && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                    Your Daily Limit
                  </span>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: 'rgba(243,99,22,0.9)' }}>
                    ${withdrawalCheck.maxAmount}
                  </span>
                </div>
              )}

              {withdrawalCheck.requiredScore && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                    Next Tier Requires
                  </span>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: 'rgba(243,99,22,0.9)' }}>
                    {withdrawalCheck.requiredScore} pts
                  </span>
                </div>
              )}

              {withdrawalCheck.cooldownEnd && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                    Cooldown Ends
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(243,99,22,0.9)' }}>
                    {new Date(withdrawalCheck.cooldownEnd).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>

            <div style={{ 
              background: 'rgba(243,99,22,0.08)', 
              borderRadius: '12px', 
              padding: '14px', 
              marginBottom: '20px',
              border: '1px solid rgba(243,99,22,0.2)'
            }}>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: '1.5' }}>
                <FaChartLine style={{ marginRight: '4px', color: 'rgba(243,99,22,0.7)' }} />
                <strong>Tip:</strong> Read more novels and complete comprehension challenges to increase your reputation tier and unlock higher withdrawal limits.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowReputationWarning(false)}
                style={{
                  flex: 1,
                  color: '#fff',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '14px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
