'use client';

import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { NovelConnectButton } from '../components/NovelConnectButton';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../services/firebase/firebase'; // Import the initialized Firebase services
import LoadingPage from '../components/LoadingPage';
import BootstrapProvider from "../components/BootstrapProvider";
import "bootstrap/dist/css/bootstrap.min.css";

export default function Home() {
  const { connected } = useWallet();
  const router = useRouter();
  const [isCreatorLoggedIn, setIsCreatorLoggedIn] = useState(false);
  const [novels, setNovels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up a listener for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsCreatorLoggedIn(!!user); // Update state based on user's login status
    });

    return () => unsubscribe(); // Clean up the listener
  }, []);

  useEffect(() => {
    // Fetch novels from Firestore
    const fetchNovels = async () => {
      try {
        const novelsCollection = collection(db, 'novels'); // Reference to the 'novels' collection
        const novelsSnapshot = await getDocs(novelsCollection);
        const novelsData = novelsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setNovels(novelsData); // Set the fetched novels data
      } catch (error) {
        console.error('Error fetching novels:', error);
      } finally {
        setLoading(false); // Stop loading
      }
    };

    fetchNovels();
  }, []);

  const handleCreatorAccess = () => {
    if (isCreatorLoggedIn) {
      router.push('/creators-dashboard'); // Redirect to dashboard if logged in
    } else {
      router.push('/creator-login'); // Redirect to login page if not logged in
    }
  };

  if (loading) {
    return <LoadingPage />;
  }

  return (
    <div className="bg-black">
      <BootstrapProvider />
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
        {novels.length > 0 ? (
          <div className="row g-4">
            {novels.map((novel) => (
              <div key={novel.id} className="col-md-4">
                <div className="image-container">
                  <Link href={`/novel/${novel.id}`} className="text-decoration-none">
                    <img
                      src={novel.image}
                      className="img-fluid shadow rounded-3 hover-image"
                      alt={novel.title}
                    />
                    <div className="image-title">
                      <h5 className="fw-bold text-uppercase">{novel.title}</h5>
                    </div>
                  </Link>
                  {!connected && (
                    <div className="overlay d-flex align-items-center justify-content-center">
                      <NovelConnectButton />
                    </div>
                  )}
                </div>
                
              </div>
              
            ))}
             {/* Card Example */}
          <div className="col-md-4">
              <div className="image-container">
                {/* Conditional Rendering Based on Connection Status */}
                {connected ? (
                  <Link href="/novels" className="text-decoration-none">
                    {/* Image */}
                    <img
                      src="/images/novel-3.jpg"
                      className="img-fluid shadow rounded-3 hover-image"
                      alt="KISS (Keep it simple, stupid)"
                    />

                    {/* Title */}
                    <div className="image-title">
                      <h5 className="fw-bold text-uppercase">Hoard</h5>
                    </div>
                  </Link>
                ) : (
                  <div className="position-relative">
                    {/* Image */}
                    <img
                      src="/images/novel-4.jpg"
                      className="img-fluid shadow rounded-3 hover-image"
                      alt="KISS (Keep it simple, stupid)"
                    />

                    {/* Title */}
                    <div className="image-title">
                      <h5 className="fw-bold text-uppercase">Hoard</h5>
                    </div>

                    {/* Overlay for Disconnected Users */}
                    <div className="overlay d-flex align-items-center justify-content-center">
                      <NovelConnectButton />
                    </div>
                  </div>
                )}
              </div>
              </div>

{/* Card Example */}
<div className="col-md-4">
              <div className="image-container">
                {/* Conditional Rendering Based on Connection Status */}
                {connected ? (
                  <Link href="/novels" className="text-decoration-none">
                    {/* Image */}
                    <img
                      src="/images/novel-4.jpg"
                      className="img-fluid shadow rounded-3 hover-image"
                      alt="KISS (Keep it simple, stupid)"
                    />

                    {/* Title */}
                    <div className="image-title">
                      <h5 className="fw-bold text-uppercase">KISS (Keep it simple, stupid)</h5>
                    </div>
                  </Link>
                ) : (
                  <div className="position-relative">
                    {/* Image */}
                    <img
                      src="/images/novel-4.jpg"
                      className="img-fluid shadow rounded-3 hover-image"
                      alt="KISS (Keep it simple, stupid)"
                    />

                    {/* Title */}
                    <div className="image-title">
                      <h5 className="fw-bold text-uppercase">KISS (Keep it simple, stupid)</h5>
                    </div>

                    {/* Overlay for Disconnected Users */}
                    <div className="overlay d-flex align-items-center justify-content-center">
                      <NovelConnectButton />
                    </div>
                  </div>
                )}
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
