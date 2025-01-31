'use client';

import { useEffect, useState } from "react";
import { supabase } from "../../../services/supabase/supabaseClient"; // Ensure this is set up to interact with Supabase
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"; // This will handle the wallet UI button

export default function WriterApprovals() {
  const [applications, setApplications] = useState([]);
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connectedWallet, setConnectedWallet] = useState(null);

  // Check if the connected wallet is a superuser
  const checkSuperuser = async (walletAddress) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("users")
      .select("id, isSuperuser")
      .eq("wallet_address", walletAddress)
      .single();

    if (error || !data || !data.isSuperuser) {
      setIsSuperuser(false); // Not a superuser
    } else {
      setIsSuperuser(true); // Superuser found
    }
    setLoading(false);
  };

  // Effect to check for wallet connection status
  useEffect(() => {
    if (window.solana && window.solana.isPhantom) {
      window.solana.connect().then((walletResponse) => {
        const walletAddress = walletResponse.publicKey.toString();
        setConnectedWallet(walletAddress);
        checkSuperuser(walletAddress);
      });
    }
  }, []);

  // Fetch applications when the user is a superuser
  useEffect(() => {
    if (isSuperuser) {
      const fetchApplications = async () => {
        const { data, error } = await supabase
          .from("writer_applications")
          .select("id, user_id, name, email, reason, submission_link, application_status")
          .eq("application_status", "pending");

        if (error) console.error(error);
        else setApplications(data);
      };

      fetchApplications();
    }
  }, [isSuperuser]);

  // Handle approval of an application
  const handleApproval = async (userId, applicationId, name, email) => {
    try {
      // Update user with isWriter status
      const { error: userError } = await supabase
        .from("users")
        .update({ name, email, isWriter: true })
        .eq("id", userId);

      if (userError) throw userError;

      // Update application status
      const { error: appError } = await supabase
        .from("writer_applications")
        .update({ application_status: "approved" })
        .eq("id", applicationId);

      if (appError) throw appError;

      // Remove the approved application from the list
      setApplications(applications.filter((app) => app.id !== applicationId));
    } catch (error) {
      console.error("Approval error:", error.message);
    }
  };

  // Loading and no-wallet states
  if (loading) {
    return <p className="loading">Loading...</p>;
  }

  if (!connectedWallet) {
    return (
      <div className="connect-container">
        <p>Connect your wallet to continue.</p>
        <WalletMultiButton className="connect-btn" /> {/* This button will appear */}
      </div>
    );
  }

  if (!isSuperuser) {
    return (
      <div className="connect-container">
        <p>You are not a superuser. Please connect a superuser wallet to proceed.</p>
        <WalletMultiButton className="connect-btn" /> {/* Connect button again for wallet */}
      </div>
    );
  }

  // Rendering writer applications for superusers
  return (
    <div className="writer-approvals-container">
  <h2 className="writer-approvals-title">Creator Applications</h2>
  {applications.length > 0 ? (
    applications.map((app) => (
      <div key={app.id} className="writer-approvals-card">
        <h3>{app.name}</h3>
        <p><strong>Email:</strong> {app.email}</p>
        <p><strong>Reason:</strong> {app.reason}</p>
        {app.submission_link && (
          <p>
            <strong>Submission:</strong>
            <a href={app.submission_link} target="_blank" rel="noopener noreferrer"> View Here</a>
          </p>
        )}
        <button className="writer-approvals-approve-btn" onClick={() => handleApproval(app.user_id, app.id, app.name, app.email)}>
          ✅ Approve
        </button>
      </div>
    ))
  ) : (
    <p className="writer-approvals-no-applications">No pending applications.</p>
  )}
</div>

  );
}
