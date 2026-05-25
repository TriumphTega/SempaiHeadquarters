import { useEffect, useState } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAccount, TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { AMETHYST_MINT_ADDRESS, SMP_MINT_ADDRESS, RPC_URL } from '@/constants';

const SOLANA_RPC_URL = RPC_URL;
const TREASURY_WALLET = "HSxUYwGM3NFzDmeEJ6o4bhyn8knmQmq7PLUZ6nZs4F58";

const TreasuryBalance = () => {
  const [amethystBalance, setAmethystBalance] = useState(null);
  const [smpBalance, setSmpBalance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBalances = async () => {
      try {
        const connection = new Connection(SOLANA_RPC_URL);
        const treasuryPublicKey = new PublicKey(TREASURY_WALLET);
        const amethystMintPublicKey = new PublicKey(AMETHYST_MINT_ADDRESS);
        const smpMintPublicKey = new PublicKey(SMP_MINT_ADDRESS);

        // Fetch Amethyst balance
        const amethystATA = await getAssociatedTokenAddress(amethystMintPublicKey, treasuryPublicKey);
        const amethystAccountInfo = await connection.getAccountInfo(amethystATA);
        
        let amethAmount = 0;
        if (amethystAccountInfo) {
          const amethystTokenAccount = await getAccount(connection, amethystATA);
          const tokenAmount = amethystTokenAccount.amount.toString();
          const tokenAmountFormatted = (BigInt(tokenAmount) / BigInt(10 ** 0)).toString();
          amethAmount = (parseInt(tokenAmountFormatted) / 1000000).toFixed(6);
        }
        setAmethystBalance(amethAmount);

        // Fetch SMP balance
        const smpATA = await getAssociatedTokenAddress(smpMintPublicKey, treasuryPublicKey);
        const smpAccountInfo = await connection.getAccountInfo(smpATA);
        
        let smpAmount = 0;
        if (smpAccountInfo) {
          const smpTokenAccount = await getAccount(connection, smpATA);
          const tokenAmount = smpTokenAccount.amount.toString();
          const tokenAmountFormatted = (BigInt(tokenAmount) / BigInt(10 ** 6)).toString();
          smpAmount = (parseInt(tokenAmountFormatted) / 1000000).toFixed(6);
        }
        setSmpBalance(smpAmount);

      } catch (error) {
        if (error.message && error.message.includes('429')) {
          console.log('Treasury balance rate limited, keeping last balance');
          setLoading(false);
          return;
        }
        console.error("Error fetching balances:", error);
        setAmethystBalance(0);
        setSmpBalance(0);
      } finally {
        setLoading(false);
      }
    };

    fetchBalances();
  }, []);

  if (loading) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '20px',
      }}>
        <div style={{
          width: '24px', height: '24px',
          border: '2.5px solid rgba(255,255,255,0.06)',
          borderTopColor: 'rgba(243,99,22,0.7)',
          borderRadius: '50%',
          margin: '0 auto',
          animation: 'treasurySpin 0.9s cubic-bezier(0.45,0.05,0.55,0.95) infinite',
        }} />
        <style>{`@keyframes treasurySpin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(8, 8, 14, 0.5)',
      backdropFilter: 'blur(16px) saturate(140%)',
      WebkitBackdropFilter: 'blur(16px) saturate(140%)',
      padding: '24px 28px',
      borderRadius: '20px',
      textAlign: 'center',
      maxWidth: '420px',
      margin: '24px auto 0',
      color: '#fff',
      border: '1px solid rgba(243, 99, 22, 0.12)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)',
      transition: 'all 0.4s cubic-bezier(0.22,1,0.36,1)',
      position: 'relative',
      overflow: 'hidden',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px) scale(1.01)';
        e.currentTarget.style.borderColor = 'rgba(243, 99, 22, 0.25)';
        e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,0,0,0.5), 0 0 30px rgba(243,99,22,0.06), inset 0 1px 0 rgba(255,255,255,0.04)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.borderColor = 'rgba(243, 99, 22, 0.12)';
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)';
      }}
    >
      {/* Subtle top accent line */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: '15%',
        right: '15%',
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(243,99,22,0.4), transparent)',
      }} />
      <p style={{
        fontSize: '0.65rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        margin: '0 0 12px',
        color: 'rgba(243, 99, 22, 0.7)',
      }}>
        Treasury
      </p>
      
      {/* Amethyst Balance */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        marginBottom: '16px',
      }}>
        <img 
          src="/images/amethyst-logo.jpeg" 
          alt="Amethyst" 
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: '2px solid rgba(163, 89, 255, 0.4)',
          }}
        />
        <div style={{ textAlign: 'left' }}>
          <h3 style={{
            fontSize: '0.85rem',
            margin: '0',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: 'rgba(255,255,255,0.8)',
          }}>
            Amethyst
          </h3>
          <p style={{
            fontSize: '1.4rem',
            fontWeight: 800,
            margin: '4px 0 0',
            color: '#fff',
            letterSpacing: '-0.02em',
            textShadow: '0 0 30px rgba(163,89,255,0.2)',
          }}>
            {Number(amethystBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
          </p>
        </div>
      </div>

      {/* SMP Balance */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        paddingTop: '16px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}>
        <img 
          src="/images/smp-logo.jpeg" 
          alt="SMP" 
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: '2px solid rgba(243, 99, 22, 0.4)',
          }}
        />
        <div style={{ textAlign: 'left' }}>
          <h3 style={{
            fontSize: '0.85rem',
            margin: '0',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: 'rgba(255,255,255,0.8)',
          }}>
            SMP
          </h3>
          <p style={{
            fontSize: '1.4rem',
            fontWeight: 800,
            margin: '4px 0 0',
            color: '#fff',
            letterSpacing: '-0.02em',
            textShadow: '0 0 30px rgba(243,99,22,0.2)',
          }}>
            {Number(smpBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
          </p>
        </div>
      </div>
    </div>
  );
  
  
};

export default TreasuryBalance;
