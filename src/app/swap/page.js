'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BootstrapProvider from '../../components/BootstrapProvider';
import ConnectButton from '../../components/ConnectButton'; // Assuming you have a button to connect wallet
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import Link from 'next/link';
import { supabase } from '../../services/supabase/supabaseClient';





export default function SwapPage() {
  const { connected, publicKey, wallet, disconnect } = useWallet(); // Use the wallet adapter's hook
  const [amount, setAmount] = useState('');
  const [coinFrom, setCoinFrom] = useState('SOL');
  const [coinTo, setCoinTo] = useState('USDT');
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const checkBalance = async () => {
    if (!publicKey) {
      console.log("No public key found. Wallet might not be connected.");
      return;
    }
  
    try {
      console.log("Fetching balance from users table for:", publicKey.toString());
  
      const { data: user, error } = await supabase
        .from("users")
        .select("balance")
        .eq("wallet_address", publicKey.toString())
        .single();
  
      if (error) {
        console.error("Error fetching user balance:", error);
        return;
      }
  
      console.log("User balance fetched:", user?.balance || 0);
      setBalance(user?.balance || 0); // Set balance (default to 0 if not found)
    } catch (error) {
      console.error("Unexpected error fetching balance:", error);
    }
  };
  useEffect(() => {
    if (connected) {
      checkBalance(); // Fetch balance from Supabase when wallet connects
    }
  }, [connected, publicKey]); // Run when connection changes
    


  // Handle the coin swap
  const handleSwap = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    if (!connected) {
      alert('Please connect your wallet first');
      return;
    }

    setLoading(true);

    try {
      // Simulate swap process here
      // In a real implementation, you would call a smart contract or API for swapping coins
      console.log(`Swapping ${amount} ${coinFrom} to ${coinTo}`);
      setTimeout(() => {
        alert('Swap successful!');
        setLoading(false);
      }, 2000);
    } catch (error) {
      console.error('Error swapping coins:', error);
      alert('Swap failed. Please try again.');
      setLoading(false);
    }
  };

    

  return (
    <div >
      <BootstrapProvider />
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark py-3 shadow">
        <div className="container">
          {/* Brand Logo */}
          <Link href="/" className="navbar-brand">
            <img src="images/ursa.jpg" alt="Sempai HQ" className="navbar-logo" />
          </Link>
          {/* Toggle Button for Mobile View */}
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
          {/* Navbar Links */}
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav me-auto">
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
            {/* Wallet and Creator Dashboard */}
          
          </div>
        </div>
      </nav>


      <header className="bg-orange py-5 text-center text-white" style={{ background: 'linear-gradient(135deg,rgb(243, 99, 22), #feb47b)' }}>
        <div className="container">
          <h1 className="display-4">Coin Swap</h1>
          <p className="lead">Swap your coins easily and securely.</p>
        </div>
      </header>

      <div className="container my-5">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6">
            <div className="card shadow-lg border-0">
              <div>
                {!connected ? (
                  <div className="alert alert-danger">
                    Please connect your wallet to proceed.
                    <ConnectButton />
                  </div>
                ) : (
                  <div className='bubble-form'>
                    <h4 className=" mb-4 form-label">Swap {coinFrom} for {coinTo}</h4>
                    <h5 className="text-success">
                      Balance: {balance} SMPT  
                      <button onClick={checkBalance} className="btn btn-sm btn-outline-primary ms-2">
                        Refresh
                      </button>
                    </h5>



                    <div className="mb-3 form-label">
                      <label className="form-label">Amount to Swap</label>
                      <input
                        type="number"
                        className="form-control"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        min="0"
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">From</label>
                      <select
                        className="form-select"
                        value={coinFrom}
                        onChange={(e) => setCoinFrom(e.target.value)}
                      >
                        <option value="SOL">Solana (SOL)</option>
                        <option value="USDT">Tether (USDT)</option>
                        {/* Add more coins as needed */}
                      </select>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">To</label>
                      <select
                        className="form-select"
                        value={coinTo}
                        onChange={(e) => setCoinTo(e.target.value)}
                      >
                        <option value="USDT">Tether (USDT)</option>
                        <option value="SOL">Solana (SOL)</option>
                        {/* Add more coins as needed */}
                      </select>
                    </div>

                    <button
                      className="btn btn-warning w-100"
                      onClick={handleSwap}
                      disabled={loading}
                    >
                      {loading ? 'Swapping...' : 'Swap Coins'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="bg-dark py-4 text-center text-white">
        <p>&copy; 2025 Sempai HQ. All rights reserved.</p>
      </footer>
    </div>
  );
}
