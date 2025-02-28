"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../services/supabase/supabaseClient";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { FaUser, FaEnvelope, FaCamera, FaGem, FaBolt, FaSave, FaHome, FaExchangeAlt, FaBars, FaTimes } from "react-icons/fa";
import UseAmethystBalance from "../../components/UseAmethystBalance";
import styles from "./EditProfile.module.css";
import Link from 'next/link';

export default function EditProfile() {
  const { connected, publicKey } = useWallet();
  const [userId, setUserId] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [imageText, setImageText] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const { balance } = UseAmethystBalance();

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!connected || !publicKey) return;

      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, email, name, image")
          .eq("wallet_address", publicKey.toString())
          .single();

        if (error) throw new Error("User not found. Please connect your wallet.");
        setUserId(data.id);
        setEmail(data.email || "");
        setName(data.name || "");
        setImageText(data.image || "");
      } catch (err) {
        setError(err.message);
      }
    };

    fetchUserData();
  }, [connected, publicKey]);

  // Calculate reward multiplier
  const getRewardAmount = () => {
    const balanceNum = Number(balance);
    if (balanceNum >= 5_000_000) return "x2.5";
    if (balanceNum >= 1_000_000) return "x2";
    if (balanceNum >= 500_000) return "x1.7";
    if (balanceNum >= 250_000) return "x1.5";
    if (balanceNum >= 100_000) return "x1.2";
    return "x1";
  };
  const rewardAmount = getRewardAmount();

  // Handle image upload
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => setImageText(reader.result);
      reader.readAsDataURL(file);
    } else {
      setError("Please upload a valid image file.");
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!userId) {
      setError("Please connect your wallet to update your profile.");
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from("users")
        .update({ name, email, image: imageText })
        .eq("id", userId);

      if (updateError) throw new Error(updateError.message);
      setSuccess("Profile updated successfully!");
    } catch (err) {
      setError(err.message);
    }
  };

  // Format wallet address
  const formatUsername = (address) =>
    address.length > 15 ? `${address.slice(0, 2)}**${address.slice(-2)}` : address;

  return (
    <div className={`${styles.page} ${menuOpen ? styles.menuActive : ""}`}>
      {/* Navbar with Home style */}
      <nav className={styles.navbar}>
        <div className={styles.navContainer}>
          <Link href="/" className={styles.logoLink}>
            <img src="/images/logo.jpg" alt="Sempai HQ" className={styles.logo} />
            <span className={styles.logoText}>Sempai HQ</span>
          </Link>
          <button className={styles.menuToggle} onClick={toggleMenu}>
            {menuOpen ? <FaTimes /> : <FaBars />}
          </button>
          <div className={`${styles.navLinks} ${menuOpen ? styles.navLinksOpen : ""}`}>
            <Link href="/" className={styles.navLink}>
              <FaHome className={styles.navIcon} /> Home
            </Link>
            <Link href="/swap" className={styles.navLink}>
              <FaExchangeAlt className={styles.navIcon} /> Swap
            </Link>
          </div>
        </div>
      </nav>

      <main className={styles.main}>
        <section className={styles.profileSection}>
          <h1 className={styles.title}>Edit Profile</h1>

          {/* Balance Card */}
          <div className={styles.balanceCard}>
            <div className={styles.balanceItem}>
              <FaGem className={styles.icon} />
              <span>Amethyst: {balance || "0"}</span>
            </div>
            <div className={styles.balanceItem}>
              <FaBolt className={styles.icon} />
              <span>Multiplier: {rewardAmount}</span>
            </div>
          </div>

          {/* Wallet Connection */}
          {!connected ? (
            <div className={styles.connectWrapper}>
              <p className={styles.connectText}>Connect your wallet to edit your profile</p>
              <WalletMultiButton className={styles.connectButton} />
            </div>
          ) : (
            <p className={styles.walletText}>
              <FaUser className={styles.icon} /> {formatUsername(publicKey.toString())}
            </p>
          )}

          {/* Profile Form */}
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <FaUser className={styles.inputIcon} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Username"
                className={styles.input}
                required
                disabled={!connected}
              />
            </div>

            <div className={styles.inputGroup}>
              <FaEnvelope className={styles.inputIcon} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className={styles.input}
                required
                disabled={!connected}
              />
            </div>

            <div className={styles.inputGroup}>
              <FaCamera className={styles.inputIcon} />
              <input
                type="file"
                onChange={handleImageChange}
                className={styles.fileInput}
                accept="image/*"
              />
              {imageText && (
                <img src={imageText} alt="Preview" className={styles.previewImage} />
              )}
            </div>

            {error && <div className={styles.alertError}>{error}</div>}
            {success && <div className={styles.alertSuccess}>{success}</div>}

            <button
              type="submit"
              className={styles.submitButton}
              disabled={!connected}
            >
              <FaSave className={styles.buttonIcon} /> Save Changes
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}