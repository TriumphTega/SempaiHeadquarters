// src/app/writers-profile/[userId]/page.js
"use client";

import { useState, useEffect, useContext } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/services/supabase/supabaseClient";
import LoadingPage from "@/components/LoadingPage";
import { FaBook, FaRocket, FaGlobe, FaTwitter, FaDiscord, FaWallet, FaHome, FaExchangeAlt, FaBars, FaTimes } from "react-icons/fa";
import ConnectButton from "@/components/ConnectButton";
import { EmbeddedWalletContext } from "@/components/EmbeddedWalletProvider";
import styles from "../CreatorsProfile.module.css";
import Link from "next/link";

export default function CreatorsProfilePage() {
  const { connected, publicKey } = useWallet();
  const { wallet: embeddedWallet } = useContext(EmbeddedWalletContext);
  const router = useRouter();
  const { userId } = useParams();
  const [userRole, setUserRole] = useState("writer");
  const [creatorData, setCreatorData] = useState(null);
  const [novels, setNovels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [walletReady, setWalletReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isWriter, setIsWriter] = useState(false);
  const [isArtist, setIsArtist] = useState(false);
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [showCreatorChoice, setShowCreatorChoice] = useState(false);

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  // Normalize website URL
  const normalizeWebsiteUrl = (url) => {
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) {
      return url;
    }
    return `https://${url}`;
  };

  // Determine dashboard button text and behavior
  const getDashboardButtonProps = () => {
    if (isSuperuser || (isWriter && isArtist)) {
      return { text: "Creator Dashboard", action: () => setShowCreatorChoice(true) };
    } else if (isWriter) {
      return { text: "Writers Dashboard", action: () => handleNavigation("/novel-creators-dashboard") };
    } else if (isArtist) {
      return { text: "Artist Dashboard", action: () => handleNavigation("/manga-creators-dashboard") };
    }
    return { text: "Creator Dashboard", action: () => handleNavigation("/apply") }; // Fallback if no roles
  };

  const handleNavigation = (path) => {
    setLoading(true);
    setMenuOpen(false);
    setShowCreatorChoice(false);
    router.push(path);
  };

  const handleCreatorChoice = (path) => {
    setShowCreatorChoice(false);
    handleNavigation(path);
  };

  useEffect(() => {
    if (connected || embeddedWallet) setWalletReady(true);
  }, [connected, publicKey, embeddedWallet]);

  useEffect(() => {
    const fetchProfileDetails = async () => {
      if (!userId) {
        setError("No user ID provided.");
        setLoading(false);
        return;
      }

      try {
        const { data: user, error: userError } = await supabase
          .from("users")
          .select("id, isWriter, isArtist, isSuperuser, name, wallet_address, image")
          .eq("id", userId)
          .single();

        if (userError || !user) throw new Error(`User not found: ${userError?.message || "No user data"}`);

        // Set user roles
        setIsWriter(user.isWriter || false);
        setIsArtist(user.isArtist || false);
        setIsSuperuser(user.isSuperuser || false);

        // Set user role for styling
        if (user.isSuperuser) setUserRole("superuser");
        else if (user.isWriter && user.isArtist) setUserRole("both");
        else if (user.isArtist) setUserRole("artist");
        else if (user.isWriter) setUserRole("writer");
        else {
          setError("This user is not a creator.");
          setLoading(false);
          return;
        }

        // Check if this is the user's own profile
        if (walletReady && (publicKey?.toString() === user.wallet_address || embeddedWallet?.publicKey === user.wallet_address)) {
          setIsOwnProfile(true);
        }

        const { data: profile, error: profileError } = await supabase
          .from("writer_profiles")
          .select("bio, twitter, discord, website")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileError && profileError.code !== "PGRST116") console.error("Profile fetch error:", profileError);

        const { data: novelsData, error: novelsError } = await supabase
          .from("novels")
          .select("id, title, image, summary")
          .eq("user_id", user.id);

        if (novelsError) throw new Error(`Novels fetch error: ${novelsError.message}`);

        setCreatorData({ ...user, ...profile });
        setNovels(novelsData || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileDetails();
  }, [userId, walletReady, publicKey, embeddedWallet]);

  useEffect(() => {
    // Close creator choice popup on outside click
    const handleOutsideClick = (e) => {
      const choicePopup = document.querySelector(`.${styles.creatorChoicePopup}`);
      if (showCreatorChoice && !choicePopup?.contains(e.target)) {
        setShowCreatorChoice(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [showCreatorChoice]);

  if (loading) return <LoadingPage />;

  const dashboardButton = getDashboardButtonProps();

  return (
    <div className={`${styles.page} ${styles[userRole]} ${menuOpen ? styles.menuActive : ""}`}>
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
            <Link href="/" onClick={() => handleNavigation("/")} className={styles.navLink}>
              <FaHome /> Home
            </Link>
            <Link href="/swap" onClick={() => handleNavigation("/swap")} className={styles.navLink}>
              <FaExchangeAlt /> Swap
            </Link>
            {isOwnProfile && (
              <Link href="/editprofile" onClick={() => handleNavigation("/editprofile")} className={styles.navLink}>
                <FaExchangeAlt /> Edit Profile
              </Link>
            )}
            <ConnectButton />
          </div>
        </div>
      </nav>

      <main className={styles.main}>
        <div className={styles.content}>
          <h1 className={styles.title}><FaRocket /> Creator’s Nexus</h1>
          {error ? (
            <div className={styles.errorContainer}>
              <p className={styles.error}>{error}</p>
              {isOwnProfile && (
                <button onClick={() => handleNavigation("/profile")} className={styles.navButton}>
                  <img src={creatorData?.image || "/images/default-profile.jpg"} alt="Profile" className={styles.profileIcon} />
                  Back to Profile
                </button>
              )}
            </div>
          ) : (
            <>
              <section className={styles.profileCard}>
                <h2 className={styles.sectionTitle}>
                  <img src={creatorData?.image || "/images/default-profile.jpg"} alt="Profile" className={styles.profileIcon} />
                  {creatorData?.name || creatorData?.wallet_address.slice(0, 8)}
                </h2>
                <p className={styles.bio}>{creatorData?.bio || "No bio provided."}</p>
                <div className={styles.socials}>
                  {creatorData?.twitter && (
                    <a href={`https://twitter.com/${creatorData.twitter}`} target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                      <FaTwitter /> @{creatorData.twitter}
                    </a>
                  )}
                  {creatorData?.discord && (
                    <span className={styles.socialLink}><FaDiscord /> {creatorData.discord}</span>
                  )}
                  {creatorData?.website && (
                    <a
                      href={normalizeWebsiteUrl(creatorData.website)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.socialLink}
                    >
                      <FaGlobe /> Website
                    </a>
                  )}
                </div>
                <p className={styles.walletInfo}><FaWallet /> {creatorData?.wallet_address.slice(0, 8)}...</p>
              </section>
              <section className={styles.novelsSection}>
                <h2 className={styles.sectionTitle}><FaBook /> Creations</h2>
                {novels.length > 0 ? (
                  <div className={styles.novelGrid}>
                    {novels.map((novel) => (
                      <div key={novel.id} className={styles.novelCard}>
                        <img src={novel.image} alt={novel.title} className={styles.novelImage} />
                        <h3 className={styles.novelTitle}>{novel.title}</h3>
                        <p className={styles.novelSummary}>{novel.summary.slice(0, 100)}...</p>
                        <button onClick={() => handleNavigation(`/novel/${novel.id}`)} className={styles.novelButton}>
                          <FaBook /> Read More
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.placeholder}>No creations yet.</p>
                )}
              </section>
              {isOwnProfile && (
                <div className={styles.profileActions}>
                  <button onClick={() => handleNavigation("/editprofile")} className={styles.navButton}>
                    <img src={creatorData?.image || "/images/default-profile.jpg"} alt="Profile" className={styles.profileIcon} />
                    Edit Profile
                  </button>
                  <button onClick={dashboardButton.action} className={styles.navButton}>
                    <FaRocket /> {dashboardButton.text}
                  </button>
                </div>
              )}
              {showCreatorChoice && (
                <div className={styles.creatorChoiceOverlay}>
                  <div className={styles.creatorChoicePopup}>
                    <button onClick={() => setShowCreatorChoice(false)} className={styles.closePopupButton}>
                      <FaTimes />
                    </button>
                    <h3 className={styles.popupTitle}>Choose Your Dashboard</h3>
                    <p className={styles.popupMessage}>You have multiple creator roles. Which dashboard would you like to access?</p>
                    <div className={styles.choiceButtons}>
                      <button
                        onClick={() => handleCreatorChoice("/novel-creators-dashboard")}
                        className={styles.choiceButton}
                      >
                        Novel Creators Dashboard
                      </button>
                      <button
                        onClick={() => handleCreatorChoice("/manga-creators-dashboard")}
                        className={styles.choiceButton}
                      >
                        Manga Creators Dashboard
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}