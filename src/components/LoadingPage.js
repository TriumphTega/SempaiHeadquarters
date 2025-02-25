"use client";

import { useState, useEffect } from "react";
import styles from "./LoadingPage.module.css"; // Updated to CSS module for scoped styling

export default function LoadingPage() {
  const [loading, setLoading] = useState(true);

  // Simulate loading delay (remove in production or tie to actual loading state)
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 3000); // 3-second delay, adjustable

    return () => clearTimeout(timer); // Cleanup on unmount
  }, []);

  return (
    <div className={`${styles.loadingContainer} ${!loading ? styles.hidden : ""}`}>
      <div className={styles.energyField}>
        <div className={styles.logoWrapper}>
          <img src="/images/logo.jpg" alt="Sempai HQ Logo" className={styles.logo} />
          <div className={styles.logoGlow}></div>
        </div>
        <div className={styles.particleSwarm}>
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className={styles.particle}></div>
          ))}
        </div>
      </div>
      <div className={styles.loadingBarWrapper}>
        <div className={styles.loadingBar}></div>
      </div>
      <h6 className={styles.loadingText}>Initializing Nexus...</h6>
    </div>
  );
}