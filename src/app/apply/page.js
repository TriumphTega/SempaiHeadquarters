"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../services/supabase/supabaseClient";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Popup from "../../components/Popup";
import styles from "../../styles/ApplyForCreator.module.css";

export default function ApplyForCreator() {
  const { connected, publicKey } = useWallet();
  const [userId, setUserId] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("writer"); // Default to writer
  const [reason, setReason] = useState("");
  const [submissionLink, setSubmissionLink] = useState(""); // Optional field
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const router = useRouter();

  // Fetch user_id, email, and name from users table using wallet_address
  useEffect(() => {
    const fetchUserId = async () => {
      if (!connected || !publicKey) return;

      const { data, error } = await supabase
        .from("users")
        .select("id, email, name")
        .eq("wallet_address", publicKey.toString())
        .single();

      if (error) {
        setError("User not found. Make sure your wallet is connected.");
        return;
      }

      setUserId(data.id); // Expecting UUID
      setEmail(data.email || "");
      setName(data.name || "");
    };

    fetchUserId();
  }, [connected, publicKey]);

  const handlePopupSubmit = (reason) => {
    setReason(reason);
    setShowPopup(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!reason) {
      setError("Reason is required!");
      return;
    }

    if (!userId) {
      setError("Invalid user. Please connect your wallet.");
      return;
    }

    const { error } = await supabase.from("creator_applications").insert([
      {
        user_id: userId, // UUID from users table
        name,
        email,
        role, // "writer" or "artist"
        reason,
        submission_link: submissionLink || null, // Optional, set to null if empty
        application_status: "pending",
      },
    ]);

    if (error) {
      setError(error.message);
    } else {
      setSuccess("Your application has been submitted successfully!");
      setReason("");
      setSubmissionLink(""); // Reset optional field
      setRole("writer"); // Reset to default
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.formWrapper}>
        <h2 className={styles.title}>Apply to Become a Creator</h2>

        {!connected ? (
          <div className={styles.connectContainer}>
            <p>Please connect your wallet to apply.</p>
            <WalletMultiButton className={styles.btnConnect} />
          </div>
        ) : (
          <p className={styles.walletConnected}>
            Wallet Connected: {publicKey.toString()}
          </p>
        )}

        <form onSubmit={handleSubmit} className={styles.loginForm}>
          <div className={styles.formGroup}>
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={!connected}
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={!connected}
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="role">Role</label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={!connected}
              className={styles.select}
            >
              <option value="writer">Writer</option>
              <option value="artist">Artist</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="reason">Why do you want to be a {role}?</label>
            <button
              type="button"
              onClick={() => setShowPopup(true)}
              className={styles.btnApply}
              disabled={!connected}
            >
              Add Reason
            </button>
            {reason && <p className={styles.reasonPreview}>📝 {reason}</p>}
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="submissionLink">
              {role === "writer" ? "Novel Link (Optional)" : "Manga Link (Optional)"}
            </label>
            <input
              type="text"
              id="submissionLink"
              value={submissionLink}
              onChange={(e) => setSubmissionLink(e.target.value)}
              disabled={!connected}
              className={styles.input}
            />
          </div>
          {error && <div className={styles.alertDanger}>{error}</div>}
          {success && <div className={styles.alertSuccess}>{success}</div>}
          <button
            type="submit"
            className={styles.btnSubmit}
            disabled={!connected}
          >
            Submit Application
          </button>
        </form>
      </div>

      {showPopup && (
        <Popup onClose={() => setShowPopup(false)} onSubmit={handlePopupSubmit} />
      )}
    </div>
  );
}