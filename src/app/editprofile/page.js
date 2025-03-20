"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../services/supabase/supabaseClient";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useRouter } from "next/navigation"; // Replace useSearchParams with useRouter
import {  FaUser,  FaEnvelope,  FaCamera,  FaGem,  FaBolt,  FaSave,  FaHome,  FaExchangeAlt,  FaBars,  FaTimes,  FaBook, FaTwitter,FaDiscord, FaGlobe, FaPen} from "react-icons/fa";
import UseAmethystBalance from "../../components/UseAmethystBalance";
import styles from "./EditProfile.module.css";
import Link from "next/link";

export default function EditProfile() {
  const { connected, publicKey } = useWallet();
  const router = useRouter(); // Use useRouter instead of useSearchParams
  const [userId, setUserId] = useState(null);
  const [isCreator, setIsCreator] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [bio, setBio] = useState("");
  const [twitter, setTwitter] = useState("");
  const [discord, setDiscord] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [referralMessage, setReferralMessage] = useState("");
  const { balance } = UseAmethystBalance();

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!connected || !publicKey) return;

      try {
        const walletAddress = publicKey.toString();
        const { data: user, error: userError } = await supabase
          .from("users")
          .select("id, email, name, image, isWriter, isArtist, isSuperuser, referred_by, has_updated_profile, weekly_points")
          .eq("wallet_address", walletAddress)
          .single();

        if (userError) {
          if (userError.code === "PGRST116") {
            setError("No user found. Please connect your wallet on the home page first.");
            return;
          }
          console.error("Supabase fetch error:", userError);
          throw new Error(`Error fetching user: ${userError.message} (Code: ${userError.code})`);
        }

        setUserId(user.id);
        setEmail(user.email || "");
        setName(user.name || "");
        setImageUrl(user.image || "");
        setIsCreator(user.isWriter || user.isArtist);

        // Access query params with useRouter
        const refCode = router.query?.ref;
        setIsNewUser(!user.has_updated_profile && !!user.referred_by);
        if (!user.has_updated_profile && user.referred_by) {
          setReferralMessage("Update your profile to claim 100 points and reward your inviter with 100 points!");
        }

        if (user.isWriter || user.isArtist) {
          const { data: profile, error: profileError } = await supabase
            .from("writer_profiles")
            .select("bio, twitter, discord, website")
            .eq("user_id", user.id)
            .single();

          if (profileError && profileError.code !== "PGRST116") {
            console.error("Profile fetch error:", profileError);
            throw new Error("Error fetching profile: " + profileError.message);
          }
          setBio(profile?.bio || "");
          setTwitter(profile?.twitter || "");
          setDiscord(profile?.discord || "");
          setWebsite(profile?.website || "");
        }
      } catch (err) {
        setError(err.message);
        console.error("Fetch user data failed:", err);
      }
    };

    fetchUserData();
  }, [connected, publicKey, router]); // Add router to dependency array

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
      const fileName = `${publicKey.toString()}-${Date.now()}.${file.name.split(".").pop()}`;
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

    if (!userId) {
      setError("Please connect your wallet to update your profile.");
      return;
    }

    try {
      const { data: currentUserData, error: fetchError } = await supabase
        .from("users")
        .select("referred_by, has_updated_profile, weekly_points")
        .eq("id", userId)
        .single();

      if (fetchError) throw new Error("Error fetching user data: " + fetchError.message);

      const { error: userError } = await supabase
        .from("users")
        .update({
          name: name.trim(),
          email: email.trim(),
          image: imageUrl,
          has_updated_profile: true,
        })
        .eq("id", userId);

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
        setSuccess("Profile updated successfully! You’ve claimed 100 points, and your inviter received 100 points!");
      } else {
        setSuccess("Profile updated successfully!");
      }

      if (isCreator) {
        const { error: profileError } = await supabase
          .from("writer_profiles")
          .upsert(
            { user_id: userId, bio: bio.trim(), twitter: twitter.trim(), discord: discord.trim(), website: website.trim() },
            { onConflict: "user_id" }
          );

        if (profileError) throw new Error("Error updating writer profile: " + profileError.message);
      }
    } catch (err) {
      setError(err.message);
      console.error("Submit error:", err);
    }
  };

  const formatUsername = (address) =>
    address.length > 15 ? `${address.slice(0, 2)}**${address.slice(-2)}` : address;

  return (
    <div className={`${styles.page} ${isCreator ? styles.creator : ""} ${menuOpen ? styles.menuActive : ""}`}>
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
            <Link href="/creators-profile" className={styles.navLink}><FaExchangeAlt /> View Profile</Link>
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
            <>
              <p className={styles.walletText}><FaUser /> {formatUsername(publicKey.toString())}</p>
              {referralMessage && <div className={styles.alertInfo}>{referralMessage}</div>}
            </>
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
                <label className={styles.imageLabel}>
                  <FaCamera className={styles.inputIcon} />
                  <FaPen className={styles.editIcon} />
                  <input
                    type="file"
                    onChange={handleImageChange}
                    className={styles.fileInput}
                    accept="image/*"
                    disabled={!connected}
                  />
                </label>
              </div>
              {imageUrl && (
                <div className={styles.previewWrapper}>
                  <img src={imageUrl} alt="Preview" className={styles.previewImage} />
                </div>
              )}
            </div>

            {isCreator && (
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
                  <FaTwitter className={styles.inputIcon} /> {/* Updated to FaXTwitter */}
                  <input
                    type="text"
                    value={twitter}
                    onChange={(e) => setTwitter(e.target.value)}
                    placeholder="X Handle (e.g., username)"
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