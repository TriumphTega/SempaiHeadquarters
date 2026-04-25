import { useEffect, useState } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAccount, TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { AMETHYST_MINT_ADDRESS, RPC_URL } from '@/constants';

const SOLANA_RPC_URL = RPC_URL; // Replace with your RPC URL
const TREASURY_WALLET = "HSxUYwGM3NFzDmeEJ6o4bhyn8knmQmq7PLUZ6nZs4F58"; // The treasury wallet address

const TreasuryBalance = () => {
  const [balance, setBalance] = useState(null); // Keep balance as BigInt (or string)
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const connection = new Connection(SOLANA_RPC_URL);
        const treasuryPublicKey = new PublicKey(TREASURY_WALLET);
        const amethystMintPublicKey = new PublicKey(AMETHYST_MINT_ADDRESS);

        // Find the associated token address for the treasury wallet and Amethyst mint
        const associatedTokenAddress = await getAssociatedTokenAddress(amethystMintPublicKey, treasuryPublicKey);

        console.log("Treasury Wallet Address:", treasuryPublicKey.toString());
        console.log("Amethyst Mint Address:", amethystMintPublicKey.toString());
        console.log("Associated Token Address:", associatedTokenAddress.toString());

        // Check if the associated token account exists
        const accountInfo = await connection.getAccountInfo(associatedTokenAddress);
        
        if (!accountInfo) {
          console.log("Associated token account not found.");
          setBalance(0); // No account found, so set balance to 0
          return;
        }

        // Get the account info and fetch the balance
        const tokenAccount = await getAccount(connection, associatedTokenAddress);

        // Convert to string and add six decimals
        const tokenAmount = tokenAccount.amount.toString(); // Token amount as string
        const decimals = 0; // Assuming the token has 6 decimals
        const tokenAmountWithDecimals = (BigInt(tokenAmount) / BigInt(10 ** decimals)).toString(); // Divide by 10^6 for 6 decimals

        // Display balance with six decimal places
        const tokenAmountFormatted = (BigInt(tokenAmount) / BigInt(10 ** decimals)).toString();
        const finalAmount = (parseInt(tokenAmountFormatted) / 1000000).toFixed(6); // Convert to float and format with 6 decimals

        setBalance(finalAmount); // Set formatted balance
      } catch (error) {
        console.error("Error fetching balance:", error);
        setBalance(0); // If an error occurs, set balance to 0
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
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
      padding: '20px 28px',
      borderRadius: '20px',
      textAlign: 'center',
      maxWidth: '380px',
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
        margin: '0 0 8px',
        color: 'rgba(243, 99, 22, 0.7)',
      }}>
        Treasury
      </p>
      <h3 style={{
        fontSize: '1.1rem',
        margin: '0',
        fontWeight: 700,
        letterSpacing: '-0.01em',
        color: '#fff',
        textShadow: '0 0 20px rgba(243,99,22,0.15)',
      }}>
        Amethyst Balance
      </h3>
      <p style={{
        fontSize: '2rem',
        fontWeight: 800,
        margin: '10px 0 0',
        color: '#fff',
        letterSpacing: '-0.02em',
        textShadow: '0 0 30px rgba(243,99,22,0.2)',
      }}>
        {Number(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'rgba(243,99,22,0.7)' }}>AMT</span>
      </p>
    </div>
  );
  
  
};

export default TreasuryBalance;
