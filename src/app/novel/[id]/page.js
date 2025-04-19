"use client";

import { useState, useEffect, useCallback, useContext } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../services/supabase/supabaseClient";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { FaHome, FaBars, FaTimes, FaBookOpen, FaEye } from "react-icons/fa";
import Link from "next/link";
import LoadingPage from "../../../components/LoadingPage";
import NovelCommentSection from "../../../components/Comments/NovelCommentSection";
import styles from "../../../styles/NovelPage.module.css";
import { EmbeddedWalletContext } from "../../../components/EmbeddedWalletProvider";
import { PublicKey } from "@solana/web3.js";

export default function NovelPage() {
  const { id } = useParams();
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  const { wallet: embeddedWallet } = useContext(EmbeddedWalletContext);
  const [novel, setNovel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showConnectPopup, setShowConnectPopup] = useState(false);
  const [viewCountError, setViewCountError] = useState(null);

  // Determine active wallet
  const activePublicKey = embeddedWallet?.publicKey
    ? new PublicKey(embeddedWallet.publicKey)
    : publicKey;
  const isWalletConnected = !!activePublicKey;

  // Sanitize text to prevent XSS
  const sanitizeText = (text) => {
    if (!text) return "";
    return text.replace(/[<>&"']/g, (char) => ({
      "<": "<",
      ">": ">",
      "&": "&",
      '"': "",
      "'": "'",
    }[char]));
  };

  // Toggle mobile menu
  const toggleMenu = () => {
    setMenuOpen((prev) => !prev);
    setShowConnectPopup(false);
  };

  // Fetch novel data
  const fetchNovel = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("novels")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw new Error("Novel not found");
      setNovel(data);
    } catch (error) {
      console.error("Unexpected error:", error.message);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Function to check and increment view count
  const updateViewCount = useCallback(async () => {
    if (!isWalletConnected || !activePublicKey) {
      console.log("No wallet connected, skipping view count update");
      return;
    }

    try {
      // Fetch user_id from users table using wallet_address
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("wallet_address", activePublicKey.toString())
        .single();

      if (userError || !user) {
        console.error("User not found for wallet:", activePublicKey.toString());
        setViewCountError("Please register your wallet to track views.");
        return;
      }

      const userId = user.id;

      // Call RPC function to increment viewers_count and add interaction
      const { error: rpcError } = await supabase.rpc("increment_novel_view", {
        novel_id: id,
        user_id: userId,
      });

      if (rpcError) {
        console.error("Error in increment_novel_view:", rpcError.message);
        setViewCountError("Failed to update view count. Please try again later.");
      } else {
        console.log("Viewers count incremented and interaction recorded for user:", userId);
      }
    } catch (error) {
      console.error("Error in updateViewCount:", error.message);
      setViewCountError("An unexpected error occurred while updating view count.");
    }
  }, [id, isWalletConnected, activePublicKey]);

  // Clear view count error after 5 seconds
  useEffect(() => {
    if (viewCountError) {
      const timer = setTimeout(() => setViewCountError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [viewCountError]);

  // Fetch novel data and update view count on mount
  useEffect(() => {
    fetchNovel();
    updateViewCount();
  }, [fetchNovel, updateViewCount]);

  // Handle navigation with wallet check for chapters beyond 1
  const handleNavigation = (path, chapterId) => {
    const chapterNum = parseInt(chapterId, 10);
    if (isNaN(chapterNum) || (!isWalletConnected && chapterNum > 1)) {
      setShowConnectPopup(true);
    } else {
      router.push(path);
    }
  };

  if (loading) return <LoadingPage />;

  if (!novel || error) {
    return (
      <div className={styles.errorContainer}>
        <h2 className={styles.errorText}>{error || "Novel not found"}</h2>
        <Link href="/" className={styles.backHomeLink}>
          <FaHome /> Back to Home
        </Link>
      </div>
    );
  }

  // Show connect popup only if triggered by navigation
  if (showConnectPopup) {
    return (
      <div className={styles.connectPopupOverlay}>
        <div className={`${styles.connectPopup} ${styles.dark}`}>
          <button
            onClick={() => setShowConnectPopup(false)}
            className={styles.closePopupButton}
          >
            <FaTimes />
          </button>
          <h3 className={styles.popupTitle}>Access Denied</h3>
          <p className={styles.popupMessage}>
            Connect your wallet to explore this chapter.
          </p>
          <WalletMultiButton className={styles.connectWalletButton} />
          <p className={styles.popupNote}>
            Using an embedded wallet? Ensure you're logged in or connect above.
          </p>
          <Link href="/" className={styles.backHomeLink}>
            <FaHome /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.page} ${styles.dark}`}>
      {/* Error Message for View Count */}
      {viewCountError && (
        <div className={styles.errorMessage}>
          {viewCountError}
          <button onClick={() => setViewCountError(null)} className={styles.clearErrorButton}>
            <FaTimes />
          </button>
        </div>
      )}

      {/* Futuristic Navbar */}
      <nav className={styles.navbar}>
        <div className={styles.navContainer}>
          <Link href="/" className={styles.logoLink}>
            <img
              src="/images/logo.jpeg"
              alt="Sempai HQ"
              className={styles.logo}
            />
            <span className={styles.logoText}>Sempai HQ</span>
          </Link>
          <button className={styles.menuToggle} onClick={toggleMenu}>
            <FaBars />
          </button>
          <div
            className={`${styles.navLinks} ${
              menuOpen ? styles.navLinksOpen : ""
            }`}
          >
            <Link href="/" className={styles.navLink}>
              <FaHome className={styles.navIcon} /> Home
            </Link>
            <Link href={`/novel/${id}/summary`} className={styles.navLink}>
              <FaBookOpen className={styles.navIcon} /> Summary
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className={styles.novelContainer}>
        <div className={styles.novelHeader}>
          <h1 className={styles.novelTitle}>{sanitizeText(novel.title)}</h1>
          <div className={styles.novelImageWrapper}>
            <img
              src={novel.image || "/images/default-novel.jpg"}
              alt={sanitizeText(novel.title)}
              className={styles.novelImage}
            />
            <div className={styles.imageGlow}></div>
          </div>
          <p className={styles.novelViews}>
            <FaEye className={styles.viewIcon} /> {novel.viewers_count || 0} Views
          </p>
          <p className={styles.novelIntro}>
            Dive into the chapters of{" "}
            <span className={styles.highlight}>
              {sanitizeText(novel.title)}
            </span>
            :
          </p>
        </div>

        {/* Chapters Grid */}
        <div className={styles.chaptersGrid}>
          {novel.chaptertitles && Object.keys(novel.chaptertitles).length > 0 ? (
            Object.entries(novel.chaptertitles).map(([chapterId, title]) => (
              <Link
                href={`/novel/${id}/chapter/${chapterId}`}
                key={chapterId}
                className={styles.chapterCard}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavigation(`/novel/${id}/chapter/${chapterId}`, chapterId);
                }}
              >
                <div className={styles.chapterContent}>
                  <h3 className={styles.chapterTitle}>{sanitizeText(title)}</h3>
                  <div className={styles.chapterHoverEffect}></div>
                </div>
              </Link>
            ))
          ) : (
            <p className={styles.noChapters}>
              No chapters available for this novel.
            </p>
          )}
        </div>

        {/* Comments Section */}
        {novel.id && novel.title && (
          <NovelCommentSection
            novelId={novel.id}
            novelTitle={sanitizeText(novel.title)}
          />
        )}
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        <p className={styles.footerText}>
          © 2025 Sempai HQ. All rights reserved.
        </p>
      </footer>
    </div>
  );
}