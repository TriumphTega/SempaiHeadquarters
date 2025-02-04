'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '../../services/supabase/supabaseClient';
import ConnectButton from '../../components/ConnectButton'; // Ensure this component exists
import { v4 as uuidv4 } from 'uuid'; // To generate unique transaction IDs
import LoadingPage from '../../components/LoadingPage';

export default function NovelsPage() {
  const { connected, publicKey } = useWallet(); // Solana wallet hook
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [novels, setNovels] = useState([]); // Store novels

  const [pendingWithdrawal, setPendingWithdrawal] = useState(0);

const checkBalance = async () => {
  if (!publicKey) {
    console.log("No public key found. Wallet might not be connected.");
    return;
  }

  try {
    console.log("Fetching balance for:", publicKey.toString());

    // Get user_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', publicKey.toString())
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return;
    }

    if (!user) {
      console.log('User not found in the users table.');
      return;
    }

    const userId = user.id;

    // Fetch wallet balance
    const { data: walletBalance, error: balanceError } = await supabase
      .from("wallet_balances")
      .select("amount")
      .eq("user_id", userId)
      .single();

    if (balanceError) {
      console.error("Error fetching balance:", balanceError);
      return;
    }

    setBalance(walletBalance?.amount || 0);

    // Fetch pending withdrawals
    const { data: pendingData, error: pendingError } = await supabase
      .from("pending_withdrawals")
      .select("amount")
      .eq("user_id", userId)
      .eq("status", "pending");

    if (pendingError) {
      console.error("Error fetching pending withdrawals:", pendingError);
      return;
    }

    // Sum pending withdrawal amounts
    const totalPending = pendingData.reduce((sum, withdrawal) => sum + withdrawal.amount, 0);
    setPendingWithdrawal(totalPending);

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

  if (loading) {
    return <LoadingPage />;
  }

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
          <div style={{
            background: '#000',
            padding: '20px',
            borderRadius: '15px',
            boxShadow: '0 4px 12px rgba(243, 99, 22, 0.7)',
            color: '#fff',
            fontFamily: 'Arial, sans-serif',
            maxWidth: '400px',
            margin: '20px auto',
            textAlign: 'center',
            border: '2px solid rgb(243, 99, 22)',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease'
          }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.03)';
              e.currentTarget.style.boxShadow = '0 6px 18px rgba(243, 99, 22, 1)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(243, 99, 22, 0.7)';
            }}
          >
            <h5 style={{ color: 'rgb(0, 255, 127)', fontSize: '1.5rem', marginBottom: '15px' }}>
              Balance: {loading ? 'Loading...' : `${balance} SMP`}
            </h5>
          
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}>
              <button 
                onClick={checkBalance} 
                style={{
                  backgroundColor: 'transparent',
                  color: '#fff',
                  border: '1px solid rgb(243, 99, 22)',
                  padding: '8px 15px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgb(243, 99, 22)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Refresh
              </button>
          
              <button 
                onClick={handleWithdraw} 
                style={{
                  backgroundColor: 'transparent',
                  color: '#fff',
                  border: '1px solid red',
                  padding: '8px 15px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'red'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Withdraw
              </button>
            </div>
          
            {pendingWithdrawal > 0 && (
              <p style={{ color: 'rgb(243, 156, 18)', fontWeight: 'bold', marginTop: '10px' }}>
                Pending Withdrawal: {pendingWithdrawal} SMP (Processing)
              </p>
            )}
          </div>
          
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
