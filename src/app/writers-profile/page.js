"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/services/supabase/supabaseClient";
import LoadingPage from "@/components/LoadingPage";
import { FaBook, FaRocket, FaUserAstronaut, FaGlobe, FaTwitter, FaDiscord, FaWallet, FaHome, FaExchangeAlt, FaBars, FaTimes } from "react-icons/fa";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import styles from "./WritersProfile.module.css";
import Link from "next/link";

export default function WritersProfilePage() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const [isWriter, setIsWriter] = useState(false);
  const [writerData, setWriterData] = useState(null);
  const [novels, setNovels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [walletReady, setWalletReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  useEffect(() => {
    console.log("Wallet State:", { connected, publicKey: publicKey?.toString() });
    const checkWallet = () => {
      if (connected && publicKey) {
        setWalletReady(true);
      } else {
        const timeout = setTimeout(() => {
          if (connected && publicKey) setWalletReady(true);
        }, 500);
        return () => clearTimeout(timeout);
      }
    };
    checkWallet();
  }, [connected, publicKey]);

  useEffect(() => {
    if (!walletReady) return;

    const fetchWriterDetails = async () => {
      try {
        const walletAddress = publicKey.toString();
        console.log("Fetching user data for wallet:", walletAddress);

        const { data: user, error: userError } = await supabase
          .from("users")
          .select("id, isWriter, name")
          .eq("wallet_address", walletAddress)
          .single();

        if (userError || !user) {
          throw new Error(`User not found: ${userError?.message || "No user data"}`);
        }

        console.log("User data:", user);

        if (!user.isWriter) {
          console.log("User is not a writer, redirecting to /profile");
          router.push("/profile");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("writer_profiles")
          .select("bio, twitter, discord, website")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileError && profileError.code !== "PGRST116") {
          console.error("Profile fetch error:", profileError);
        }

        const { data: novelsData, error: novelsError } = await supabase
          .from("novels")
          .select("id, title, image, summary")
          .eq("user_id", user.id);

        if (novelsError) throw new Error(`Novels fetch error: ${novelsError.message}`);

        console.log("Novels data:", novelsData);

        setIsWriter(true);
        setWriterData({ ...user, ...profile });
        setNovels(novelsData || []);
      } catch (err) {
        console.error("Error in fetchWriterDetails:", err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWriterDetails();
  }, [walletReady, publicKey, router]);

  const handleNavigation = (path) => {
    console.log("Navigating to:", path);
    router.push(path);
  };

  return (
    <div className={`${styles.container} ${menuOpen ? styles.menuActive : ""}`}>
      {/* Navbar from EditProfile */}
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

      {/* Main Content */}
      <main className={styles.main}>
        {loading || !walletReady ? (
          <LoadingPage />
        ) : !connected || !publicKey ? (
          <div className={styles.content}>
            <h1 className={styles.title}><FaRocket /> Writer’s Nexus</h1>
            <p className={styles.error}>Connect your Solana wallet to access the Writer’s Nexus.</p>
            <div className={styles.connectWrapper}>
              <WalletMultiButton className={styles.connectButton} />
            </div>
          </div>
        ) : error || !isWriter ? (
          <div className={styles.content}>
            <h1 className={styles.title}><FaRocket /> Writer’s Nexus</h1>
            <p className={styles.error}>{error || "Access denied. Writers only."}</p>
            <button onClick={() => handleNavigation("/profile")} className={styles.navButton}>
              <FaUserAstronaut /> Back to Profile
            </button>
          </div>
        ) : (
          <div className={styles.content}>
            <h1 className={styles.title}><FaRocket /> Writer’s Nexus</h1>
            <section className={styles.profileCard}>
              <h2 className={styles.sectionTitle}>
                <FaUserAstronaut /> {writerData?.name || publicKey.toString().slice(0, 8)}
              </h2>
              <p className={styles.bio}>{writerData?.bio || "No bio provided."}</p>
              <div className={styles.socials}>
                {writerData?.twitter && (
                  <a href={`https://twitter.com/${writerData.twitter}`} target="_blank" className={styles.socialLink}>
                    <FaTwitter /> @{writerData.twitter}
                  </a>
                )}
                {writerData?.discord && (
                  <span className={styles.socialLink}><FaDiscord /> {writerData.discord}</span>
                )}
                {writerData?.website && (
                  <a href={writerData.website} target="_blank" className={styles.socialLink}>
                    <FaGlobe /> Website
                  </a>
                )}
              </div>
              <p className={styles.walletInfo}><FaWallet /> {publicKey.toString().slice(0, 8)}...</p>
            </section>
            <section className={styles.novelsSection}>
              <h2 className={styles.sectionTitle}><FaBook /> My Creations</h2>
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
                <p className={styles.placeholder}>No novels yet. Start creating!</p>
              )}
            </section>
            <button onClick={() => handleNavigation("/creators-dashboard")} className={styles.navButton}>
              <FaRocket /> Creator Dashboard
            </button>
          </div>
        )}
      </main>
    </div>
  );
}