"use client";

import { useState, useEffect, useContext } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, unpackAccount } from "@solana/spl-token";
import { AMETHYST_MINT_ADDRESS, SMP_MINT_ADDRESS, USDC_MINT_ADDRESS, SKR_MINT_ADDRESS, RPC_URL } from "@/constants";
import { FaTimes, FaGem, FaCoins, FaDollarSign, FaCopy, FaWallet, FaPaperPlane } from "react-icons/fa";
import { EmbeddedWalletContext } from "./EmbeddedWalletProvider";
import QRCode from "qrcode";

const connection = new Connection(RPC_URL);

const TOKEN_MINTS = {
  SOL: { mint: new PublicKey("So11111111111111111111111111111111111111112"), decimals: 9, symbol: "SOL", icon: <FaCoins />, logo: "/images/sol-logo.png" },
  JUP: { mint: new PublicKey("JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN"), decimals: 6, symbol: "JUP", icon: <FaGem />, logo: "/images/jup-logo.png" },
  AMETHYST: { mint: AMETHYST_MINT_ADDRESS, decimals: 6, symbol: "AMETHYST", icon: <FaGem />, logo: "/images/amethyst-logo.jpeg" },
  SMP: { mint: SMP_MINT_ADDRESS, decimals: 6, symbol: "SMP", icon: <FaGem />, logo: "/images/smp-logo.jpeg" },
  SKR: { mint: SKR_MINT_ADDRESS, decimals: 6, symbol: "SKR", icon: <FaGem />, logo: "/images/skr-logo.png" },
  USDC: { mint: USDC_MINT_ADDRESS, decimals: 6, symbol: "USDC", icon: <FaDollarSign />, logo: "/images/usdc-logo.png" },
};

