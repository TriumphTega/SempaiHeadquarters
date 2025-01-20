'use client';

import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { NovelConnectButton } from '../components/NovelConnectButton';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';

import { useEffect, useState } from 'react';
import { novels } from '../novelsData'; // Import the novels data file
import { auth } from '../services/firebase/firebase'; // Import the initialized auth
import LoadingPage from '../components/LoadingPage';


export default function Home() {
  const { connected } = useWallet();
  const router = useRouter();
  const [isCreatorLoggedIn, setIsCreatorLoggedIn] = useState(false);

  useEffect(() => {
    // Set up a listener for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsCreatorLoggedIn(!!user); // Update state based on user's login status
    });

    return () => unsubscribe(); // Clean up the listener
  }, []);

  const handleCreatorAccess = () => {
    if (isCreatorLoggedIn) {
      router.push('/creators-dashboard'); // Redirect to dashboard if logged in
    } else {
      router.push('/creator-login'); // Redirect to login page if not logged in
    }
  };

  return (
    <div className="bg-black">
      <LoadingPage />
      {/* Navbar */}
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
      <ul className="navbar-nav ms-auto align-items-center">
        <li className="nav-item me-3">
          <WalletMultiButton className="btn btn-light btn-sm rounded-pill px-3 py-2 text-dark" />
        </li>
        <li className="nav-item">
          <button
            onClick={handleCreatorAccess}
            className="btn btn-warning btn-sm rounded-pill text-dark fw-bold px-4 py-2"
          >
            Creator Dashboard
          </button>
        </li>
      </ul>
    </div>
  </div>
</nav>


      {/* Hero Section */}
      <header className="bg-orange py-5 text-center text-white" style={{ background: 'linear-gradient(135deg,rgb(243, 99, 22), #feb47b)' }}>
        <div className="container">
          <h1 className="display-4 fw-bold">Welcome to Sempai HQ</h1>
          <p className="lead fs-4">Explore your favorite novels and earn tokens!</p>
        </div>
      </header>

      {/* Novels Grid */}
      <div className="container my-5">
        {novels && Object.keys(novels).length > 0 ? (
          <div className="g-4 row row-cols-1 row-cols-md-3">
            {Object.entries(novels).map(([id, novel]) => (
              <div key={id} className="col">
                <div className="bg-card card h-100 shadow-sm rounded-3 hover-card">
                  <img
                    src={novel.image}
                    className="card-img-top rounded-3"
                    alt={novel.title}
                  />
                  <div className="card-body">
                    <h5 className="card-title fw-bold text-orange text-uppercase">
                      {novel.title}
                    </h5>
                    <p className="card-text">Click to explore chapters</p>
                    {connected ? (
                      <Link href={`/novel/${id}`} className="btn btn-dark">
                        Read
                      </Link>
                    ) : (
                      <NovelConnectButton />
                    )}
                  </div>
                  
                </div>
                
              </div>

              
            ))}
            
            
            <div className="col">
                <div className="bg-card card h-100 shadow-sm rounded-3 hover-card">
                  <img
                    src="/images/novel-3.jpg"
                    className="card-img-top rounded-3"
                    alt="Hoard"
                  />
                  <div className="card-body">
                    <h5 className="card-title fw-bold text-orange text-uppercase">Hoard
                    </h5>
                    <p className="card-text">Click to explore more </p>
                    {connected ? (
                      <Link href={`/novels`} className="btn btn-dark">
                        Explore
                      </Link>
                    ) : (
                      <NovelConnectButton />
                    )}
                  </div>
                  
                </div>
                
              </div>
              <div className="col">
                <div className="bg-card card h-100 shadow-sm rounded-3 hover-card">
                  <img
                    src="/images/novel-4.jpg"
                    className="card-img-top rounded-3"
                    alt="Hoard"
                  />
                  <div className="card-body">
                    <h5 className="card-title fw-bold text-orange text-uppercase">KISS (Keep it Simple, Stupid)
                    </h5>
                    <p className="card-text">Click to explore more </p>
                    {connected ? (
                      <Link href={`/novels`} className="btn btn-dark">
                        Read
                      </Link>
                    ) : (
                      <NovelConnectButton />
                    )}
                  </div>
                  
                </div>
                
              </div>

              
          </div>
          
          
          
        ) : (
          <p className="text-center text-white">No novels available at the moment.</p>
        )}
      </div>

      

      {/* Footer */}
      <footer className="bg-dark py-4 text-center text-white shadow-lg">
        <p>&copy; 2025 Sempai HQ. All rights reserved.</p>
      </footer>
    </div>
  );
}
