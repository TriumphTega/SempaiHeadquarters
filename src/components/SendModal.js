"use client";

import { useState, useEffect, useContext } from "react";
import { Connection, PublicKey, VersionedTransaction, Keypair, Transaction, SystemProgram, sendAndConfirmTransaction } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAssociatedTokenAddressSync, createTransferInstruction, getAccount, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import { AMETHYST_MINT_ADDRESS, SMP_MINT_ADDRESS, USDC_MINT_ADDRESS, SKR_MINT_ADDRESS, RPC_URL } from "@/constants";
import { FaTimes, FaGem, FaCoins, FaDollarSign, FaPaperPlane, FaShieldAlt, FaChartLine } from "react-icons/fa";
import { EmbeddedWalletContext } from "./EmbeddedWalletProvider";
import { useWallet } from "@solana/wallet-adapter-react";
import WithdrawalReputationService from "@/services/porp/WithdrawalReputationService";

const connection = new Connection(RPC_URL);

const TOKEN_MINTS = {
  SOL: { mint: new PublicKey("So11111111111111111111111111111111111111112"), decimals: 9, symbol: "SOL", icon: <FaCoins />, logo: "/images/sol-logo.png" },
  JUP: { mint: new PublicKey("JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN"), decimals: 6, symbol: "JUP", icon: <FaGem />, logo: "/images/jup-logo.png" },
  AMETHYST: { mint: AMETHYST_MINT_ADDRESS, decimals: 6, symbol: "AMETHYST", icon: <FaGem />, logo: "/images/amethyst-logo.jpeg" },
  SMP: { mint: SMP_MINT_ADDRESS, decimals: 6, symbol: "SMP", icon: <FaGem />, logo: "/images/smp-logo.jpeg" },
  SKR: { mint: SKR_MINT_ADDRESS, decimals: 6, symbol: "SKR", icon: <FaGem />, logo: "/images/skr-logo.png" },
  USDC: { mint: USDC_MINT_ADDRESS, decimals: 6, symbol: "USDC", icon: <FaDollarSign />, logo: "/images/usdc-logo.png" },
};

export default function SendModal({ isOpen, onClose, activeWalletAddress }) {
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

  useEffect(() => {
    if (isOpen && activeWalletAddress) {
      fetchBalance();
      fetchReputationInfo();
    }
  }, [isOpen, activeWalletAddress, selectedToken]);

  // Update USD value when amount or token changes
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
      console.log('[SendModal] Fetching reputation info for:', activeWalletAddress);
      const info = await withdrawalService.getUserReputationTier(activeWalletAddress);
      setReputationInfo(info);
      console.log('[SendModal] Reputation info loaded:', info);
    } catch (error) {
      console.error('[SendModal] Error fetching reputation info:', error);
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
      console.error('[SendModal] Error converting to USD:', error);
      setAmountUSD(0);
    }
  };

  const checkWithdrawalEligibility = async () => {
    try {
      console.log('[SendModal] Checking withdrawal eligibility:', { amountUSD, token: selectedToken });
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
      
      console.log('[SendModal] Withdrawal eligibility check:', check);
    } catch (error) {
      console.error('[SendModal] Error checking withdrawal eligibility:', error);
    }
  };

  // Helper to Check if ATA Exists
  const checkAtaExists = async (mint, owner) => {
    console.log("[checkAtaExists] Starting ATA check for mint:", mint.toString(), "owner:", owner.toString());
    try {
      const ata = getAssociatedTokenAddressSync(mint, owner);
      console.log("[checkAtaExists] ATA address calculated:", ata.toString());
      console.log("[checkAtaExists] Checking if ATA exists on-chain...");
      await getAccount(connection, ata);
      console.log("[checkAtaExists] ATA exists:", ata.toString());
      return true;
    } catch (e) {
      if (e.name === "TokenAccountNotFoundError") {
        console.log("[checkAtaExists] ATA does not exist for owner:", owner.toString());
        return false;
      }
      console.error("[checkAtaExists] Failed to check ATA:", e.message, e.name);
      throw e;
    }
  };

