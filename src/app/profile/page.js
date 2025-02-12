'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase/supabaseClient';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import UseAmethystBalance from '../../components/UseAmethystBalance';


export default function EditProfile() {
  const { connected, publicKey } = useWallet();
  const [userId, setUserId] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [imageText, setImageText] = useState('');
  const { balance } = UseAmethystBalance();


  // Fetch user data using wallet address
  useEffect(() => {
    const fetchUserData = async () => {
      if (!connected || !publicKey) return;

      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, image')
        .eq('wallet_address', publicKey.toString())
        .single();

      if (error) {
        setError("User not found. Please connect your wallet.");
        return;
      }

      setUserId(data.id);
      setEmail(data.email);
      setName(data.name);
      setImageText(data.image);

    };

    fetchUserData();
  }, [connected, publicKey]);

  let rewardAmount = 0; // Default value

        if (Number(balance) >= 100_000 && Number(balance) < 250_000) {
          rewardAmount = "X1.2";  // Reward for 100k - 250k
        } else if (Number(balance) >= 250_000 && Number(balance) < 500_000) {
          rewardAmount = "X1.5";  // Reward for 250k - 500k
        } else if (Number(balance) >= 500_000 && Number(balance) < 1_000_000) {
          rewardAmount = "x1.7";  // Reward for 500k - 1M
        } else if (Number(balance) >= 1_000_000 && Number(balance) < 5_000_000) {
          rewardAmount = "2"; // Reward for 1M - 5M
        }
         else if (Number(balance) >= 5_000_000) {
          rewardAmount = "X2.5"; // Reward for 5M and above
        } else {
          rewardAmount = "X1";   // No reward if balance doesn't fit any range
        }
        console.log(rewardAmount);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) { // Check if it's an image file
      const reader = new FileReader();
      reader.onloadend = () => setImageText(reader.result);
      reader.readAsDataURL(file);
    } else {
      alert('Please upload a valid image file.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
  
    if (!userId) {
      setError("Invalid user. Please connect your wallet.");
      return;
    }
  
    // Update the 'users' table in Supabase
    const { error: updateError } = await supabase
      .from('users')
      .update({ name, email, image: imageText })  // Corrected this line to use 'imageText'
      .eq('id', userId);  // Matching with userId
  
    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess('Your profile has been updated successfully!');
    }
  };
  const formatUsername = (address) => {
    if (address.length > 15) {
      return `${address.slice(0, 2)}**${address.slice(-2)}`;
    }
    return address;
  };

  return (
    <div className="profile-container">
         <nav className="navbar navbar-expand-lg navbar-dark bg-dark py-3 shadow">
        <div className="container">
          {/* Brand Logo */}
          <Link href="/" className="navbar-brand">
          <img
            src="/images/logo.jpg"  // The path is correct if the image is in the public folder
            alt="Sempai HQ"
            className="navbar-logo"
            style={{ width: "40px", height: "40px", borderRadius: "50%" }}
          />
          </Link>
          
          {/* Navbar Links */}
          <div id="navbarNav">
            <ul className="navbar-nav me-auto">
              <li className="nav-item">
                <Link href="/" className="nav-link text-light fw-semibold hover-effect">
                  Home
                </Link>
              </li>
              {/* <li className="nav-item">
                <Link href="/swap" className="nav-link text-light fw-semibold hover-effect">
                  Swap
                </Link>
              </li> */}
            </ul>
            {/* Wallet and Creator Dashboard */}

          </div>
        </div>
      </nav>

      <div className="form-wrapper">
      
            <h2 className="text-center">Edit Your Profile</h2>

            <div className="balance-card">
  <div className="balance-content">
    <h5 className="balance-text">
      <span className="icon">💎</span> Amethyst: <span className="balance-amount">{`${balance}`}</span>
    </h5>
    <p className="multiplier-text">
      <span className="icon">⚡</span> Multiplier: <span className="multiplier-value">{rewardAmount}</span>
    </p>
  </div>
</div>


        {!connected ? (
          <div className="connect-container">
            <p>Please connect your wallet to proceed.</p>
            <WalletMultiButton className="btn-connect" />
          </div>
        ) : (
          <p className="wallet-connected">Wallet Connected: {formatUsername(publicKey.toString())}</p>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="name">Username</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={!connected}
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
              disabled={!connected}
            />
          </div>
          <div className="form-group">
              <label htmlFor="novelImage">Image</label>
              {imageText && (
                <div className="mb-2">
                  <img
                    src={imageText}
                    alt="Current Novel"
                    className="img-thumbnail"
                    style={{ maxWidth: "200px" }}
                  />
                  <p>Current Image</p>
                </div>
              )}
              <input
                type="file"
                id="novelImage"
                onChange={handleImageChange}
                required
              />
            </div>

          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <button type="submit" className="btn-submit" disabled={!connected}>
            Update Profile
          </button>
        </form>
      </div>

      <style jsx>{`
        .profile-container {
          background: #000;
          padding: 20px;
          border-radius: 15px;
          box-shadow: 0 4px 12px rgba(243, 99, 22, 0.7);
          color: #fff;
          max-width: 400px;
          margin: 20px auto;
          text-align: center;
        }
        .btn-connect {
          background: rgb(243, 99, 22);
          color: white;
          padding: 10px;
          border: none;
          cursor: pointer;
          border-radius: 5px;
          transition: background 0.3s;
        }
        .btn-connect:hover {
          background: #ff5722;
        }
        .wallet-connected {
          color: #00b894;
          margin-bottom: 10px;
        }
        .alert-danger {
          color: #e74c3c;
          margin: 10px 0;
        }
        .alert-success {
          color: #2ecc71;
          margin: 10px 0;
        }
        .btn-submit {
          background: rgb(243, 99, 22);
          color: white;
          padding: 10px;
          border: none;
          cursor: pointer;
          border-radius: 5px;
          margin-top: 10px;
          transition: background 0.3s;
        }
        .btn-submit:hover {
          background: #ff5722;
        }
        input {
          padding: 8px;
          width: 100%;
          margin-top: 5px;
          border-radius: 5px;
          border: 1px solid #ccc;
        }
          .balance-card {
    background: linear-gradient(135deg, #1e1e1e, #2a2a2a);
    border-radius: 10px;
    padding: 15px 20px;
    text-align: center;
    box-shadow: 0 4px 10px rgba(0, 255, 127, 0.4);
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 20px auto;
    max-width: 350px;
  }

  .balance-content {
    width: 100%;
  }

  .balance-text {
    color: #00ff7f;
    font-size: 1.3rem;
    font-weight: bold;
    text-shadow: 0px 0px 8px rgba(0, 255, 127, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .multiplier-text {
    color: #f39c12;
    font-weight: bold;
    font-size: 1.2rem;
    margin-top: 10px;
    text-shadow: 0px 0px 6px rgba(243, 156, 18, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .icon {
    font-size: 1.5rem;
  }

  .balance-amount,
  .multiplier-value {
    font-weight: bold;
    font-size: 1.4rem;
  }

  @media (max-width: 768px) {
    .balance-card {
      max-width: 300px;
      padding: 10px;
    }

    .balance-text, .multiplier-text {
      font-size: 1.1rem;
    }
      `}</style>
    </div>
  );
}
