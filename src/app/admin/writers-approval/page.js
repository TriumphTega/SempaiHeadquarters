'use client';
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../services/supabase/supabaseClient";
import { Connection, PublicKey } from '@solana/web3.js'; // Example for Solana

export default function WriterApprovals() {
  const [applications, setApplications] = useState([]);
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connectedWallet, setConnectedWallet] = useState(null); // Store the connected wallet
  const router = useRouter();

  // Function to handle wallet connection
  const connectWallet = async () => {
    try {
      // Connect to Solana wallet (example using Phantom wallet)
      const { solana } = window;

      if (solana && solana.isPhantom) {
        const walletResponse = await solana.connect(); // Connect wallet
        setConnectedWallet(walletResponse.publicKey.toString()); // Set connected wallet address
        console.log("Connected Wallet:", walletResponse.publicKey.toString());
      } else {
        alert("Please install Phantom wallet to connect.");
      }
    } catch (error) {
      console.error("Wallet connection error:", error);
    }
  };

  useEffect(() => {
    const checkSuperuser = async () => {
      setLoading(true);

      // Ensure a wallet is connected
      if (!connectedWallet) {
        setIsSuperuser(false); // Stay on the page with a prompt to connect the wallet
        setLoading(false);
        return;
      }

      // Check if the connected wallet address is a superuser
      const { data, error } = await supabase
        .from("users")
        .select("id, isSuperuser")
        .eq("wallet_address", connectedWallet)
        .single();

      if (error || !data || !data.isSuperuser) {
        setIsSuperuser(false); // Not a superuser
      } else {
        setIsSuperuser(true); // Superuser found
      }

      setLoading(false);
    };

    checkSuperuser();
  }, [connectedWallet]);

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

  const handleApproval = async (userId, applicationId, name, email) => {
    try {
      // Update user with name, email, and set isWriter to true
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
      setApplications(applications.filter(app => app.id !== applicationId));

    } catch (error) {
      console.error("Approval error:", error.message);
    }
  };

  if (loading) {
    return <p className="loading">Loading...</p>;
  }

  if (!connectedWallet) {
    return (
      <div className="connect-container">
        <p>Connect your wallet to continue.</p>
        <button onClick={connectWallet} className="connect-btn">
          Connect Wallet
        </button>
      </div>
    ); // Show "Connect Wallet" button if no wallet is connected
  }

  if (!isSuperuser) {
    return (
      <div className="connect-container">
        <p>You are not a superuser. Please connect a superuser wallet to proceed.</p>
        <button onClick={connectWallet} className="connect-btn">
          Connect Wallet
        </button>
      </div>
    ); // Show message if the wallet is not a superuser
  }

  return (
    <div className="container">
      <h2 className="title">Writer Applications</h2>
      {applications.length > 0 ? (
        applications.map(app => (
          <div key={app.id} className="card">
            <h3>{app.name}</h3>
            <p><strong>Email:</strong> {app.email}</p>
            <p><strong>Reason:</strong> {app.reason}</p>
            {app.submission_link && (
              <p>
                <strong>Submission:</strong> 
                <a href={app.submission_link} target="_blank" rel="noopener noreferrer"> View Here</a>
              </p>
            )}
            <button className="approve-btn" onClick={() => handleApproval(app.user_id, app.id, app.name, app.email)}>
              ✅ Approve
            </button>
          </div>
        ))
      ) : (
        <p className="no-applications">No pending applications.</p>
      )}

      <style jsx>{`
        .container {
          max-width: 600px;
          margin: 20px auto;
          padding: 20px;
          border-radius: 8px;
          background: #f9f9f9;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        .title {
          text-align: center;
          margin-bottom: 20px;
        }
        .card {
          background: white;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 15px;
          box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
        }
        .card h3 {
          margin: 0 0 10px;
        }
        .approve-btn {
          background: #28a745;
          color: white;
          padding: 10px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          margin-top: 10px;
        }
        .approve-btn:hover {
          background: #218838;
        }
        .loading {
          text-align: center;
          font-size: 18px;
          margin-top: 20px;
        }
        .connect-container {
          text-align: center;
          margin-top: 50px;
        }
        .connect-btn {
          background: #007bff;
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        }
        .connect-btn:hover {
          background: #0056b3;
        }
      `}</style>
    </div>
  );
}
