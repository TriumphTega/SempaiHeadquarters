"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FaExchangeAlt, FaTimes } from "react-icons/fa";
import styles from "../styles/MigrationBanner.module.css";

export default function MigrationBanner({ userId, userEmail }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if user has email - if not, show migration banner
    if (userId && !userEmail) {
      // Check if user has dismissed the banner in this session
      const dismissed = sessionStorage.getItem(`migration-banner-dismissed-${userId}`);
      if (!dismissed) {
        setIsVisible(true);
      }
    }
  }, [userId, userEmail]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    // Store dismissal in session storage (will reset on browser close)
    sessionStorage.setItem(`migration-banner-dismissed-${userId}`, "true");
  };

  if (!isVisible || isDismissed) return null;

  return (
    <div className={styles.banner}>
      <div className={styles.content}>
        <FaExchangeAlt className={styles.icon} />
        <div className={styles.message}>
          <strong>Important: Secure Your Account</strong>
          <p>
            Link your email and migrate to a new wallet to ensure you can recover your account if
            you lose access to your current wallet.
          </p>
        </div>
        <Link href="/migrate-wallet" className={styles.actionButton}>
          Migrate Now
        </Link>
        <button onClick={handleDismiss} className={styles.closeButton} aria-label="Dismiss">
          <FaTimes />
        </button>
      </div>
    </div>
  );
}