export default function BalanceModal({ isOpen, onClose, activeWalletAddress }) {
  const { wallet: embeddedWallet } = useContext(EmbeddedWalletContext);
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState("");

  useEffect(() => {
    if (isOpen && activeWalletAddress) {
      fetchAllBalances();
      generateQRCode();
    }
  }, [isOpen, activeWalletAddress]);

  const fetchAllBalances = async () => {
    setLoading(true);
    const newBalances = {};

    try {
      for (const [symbol, token] of Object.entries(TOKEN_MINTS)) {
        let balance = 0;

        if (symbol === "SOL") {
          const solBalance = await connection.getBalance(new PublicKey(activeWalletAddress));
          balance = solBalance / 1_000_000_000;
        } else {
          const ataAddress = getAssociatedTokenAddressSync(token.mint, new PublicKey(activeWalletAddress));
          const ataInfo = await connection.getAccountInfo(ataAddress);
          if (ataInfo) {
            const ata = unpackAccount(ataAddress, ataInfo);
            balance = Number(ata.amount) / Math.pow(10, token.decimals);
          }
        }

        newBalances[symbol] = {
          balance,
          symbol: token.symbol,
          icon: token.icon,
          mint: token.mint.toString(),
        };
      }

      setBalances(newBalances);
    } catch (error) {
      console.error("Error fetching balances:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async () => {
    try {
      const qr = await QRCode.toDataURL(activeWalletAddress);
      setQrCode(qr);
    } catch (error) {
      console.error("Error generating QR code:", error);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const formatBalance = (balance) => {
    return balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  };

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @keyframes modalBackdropIn { from { opacity:0; } to { opacity:1; } }
        @keyframes modalContainerIn { from { opacity:0; transform:scale(0.92) translateY(20px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes balanceRowIn { from { opacity:0; transform:translateX(-12px); } to { opacity:1; transform:translateX(0); } }
        @keyframes spinOrange { to { transform:rotate(360deg); } }
        @keyframes borderRotateModal { from { filter: hue-rotate(0deg); } to { filter: hue-rotate(360deg); } }
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
        animation: 'modalBackdropIn 0.35s cubic-bezier(0.22,1,0.36,1) forwards',
      }}>

        <div style={{
          position: 'relative',
          width: '100%',
          maxWidth: '440px',
          maxHeight: '85vh',
          overflowY: 'auto',
          borderRadius: '24px',
          padding: '24px',
          background: 'rgba(12,12,18,0.92)',
          backdropFilter: 'blur(32px) saturate(160%)',
          WebkitBackdropFilter: 'blur(32px) saturate(160%)',
          border: '1px solid rgba(243,99,22,0.18)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(243,99,22,0.04), inset 0 1px 0 rgba(255,255,255,0.04)',
          animation: 'modalContainerIn 0.45s cubic-bezier(0.22,1,0.36,1) forwards',
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
            animation: 'borderRotateModal 8s linear infinite',
          }} />

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', position: 'relative', zIndex: 10 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '-0.01em', margin: 0 }}>
              <span style={{ color: 'rgba(243,99,22,0.9)', filter: 'drop-shadow(0 0 8px rgba(243,99,22,0.4))' }}>
                <FaWallet />
              </span>
              Your Portfolio
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

          {/* Wallet Address */}
          <div style={{
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
            position: 'relative',
            overflow: 'hidden',
            background: 'rgba(0,0,0,0.35)',
            border: '1px solid rgba(243,99,22,0.1)',
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '4px', color: 'rgba(255,255,255,0.35)', margin: '0 0 4px 0' }}>Wallet Address</p>
                <p style={{ fontSize: '14px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.8)', margin: 0 }}>
                  {activeWalletAddress?.slice(0, 6)}...{activeWalletAddress?.slice(-4)}
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(activeWalletAddress)}
                style={{ color: 'rgba(243,99,22,0.8)', background: 'rgba(243,99,22,0.08)', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', transition: 'all 0.3s' }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                title="Copy address"
              >
                <FaCopy size={14} />
              </button>
            </div>
          </div>

          {/* QR Code */}
          {qrCode && (
            <div style={{
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
              background: 'rgba(255,255,255,0.97)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}>
              <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '12px', color: 'rgba(0,0,0,0.5)', margin: '0 0 12px 0' }}>Receive</p>
              <div style={{ position: 'relative' }}>
                <img src={qrCode} alt="QR Code" style={{ width: '144px', height: '144px', borderRadius: '8px' }} />
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: '8px', pointerEvents: 'none', boxShadow: 'inset 0 0 20px rgba(243,99,22,0.08)' }} />
              </div>
              <p style={{ fontSize: '10px', marginTop: '8px', textAlign: 'center', color: 'rgba(0,0,0,0.35)', margin: '8px 0 0 0' }}>Scan to deposit</p>
            </div>
          )}

          {/* Token Balances */}
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '12px', color: 'rgba(255,255,255,0.3)', margin: '0 0 12px 0' }}>Token Balances</h3>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{
                  width: '28px', height: '28px',
                  border: '2.5px solid rgba(255,255,255,0.08)',
                  borderTopColor: 'rgba(243,99,22,0.8)',
                  borderRadius: '50%',
                  margin: '0 auto 12px auto',
                  animation: 'spinOrange 0.9s cubic-bezier(0.45,0.05,0.55,0.95) infinite',
                }} />
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>Loading balances...</p>
              </div>
            ) : (
              Object.entries(balances).map(([symbol, data], index) => (
                <div
                  key={symbol}
                  style={{
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'relative',
                    overflow: 'hidden',
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid rgba(255,255,255,0.04)',
                    backdropFilter: 'blur(8px)',
                    animation: `balanceRowIn 0.4s ${0.05 * index}s cubic-bezier(0.22,1,0.36,1) forwards`,
                    opacity: 0,
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0,0,0,0.4)';
                    e.currentTarget.style.borderColor = 'rgba(243,99,22,0.15)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(243,99,22,0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(0,0,0,0.25)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative', zIndex: 10 }}>
                    <img 
                      src={data.logo} 
                      alt={data.symbol}
                      style={{ 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '50%',
                        objectFit: 'contain',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    />
                    <div>
                      <p style={{ color: '#fff', fontWeight: 600, fontSize: '14px', margin: 0 }}>{data.symbol}</p>
                      <p style={{ fontSize: '10px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.25)', margin: '2px 0 0 0' }}>
                        {data.mint.slice(0, 8)}...{data.mint.slice(-8)}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', position: 'relative', zIndex: 10 }}>
                    <p style={{ color: '#fff', fontWeight: 700, fontSize: '16px', letterSpacing: '-0.02em', margin: 0 }}>{formatBalance(data.balance)}</p>
                    <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', margin: '2px 0 0 0' }}>{data.symbol}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '20px', position: 'relative', zIndex: 10 }}>
            <button
              onClick={() => {
                onClose();
                window.dispatchEvent(new CustomEvent('openSendModal'));
              }}
              style={{
                color: '#fff',
                padding: '14px 16px',
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: '14px',
                position: 'relative',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, rgba(243,99,22,0.85), rgba(200,60,10,0.85))',
                boxShadow: '0 4px 16px rgba(243,99,22,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
                border: '1px solid rgba(243,99,22,0.3)',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(243,99,22,0.3), inset 0 1px 0 rgba(255,255,255,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(243,99,22,0.2), inset 0 1px 0 rgba(255,255,255,0.1)';
              }}
            >
              <FaPaperPlane size={13} /> Send
            </button>
            <button
              onClick={() => copyToClipboard(activeWalletAddress)}
              style={{
                color: '#fff',
                padding: '14px 16px',
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: '14px',
                position: 'relative',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, rgba(76,175,80,0.7), rgba(46,125,50,0.7))',
                boxShadow: '0 4px 16px rgba(76,175,80,0.15), inset 0 1px 0 rgba(255,255,255,0.08)',
                border: '1px solid rgba(76,175,80,0.25)',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(76,175,80,0.25), inset 0 1px 0 rgba(255,255,255,0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(76,175,80,0.15), inset 0 1px 0 rgba(255,255,255,0.08)';
              }}
            >
              <FaCopy size={13} /> Receive
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
