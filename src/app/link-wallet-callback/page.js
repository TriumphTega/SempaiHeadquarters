"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/services/supabase/supabaseClient";
import { FaSpinner, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import styles from "./LinkCallback.module.css";

function LinkWalletCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const walletAddress = searchParams.get("wallet");
  
  const [status, setStatus] = useState("processing"); // processing, success, error
  const [message, setMessage] = useState("Linking your wallet to email...");
  const [error, setError] = useState("");

  useEffect(() => {
    const linkWallet = async () => {
      if (!walletAddress) {
        setStatus("error");
        setError("No wallet address found in callback");
        return;
      }

      try {
        // Get current authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          throw new Error("Authentication failed. Please try again.");
        }

        setMessage(`Linking wallet to ${user.email}...`);

        // Call the link API
        const response = await fetch("/api/link-wallet-to-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            walletAddress,
            authUserId: user.id,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to link wallet");
        }

        setStatus("success");
        setMessage(data.message);

        // Redirect to profile after 3 seconds
        setTimeout(() => {
          router.push("/editprofile");
        }, 3000);

      } catch (err) {
        console.error("Wallet linking error:", err);
        setStatus("error");
        setError(err.message || "Failed to link wallet to email");
      }
    };

    linkWallet();
  }, [walletAddress, router]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {status === "processing" && (
          <>
            <FaSpinner className={styles.spinner} />
            <h2>Linking Wallet</h2>
            <p>{message}</p>
          </>
        )}

        {status === "success" && (
          <>
            <FaCheckCircle className={styles.successIcon} />
            <h2>Successfully Linked!</h2>
            <p>{message}</p>
            <div className={styles.walletInfo}>
              <strong>Wallet:</strong>
              <code>{walletAddress}</code>
            </div>
            <p className={styles.redirect}>Redirecting to your profile...</p>
          </>
        )}

        {status === "error" && (
          <>
            <FaExclamationCircle className={styles.errorIcon} />
            <h2>Linking Failed</h2>
            <p className={styles.errorMessage}>{error}</p>
            <button
              className={styles.retryButton}
              onClick={() => router.push("/")}
            >
              Go to Home
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function LinkWalletCallback() {
  return (
    <Suspense
      fallback={
        <div className={styles.container}>
          <div className={styles.card}>
            <FaSpinner className={styles.spinner} />
            <h2>Loading...</h2>
            <p>Please wait...</p>
          </div>
        </div>
      }
    >
      <LinkWalletCallbackContent />
    </Suspense>
  );
}
