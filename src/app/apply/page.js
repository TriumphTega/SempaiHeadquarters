'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../services/supabase/supabaseClient';
import Popup from "../../components/Popup";

export default function ApplyForWriter() {
  const [userId, setUserId] = useState(null); // Store user ID
  const [walletAddress, setWalletAddress] = useState(null); // Store connected wallet
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [submissionLink, setSubmissionLink] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const router = useRouter();

  // Function to get connected wallet address
  const fetchConnectedWallet = async () => {
    try {
      if (window.solana && window.solana.isPhantom) {
        const response = await window.solana.connect();
        setWalletAddress(response.publicKey.toString());
      } else {
        setError("Phantom wallet not found. Please install it.");
      }
    } catch (err) {
      setError("Wallet connection failed.");
    }
  };

  // Fetch user_id from users table using wallet_address
  useEffect(() => {
    const fetchUserId = async () => {
      if (!walletAddress) return;
      
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name')
        .eq('wallet_address', walletAddress)
        .single();
      
      if (error) {
        setError("User not found. Make sure your wallet is connected.");
        return;
      }

      setUserId(data.id);
      setEmail('');
      setName('');
    };

    fetchUserId();
  }, [walletAddress]); // Run this when the walletAddress changes

  const handlePopupSubmit = (reason) => {
    setReason(reason);
    setShowPopup(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!reason) {
      setError('Reason is required!');
      return;
    }

    if (!userId) {
      setError("Invalid user. Please connect your wallet.");
      return;
    }

    const { error } = await supabase.from('writer_applications').insert([
      {
        user_id: userId, // Include user_id from wallet lookup
        name,
        email,
        reason,
        submission_link: submissionLink,
        application_status: 'pending',
      },
    ]);

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Your application has been submitted successfully!');
      setReason('');
      setSubmissionLink('');
    }
  };

  return (
    <div className="login-container">
      <div className="form-wrapper">
        <h2 className="text-center">Apply to Become a Creator</h2>
        
        {!walletAddress ? (
          <button className="btn-connect" onClick={fetchConnectedWallet}>
            Connect Wallet
          </button>
        ) : (
          <p className="wallet-connected">Wallet Connected: {walletAddress}</p>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required />

          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

          </div>
          <div className="form-group">
            <label htmlFor="reason">Why do you want to be a creator?</label>
            <button type="button" onClick={() => setShowPopup(true)} className="btn-apply">
              Add Reason
            </button>
            {reason && <p className="reason-preview">📝 {reason}</p>}
          </div>
          <div className="form-group">
            <label htmlFor="submissionLink">Manga/Novel Link</label>
            <input
              type="text"
              id="submissionLink"
              value={submissionLink}
              onChange={(e) => setSubmissionLink(e.target.value)}
            required/>
          </div>
          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <button type="submit" className="btn-submit">Submit Application</button>
        </form>
      </div>

      {showPopup && <Popup onClose={() => setShowPopup(false)} onSubmit={handlePopupSubmit} />}

      <style jsx>{`
        .btn-connect {
          background: #ff9900;
          color: white;
          padding: 10px;
          border: none;
          cursor: pointer;
          margin-bottom: 10px;
        }
        .btn-apply {
          background: #ff9900;
          color: white;
          padding: 10px;
          border: none;
          cursor: pointer;
        }
        .wallet-connected {
          color: #00b894;
          font-size: 14px;
          margin-bottom: 10px;
        }
        .reason-preview {
          margin-top: 10px;
          color: #ff9900;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}
