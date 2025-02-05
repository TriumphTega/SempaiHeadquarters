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
    return <div>Loading...</div>;
  }

  return (
    <div style={{
      background: 'black',
      padding: '20px',
      borderRadius: '15px',
      boxShadow: '0 4px 12px rgba(243, 99, 22, 0.7)',
      textAlign: 'center',
      maxWidth: '400px',
      margin: '20px auto',
      color: '#fff',
      fontFamily: 'Arial, sans-serif',
      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
      border: '2px solid rgb(243, 99, 22)'
    }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'scale(1.05)';
        e.currentTarget.style.boxShadow = '0 6px 18px rgba(243, 99, 22, 1)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(243, 99, 22, 0.7)';
      }}
    >
      <h3 style={{
        fontSize: '1.8rem',
        margin: '0',
        letterSpacing: '1px',
        color: 'rgb(243, 99, 22)',
      }}>
        Amethyst Treasury Balance
      </h3>
      <p style={{
        fontSize: '2.5rem',
        fontWeight: 'bold',
        margin: '10px 0 0',
        color: '#FFFFFF',
      }}>
        {Number(balance)} AMT
      </p>
    </div>
  );
  
  
};

export default TreasuryBalance;
