'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '../../services/supabase/supabaseClient';
import ConnectButton from '../../components/ConnectButton'; // Ensure this component exists
import { v4 as uuidv4 } from 'uuid'; // To generate unique transaction IDs

export default function NovelsPage() {
  const { connected, publicKey } = useWallet(); // Solana wallet hook
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [novels, setNovels] = useState([]); // Store novels

  const checkBalance = async () => {
    if (!publicKey) {
      console.log("No public key found. Wallet might not be connected.");
      return;
    }

    try {
      console.log("Fetching balance for:", publicKey.toString());

      // Get the user_id from the 'users' table using the wallet address
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', publicKey.toString())
        .single();

      if (userError) {
        console.error('Error fetching user from users table:', userError);
        return;
      }

      if (!user) {
        console.log('User not found in the users table.');
        return;
      }

      const userId = user.id; // Use user.id as the user_id

      // Fetch balance from 'wallet_balances' using the user_id
      const { data: walletBalance, error: balanceError } = await supabase
        .from("wallet_balances")
        .select("amount")
        .eq("user_id", userId)
        .single();

      if (balanceError) {
        console.error("Error fetching user balance:", balanceError);
        return;
      }

      console.log("User balance:", walletBalance?.amount || 0);
      setBalance(walletBalance?.amount || 0);
      setLoading(false);
    } catch (error) {
      console.error("Unexpected error fetching balance:", error);
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!connected) {
      alert("Please connect your wallet first.");
      return;
    }

    if (balance <= 2499) {
      alert("You can withdraw minimum of 2500");
      return;
    }

    try {
      // Get the user_id from the 'users' table using the wallet address
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', publicKey.toString())
        .single();

      if (userError) {
        console.error('Error fetching user from users table:', userError);
        return;
      }

      if (!user) {
        console.log('User not found in the users table.');
        return;
      }

      const userId = user.id; // Use user.id as the user_id
      const transactionid = uuidv4(); // Generate unique transaction ID

      // Insert the withdrawal request into the 'pending_withdrawals' table
      const { error: insertError } = await supabase.from('pending_withdrawals').insert([{
        user_id: userId,
        amount: balance,
        transactionid,
        status: 'pending',
        createdat: new Date().toISOString(),
      }]);

      if (insertError) {
        console.error('Error inserting withdrawal request:', insertError);
        alert("Failed to initiate withdrawal.");
        return;
      }

      // Deduct balance from 'wallet_balances' table
      const { error: balanceError } = await supabase
        .from('wallet_balances')
        .update({ amount: 0 }) // Set balance to 0 (or reduce it)
        .eq('user_id', userId);

      if (balanceError) {
        console.error('Error deducting balance from wallet_balances:', balanceError);
        alert("Failed to deduct from wallet balance.");
        return;
      }

      // Deduct balance from 'users' table
      const { error: userBalanceError } = await supabase
        .from('users')
        .update({ balance: 0 }) // Set balance to 0 (or reduce it)
        .eq('id', userId);

      if (userBalanceError) {
        console.error('Error deducting balance from users:', userBalanceError);
        alert("Failed to update user balance.");
        return;
      }

      // Successfully processed the withdrawal
      alert("Withdrawal initiated successfully!");

      // Refresh balance after withdrawal
      checkBalance();
    } catch (error) {
      console.error("Error processing withdrawal:", error);
      alert("Something went wrong. Please try again.");
    }
  };

  // Fetch novels from Supabase
  const fetchNovels = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('novels').select('*');

      if (error) {
        console.error('Error fetching novels:', error.message);
        setLoading(false);
        return;
      }

      console.log('Novels fetched:', data);
      setNovels(data);
      setLoading(false);
    } catch (error) {
      console.error('Unexpected error fetching novels:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (connected && publicKey) {
      checkBalance();
    }
    fetchNovels();
  }, [connected, publicKey]);

  return (
    <div className="bg-black">
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark py-3 shadow">
        <div className="container">
          <Link href="/" className="navbar-brand">
            <img
              src="/images/logo.jpg"
              alt="Sempai HQ"
              className="navbar-logo"
              style={{ width: "40px", height: "40px", borderRadius: "50%" }}
            />
          </Link>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav me-auto text-center">
              <li className="nav-item">
                <Link href="/" className="nav-link text-light fw-semibold hover-effect">
                  Home
                </Link>
              </li>
              <li className="nav-item">
                <Link href="/swap" className="nav-link text-light fw-semibold hover-effect">
                  Swap
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <header className="bg-orange py-5 text-center text-white" style={{ background: 'linear-gradient(135deg,rgb(243, 99, 22), #feb47b)' }}>
        <div className="container">
          <h1 className="text-uppercase fw-bold" style={{ color: '#fff', fontFamily: 'Lora, serif' }}>
            Explore Our Collection
          </h1>
          <p className="text-muted mb-4" style={{ fontSize: '1.1rem', fontFamily: 'Open Sans, sans-serif' }}>
            Dive into a collection of captivating stories and immersive worlds.
          </p>

          {connected ? (
            <h5 className="text-success">
              Balance: {loading ? 'Loading...' : `${balance} SMP`}
              <button onClick={checkBalance} className="btn btn-sm btn-outline-dark ms-2">
                Refresh
              </button>
              <button onClick={handleWithdraw} className="btn btn-sm btn-outline-danger ms-2">
                Withdraw
              </button>
            </h5>
          ) : (
            <div className="alert alert-danger">
              Please connect your wallet to proceed.
              <ConnectButton />
            </div>
          )}
        </div>
      </header>

      <div className="container my-5">
        <div className="novels-grid row g-4 justify-content-center">
          {novels.length > 0 ? (
            novels.map((novel) => (
              <div key={novel.id} className="col-md-4 col-sm-6 col-12">
                <div className="image-container position-relative">
                  {connected ? (
                    <Link href={`/novel/${novel.id}`} className="text-decoration-none">
                      <img src={novel.image} className="img-fluid shadow rounded-3 hover-image" alt={novel.title} />
                      <div className="image-title position-absolute bottom-0 start-0 w-100 text-center p-3 bg-dark bg-opacity-50">
                        <h5 className="fw-bold text-uppercase text-white">{novel.title}</h5>
                      </div>
                    </Link>
                  ) : (
                    <div className="position-relative">
                      <img src={novel.image} className="img-fluid shadow rounded-3 hover-image" alt={novel.title} />
                      <div className="image-title position-absolute bottom-0 start-0 w-100 text-center p-3 bg-dark bg-opacity-50">
                        <h5 className="fw-bold text-uppercase text-white">{novel.title}</h5>
                      </div>
                      <div className="overlay d-flex align-items-center justify-content-center position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-50">
                        <ConnectButton />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-dark">No novels available.</p>
          )}
        </div>
      </div>
    </div>
  );
}
