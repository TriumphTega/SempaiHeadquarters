"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/services/supabase/supabaseClient";
import LoadingPage from "@/components/LoadingPage";
import { FaRocket, FaGlobe, FaTwitter, FaDiscord, FaWallet, FaHome, FaExchangeAlt, FaBars, FaTimes } from "react-icons/fa";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import styles from "./CreatorsProfile.module.css"; // Updated to CreatorsProfile.module.css
import Link from "next/link";

export default function CreatorsProfilePage() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const [userRole, setUserRole] = useState("writer"); // "writer", "artist", "both", "superuser"
  const [creatorData, setCreatorData] = useState(null);
  const [novels, setNovels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [walletReady, setWalletReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  useEffect(() => {
    if (connected && publicKey) setWalletReady(true);
  }, [connected, publicKey]);

  useEffect(() => {
    if (!walletReady) return;

    const fetchCreatorDetails = async () => {
      try {
        const walletAddress = publicKey.toString();

        const { data: user, error: userError } = await supabase
          .from("users")
          .select("id, isWriter, isArtist, isSuperuser, name, image")
          .eq("wallet_address", walletAddress)
          .single();

        if (userError || !user) throw new Error(`User not found: ${userError?.message || "No user data"}`);

        // Determine user role
        if (user.isSuperuser) setUserRole("superuser");
        else if (user.isWriter && user.isArtist) setUserRole("both");
        else if (user.isArtist) setUserRole("artist");
        else if (user.isWriter) setUserRole("writer");
        else {
          router.push("/profile");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("writer_profiles") // Assuming this table is still used for creators
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

    fetchCreatorDetails();
  }, [walletReady, publicKey, router]);

  const handleNavigation = (path) => router.push(path);

  return (
    <div className={`${styles.page} ${styles[userRole]} ${menuOpen ? styles.menuActive : ""}`}>
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
            <Link href="/editprofile" className={styles.navLink}><FaExchangeAlt /> Edit Profile</Link>
          </div>
        </div>
      </nav>

      <main className={styles.main}>
        {loading || !walletReady ? (
          <LoadingPage />
        ) : !connected || !publicKey ? (
          <div className={styles.content}>
            <h1 className={styles.title}>Profile</h1>
            <p className={styles.error}>Connect your Solana wallet to view your profile.</p>
            <div className={styles.connectWrapper}>
              <WalletMultiButton className={styles.connectButton} />
            </div>
          </div>
        ) : error ? (
          <div className={styles.content}>
            <h1 className={styles.title}>Profile</h1>
            <p className={styles.error}>{error}</p>
            <button onClick={() => handleNavigation("/profile")} className={styles.navButton}>
              <img src={creatorData?.image || "/images/default-profile.jpg"} alt="Profile" className={styles.profileIcon} />
              Back to Profile
            </button>
          </div>
        ) : (
          <div className={styles.content}>
            <h1 className={styles.title}>My Creator Profile</h1>
            <section className={styles.profileCard}>
              <h2 className={styles.sectionTitle}>
                <img src={creatorData?.image || "/images/default-profile.jpg"} alt="Profile" className={styles.profileIcon} />
                {creatorData?.name || publicKey.toString().slice(0, 8)}
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
                  <a href={creatorData.website} target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                    <FaGlobe /> Website
                  </a>
                )}
              </div>
              <p className={styles.walletInfo}><FaWallet /> {publicKey.toString().slice(0, 8)}...</p>
            </section>
            <section className={styles.novelsSection}>
              <h2 className={styles.sectionTitle}><FaRocket /> My Creations</h2>
              {novels.length > 0 ? (
                <div className={styles.novelGrid}>
                  {novels.map((novel) => (
                    <div key={novel.id} className={styles.novelCard}>
                      <img src={novel.image} alt={novel.title} className={styles.novelImage} />
                      <h3 className={styles.novelTitle}>{novel.title}</h3>
                      <p className={styles.novelSummary}>{novel.summary.slice(0, 100)}...</p>
                      <button onClick={() => handleNavigation(`/novel/${novel.id}`)} className={styles.novelButton}>
                        <FaRocket /> Read More
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.placeholder}>No creations yet. Start creating!</p>
              )}
            </section>
            <div className={styles.profileActions}>
              <button onClick={() => handleNavigation("/editprofile")} className={styles.navButton}>
                <FaExchangeAlt /> Edit Profile
              </button>
              <button onClick={() => handleNavigation("/creators-dashboard")} className={styles.navButton}>
                <FaRocket /> Creator Dashboard
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}