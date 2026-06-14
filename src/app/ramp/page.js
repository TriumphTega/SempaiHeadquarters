"use client";

import { useState, useContext } from "react";
import { useAuth } from "@/components/AuthProvider";
import { EmbeddedWalletContext } from "@/components/EmbeddedWalletProvider";
import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";
import { FaCreditCard, FaArrowLeft, FaInfoCircle } from "react-icons/fa";
import Link from "next/link";
import styles from "@/styles/RampPage.module.css";

// Dynamic import for MoonPay widget to avoid SSR issues
const MoonPayBuyWidget = dynamic(
  () => import("@moonpay/moonpay-react").then((mod) => mod.MoonPayBuyWidget),
  { ssr: false }
);

export default function RampPage() {
  const { user } = useAuth();
  const { wallet: embeddedWallet } = useContext(EmbeddedWalletContext);
  const { publicKey: externalPublicKey, connected: externalConnected } = useWallet();
  const [selectedProvider, setSelectedProvider] = useState("moonpay");
  const [amount, setAmount] = useState("");
  const [showMoonpayWidget, setShowMoonpayWidget] = useState(false);

  // Check if wallet is connected (either embedded or external)
  const isWalletConnected = embeddedWallet || (externalConnected && externalPublicKey);
  const walletAddress = embeddedWallet?.publicKey || (externalConnected && externalPublicKey?.toBase58());

  const providers = [
    {
      id: "moonpay",
      name: "MoonPay",
      description: "Buy crypto with credit card, bank transfer, or Apple Pay",
      icon: "🌙",
      url: "https://moonpay.com",
      features: ["Fast verification", "High limits", "Mobile-friendly", "In-app widget"]
    }
  ];

  const handleBuyCrypto = (providerId) => {
    if (providerId === "moonpay") {
      if (!isWalletConnected) {
        alert("Please connect your wallet first");
        return;
      }
      setShowMoonpayWidget(true);
    }
  };

  return (
    <div className={styles.rampContainer}>
      <nav className={styles.navbar}>
        <Link href="/" className={styles.navLink}>
          <FaArrowLeft /> Back to Home
        </Link>
        <div className={styles.logo}>
          <FaCreditCard /> Ramp - Buy Crypto
        </div>
      </nav>

      <main className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Buy Crypto with Ramp</h1>
          <p className={styles.subtitle}>
            Purchase SOL, USDC, SMP, and other tokens easily with your preferred payment method
          </p>
        </div>

        {isWalletConnected ? (
          <div className={styles.userSection}>
            <div className={styles.userInfo}>
              <FaInfoCircle />
              <span>Connected: {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}</span>
            </div>
          </div>
        ) : (
          <div className={styles.warningSection}>
            <FaInfoCircle />
            <p>Connect your wallet to see your address and make purchases</p>
          </div>
        )}

        <div className={styles.providersSection}>
          <h2 className={styles.sectionTitle}>Choose Your Provider</h2>
          <div className={styles.providersGrid}>
            {providers.map((provider) => (
              <div
                key={provider.id}
                className={`${styles.providerCard} ${selectedProvider === provider.id ? styles.selected : ''}`}
                onClick={() => setSelectedProvider(provider.id)}
              >
                <div className={styles.providerHeader}>
                  <span className={styles.providerIcon}>{provider.icon}</span>
                  <h3 className={styles.providerName}>{provider.name}</h3>
                </div>
                <p className={styles.providerDescription}>{provider.description}</p>
                <ul className={styles.providerFeatures}>
                  {provider.features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
                <button
                  className={styles.buyButton}
                  onClick={() => handleBuyCrypto(provider.id)}
                >
                  Open MoonPay Widget
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.infoSection}>
          <h2 className={styles.sectionTitle}>How It Works</h2>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>1</div>
              <div className={styles.stepContent}>
                <h3>Choose a Provider</h3>
                <p>Select from our trusted crypto onboarding providers</p>
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>2</div>
              <div className={styles.stepContent}>
                <h3>Complete KYC</h3>
                <p>Verify your identity with the provider (one-time process)</p>
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>3</div>
              <div className={styles.stepContent}>
                <h3>Buy Crypto</h3>
                <p>Use your preferred payment method to purchase crypto</p>
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>4</div>
              <div className={styles.stepContent}>
                <h3>Start Using</h3>
                <p>Your crypto will be sent directly to your wallet</p>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.supportSection}>
          <h2 className={styles.sectionTitle}>Need Help?</h2>
          <p className={styles.supportText}>
            If you encounter any issues during the purchase process, please contact the provider's support team directly.
            Each provider has dedicated 24/7 support to assist you.
          </p>
        </div>

        {showMoonpayWidget && (
          <div className={styles.moonpayOverlay}>
            <button
              className={styles.closeOverlay}
              onClick={() => setShowMoonpayWidget(false)}
            >
              <FaArrowLeft /> Close
            </button>
            <MoonPayBuyWidget
              variant="overlay"
              baseCurrencyCode="usd"
              baseCurrencyAmount={amount || "100"}
              defaultCurrencyCode="sol"
              walletAddress={walletAddress}
              onLogin={async () => console.log("Customer logged in!")}
              visible={showMoonpayWidget}
            />
          </div>
        )}
      </main>
    </div>
  );
}
