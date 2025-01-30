'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '../../services/supabase/supabaseClient';
import ConnectButton from '../../components/ConnectButton'; // Assuming you have a ConnectButton component

export default function NovelsPage() {
  const { connected, publicKey } = useWallet(); // Use wallet hook
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [novels, setNovels] = useState([]); // Add state for novels

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
      setLoading(false);
    } catch (error) {
      console.error("Unexpected error fetching balance:", error);
      setLoading(false);
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
      setNovels(data); // Store fetched novels
      setLoading(false);
    } catch (error) {
      console.error('Unexpected error fetching novels:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (connected && publicKey) {
      checkBalance(); // Fetch balance when wallet connects
    }
    fetchNovels(); // Fetch novels when the page loads
  }, [connected, publicKey]); // Run when connection changes

  return (
    <div className="bg-black">
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark py-3 shadow">
        <div className="container">
          {/* Brand Logo */}
          <Link href="/" className="navbar-brand">
            <img
              src="/images/ursa.jpg"
              alt="Sempai HQ"
              className="navbar-logo"
              style={{ width: "40px", height: "40px", borderRadius: "50%" }}
            />
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
          Explore Our Novels
        </h1>
        <p className="text-muted mb-4" style={{ fontSize: '1.1rem', fontFamily: 'Open Sans, sans-serif' }}>
          Dive into a collection of captivating stories and immersive worlds.
        </p>

        {/* Display Balance */}
        {connected ? (
          <h5 className="text-success">
            Balance: {loading ? 'Loading...' : `${balance} SMPT`}
            <button onClick={checkBalance} className="btn btn-sm btn-outline-dark ms-2">
              Refresh
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

      {/* Novels Grid */}
       {/* Novels Grid */}
       <div className="container my-5">
      <div className="novels-grid row g-4 justify-content-center">
        {/* Map over the fetched novels */}
        {novels.length > 0 ? (
          novels.map((novel) => (
            <div key={novel.id} className="col-md-4 col-sm-6 col-12">
              <div className="image-container position-relative">
                {/* Conditional Rendering Based on Connection Status */}
                {connected ? (
                  <Link href={`/novel/${novel.id}`} className="text-decoration-none">
                    {/* Image */}
                    <img
                      src={novel.image}
                      className="img-fluid shadow rounded-3 hover-image"
                      alt={novel.title}
                    />

                    {/* Title */}
                    <div className="image-title position-absolute bottom-0 start-0 w-100 text-center p-3 bg-dark bg-opacity-50">
                      <h5 className="fw-bold text-uppercase text-white">{novel.title}</h5>
                    </div>
                  </Link>
                ) : (
                  <div className="position-relative">
                    {/* Image */}
                    <img
                      src={novel.image}
                      className="img-fluid shadow rounded-3 hover-image"
                      alt={novel.title}
                    />

                    {/* Title */}
                    <div className="image-title position-absolute bottom-0 start-0 w-100 text-center p-3 bg-dark bg-opacity-50">
                      <h5 className="fw-bold text-uppercase text-white">{novel.title}</h5>
                    </div>

                    {/* Overlay for Disconnected Users */}
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
