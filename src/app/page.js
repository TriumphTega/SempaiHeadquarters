"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useRouter } from "next/navigation";
import { supabase } from "../services/supabase/supabaseClient";
import {
  FaHome,
  FaExchangeAlt,
  FaUser,
  FaComments,
  FaBell,
  FaBookOpen,
  FaSun,
  FaMoon,
  FaChevronLeft,
  FaChevronRight,
  FaBars,
  FaTimes,
  FaGamepad,
} from "react-icons/fa";
import Link from "next/link";
import LoadingPage from "../components/LoadingPage";
import ConnectButton from "../components/ConnectButton";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import styles from "./page.module.css";

// Custom arrow components with props forwarding
const PrevArrow = (props) => {
  const { className, style, onClick } = props;
  return (
    <button className={`${styles.carouselArrow} ${className}`} style={{ ...style, left: "10px" }} onClick={onClick}>
      <FaChevronLeft />
    </button>
  );
};

const NextArrow = (props) => {
  const { className, style, onClick } = props;
  return (
    <button className={`${styles.carouselArrow} ${className}`} style={{ ...style, right: "10px" }} onClick={onClick}>
      <FaChevronRight />
    </button>
  );
};

export default function Home() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const [isCreatorLoggedIn, setIsCreatorLoggedIn] = useState(false);
  const [isWriter, setIsWriter] = useState(false);
  const [novels, setNovels] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState("dark");
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [showConnectPopup, setShowConnectPopup] = useState(false);

  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  const toggleMenu = () => {
    setMenuOpen((prev) => !prev);
    setNotificationsOpen(false);
    setShowConnectPopup(false);
  };
  const toggleNotifications = () => {
    setNotificationsOpen((prev) => !prev);
    setMenuOpen(false);
    setShowConnectPopup(false);
  };
  const toggleConnectPopup = () => {
    setShowConnectPopup((prev) => !prev);
    setMenuOpen(false);
    setNotificationsOpen(false);
  };

  const fetchNotifications = useCallback(async () => {
    if (!connected || !publicKey) return;
    const walletAddress = publicKey.toString();
    let retryCount = 0;
    const maxRetries = 3;

    const fetchWithRetry = async () => {
      try {
        const { data: user, error: userError } = await supabase
          .from("users")
          .select("id")
          .eq("wallet_address", walletAddress)
          .single();

        if (userError || !user) throw new Error("User not found");

        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_read", false)
          .order("created_at", { ascending: false });

        if (error) throw new Error(`Failed to fetch notifications: ${error.message}`);
        setNotifications(data || []);
      } catch (err) {
        if (retryCount < maxRetries) {
          retryCount++;
          console.warn(`Retry ${retryCount}/${maxRetries}: ${err.message}`);
          await new Promise((res) => setTimeout(res, 1000 * retryCount));
          return fetchWithRetry();
        }
        console.error(err.message);
        setError("Failed to load notifications.");
      }
    };

    await fetchWithRetry();
  }, [connected, publicKey]);

  const markAsRead = useCallback(async () => {
    if (!connected || !publicKey) return;
    try {
      const walletAddress = publicKey.toString();
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("wallet_address", walletAddress)
        .single();

      if (userError || !user) throw new Error("User not found");

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id);

      if (error) throw new Error("Failed to mark notifications as read");
      setNotifications([]);
      setNotificationsOpen(false);
    } catch (err) {
      console.error(err.message);
      setError("Failed to update notifications.");
    }
  }, [connected, publicKey]);

  const fetchUserDetails = useCallback(async () => {
    if (!connected || !publicKey) return;
    try {
      const walletAddress = publicKey.toString();
      const { data: user, error } = await supabase
        .from("users")
        .select("isWriter")
        .eq("wallet_address", walletAddress)
        .single();

      if (error) throw new Error("Failed to fetch user details");
      setIsWriter(user?.isWriter || false);
    } catch (err) {
      console.error(err.message);
      setError("Failed to verify writer status.");
    }
  }, [connected, publicKey]);

  const checkCreatorLogin = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsCreatorLoggedIn(!!user);
  }, []);

  const fetchNovels = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("novels").select("*");
      if (error) throw new Error("Failed to fetch novels");
      setNovels(data || []);
    } catch (err) {
      console.error(err.message);
      setError("Failed to load novels.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCreatorAccess = useCallback(async () => {
    if (!connected || !publicKey) {
      setShowConnectPopup(true);
      return;
    }
    setPageLoading(true);
    try {
      const walletAddress = publicKey.toString();
      const { data: user, error } = await supabase
        .from("users")
        .select("isWriter")
        .eq("wallet_address", walletAddress)
        .single();

      if (error || !user) throw new Error("User not found or not a writer");
      if (user.isWriter) {
        router.push("/creators-dashboard");
      } else {
        router.push("/apply");
      }
    } catch (err) {
      console.error(err.message);
      setError(err.message);
      setPageLoading(false);
    }
  }, [connected, publicKey, router]);

  const handleNavigation = (path) => {
    if (connected) {
      setPageLoading(true);
      setMenuOpen(false);
      setNotificationsOpen(false);
      setShowConnectPopup(false);
      router.push(path);
    } else {
      setShowConnectPopup(true);
    }
  };

  useEffect(() => {
    checkCreatorLogin();
    fetchUserDetails();
    fetchNovels();
    fetchNotifications();
  }, [checkCreatorLogin, fetchUserDetails, fetchNovels, fetchNotifications]);

  const carouselSettings = {
    dots: true,
    infinite: true,
    speed: 700,
    slidesToShow: 3,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 2500,
    arrows: true,
    prevArrow: <PrevArrow />,
    nextArrow: <NextArrow />,
    centerMode: true,
    centerPadding: "20px",
    responsive: [
      { breakpoint: 1024, settings: { slidesToShow: 2, centerPadding: "30px" } },
      { breakpoint: 768, settings: { slidesToShow: 2, centerPadding: "20px" } },
      { breakpoint: 480, settings: { slidesToShow: 1, centerPadding: "10px" } },
    ],
  };

  if (loading || pageLoading) return <LoadingPage />;

  return (
    <div className={`${styles.page} ${theme === "light" ? styles.light : styles.dark} ${menuOpen ? styles.menuActive : ""}`}>
      <nav className={styles.navbar}>
        <div className={styles.navContainer}>
          <Link href="/" onClick={() => handleNavigation("/")} className={styles.logoLink}>
            <img src="/images/logo.jpg" alt="Sempai HQ" className={styles.logo} />
            <span className={styles.logoText}>Sempai HQ</span>
          </Link>
          <button className={styles.menuToggle} onClick={toggleMenu}>
            {menuOpen ? <FaTimes /> : <FaBars />}
          </button>
          <div className={`${styles.navLinks} ${menuOpen ? styles.navLinksOpen : ""}`}>
            <Link href="/" onClick={() => handleNavigation("/")} className={styles.navLink}>
              <FaHome className={styles.navIcon} /> Home
            </Link>
            <Link href="/swap" onClick={() => handleNavigation("/swap")} className={styles.navLink}>
              <FaExchangeAlt className={styles.navIcon} /> Swap
            </Link>
            <Link href="/profile" onClick={() => handleNavigation("/profile")} className={styles.navLink}>
              <FaUser className={styles.navIcon} /> Profile
            </Link>
            <Link href="/chat" onClick={() => handleNavigation("/chat")} className={styles.navLink}>
              <FaComments className={styles.navIcon} /> Chat
            </Link>
            <Link href="/kaito-adventure" onClick={() => handleNavigation("/kaito-adventure")} className={styles.navLink}>
              <FaGamepad className={styles.navIcon} /> Kaito's Adventure
            </Link>
            <button onClick={handleCreatorAccess} className={styles.actionButton}>
              {isWriter ? "Creator Dashboard" : "Become a Creator"}
            </button>
            <div className={styles.notificationWrapper}>
              <button onClick={toggleNotifications} className={styles.notificationButton}>
                <FaBell className={styles.bellIcon} />
                {notifications.length > 0 && (
                  <span className={styles.notificationBadge}>{notifications.length}</span>
                )}
              </button>
              {notificationsOpen && (
                <div className={styles.notificationDropdown}>
                  {notifications.length > 0 ? (
                    <>
                      {notifications.map((notif) => (
                        <div key={notif.id} className={styles.notificationItem}>
                          {notif.type === "reply" && notif.comment_id ? (
                            <Link href={`/novel/${notif.novel_id}/chapter/${notif.comment_id}`} onClick={() => handleNavigation(`/novel/${notif.novel_id}/chapter/${notif.comment_id}`)}>
                              📩 Someone replied: "{notif.message}"
                            </Link>
                          ) : notif.type === "new_chapter" ? (
                            <Link href={`/novel/${notif.novel_id}`} onClick={() => handleNavigation(`/novel/${notif.novel_id}`)}>
                              📖 New chapter: "{notif.novel_title}"
                            </Link>
                          ) : notif.type === "reward" ? (
                            <Link href="/profile" onClick={() => handleNavigation("/profile")}>
                              🎉 Weekly reward received!
                            </Link>
                          ) : (
                            <span>{notif.message || "New notification"}</span>
                          )}
                        </div>
                      ))}
                      <button onClick={markAsRead} className={styles.markReadButton}>
                        Mark All as Read
                      </button>
                    </>
                  ) : (
                    <div className={styles.noNotifications}>No new notifications</div>
                  )}
                </div>
              )}
            </div>
            <button onClick={toggleTheme} className={styles.themeToggle}>
              {theme === "dark" ? <FaSun /> : <FaMoon />}
            </button>
            <ConnectButton className={styles.connectButton} />
          </div>
        </div>
      </nav>

      <header className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Embark on Epic Journeys</h1>
          <p className={styles.heroSubtitle}>Discover Novels, Earn Tokens, Unleash Your Imagination</p>
          <button onClick={() => handleNavigation("/novels")} className={styles.heroButton}>
            <FaBookOpen className={styles.heroIcon} /> Explore Now
          </button>
        </div>
      </header>

      <section className={styles.novelsSection}>
        <h2 className={styles.sectionTitle}>Featured</h2>
        {error && <div className={styles.errorAlert}>{error}</div>}
        <Slider {...carouselSettings} className={styles.carousel}>
          {novels.map((novel) => (
            <div key={novel.id} className={styles.carouselItem}>
              <div className={styles.novelCard}>
                <Link href={`/novel/${novel.id}`} onClick={(e) => { e.preventDefault(); handleNavigation(`/novel/${novel.id}`); }}>
                  <img src={novel.image} alt={novel.title} className={styles.novelImage} />
                  <div className={styles.novelOverlay}>
                    <h3 className={styles.novelTitle}>{novel.title}</h3>
                  </div>
                </Link>
              </div>
            </div>
          ))}
          <div className={styles.carouselItem}>
            <div className={styles.novelCard}>
              <Link href="/kaito-adventure" onClick={(e) => { e.preventDefault(); handleNavigation("/kaito-adventure"); }}>
                <img src="/background.jpg" alt="Kaito Brewmaster" className={styles.novelImage} />
                <div className={styles.novelOverlay}>
                  <h3 className={styles.novelTitle}>Kaito Brewmaster</h3>
                </div>
              </Link>
            </div>
          </div>
          <div className={styles.carouselItem}>
            <div className={styles.novelCard}>
              <Link href="/novels" onClick={(e) => { e.preventDefault(); handleNavigation("/novels"); }}>
                <img src="/images/novel-3.jpg" alt="Hoard" className={styles.novelImage} />
                <div className={styles.novelOverlay}>
                  <h3 className={styles.novelTitle}>Hoard</h3>
                </div>
              </Link>
            </div>
          </div>
          <div className={styles.carouselItem}>
            <div className={styles.novelCard}>
              <Link href="/keep-it-simple" onClick={(e) => { e.preventDefault(); handleNavigation("/keep-it-simple"); }}>
                <img src="/images/novel-4.jpg" alt="KISS" className={styles.novelImage} />
                <div className={styles.novelOverlay}>
                  <h3 className={styles.novelTitle}>KISS</h3>
                </div>
              </Link>
            </div>
          </div>
          <div className={styles.carouselItem}>
            <div className={styles.novelCard}>
              <Link href="/dao-governance" onClick={(e) => { e.preventDefault(); handleNavigation("/dao-governance"); }}>
                <img src="/images/dao.jpg" alt="DAO Governance" className={styles.novelImage} />
                <div className={styles.novelOverlay}>
                  <h3 className={styles.novelTitle}>DAO Governance</h3>
                </div>
              </Link>
            </div>
          </div>
        </Slider>
      </section>
      {showConnectPopup && (
        <div className={styles.connectPopupOverlay}>
          <div className={styles.connectPopup}>
            <button onClick={toggleConnectPopup} className={styles.closePopupButton}>
              <FaTimes />
            </button>
            <h3 className={styles.popupTitle}>Connect Your Wallet</h3>
            <p className={styles.popupMessage}>Please connect your wallet to access this content.</p>
            <WalletMultiButton className={styles.connectWalletButton} />
          </div>
        </div>
      )}

      <footer className={styles.footer}>
        <p>© 2025 Sempai HQ. All rights reserved.</p>
      </footer>
    </div>
  );
}