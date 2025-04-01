"use client";

import { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../services/supabase/supabaseClient";
import { useWallet } from "@solana/wallet-adapter-react";
import { EmbeddedWalletContext } from "../../components/EmbeddedWalletProvider";
import Link from "next/link";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  FaHome,
  FaBars,
  FaTimes,
  FaBullhorn,
  FaUserShield,
  FaGem,
  FaSun,
  FaMoon,
} from "react-icons/fa";
import ConnectButton from "../../components/ConnectButton";
import styles from "../../styles/CreatorsDashboard.module.css";

export default function Announcements() {
  const { connected, publicKey } = useWallet();
  const { wallet: embeddedWallet } = useContext(EmbeddedWalletContext);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementReleaseDate, setAnnouncementReleaseDate] = useState(null);
  const [audience, setAudience] = useState("all");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isWriter, setIsWriter] = useState(false);
  const [isArtist, setIsArtist] = useState(false);
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const router = useRouter();

  const activePublicKey = publicKey || (embeddedWallet ? embeddedWallet.publicKey : null);
  const isWalletConnected = connected || !!embeddedWallet;

  const handleAccessCheck = async () => {
    if (!isWalletConnected || !activePublicKey) return;

    setLoading(true);
    try {
      const walletAddress = activePublicKey.toString();
      const { data, error } = await supabase
        .from("users")
        .select("id, isWriter, isArtist, isSuperuser")
        .eq("wallet_address", walletAddress)
        .single();

      if (error) throw new Error(`Access check failed: ${error.message}`);
      if (!data) throw new Error("No user data found");

      if (!data.isWriter && !data.isArtist && !data.isSuperuser) {
        router.push("/error");
        return;
      }

      setCurrentUserId(data.id);
      setIsWriter(data.isWriter);
      setIsArtist(data.isArtist);
      setIsSuperuser(data.isSuperuser);
    } catch (err) {
      console.error("Error checking access:", err);
      router.push("/error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleAccessCheck();
  }, [connected, publicKey, embeddedWallet]);

  const handleAnnouncementSubmit = async (e) => {
    e.preventDefault();

    if (!announcementTitle.trim() || !announcementMessage.trim()) {
      alert("Please provide both an announcement title and message.");
      return;
    }

    setLoading(true);
    try {
      let targetUsers = [];

      if (isSuperuser) {
        let query = supabase.from("users").select("id, isWriter, isArtist");

        if (audience === "writers") {
          query = query.eq("isWriter", true);
        } else if (audience === "artists") {
          query = query.eq("isArtist", true);
        } else if (audience === "creators") {
          query = query.or("isWriter.eq.true,isArtist.eq.true");
        }

        const { data: allUsers, error: usersError } = await query;

        if (usersError) throw new Error(`Failed to fetch users: ${usersError.message}`);
        if (!allUsers || allUsers.length === 0) throw new Error(`No users found for audience: ${audience}`);

        targetUsers = allUsers.map((user) => user.id);
        console.log("Target users (superuser):", targetUsers); // Debug log
      } else if (isWriter || isArtist) {
        const { data: works, error: worksError } = await supabase
          .from(isWriter ? "novels" : "manga")
          .select("id")
          .eq("user_id", currentUserId);

        if (worksError) throw new Error(`Failed to fetch works: ${worksError.message}`);
        if (!works || works.length === 0) {
          alert("You have no works to announce about.");
          setLoading(false);
          return;
        }

        const workIds = works.map((work) => work.id);
        const { data: interactions, error: interactionsError } = await supabase
          .from(isWriter ? "novel_interactions" : "manga_interactions")
          .select("user_id")
          .in(isWriter ? "novel_id" : "manga_id", workIds)
          .neq("user_id", currentUserId);

        if (interactionsError) throw new Error(`Failed to fetch interactions: ${interactionsError.message}`);

        targetUsers = [...new Set(interactions?.map((interaction) => interaction.user_id) || [])];
        console.log("Target users (writer/artist):", targetUsers); // Debug log
      }

      if (targetUsers.length === 0) {
        alert("No users to notify for the selected audience.");
        setLoading(false);
        return;
      }

      const announcementData = {
        user_id: currentUserId,
        title: announcementTitle,
        message: announcementMessage,
        release_date: announcementReleaseDate ? announcementReleaseDate.toISOString() : null,
        is_superuser_announcement: isSuperuser,
        audience: isSuperuser ? audience : null,
      };

      const { error: announcementError } = await supabase
        .from("announcements")
        .insert([announcementData]);

      if (announcementError) throw new Error(`Failed to insert announcement: ${announcementError.message}`);

      const notifications = targetUsers.map((userId) => ({
        user_id: userId,
        type: "announcement",
        message: `${announcementTitle}: ${announcementMessage}`,
      }));

      const { error: notifError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (notifError) throw new Error(`Failed to insert notifications: ${notifError.message}`);

      alert("Announcement sent successfully!");
      setAnnouncementTitle("");
      setAnnouncementMessage("");
      setAnnouncementReleaseDate(null);
      setAudience("all");
    } catch (err) {
      console.error("Full error details:", err); // Log full error object
      alert(`Failed to send announcement: ${err.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleMenu = () => setMenuOpen((prev) => !prev);
  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  return (
    <div className={`${styles.page} ${isDarkMode ? styles.darkMode : styles.lightMode}`}>
      <nav className={`${styles.navbar} ${menuOpen ? styles.navbarOpen : ""}`}>
        <div className={styles.navContainer}>
          <Link href="/" className={styles.logoLink}>
            <img src="/images/logo.png" alt="Sempai HQ" className={styles.logo} />
            <span className={styles.logoText}>Sempai HQ</span>
          </Link>
          <button className={styles.menuToggle} onClick={toggleMenu}>
            {menuOpen ? <FaTimes /> : <FaBars />}
          </button>
          <div className={`${styles.navLinks} ${menuOpen ? styles.navLinksOpen : ""}`}>
            <Link href="/" className={styles.navLink}>
              <FaHome /> Home
            </Link>
            <Link href="/creators-dashboard" className={styles.navLink}>
              <FaUserShield /> Dashboard
            </Link>
            <button onClick={toggleTheme} className={styles.themeToggle}>
              {isDarkMode ? <FaSun /> : <FaMoon />}
            </button>
            <ConnectButton className={styles.connectButton} />
          </div>
        </div>
      </nav>

      {menuOpen && <div className={styles.blurOverlay}></div>}

      <header className={styles.header}>
        <h1 className={styles.headerTitle}>
          <FaBullhorn /> Announcements
        </h1>
        <p className={styles.headerSubtitle}>
          {isSuperuser
            ? "Broadcast to your selected audience in the dApp."
            : "Notify fans of your works."}
        </p>
      </header>

      <main className={styles.main}>
        {!isWalletConnected ? (
          <div className={styles.connectPrompt}>
            <FaGem className={styles.connectIcon} />
            <p>Connect your wallet to access the Announcements page.</p>
            <ConnectButton className={styles.connectButtonPrompt} />
          </div>
        ) : !isWriter && !isArtist && !isSuperuser ? (
          <div className={styles.accessDenied}>
            <FaTimes className={styles.deniedIcon} />
            <p>Access Denied. Only writers, artists, and superusers may enter.</p>
            <Link href="/" className={styles.backLink}>
              <FaHome /> Return Home
            </Link>
          </div>
        ) : (
          <div className={styles.dashboard}>
            <section className={styles.formSection}>
              <h2 className={styles.sectionTitle}>
                <FaBullhorn /> Create Announcement
              </h2>
              <form onSubmit={handleAnnouncementSubmit} className={styles.announcementForm}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Announcement Title</label>
                  <input
                    type="text"
                    value={announcementTitle}
                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                    placeholder="e.g., Exciting News for Fans!"
                    className={styles.input}
                    required
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Message</label>
                  <textarea
                    value={announcementMessage}
                    onChange={(e) => setAnnouncementMessage(e.target.value)}
                    placeholder="Write your announcement here"
                    className={styles.textarea}
                    rows="5"
                    required
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Release Date (Optional)</label>
                  <DatePicker
                    selected={announcementReleaseDate}
                    onChange={(date) => setAnnouncementReleaseDate(date)}
                    showTimeSelect
                    dateFormat="Pp"
                    minDate={new Date()}
                    placeholderText="Select release date"
                    className={styles.input}
                  />
                </div>
                {isSuperuser && (
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Target Audience</label>
                    <select
                      value={audience}
                      onChange={(e) => setAudience(e.target.value)}
                      className={styles.input}
                    >
                      <option value="all">All Users</option>
                      <option value="writers">Only Writers</option>
                      <option value="artists">Only Artists</option>
                      <option value="creators">Only Creators (Writers & Artists)</option>
                    </select>
                  </div>
                )}
                <button
                  type="submit"
                  className={styles.announcementButton}
                  disabled={loading}
                >
                  {loading ? (
                    <span className={styles.spinner}></span>
                  ) : (
                    <>
                      <FaBullhorn /> Send Announcement
                    </>
                  )}
                </button>
              </form>
            </section>
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <p className={styles.footerText}>© 2025 Sempai HQ. All rights reserved.</p>
      </footer>
    </div>
  );
}