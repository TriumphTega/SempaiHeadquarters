"use client";

import { useState } from "react";
import Link from "next/link";
import { FaGem, FaArrowLeft } from "react-icons/fa";
import styles from "../../styles/MintPage.module.css"; // Import CSS module

export default function MintPage() {
  const [isMinting, setIsMinting] = useState(false);

  const handleMint = () => {
    setIsMinting(true);
    // Simulate minting process (replace with your actual mint logic)
    setTimeout(() => {
      setIsMinting(false);
      alert("Minting completed successfully!");
    }, 2000);
  };

  return (
    <div className={`${styles.page} container-fluid min-vh-100 d-flex flex-column text-white`}>
      {/* Header */}
      <header className={`${styles.header} navbar navbar-dark bg-dark border-bottom border-orange py-3`}>
        <div className="container d-flex justify-content-between align-items-center">
          <Link href="/" className={`${styles.logoLink} navbar-brand d-flex align-items-center`}>
            <FaGem className="me-2" />
            <span>Sempai Mint</span>
          </Link>
          <Link href="/" className={`${styles.backLink} text-orange d-flex align-items-center`}>
            <FaArrowLeft className="me-1" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow-1 d-flex align-items-center justify-content-center py-5">
        <div className="container text-center">
          <h1 className={`${styles.title} display-4 fw-bold mb-4`}>
            Mint Your Exclusive NFT
          </h1>
          <p className={`${styles.subtitle} lead text-gray mb-5 mx-auto`}>
            Join the Sempai community by minting your unique NFT. Unlock special perks and become part of the creative revolution!
          </p>
          <div className="position-relative d-inline-block">
            <button
              onClick={handleMint}
              disabled={isMinting}
              className={`${styles.mintButton} btn ${isMinting ? "btn-secondary" : "btn-orange"} px-5 py-3 fw-semibold`}
            >
              {isMinting ? (
                <span className="d-flex align-items-center justify-content-center">
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Minting...
                </span>
              ) : (
                "Mint Now"
              )}
            </button>
            <div className={`${styles.buttonGlow} position-absolute top-0 start-0 end-0 bottom-0`}></div>
          </div>
          <div className="mt-4 text-gray">
            <p>Limited supply available. Act fast!</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={`${styles.footer} bg-dark border-top border-orange py-3`}>
        <div className="container text-center text-gray">
          <p className="mb-0">© 2025 SempaiHQ. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}