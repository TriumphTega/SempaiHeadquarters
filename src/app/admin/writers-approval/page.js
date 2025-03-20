"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { supabase } from "../../../services/supabase/supabaseClient";
import styles from "../../../styles/CreatorApprovals.module.css";

export default function CreatorApprovals() {
  const { connected, publicKey } = useWallet();
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Check superuser status and fetch applications
  useEffect(() => {
    const checkSuperuserAndFetch = async () => {
      if (!connected || !publicKey) {
        setLoading(false);
        return;
      }

      const walletAddress = publicKey.toString();
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id, isSuperuser")
        .eq("wallet_address", walletAddress)
        .single();

      if (userError || !user || !user.isSuperuser) {
        setIsSuperuser(false);
        setError("You are not a superuser or user not found.");
        setLoading(false);
        return;
      }

      setIsSuperuser(true);

      // Fetch pending applications
      const { data: apps, error: appsError } = await supabase
        .from("creator_applications")
        .select("id, user_id, name, email, role, reason, submission_link, created_at")
        .eq("application_status", "pending")
        .order("created_at", { ascending: true });

      if (appsError) {
        setError("Failed to load applications: " + appsError.message);
      } else {
        setApplications(apps || []);
      }
      setLoading(false);
    };

    checkSuperuserAndFetch();
  }, [connected, publicKey]);

  // Handle approval or rejection
  const handleAction = async (applicationId, userId, role, action) => {
    try {
      // Update application status
      const { error: appError } = await supabase
        .from("creator_applications")
        .update({ application_status: action })
        .eq("id", applicationId);

      if (appError) throw appError;

      // If approved, update user role
      if (action === "approved") {
        const roleField = role === "writer" ? "isWriter" : "isArtist";
        const { error: userError } = await supabase
          .from("users")
          .update({ [roleField]: true })
          .eq("id", userId);

        if (userError) throw userError;
      }

      // Remove the application from the list
      setApplications((prev) =>
        prev.filter((app) => app.id !== applicationId)
      );
    } catch (error) {
      setError("Action failed: " + error.message);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!connected) {
    return (
      <div className={styles.container}>
        <div className={styles.wrapper}>
          <h2 className={styles.title}>Superuser Access Required</h2>
          <div className={styles.connectContainer}>
            <p>Connect your wallet to continue.</p>
            <WalletMultiButton className={styles.btnConnect} />
          </div>
        </div>
      </div>
    );
  }

  if (!isSuperuser) {
    return (
      <div className={styles.container}>
        <div className={styles.wrapper}>
          <h2 className={styles.title}>Access Denied</h2>
          <p className={styles.error}>
            {error || "Only superusers can access this page."}
          </p>
          <WalletMultiButton className={styles.btnConnect} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <h2 className={styles.title}>Creator Applications</h2>
        {error && <div className={styles.alertDanger}>{error}</div>}
        {applications.length > 0 ? (
          <div className={styles.applicationsList}>
            {applications.map((app) => (
              <div key={app.id} className={styles.applicationCard}>
                <div className={styles.applicationDetails}>
                  <h3 className={styles.applicationName}>{app.name}</h3>
                  <p><strong>Email:</strong> {app.email}</p>
                  <p><strong>Role:</strong> {app.role.charAt(0).toUpperCase() + app.role.slice(1)}</p>
                  <p><strong>Reason:</strong> {app.reason}</p>
                  {app.submission_link && (
                    <p>
                      <strong>Submission:</strong>{" "}
                      <a
                        href={app.submission_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.link}
                      >
                        View Here
                      </a>
                    </p>
                  )}
                  <p><strong>Applied:</strong> {new Date(app.created_at).toLocaleString()}</p>
                </div>
                <div className={styles.actionButtons}>
                  <button
                    onClick={() =>
                      handleAction(app.id, app.user_id, app.role, "approved")
                    }
                    className={styles.btnApprove}
                  >
                    ✅ Approve
                  </button>
                  <button
                    onClick={() =>
                      handleAction(app.id, app.user_id, app.role, "rejected")
                    }
                    className={styles.btnReject}
                  >
                    ❌ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.noApplications}>No pending applications.</p>
        )}
      </div>
    </div>
  );
}