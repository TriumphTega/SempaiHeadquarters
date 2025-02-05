import { useEffect, useState } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddress } from '@solana/spl-token';
import { useWallet } from '@solana/wallet-adapter-react';
import { AMETHYST_MINT_ADDRESS, RPC_URL } from '@/constants';

const UseAmethystBalance = () => {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { connected, publicKey } = useWallet();

  useEffect(() => {
    const fetchBalance = async () => {
      if (!connected || !publicKey) return;

      try {
        const connection = new Connection(RPC_URL);
        const amethystMintPublicKey = new PublicKey(AMETHYST_MINT_ADDRESS);

        // Get the associated token address for the connected wallet
        const associatedTokenAddress = await getAssociatedTokenAddress(
          amethystMintPublicKey,
          publicKey
        );

        const accountInfo = await connection.getAccountInfo(associatedTokenAddress);

        if (!accountInfo) {
          setBalance(0); // No token account found, balance is 0
          return;
        }

        const tokenAccount = await getAccount(connection, associatedTokenAddress);
        const tokenAmount = tokenAccount.amount.toString();
        const decimals = 6; // Assuming Amethyst has 6 decimals

        const finalAmount = (BigInt(tokenAmount) / BigInt(10 ** decimals)).toString();
        setBalance(finalAmount);
      } catch (err) {
        console.error("Error fetching balance:", err);
        setError(err);
        setBalance(0);
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
  }, [connected, publicKey]);

  return { balance, loading, error };
};

export default UseAmethystBalance;
