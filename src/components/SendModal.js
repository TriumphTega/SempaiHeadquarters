"use client";

import { useState, useEffect, useContext } from "react";
import { Connection, PublicKey, VersionedTransaction, Keypair } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, createTransferInstruction, getAccount } from "@solana/spl-token";
import { AMETHYST_MINT_ADDRESS, SMP_MINT_ADDRESS, USDC_MINT_ADDRESS, RPC_URL } from "@/constants";
import { FaTimes, FaGem, FaCoins, FaDollarSign, FaPaperPlane } from "react-icons/fa";
import { EmbeddedWalletContext } from "./EmbeddedWalletProvider";
import { useWallet } from "@solana/wallet-adapter-react";

const connection = new Connection(RPC_URL);

const TOKEN_MINTS = {
  SOL: { mint: new PublicKey("So11111111111111111111111111111111111111112"), decimals: 9, symbol: "SOL", icon: <FaCoins /> },
  JUP: { mint: new PublicKey("JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN"), decimals: 6, symbol: "JUP", icon: <FaGem /> },
  AMETHYST: { mint: AMETHYST_MINT_ADDRESS, decimals: 6, symbol: "AMETHYST", icon: <FaGem /> },
  SMP: { mint: SMP_MINT_ADDRESS, decimals: 6, symbol: "SMP", icon: <FaGem /> },
  USDC: { mint: USDC_MINT_ADDRESS, decimals: 6, symbol: "USDC", icon: <FaDollarSign /> },
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

  useEffect(() => {
    if (isOpen && activeWalletAddress) {
      fetchBalance();
    }
  }, [isOpen, activeWalletAddress, selectedToken]);

  const fetchBalance = async () => {
    try {
      const token = TOKEN_MINTS[selectedToken];
      let balance = 0;

      if (selectedToken === "SOL") {
        const solBalance = await connection.getBalance(new PublicKey(activeWalletAddress));
        balance = solBalance / 1_000_000_000;
      } else {
        const ataAddress = getAssociatedTokenAddressSync(token.mint, new PublicKey(activeWalletAddress));
        const ataInfo = await connection.getAccountInfo(ataAddress);
        if (ataInfo) {
          const ata = await getAccount(connection, ataAddress);
          balance = Number(ata.amount) / Math.pow(10, token.decimals);
        }
      }

      setBalance(balance);
    } catch (error) {
      console.error("Error fetching balance:", error);
      setBalance(0);
    }
  };

  const handleSend = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    if (!recipientAddress) {
      setError("Please enter a recipient address.");
      return;
    }
    if (parseFloat(amount) > balance) {
      setError("Insufficient balance.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const token = TOKEN_MINTS[selectedToken];
      const rawAmount = Math.floor(parseFloat(amount) * Math.pow(10, token.decimals));
      const recipient = new PublicKey(recipientAddress);
      const sender = new PublicKey(activeWalletAddress);

      let transaction;

      if (selectedToken === "SOL") {
        // SOL transfer
        transaction = await connection.buildTransaction({
          fromPubkey: sender,
          toPubkey: recipient,
          lamports: rawAmount,
        });
      } else {
        // Token transfer
        const senderATA = getAssociatedTokenAddressSync(token.mint, sender);
        const recipientATA = getAssociatedTokenAddressSync(token.mint, recipient);
        
        transaction = new Transaction().add(
          createTransferInstruction(
            senderATA,
            recipientATA,
            sender,
            rawAmount
          )
        );
      }

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = sender;

      let signature;

      if (embeddedWallet) {
        const secretKey = await getSecretKey();
        if (!secretKey) throw new Error("Failed to decrypt secret key. Please check your wallet setup.");
        const keypair = Keypair.fromSecretKey(secretKey);
        transaction.sign([keypair]);
        signature = await connection.sendRawTransaction(transaction.serialize(), {
          skipPreflight: false,
          maxRetries: 2,
        });
      } else if (signTransaction && sendTransaction) {
        const signedTransaction = await signTransaction(transaction);
        signature = await sendTransaction(signedTransaction, connection, {
          skipPreflight: false,
          maxRetries: 2,
        });
      } else {
        throw new Error("Wallet signing method not available.");
      }

      await connection.confirmTransaction({
        blockhash,
        lastValidBlockHeight,
        signature,
      });

      setSuccessMessage(`Successfully sent ${amount} ${selectedToken}! Signature: ${signature}`);
      setAmount("");
      setRecipientAddress("");
      fetchBalance();
      
      setTimeout(() => {
        onClose();
        setSuccessMessage("");
      }, 3000);

    } catch (error) {
      console.error("Error sending tokens:", error);
      setError(`Send failed: ${error.message}`);
    } finally {
      setLoading(false);
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
            <div style={{ position: 'relative' }}>
              <select
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value)}
                style={{
                  width: '100%',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#fff',
                  appearance: 'none',
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(243,99,22,0.18)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
                  transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(243,99,22,0.45)';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(243,99,22,0.08), inset 0 1px 0 rgba(255,255,255,0.03)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(243,99,22,0.18)';
                  e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.03)';
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
    </>
  );
}
