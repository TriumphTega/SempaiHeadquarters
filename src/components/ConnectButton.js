'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase/firebase'; // Ensure this points to your Firebase setup

export default function ConnectButton() {
  const { connected, publicKey } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkWalletInFirestore = async () => {
      if (!connected || !publicKey) return;

      setIsLoading(true);

      try {
        const walletAddress = publicKey.toString();
        const walletDocRef = doc(db, 'readers', walletAddress);
        const walletDoc = await getDoc(walletDocRef);

        if (walletDoc.exists()) {
          console.log('Wallet already exists:', walletDoc.data());
          // Wallet exists, you can proceed with your logic
        } else {
          console.log('Wallet not found, creating new instance...');
          await setDoc(walletDocRef, {
            tokenBalance: 0,
          });
          console.log('New wallet instance created with tokenBalance 0.');
        }
      } catch (err) {
        console.error('Error checking wallet:', err.message);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    checkWalletInFirestore();
  }, [connected, publicKey]);

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center">
        <div className="spinner-border text-warning" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  return (
    <div>
      <WalletMultiButton className="btn btn-warning text-dark" />
      {connected}
    </div>
  );
}
