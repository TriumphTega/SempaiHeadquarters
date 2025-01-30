'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { supabase } from '../services/supabase/supabaseClient'; // Correct import

export default function ConnectButton() {
  const { connected, publicKey } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userCreated, setUserCreated] = useState(false); // To track user creation status

  useEffect(() => {
    const createUserInSupabase = async () => {
      if (!connected || !publicKey) return;
  
      setIsLoading(true);
  
      try {
        const walletAddress = publicKey.toString();
  
        // Check if the user already exists in the 'users' table
        const { data: existingUser, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('wallet_address', walletAddress);
  
        if (fetchError) {
          console.error('Error fetching user:', fetchError.message);
          setError(fetchError.message);
          setIsLoading(false);
          return;
        }
  
        if (existingUser.length === 0) {
          // User does not exist, create a new user
          const { error: insertError } = await supabase
            .from('users')
            .insert([
              {
                wallet_address: walletAddress,
                name: walletAddress, // Set wallet address as name
                email: walletAddress, // Set wallet address as email
                isWriter: false, // Explicitly set isWriter to false
                isSuperuser: false, // Explicitly set isSuperuser to false
              },
            ]);
  
          if (insertError) {
            console.error('Error creating new user:', insertError.message);
            setError(insertError.message);
          } else {
            console.log('New user instance created with wallet address.');
          }
        } else {
          console.log('User already exists:', existingUser);
        }
      } catch (err) {
        console.error('Error creating user:', err.message);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
  
    createUserInSupabase();
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
      {userCreated && <p>User successfully created!</p>}
    </div>
  );
}
