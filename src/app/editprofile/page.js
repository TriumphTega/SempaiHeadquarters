"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../services/supabase/supabaseClient";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { FaUser, FaEnvelope, FaCamera, FaGem, FaBolt, FaSave, FaHome, FaExchangeAlt, FaBars, FaTimes, FaBook, FaTwitter, FaDiscord, FaGlobe } from "react-icons/fa";
import UseAmethystBalance from "../../components/UseAmethystBalance";
import styles from "./EditProfile.module.css";
import Link from "next/link";

export default function EditProfile() {
  const { connected, publicKey } = useWallet();
  const [userId, setUserId] = useState(null);
  const [isWriter, setIsWriter] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [imageText, setImageText] = useState("");
  const [bio, setBio] = useState("");
  const [twitter, setTwitter] = useState("");
  const [discord, setDiscord] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const { balance } = UseAmethystBalance();

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!connected || !publicKey) return;

      try {
        const walletAddress = publicKey.toString();
        const { data: user, error: userError } = await supabase
          .from("users")
          .select("id, email, name, image, isWriter")
          .eq("wallet_address", walletAddress)
          .single();

        if (userError) throw new Error("User not found.");
        setUserId(user.id);
        setEmail(user.email || "");
        setName(user.name || "");
        setImageText(user.image || "");
        setIsWriter(user.isWriter || false);

        if (user.isWriter) {
          const { data: profile, error: profileError } = await supabase
            .from("writer_profiles")
            .select("bio, twitter, discord, website")
            .eq("user_id", user.id)
            .single();

          if (profileError && profileError.code !== "PGRST116") throw profileError;
          setBio(profile?.bio || "");
          setTwitter(profile?.twitter || "");
          setDiscord(profile?.discord || "");
          setWebsite(profile?.website || "");
        }
      } catch (err) {
        setError(err.message);
      }
    };

    fetchUserData();
  }, [connected, publicKey]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!userId) {
      setError("Please connect your wallet to update your profile.");
      return;
    }

    try {
      const { error: userError } = await supabase
        .from("users")
        .update({ name, email, image: imageText })
        .eq("id", userId);

      if (userError) throw new Error(userError.message);

      if (isWriter) {
        const { error: profileError } = await supabase
          .from("writer_profiles")
          .upsert({ user_id: userId, bio, twitter, discord, website }, { onConflict: "user_id" });

        if (profileError) throw new Error(profileError.message);
      }

      setSuccess("Profile updated successfully!");
    } catch (err) {
      setError(err.message);
    }
  };

  const formatUsername = (address) =>
    address.length > 15 ? `${address.slice(0, 2)}**${address.slice(-2)}` : address;

  return (
    <div className={`${styles.page} ${menuOpen ? styles.menuActive : ""}`}>
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
            <Link href="/" className={styles.navLink}><FaHome /> Home</Link>
            <Link href="/writers-profile" className={styles.navLink}><FaExchangeAlt /> View Profile</Link>
          </div>
        </div>
      </nav>

      <main className={styles.main}>
        <section className={styles.profileSection}>
          <h1 className={styles.title}><FaUser /> Profile Editor</h1>

          <div className={styles.balanceCard}>
            <div className={styles.balanceItem}><FaGem /> Amethyst: {balance || "0"}</div>
            <div className={styles.balanceItem}><FaBolt /> Multiplier: {rewardAmount}</div>
          </div>

          {!connected ? (
            <div className={styles.connectWrapper}>
              <p className={styles.connectText}>Connect your wallet to edit your profile</p>
              <WalletMultiButton className={styles.connectButton} />
            </div>
          ) : (
            <p className={styles.walletText}><FaUser /> {formatUsername(publicKey.toString())}</p>
          )}

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
  <div className={styles.imageGroup}>
    <div className={styles.inputWrapper}>
      <FaCamera className={styles.inputIcon} />
      <input
        type="file"
        onChange={handleImageChange}
        className={styles.fileInput}
        accept="image/*"
        disabled={!connected}
      />
    </div>
    {imageText && (
      <div className={styles.previewWrapper}>
        <img src={imageText} alt="Preview" className={styles.previewImage} />
      </div>
    )}
  </div>
  {isWriter && (
    <>
      <div className={styles.inputGroup}>
        <FaBook className={styles.inputIcon} />
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Bio"
          className={styles.textarea}
          disabled={!connected}
        />
      </div>
      <div className={styles.inputGroup}>
        <FaTwitter className={styles.inputIcon} />
        <input
          type="text"
          value={twitter}
          onChange={(e) => setTwitter(e.target.value)}
          placeholder="Twitter Handle (e.g., username)"
          className={styles.input}
          disabled={!connected}
        />
      </div>
      <div className={styles.inputGroup}>
        <FaDiscord className={styles.inputIcon} />
        <input
          type="text"
          value={discord}
          onChange={(e) => setDiscord(e.target.value)}
          placeholder="Discord ID (e.g., user#1234)"
          className={styles.input}
          disabled={!connected}
        />
      </div>
      <div className={styles.inputGroup}>
        <FaGlobe className={styles.inputIcon} />
        <input
          type="text"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="Website URL"
          className={styles.input}
          disabled={!connected}
        />
      </div>
    </>
  )}
  {error && <div className={styles.alertError}>{error}</div>}
  {success && <div className={styles.alertSuccess}>{success}</div>}
  <button type="submit" className={styles.submitButton} disabled={!connected}>
    <FaSave /> Save Changes
  </button>
</form>
        </section>
      </main>
    </div>
  );
}