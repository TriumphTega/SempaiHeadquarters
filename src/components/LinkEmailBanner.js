"use client";

import { useState } from "react";
import { FaEnvelope, FaTimes, FaShieldAlt, FaGoogle } from "react-icons/fa";
import styles from "../styles/LinkEmailBanner.module.css";
import { supabase } from "@/services/supabase/supabaseClient";

export default function LinkEmailBanner({ walletAddress, onDismiss, onLinked }) {
  const [isLinking, setIsLinking] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleLinkWithGoogle = async () => {
    setIsLinking(true);
    setError("");

    try {
      // Sign in with Google
      const { data, error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/link-wallet-callback?wallet=${walletAddress}`,
        },
      });

      if (signInError) throw signInError;

      // OAuth redirect will handle the rest
    } catch (err) {
      console.error("Google sign-in error:", err);
      setError(err.message || "Failed to sign in with Google");
      setIsLinking(false);
    }
  };

  const handleLinkWithEmail = async () => {
    // You can implement magic link email sign-in here
    setError("Email sign-in coming soon. Please use Google for now.");
  };

  return (
    <>
      {/* Banner */}
      <div className={styles.banner}>
        <div className={styles.bannerContent}>
          <div className={styles.bannerIcon}>
            <FaShieldAlt />
          </div>
          <div className={styles.bannerText}>
            <strong>🔒 Secure Your Account</strong>
            <p>Link your email to enable account recovery if you lose access to your wallet</p>
          </div>
        </div>
        <div className={styles.bannerActions}>
          <button
            className={styles.linkButton}
            onClick={() => setShowModal(true)}
          >
            <FaEnvelope /> Link Email
          </button>
          <button
            className={styles.dismissButton}
            onClick={onDismiss}
            title="Dismiss (you can link later in settings)"
          >
            <FaTimes />
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => !isLinking && setShowModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>
                <FaShieldAlt /> Link Email to Wallet
              </h2>
              <button
                className={styles.modalClose}
                onClick={() => setShowModal(false)}
                disabled={isLinking}
              >
                <FaTimes />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.infoBox}>
                <h3>Why link your email?</h3>
                <ul>
                  <li>✅ Recover your account if you lose wallet access</li>
                  <li>✅ Sign in with email OR wallet (your choice)</li>
                  <li>✅ Receive important notifications</li>
                  <li>✅ Enhanced security for your assets</li>
                </ul>
              </div>

              <div className={styles.walletInfo}>
                <strong>Wallet to Link:</strong>
                <code>{walletAddress}</code>
              </div>

              <div className={styles.signInOptions}>
                <button
                  className={styles.googleButton}
                  onClick={handleLinkWithGoogle}
                  disabled={isLinking}
                >
                  <FaGoogle /> {isLinking ? "Signing in..." : "Continue with Google"}
                </button>

                <div className={styles.divider}>
                  <span>or</span>
                </div>

                <button
                  className={styles.emailButton}
                  onClick={handleLinkWithEmail}
                  disabled={isLinking}
                >
                  <FaEnvelope /> Continue with Email
                </button>
              </div>

              {error && <div className={styles.error}>{error}</div>}
              {success && <div className={styles.success}>{success}</div>}

              <div className={styles.disclaimer}>
                <small>
                  🔒 Your wallet will remain under your control. Linking email only adds a recovery option.
                </small>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
