'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../services/supabase/supabaseClient';
import { useWallet } from '@solana/wallet-adapter-react';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'; // Import Wallet hook and UI button
import Popup from "../../components/Popup";

export default function ApplyForWriter() {
  const { connected, publicKey, disconnect } = useWallet(); // Use the wallet hook to handle wallet connection
  const [userId, setUserId] = useState(null); // Store user ID
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [submissionLink, setSubmissionLink] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const router = useRouter();

  // Fetch user_id from users table using wallet_address
  useEffect(() => {
    const fetchUserId = async () => {
      if (!connected || !publicKey) return;
      
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name')
        .eq('wallet_address', publicKey.toString())
        .single();
      
      if (error) {
        setError("User not found. Make sure your wallet is connected.");
        return;
      }

      setUserId(data.id);
      setEmail(data.email);
      setName(data.name);
    };

    fetchUserId();
  }, [connected, publicKey]); // Run this when the wallet connection status or publicKey changes

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

    const { error } = await supabase.from('writer_applications').insert([{
      user_id: userId, // Include user_id from wallet lookup
      name,
      email,
      reason,
      submission_link: submissionLink,
      application_status: 'pending',
    }]);

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
        
        {/* Display the WalletMultiButton to connect the wallet */}
        {!connected ? (
          <div className="connect-container">
            <p>Please connect your wallet to apply.</p>
            <WalletMultiButton className="btn-connect" /> {/* Wallet UI button */}
          </div>
        ) : (
          <p className="wallet-connected">Wallet Connected: {publicKey.toString()}</p>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={!connected} // Disable if wallet is not connected
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={!connected} // Disable if wallet is not connected
            />
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
              required
              disabled={!connected} // Disable if wallet is not connected
            />
          </div>
          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <button type="submit" className="btn-submit" disabled={!connected}>
            Submit Application
          </button>
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
        .alert {
          margin: 10px 0;
        }
        .alert-danger {
          color: #e74c3c;
        }
        .alert-success {
          color: #2ecc71;
        }
      `}</style>
    </div>
  );
}