const fetchBalance = async (retryCount = 0) => {
    console.log(`[fetchBalance] Starting balance fetch (attempt ${retryCount + 1}) for token: ${selectedToken}`);
    const maxRetries = 3;
    try {
      const token = TOKEN_MINTS[selectedToken];
      console.log("[fetchBalance] Token info:", { symbol: token.symbol, mint: token.mint.toString(), decimals: token.decimals });
      let balance = 0;

      if (selectedToken === "SOL") {
        console.log("[fetchBalance] Fetching SOL balance for address:", activeWalletAddress);
        try {
          const solBalance = await connection.getBalance(new PublicKey(activeWalletAddress));
          balance = solBalance / 1_000_000_000;
          console.log("[fetchBalance] SOL balance fetched:", balance);
        } catch (solError) {
          console.error("[fetchBalance] Error fetching SOL balance:", solError);
          if (retryCount < maxRetries) {
            console.log(`[fetchBalance] Retrying SOL balance fetch (${retryCount + 1}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
            return fetchBalance(retryCount + 1);
          }
          throw new Error("Failed to fetch SOL balance. Please check your network connection.");
        }
      } else {
        console.log("[fetchBalance] Fetching token balance for:", selectedToken);
        try {
          const ataAddress = getAssociatedTokenAddressSync(token.mint, new PublicKey(activeWalletAddress));
          console.log("[fetchBalance] ATA address:", ataAddress.toString());
          const ataInfo = await connection.getAccountInfo(ataAddress);
          console.log("[fetchBalance] ATA exists:", !!ataInfo);
          if (ataInfo) {
            console.log("[fetchBalance] Getting account details...");
            const ata = await getAccount(connection, ataAddress);
            balance = Number(ata.amount) / Math.pow(10, token.decimals);
            console.log("[fetchBalance] Token balance calculated:", balance);
          } else {
            console.log("[fetchBalance] No ATA found, balance is 0");
          }
        } catch (tokenError) {
          console.error("[fetchBalance] Error fetching token balance:", tokenError);
          if (retryCount < maxRetries) {
            console.log(`[fetchBalance] Retrying ${selectedToken} balance fetch (${retryCount + 1}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
            return fetchBalance(retryCount + 1);
          }
          throw new Error(`Failed to fetch ${selectedToken} balance. Please check your network connection.`);
        }
      }

      console.log("[fetchBalance] Setting balance:", balance);
      setBalance(balance);
      setError(""); // Clear any previous errors
    } catch (error) {
      console.error("[fetchBalance] Error fetching balance:", error);
      setBalance(0);
      setError(error.message || "Failed to fetch balance");
    }
  };

  const handleATAConfirmation = async () => {
    console.log("[handleATAConfirmation] Starting ATA confirmation process");
    setLoading(true);
    setShowATAConfirmation(false);
    setError("");

    try {
      const tx = pendingTransaction;
      console.log("[handleATAConfirmation] Pending transaction:", tx);
      if (!tx) throw new Error("No pending transaction");

      console.log("[handleATAConfirmation] Building transaction instructions...");
      const instructions = [];
      
      // Add sender ATA creation if needed
      if (tx.needsSenderATA) {
        console.log("[handleATAConfirmation] Adding sender ATA creation...");
        instructions.push(
          createAssociatedTokenAccountInstruction(
            tx.sender,      // Payer (sender pays for own ATA)
            tx.senderATA,    // ATA address
            tx.sender,      // Owner
            tx.tokenMint    // Mint
          )
        );
        console.log("[handleATAConfirmation] Sender ATA instruction added");
      }
      
      // Add recipient ATA creation instruction
      console.log("[handleATAConfirmation] Adding recipient ATA creation...");
      instructions.push(
        createAssociatedTokenAccountInstruction(
          tx.sender,      // Payer (sender pays for recipient's ATA)
          tx.recipientATA, // ATA address
          tx.recipient,   // Owner
          tx.tokenMint    // Mint
        )
      );
      console.log("[handleATAConfirmation] Recipient ATA instruction added");
      
      // Add transfer instruction
      console.log("[handleATAConfirmation] Adding transfer instruction...");
      instructions.push(
        createTransferInstruction(
          tx.senderATA,
          tx.recipientATA,
          tx.sender,
          tx.rawAmount
        )
      );
      console.log("[handleATAConfirmation] Transfer instruction added");

      console.log("[handleATAConfirmation] Creating transaction with", instructions.length, "instructions");
      let transaction = new Transaction().add(...instructions);

      console.log("[handleATAConfirmation] Getting latest blockhash...");
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = tx.sender;
      console.log("[handleATAConfirmation] Transaction prepared:", { blockhash, feePayer: tx.sender.toString() });

      let signature;

      console.log("[handleATAConfirmation] Checking wallet status:", { 
        hasEmbeddedWallet: !!embeddedWallet, 
        hasSignTransaction: !!signTransaction, 
        hasSendTransaction: !!sendTransaction 
      });

      // Use wallet adapter signing (more reliable)
      if (signTransaction && sendTransaction) {
        console.log("[handleATAConfirmation] Using wallet adapter signing");
        const signedTransaction = await signTransaction(transaction);
        console.log("[handleATAConfirmation] Transaction signed, sending...");
        signature = await sendTransaction(signedTransaction, connection, {
          skipPreflight: false,
          maxRetries: 2,
        });
        console.log("[handleATAConfirmation] Transaction sent with signature:", signature);
      } else if (embeddedWallet) {
        console.log("[handleATAConfirmation] Using embedded wallet signing");
        console.log("[handleATAConfirmation] Getting secret key...");
        const secretKey = await getSecretKey();
        if (!secretKey) throw new Error("Failed to decrypt secret key. Please check your wallet setup.");
        const keypair = Keypair.fromSecretKey(secretKey);
        
        console.log("[handleATAConfirmation] Keypair public key:", keypair.publicKey.toString());
        console.log("[handleATAConfirmation] Expected sender address:", tx.sender.toString());
        
        if (keypair.publicKey.toString() !== tx.sender.toString()) {
          throw new Error("Wallet address mismatch. Please ensure you're using the correct wallet.");
        }
        
        console.log("[handleATAConfirmation] About to send and confirm transaction...");
        signature = await sendAndConfirmTransaction(connection, transaction, [keypair], {
          skipPreflight: false,
          maxRetries: 2,
        });
        console.log("[handleATAConfirmation] Transaction confirmed with signature:", signature);
      } else {
        throw new Error("Wallet signing method not available.");
      }

      console.log("[handleATAConfirmation] Confirming transaction on-chain...");
      await connection.confirmTransaction({
        blockhash,
        lastValidBlockHeight,
        signature,
      });
      console.log("[handleATAConfirmation] Transaction fully confirmed");

      console.log("[handleATAConfirmation] Updating UI state...");
      setSuccessMessage(`Tokens sent successfully! Signature: ${signature}`);
      setAmount("");
      setRecipientAddress("");
      setTimeout(() => setSuccessMessage(""), 5000);
      fetchBalance();
    } catch (error) {
      console.error("[handleATAConfirmation] Error:", error);
      setError(`Failed to send tokens: ${error.message}`);
    } finally {
      console.log("[handleATAConfirmation] Cleaning up...");
      setLoading(false);
      setPendingTransaction(null);
    }
  };

  const handleSend = async () => {
    console.log("[handleSend] ========== SEND PROCESS STARTED ==========");
    console.log("[handleSend] Send button clicked");
    console.log("[handleSend] Current state:", {
      amount,
      recipientAddress,
      balance,
      selectedToken,
      activeWalletAddress,
      loading
    });
    
    if (!amount || parseFloat(amount) <= 0) {
      console.log("[handleSend] Validation failed: Invalid amount");
      setError("Please enter a valid amount.");
      return;
    }
    if (!recipientAddress) {
      console.log("[handleSend] Validation failed: No recipient address");
      setError("Please enter a recipient address.");
      return;
    }
    if (parseFloat(amount) > balance) {
      console.log("[handleSend] Validation failed: Insufficient balance");
      setError("Insufficient balance.");
      return;
    }

    // PoRP Layer 3 - Withdrawal Reputation Check
    if (withdrawalCheck && !withdrawalCheck.canWithdraw) {
      console.log("[handleSend] Validation failed: Withdrawal not permitted by reputation system");
      setError(withdrawalCheck.reason);
      return;
    }

    console.log("[handleSend] Validation passed, starting send process");
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      console.log("[handleSend] Getting token information...");
      const token = TOKEN_MINTS[selectedToken];
      if (!token) {
        throw new Error(`Invalid token selected: ${selectedToken}`);
      }
      console.log("[handleSend] Token info:", { symbol: token.symbol, mint: token.mint.toString(), decimals: token.decimals });
      
      console.log("[handleSend] Calculating raw amount...");
      const rawAmount = Math.floor(parseFloat(amount) * Math.pow(10, token.decimals));
      console.log("[handleSend] Raw amount:", rawAmount, "from amount:", amount);
      
      console.log("[handleSend] Creating PublicKey objects...");
      const recipient = new PublicKey(recipientAddress);
      const sender = new PublicKey(activeWalletAddress);
      console.log("[handleSend] Sender:", sender.toString());
      console.log("[handleSend] Recipient:", recipient.toString());

      let transaction;

      try {
        if (selectedToken === "SOL") {
          console.log("[handleSend] Creating SOL transfer transaction...");
          transaction = new Transaction().add(
            SystemProgram.transfer({
              fromPubkey: sender,
              toPubkey: recipient,
              lamports: rawAmount,
            })
          );
          console.log("[handleSend] SOL transaction created");
        } else {
          console.log("[handleSend] Creating token transfer transaction...");
          
          // Validate recipient address
          console.log("[handleSend] Validating recipient address...");
          if (recipientAddress.includes("squas.so") || recipient.toString().startsWith("SQS")) {
            throw new Error("Squads addresses cannot hold tokens directly. Please use the squad's vault address instead.");
          }
          
          console.log("[handleSend] Calculating ATA addresses...");
          const senderATA = getAssociatedTokenAddressSync(token.mint, sender);
          const recipientATA = getAssociatedTokenAddressSync(token.mint, recipient);
          
          console.log("[handleSend] Sender ATA:", senderATA.toString());
          console.log("[handleSend] Recipient ATA:", recipientATA.toString());
          
          const instructions = [];
          
          // Check and Create Sender ATA
          console.log("[handleSend] Checking sender ATA existence...");
          const senderAtaExists = await checkAtaExists(token.mint, sender);
          if (!senderAtaExists) {
            console.log("[handleSend] Sender ATA doesn't exist, adding creation instruction...");
            instructions.push(
              createAssociatedTokenAccountInstruction(
                sender,      // Payer (sender pays for own ATA)
                senderATA,    // ATA address
                sender,      // Owner
                token.mint    // Mint
              )
            );
            console.log("[handleSend] Sender ATA creation instruction added");
          } else {
            console.log("[handleSend] Sender ATA already exists");
          }
          
          // Check if recipient needs ATA
          console.log("[handleSend] Checking recipient ATA existence...");
          const recipientAtaExists = await checkAtaExists(token.mint, recipient);
          if (!recipientAtaExists) {
            console.log("[handleSend] Recipient ATA doesn't exist, calculating cost...");
            const rentExemption = await connection.getMinimumBalanceForRentExemption(165); // ATA size
            const ataCostSOL = rentExemption / 1_000_000_000;
            
            console.log("[handleSend] Recipient needs ATA creation, cost:", ataCostSOL, "SOL");
            
            console.log("[handleSend] Storing pending transaction and showing confirmation modal...");
            console.log("[handleSend] Pending transaction data:", {
              sender: sender.toString(),
              recipient: recipient.toString(),
              ataCost: ataCostSOL,
              needsSenderATA: !senderAtaExists
            });
            setPendingTransaction({
              sender,
              recipient,
              senderATA,
              recipientATA,
              rawAmount,
              tokenMint: token.mint,
              ataCost: ataCostSOL,
              needsSenderATA: !senderAtaExists
            });
            setAtaCreationCost(ataCostSOL);
            console.log("[handleSend] Setting showATAConfirmation to true...");
            setShowATAConfirmation(true);
            setLoading(false);
            console.log("[handleSend] Modal should now be visible");
            return; // Exit here, wait for user confirmation
          } else {
            console.log("[handleSend] Recipient ATA already exists");
          }
          
          // Add the transfer instruction
          console.log("[handleSend] Adding transfer instruction...");
          instructions.push(
            createTransferInstruction(
              senderATA,
              recipientATA,
              sender,
              rawAmount
            )
          );
          console.log("[handleSend] Transfer instruction added");
          
          console.log("[handleSend] Creating transaction with", instructions.length, "instructions");
          transaction = new Transaction().add(...instructions);
          console.log("[handleSend] Token transaction created successfully");
        }
      } catch (txError) {
        console.error("[handleSend] Error creating transaction:", txError);
        throw new Error(`Failed to create transaction: ${txError.message}`);
      }

      if (!transaction) {
        throw new Error("Failed to create transaction");
      }

      console.log("[handleSend] Transaction created, preparing for signing...");
      console.log("[handleSend] Transaction instructions count:", transaction.instructions.length);

      console.log("[handleSend] Getting latest blockhash...");
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = sender;
      console.log("[handleSend] Transaction prepared:", { blockhash, feePayer: sender.toString() });

      let signature;

      console.log("[handleSend] Checking wallet capabilities...");
      console.log("[handleSend] Wallet status:", { 
        hasEmbeddedWallet: !!embeddedWallet, 
        hasSignTransaction: !!signTransaction, 
        hasSendTransaction: !!sendTransaction 
      });

      // Use wallet adapter signing (more reliable)
      if (signTransaction && sendTransaction) {
        console.log("[handleSend] Using wallet adapter signing method");
        const signedTransaction = await signTransaction(transaction);
        console.log("[handleSend] Transaction signed with wallet adapter, sending...");
        signature = await sendTransaction(signedTransaction, connection, {
          skipPreflight: false,
          maxRetries: 2,
        });
        console.log("[handleSend] Transaction sent with signature:", signature);
      } else if (embeddedWallet) {
        console.log("[handleSend] Using embedded wallet signing method");
        console.log("[handleSend] Getting secret key...");
        const secretKey = await getSecretKey();
        if (!secretKey) throw new Error("Failed to decrypt secret key. Please check your wallet setup.");
        const keypair = Keypair.fromSecretKey(secretKey);
        
        console.log("[handleSend] Keypair public key:", keypair.publicKey.toString());
        console.log("[handleSend] Expected sender address:", sender.toString());
        
        if (keypair.publicKey.toString() !== sender.toString()) {
          throw new Error("Wallet address mismatch. Please ensure you're using the correct wallet.");
        }
        
        console.log("[handleSend] About to send and confirm transaction...");
        signature = await sendAndConfirmTransaction(connection, transaction, [keypair], {
          skipPreflight: false,
          maxRetries: 2,
        });
        console.log("[handleSend] Transaction confirmed with signature:", signature);
      } else {
        throw new Error("Wallet signing method not available.");
      }

      console.log("[handleSend] Confirming transaction on-chain...");
      await connection.confirmTransaction({
        blockhash,
        lastValidBlockHeight,
        signature,
      });
      console.log("[handleSend] Transaction fully confirmed");

      // PoRP Layer 3 - Record withdrawal for reputation tracking
      try {
        console.log("[handleSend] Recording withdrawal for reputation system...");
        await withdrawalService.recordWithdrawal(activeWalletAddress, amountUSD, selectedToken, signature);
        console.log("[handleSend] Withdrawal recorded successfully");
      } catch (recordError) {
        console.error("[handleSend] Failed to record withdrawal:", recordError);
        // Don't fail the transaction if recording fails
      }

      console.log("[handleSend] Updating UI with success...");
      setSuccessMessage(`Tokens sent successfully! Signature: ${signature}`);
      setAmount("");
      setRecipientAddress("");
      setTimeout(() => setSuccessMessage(""), 5000);
      console.log("[handleSend] Refreshing balance...");
      fetchBalance();
    } catch (error) {
      console.error("[handleSend] Error in send process:", error);
      setError(`Failed to send tokens: ${error.message}`);
    } finally {
      console.log("[handleSend] Cleaning up loading state...");
      setLoading(false);
      console.log("[handleSend] ========== SEND PROCESS COMPLETED ==========");
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
        animation: 'sendModalBackdropIn 0.35s cubic-bezier(0.22,1,0.36,1) forwards',
      }}>

        <div style={{
          position: 'relative',
          width: '100%',
          maxWidth: '440px',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: '24px',
          padding: '24px',
          background: 'rgba(12,12,18,0.92)',
          backdropFilter: 'blur(32px) saturate(160%)',
          WebkitBackdropFilter: 'blur(32px) saturate(160%)',
          border: '1px solid rgba(243,99,22,0.18)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(243,99,22,0.04), inset 0 1px 0 rgba(255,255,255,0.04)',
          animation: 'sendModalContainerIn 0.45s cubic-bezier(0.22,1,0.36,1) forwards',
        }}>

          {/* Animated border glow */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            borderRadius: '24px',
            pointerEvents: 'none',
            padding: '1px',
            background: 'linear-gradient(135deg, rgba(243,99,22,0.4), rgba(255,98,0,0.08), rgba(243,99,22,0.08), rgba(255,98,0,0.4))',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            animation: 'borderRotateSend 8s linear infinite',
          }} />

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', position: 'relative', zIndex: 10 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '-0.01em', margin: 0 }}>
              <span style={{ color: 'rgba(243,99,22,0.9)', filter: 'drop-shadow(0 0 8px rgba(243,99,22,0.4))' }}>
                <FaPaperPlane />
              </span>
              Send Tokens
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.35)',
                cursor: 'pointer',
                padding: '4px',
                transition: 'color 0.3s, transform 0.4s cubic-bezier(0.34,1.56,0.64,1)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'rotate(90deg)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.transform = 'rotate(0deg)'; }}
            >
              <FaTimes size={22} />
            </button>
          </div>

          {/* Token Selection */}
          <div style={{ marginBottom: '16px', position: 'relative', zIndex: 10 }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px', color: 'rgba(255,255,255,0.35)' }}>Select Token</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(243,99,22,0.18)', borderRadius: '12px', transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)' }}>
              <img 
                src={TOKEN_MINTS[selectedToken].logo} 
                alt={selectedToken}
                style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%',
                  margin: '8px 0 8px 12px',
                  objectFit: 'contain',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              />
              <select
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value)}
                style={{
                  flex: 1,
                  borderRadius: '12px',
                  padding: '14px 16px 14px 8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#fff',
                  appearance: 'none',
                  background: 'transparent',
                  border: 'none',
                  boxShadow: 'none',
                  transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  e.currentTarget.parentElement.style.borderColor = 'rgba(243,99,22,0.45)';
                  e.currentTarget.parentElement.style.boxShadow = '0 0 20px rgba(243,99,22,0.08), inset 0 1px 0 rgba(255,255,255,0.03)';
                }}
                onBlur={(e) => {
                  e.currentTarget.parentElement.style.borderColor = 'rgba(243,99,22,0.18)';
                  e.currentTarget.parentElement.style.boxShadow = 'none';
                }}
              >
                {Object.entries(TOKEN_MINTS).map(([symbol, token]) => (
                  <option key={symbol} value={symbol} style={{ background: '#0c0c12', color: '#fff' }}>
                    {token.symbol}
                  </option>
                ))}
              </select>
              <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'rgba(243,99,22,0.7)' }}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 11L3 6h10l-5 5z"/></svg>
              </div>
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
          <div style={{ marginBottom: '20px', position: 'relative', zIndex: 10 }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px', color: 'rgba(255,255,255,0.35)' }}>Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.000001"
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
              borderRadius: '12px',
              padding: '14px',
              marginBottom: '16px',
              fontSize: '12px',
              fontWeight: 500,
              textAlign: 'center',
              position: 'relative',
              zIndex: 10,
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#ff7b7b',
              animation: 'sendModalContainerIn 0.3s cubic-bezier(0.22,1,0.36,1)',
            }}>
              {error}
            </div>
          )}

          {successMessage && (
            <div style={{
              borderRadius: '12px',
              padding: '14px',
              marginBottom: '16px',
              fontSize: '12px',
              fontWeight: 500,
              textAlign: 'center',
              position: 'relative',
              zIndex: 10,
              background: 'rgba(40,167,69,0.08)',
              border: '1px solid rgba(40,167,69,0.3)',
              color: '#42d675',
              animation: 'sendModalContainerIn 0.3s cubic-bezier(0.22,1,0.36,1)',
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
                backdropFilter: 'blur(8px)',
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
