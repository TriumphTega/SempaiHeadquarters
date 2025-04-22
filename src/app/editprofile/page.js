// src/app/editprofile/page.js
"use client";

import { useState, useEffect, useContext } from "react";
import { supabase } from "../../services/supabase/supabaseClient";
import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import {
  FaUser,
  FaEnvelope,
  FaCamera,
  FaGem,
  FaBolt,
  FaSave,
  FaHome,
  FaExchangeAlt,
  FaBars,
  FaTimes,
  FaBook,
  FaTwitter,
  FaDiscord,
  FaGlobe,
  FaPen,
  FaSpinner,
} from "react-icons/fa";
import UseAmethystBalance from "../../components/UseAmethystBalance";
import styles from "./EditProfile.module.css";
import ConnectButton from "../../components/ConnectButton";
import { EmbeddedWalletContext } from "../../components/EmbeddedWalletProvider";

export default function EditProfile() {
  const { connected, publicKey } = useWallet();
  const { wallet: embeddedWallet } = useContext(EmbeddedWalletContext);
  const [userId, setUserId] = useState(null);
  const [isCreator, setIsCreator] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [xAccount, setXAccount] = useState("");
  const [twitterInput, setTwitterInput] = useState("");
  const [twitterError, setTwitterError] = useState("");
  const [twitterVerified, setTwitterVerified] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [bio, setBio] = useState("");
  const [discord, setDiscord] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [referralMessage, setReferralMessage] = useState("");
  const [isVerifying, setIsVerifying] = useState(false); // New: Loading state for Verify
  const [isSaving, setIsSaving] = useState(false); // New: Loading state for Save
  const { balance } = UseAmethystBalance();

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  useEffect(() => {
    const fetchUserData = async () => {
      const walletAddress = publicKey?.toString() || embeddedWallet?.publicKey;
      if (!connected && !embeddedWallet) return;

      try {
        const { data: user, error: userError } = await supabase
          .from("users")
          .select(
            "id, email, name, x_account, x_verified_at, image, isWriter, isArtist, isSuperuser, referred_by, has_updated_profile, weekly_points"
          )
          .eq("wallet_address", walletAddress)
          .single();

        if (userError) {
          if (userError.code === "PGRST116") {
            setError("No user found. Please connect your wallet on the home page first.");
            return;
          }
          throw new Error(`Error fetching user: ${userError.message} (Code: ${userError.code})`);
        }

        setUserId(user.id);
        setEmail(user.email || "");
        setName(user.name || "");
        setXAccount(user.x_account || "");
        setImageUrl(user.image || "");
        setIsCreator(user.isWriter || user.isArtist);

        if (user.x_account && user.x_verified_at) {
          const verifiedAt = new Date(user.x_verified_at);
          if (verifiedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
            setTwitterVerified(true);
            setTwitterInput(user.x_account);
          }
        }

        setIsNewUser(!user.has_updated_profile && !!user.referred_by);
        if (!user.has_updated_profile && user.referred_by) {
          setReferralMessage(
            "Update your profile to claim 100 points and reward your inviter with 100 points!"
          );
        }

        if (user.isWriter || user.isArtist) {
          const { data: profile, error: profileError } = await supabase
            .from("writer_profiles")
            .select("bio, twitter, discord, website")
            .eq("user_id", user.id)
            .single();

          if (profileError && profileError.code !== "PGRST116") {
            throw new Error("Error fetching profile: " + profileError.message);
          }
          setBio(profile?.bio || "");
          setTwitterInput(profile?.twitter || user.x_account || "");
          setXAccount(profile?.twitter || user.x_account || "");
          setDiscord(profile?.discord || "");
          setWebsite(profile?.website || "");
        }
      } catch (err) {
        setError(err.message);
        console.error("Fetch user data failed:", err);
      }
    };

    fetchUserData();
  }, [connected, publicKey, embeddedWallet]);

  const validateTwitterUsername = async () => {
    setTwitterError("");
    setTwitterVerified(false);
    setSuccess(""); // Clear success message
    setIsVerifying(true); // Start loading

    let username = twitterInput.trim();
    const urlMatch = username.match(/twitter\.com\/([A-Za-z0-9_]+)/);
    if (urlMatch) {
      username = urlMatch[1];
    } else {
      username = username.replace(/^@/, "");
    }

    if (!username.match(/^[A-Za-z0-9_]{1,15}$/)) {
      setTwitterError(
        "Please enter a valid Twitter username (1-15 characters, letters, numbers, or underscores)."
      );
      setIsVerifying(false);
      return;
    }

    try {
      // Check if username is unique in the database
      const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("id")
        .eq("x_account", username)
        .neq("id", userId || "")
        .single();

      if (existingUser) {
        setTwitterError(
          <>
            Username @{username} is already taken. Please choose a different username.{" "}
            <Link href="/support" className={styles.errorLink}>
              Need help?
            </Link>
          </>
        );
        setIsVerifying(false);
        return;
      }

      if (checkError && checkError.code !== "PGRST116") {
        throw new Error(`Error checking username uniqueness: ${checkError.message}`);
      }

      // Verify username via API
      console.log(`Sending request to /api/check-twitter?username=${username}`);
      const response = await fetch(`/api/check-twitter?username=${encodeURIComponent(username)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log(
        `Response: status=${response.status}, ok=${response.ok}, headers=`,
        Object.fromEntries(response.headers)
      );

      if (!response.ok) {
        let errorMessage = `HTTP error ${response.status}`;
        if (response.status === 404) {
          errorMessage = "API endpoint not found. Please contact support.";
        } else if (response.status === 429) {
          errorMessage = "Too many requests. Please try again later.";
        }

        const responseText = await response.text();
        console.log("Raw response text:", responseText || "[Empty response]");

        try {
          const errorData = JSON.parse(responseText);
          console.log("Error response data:", errorData);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          console.error("Failed to parse error response:", e);
          if (responseText.includes("<html")) {
            errorMessage = `Received HTML response (status ${response.status}). Please contact support.`;
          }
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("Success response data:", data);

      if (data.error) {
        setTwitterError(data.error);
        setIsVerifying(false);
        return;
      }

      if (data.exists) {
        setTwitterVerified(true);
        setXAccount(username);
        setSuccess(`Twitter username @${username} verified!`);
      } else {
        setTwitterError(
          <>
            Username @{username} does not exist or is private. Ensure the account is public and try again.{" "}
            <Link href="/support" className={styles.errorLink}>
              Need help?
            </Link>
          </>
        );
      }
    } catch (err) {
      console.error("Twitter validation error:", err.message);
      setTwitterError(
        <>
          Error verifying username: {err.message}.{" "}
          <Link href="/support" className={styles.errorLink}>
            Contact support
          </Link>
        </>
      );
    } finally {
      setIsVerifying(false); // Stop loading
    }
  };

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

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) {
      setError("Please upload a valid image file.");
      return;
    }

    try {
      const walletAddress = publicKey?.toString() || embeddedWallet?.publicKey;
      const fileName = `${walletAddress}-${Date.now()}.${file.name.split(".").pop()}`;
      const { error: uploadError } = await supabase.storage
        .from("sempai")
        .upload(`profile-images/${fileName}`, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw new Error("Image upload failed: " + uploadError.message);

      const { data } = supabase.storage.from("sempai").getPublicUrl(`profile-images/${fileName}`);
      setImageUrl(data.publicUrl);
    } catch (err) {
      setError(err.message);
      console.error("Image upload error:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsSaving(true); // Start loading

    if (!userId) {
      setError("Please connect your wallet to update your profile.");
      setIsSaving(false);
      return;
    }

    if (!twitterVerified && !xAccount) {
      setError("Please verify your Twitter username before saving.");
      setIsSaving(false);
      return;
    }

    try {
      const { data: currentUserData, error: fetchError } = await supabase
        .from("users")
        .select("referred_by, has_updated_profile, weekly_points")
        .eq("id", userId)
        .single();

      if (fetchError) throw new Error("Error fetching user data: " + fetchError.message);

      const walletAddress = publicKey?.toString() || embeddedWallet?.publicKey;
      const { error: userError } = await supabase
        .from("users")
        .update({
          name: name.trim(),
          email: email.trim(),
          x_account: xAccount,
          x_verified_at: new Date().toISOString(),
          image: imageUrl,
          has_updated_profile: true,
        })
        .eq("wallet_address", walletAddress);

      if (userError) throw new Error("Error updating user: " + userError.message);

      if (isNewUser && !currentUserData.has_updated_profile && currentUserData.referred_by) {
        await supabase
          .from("users")
          .update({ weekly_points: (currentUserData.weekly_points || 0) + 100 })
          .eq("id", userId);

        const { data: inviterData, error: inviterError } = await supabase
          .from("users")
          .select("weekly_points")
          .eq("wallet_address", currentUserData.referred_by)
          .single();

        if (inviterError) throw new Error("Error fetching inviter data: " + inviterError.message);

        await supabase
          .from("users")
          .update({ weekly_points: (inviterData?.weekly_points || 0) + 100 })
          .eq("wallet_address", currentUserData.referred_by);

        setIsNewUser(false);
        setReferralMessage("");
        setSuccess(
          "Profile updated successfully! You’ve claimed 100 points, and your inviter received 100 points!"
        );
      } else {
        setSuccess("Profile updated successfully!");
      }

      if (isCreator) {
        const { error: profileError } = await supabase
          .from("writer_profiles")
          .upsert(
            {
              user_id: userId,
              bio: bio.trim(),
              twitter: xAccount, // Save x_account to writer_profiles.twitter
              discord: discord.trim(),
              website: website.trim(),
            },
            { onConflict: "user_id" }
          );

        if (profileError) throw new Error("Error updating writer profile: " + profileError.message);
      }
    } catch (err) {
      setError(err.message);
      console.error("Submit error:", err);
    } finally {
      setIsSaving(false); // Stop loading
    }
  };

  const formatUsername = (address) =>
    address && address.length > 15 ? `${address.slice(0, 2)}**${address.slice(-2)}` : address || "";

  return (
    <div className={`${styles.page} ${isCreator ? styles.creator : ""} ${menuOpen ? styles.menuActive : ""}`}>
      <nav className={styles.navbar}>
        <div className={styles.navContainer}>
          <Link href="/" className={styles.logoLink}>
            <img src="/images/logo.jpeg" alt="Sempai HQ" className={styles.logo} />
            <span className={styles.logoText}>Sempai HQ</span>
          </Link>
          <button className={styles.menuToggle} onClick={toggleMenu}>
            {menuOpen ? <FaTimes /> : <FaBars />}
          </button>
          <div className={`${styles.navLinks} ${menuOpen ? styles.navLinksOpen : ""}`}>
            <Link href="/" className={styles.navLink}>
              <FaHome /> Home
            </Link>
            <Link href="/writers-profile" className={styles.navLink}>
              <FaExchangeAlt /> View Profile
            </Link>
            <ConnectButton />
          </div>
        </div>
      </nav>

      <main className={styles.main}>
        <section className={styles.profileSection}>
          <h1 className={styles.title}>
            <FaUser /> Edit Profile
          </h1>

          <div className={styles.balanceCard}>
            <div className={styles.balanceItem}>
              <FaGem /> Amethyst: {balance || "0"}
            </div>
            <div className={styles.balanceItem}>
              <FaBolt /> Multiplier: {rewardAmount}
            </div>
          </div>

          {!connected && !embeddedWallet ? (
            <div className={styles.connectWrapper}>
              <p className={styles.connectText}>Connect your wallet to edit your profile</p>
              <ConnectButton />
            </div>
          ) : (
            <>
              <p className={styles.walletText}>
                <FaUser /> {formatUsername(publicKey?.toString() || embeddedWallet?.publicKey)}
              </p>
              {referralMessage && <div className={styles.alertInfo}>{referralMessage}</div>}
            </>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="name" className={styles.inputLabel}>
                <FaUser className={styles.inputIcon} /> Username
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your username"
                className={styles.input}
                required
                disabled={(!connected && !embeddedWallet) || isSaving}
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="email" className={styles.inputLabel}>
                <FaEnvelope className={styles.inputIcon} /> Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className={styles.input}
                required
                disabled={(!connected && !embeddedWallet) || isSaving}
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="twitter" className={styles.inputLabel}>
                <FaTwitter className={styles.inputIcon} /> Twitter Username
              </label>
              {xAccount && twitterVerified ? (
                <p className={styles.verifiedText}>Verified X Account: @{xAccount}</p>
              ) : (
                <div className={styles.inputWithButton}>
                  <input
                    id="twitter"
                    type="text"
                    value={twitterInput}
                    onChange={(e) => setTwitterInput(e.target.value)}
                    placeholder="e.g., @username or https://twitter.com/username"
                    className={styles.input}
                    disabled={(!connected && !embeddedWallet) || isVerifying || isSaving}
                  />
                  <button
                    type="button"
                    onClick={validateTwitterUsername}
                    className={styles.verifyButton}
                    disabled={!twitterInput || (!connected && !embeddedWallet) || isVerifying || isSaving}
                  >
                    {isVerifying ? <FaSpinner className={styles.spinner} /> : "Verify"}
                  </button>
                </div>
              )}
            </div>
            {twitterError && <div className={styles.alertError}>{twitterError}</div>}
            {twitterVerified && xAccount && (
              <div className={styles.alertSuccess}>Twitter username @{xAccount} verified!</div>
            )}

            <div className={styles.inputGroup}>
              <label htmlFor="image" className={styles.inputLabel}>
                <FaCamera className={styles.inputIcon} /> Profile Image
              </label>
              <div className={styles.imageGroup}>
                <div className={styles.inputWrapper}>
                  <label className={styles.imageLabel}>
                    <FaPen className={styles.editIcon} /> Upload Image
                    <input
                      id="image"
                      type="file"
                      onChange={handleImageChange}
                      className={styles.fileInput}
                      accept="image/*"
                      disabled={(!connected && !embeddedWallet) || isSaving}
                    />
                  </label>
                </div>
                {imageUrl && (
                  <div className={styles.previewWrapper}>
                    <img src={imageUrl} alt="Preview" className={styles.previewImage} />
                  </div>
                )}
              </div>
            </div>

            {isCreator && (
              <>
                <div className={styles.inputGroup}>
                  <label htmlFor="bio" className={styles.inputLabel}>
                    <FaBook className={styles.inputIcon} /> Bio
                  </label>
                  <textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself"
                    className={styles.textarea}
                    disabled={(!connected && !embeddedWallet) || isSaving}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label htmlFor="discord" className={styles.inputLabel}>
                    <FaDiscord className={styles.inputIcon} /> Discord ID
                  </label>
                  <input
                    id="discord"
                    type="text"
                    value={discord}
                    onChange={(e) => setDiscord(e.target.value)}
                    placeholder="e.g., user#1234"
                    className={styles.input}
                    disabled={(!connected && !embeddedWallet) || isSaving}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label htmlFor="website" className={styles.inputLabel}>
                    <FaGlobe className={styles.inputIcon} /> Website
                  </label>
                  <input
                    id="website"
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="e.g., https://yourwebsite.com"
                    className={styles.input}
                    disabled={(!connected && !embeddedWallet) || isSaving}
                  />
                </div>
              </>
            )}

            {error && <div className={styles.alertError}>{error}</div>}
            {success && <div className={styles.alertSuccess}>{success}</div>}
            <button
              type="submit"
              className={styles.submitButton}
              disabled={(!connected && !embeddedWallet) || isSaving}
            >
              {isSaving ? <FaSpinner className={styles.spinner} /> : <FaSave />} Save Changes
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}