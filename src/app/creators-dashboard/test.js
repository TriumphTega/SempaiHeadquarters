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
  FaBullhorn,
  FaFeatherAlt, // New badge icon
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
  const [userId, setUserId] = useState(null); // Store user's ID for profile link
  const [novels, setNovels] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState("dark");
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [showConnectPopup, setShowConnectPopup] = useState(false);
  const [announcementsOpen, setAnnouncementsOpen] = useState(false);

  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  const toggleMenu = () => {
    setMenuOpen((prev) => {
      console.log("Toggling menu, new state:", !prev);
      return !prev;
    });
    setNotificationsOpen(false);
    setShowConnectPopup(false);
    setAnnouncementsOpen(false);
  };

  const toggleNotifications = (e) => {
    e.stopPropagation();
    if (toggleNotifications.lastToggle && Date.now() - toggleNotifications.lastToggle < 100) return;
    toggleNotifications.lastToggle = Date.now();

    setNotificationsOpen((prev) => {
      console.log("Toggling notifications, new state:", !prev);
      return !prev;
    });
    setShowConnectPopup(false);
    setAnnouncementsOpen(false);
  };
  toggleNotifications.lastToggle = 0;

  const toggleConnectPopup = () => {
    setShowConnectPopup((prev) => {
      console.log("Toggling connect popup, new state:", !prev);
      return !prev;
    });
    setMenuOpen(false);
    setNotificationsOpen(false);
    setAnnouncementsOpen(false);
  };

  const toggleAnnouncements = () => {
    setAnnouncementsOpen((prev) => {
      console.log("Toggling announcements, new state:", !prev);
      return !prev;
    });
    setMenuOpen(false);
    setNotificationsOpen(false);
    setShowConnectPopup(false);
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
          .select("id, user_id, novel_id, message, type, is_read, created_at, novel_title, comment_id")
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
        .select("id, isWriter")
        .eq("wallet_address", walletAddress)
        .single();

      if (error) throw new Error("Failed to fetch user details");
      setIsWriter(user?.isWriter || false);
      setUserId(user?.id); // Store user ID for profile link
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
      const { data, error } = await supabase
        .from("novels")
        .select("id, title, image, summary, user_id, users (id, name, isWriter)")
        .order("created_at", { ascending: false }); // Include writer info
      if (error) throw new Error("Failed to fetch novels");
      setNovels(data || []);
    } catch (err) {
      console.error(err.message);
      setError("Failed to load novels.");
    }
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const response = await fetch(`/api/announcements${publicKey ? `?publicKey=${publicKey.toString()}` : ''}`);
      if (!response.ok) throw new Error("Failed to fetch announcements");
      const { data } = await response.json();

      // Fetch usernames for announcements
      const userIds = [...new Set(data.map(a => a.user_id))];
      const { data: users, error: userError } = await supabase
        .from("users")
        .select("id, name")
        .in("id", userIds);

      if (userError) throw new Error("Failed to fetch user data for announcements");

      const userMap = users.reduce((acc, user) => {
        acc[user.id] = user.name;
        return acc;
      }, {});

      const recentAnnouncements = data
        .filter(announcement => {
          const createdAt = new Date(announcement.created_at);
          const now = new Date();
          const diffInDays = (now - createdAt) / (1000 * 60 * 60 * 24);
          return diffInDays <= 7;
        })
        .map(announcement => ({
          ...announcement,
          username: userMap[announcement.user_id] || "Unknown",
        }));

      setAnnouncements(recentAnnouncements.slice(0, 5));
    } catch (err) {
      console.error("Error fetching announcements:", err);
      setError("Failed to load announcements.");
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

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
    setPageLoading(true);
    setMenuOpen(false);
    setNotificationsOpen(false);
    setShowConnectPopup(false);
    setAnnouncementsOpen(false);
    router.push(path);
  };

  const handleNovelNavigation = (novelId) => {
    setPageLoading(true);
    setMenuOpen(false);
    setNotificationsOpen(false);
    setShowConnectPopup(false);
    setAnnouncementsOpen(false);
    router.push(`/novel/${novelId}`);
  };

  useEffect(() => {
    checkCreatorLogin();
    fetchUserDetails();
    fetchNovels();
    fetchNotifications();
    fetchAnnouncements();
  }, [checkCreatorLogin, fetchUserDetails, fetchNovels, fetchNotifications, fetchAnnouncements]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      const notificationButton = document.querySelector(`.${styles.notificationButton}`);
      const notificationDropdown = document.querySelector(`.${styles.notificationDropdown}`);
      if (
        notificationsOpen &&
        !notificationButton?.contains(e.target) &&
        !notificationDropdown?.contains(e.target)
      ) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [notificationsOpen]);

  const novelCarouselSettings = {
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

  const announcementCarouselSettings = {
    dots: true,
    infinite: true,
    speed: 600,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3500,
    arrows: true,
    prevArrow: <PrevArrow />,
    nextArrow: <NextArrow />,
    fade: true,
    pauseOnHover: true,
    adaptiveHeight: true,
    customPaging: (i) => (
      <button className={styles.customDot}>{i + 1}</button>
    ),
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
            <Link href="/swap" onClick={() => (connected ? handleNavigation("/swap") : toggleConnectPopup())} className={styles.navLink}>
              <FaExchangeAlt className={styles.navIcon} /> Swap
            </Link>
            <Link
              href={connected && isWriter ? `/writers-profile/${userId}` : "/editprofile"}
              onClick={() => (connected ? handleNavigation(isWriter ? `/writers-profile/${userId}` : "/editprofile") : toggleConnectPopup())}
              className={styles.navLink}
            >
              <FaUser className={styles.navIcon} /> Profile
            </Link>
            <Link href="/chat" onClick={() => (connected ? handleNavigation("/chat") : toggleConnectPopup())} className={styles.navLink}>
              <FaComments className={styles.navIcon} /> Chat
            </Link>
            <Link href="/kaito-adventure" onClick={() => (connected ? handleNavigation("/kaito-adventure") : toggleConnectPopup())} className={styles.navLink}>
              <FaGamepad className={styles.navIcon} /> Kaito's Adventure
            </Link>
            <button onClick={handleCreatorAccess} className={styles.actionButton}>
              {isWriter ? "Creator Dashboard" : "Become a Creator"}
            </button>
            {connected && (
              <div className={styles.notificationWrapper}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleNotifications(e);
                  }}
                  className={styles.notificationButton}
                >
                  <FaBell className={styles.bellIcon} />
                  {notifications.length > 0 && (
                    <span className={styles.notificationBadge}>{notifications.length}</span>
                  )}
                </button>
                {notificationsOpen && (
                  <div className={`${styles.notificationDropdown} ${notificationsOpen ? styles.open : ''}`}>
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
                                📖 {notif.message}
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
            )}
            <button onClick={toggleTheme} className={styles.themeToggle}>
              {theme === "dark" ? <FaSun /> : <FaMoon />}
            </button>
            <ConnectButton className={styles.connectButton} />
          </div>
        </div>
      </nav>

      <header className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.announcementToggleWrapper}>
            <button onClick={toggleAnnouncements} className={styles.announcementToggle}>
              <FaBullhorn className={styles.announcementIcon} />
              {announcements.length > 0 && (
                <span className={styles.announcementBadge}>{announcements.length}</span>
              )}
            </button>
            {announcementsOpen && (
              <div className={styles.announcementDropdown}>
                {error && <div className={styles.errorAlert}>{error}</div>}
                {announcements.length > 0 ? (
                  <Slider {...announcementCarouselSettings} className={styles.announcementCarousel}>
                    {announcements.map((announcement) => (
                      <div key={announcement.id} className={styles.announcementSlide}>
                        <div className={styles.announcementCard}>
                          <div className={styles.announcementGlow}></div>
                          <h3 className={styles.announcementTitle}>{announcement.title}</h3>
                          <p className={styles.announcementMessage}>{announcement.message}</p>
                          <div className={styles.announcementDetails}>
                            <Link
                              href={`/writers-profile/${announcement.user_id}`}
                              onClick={() => handleNavigation(`/writers-profile/${announcement.user_id}`)}
                              className={styles.announcementAuthor}
                            >
                              <FaFeatherAlt className={styles.writerBadge} /> {announcement.username}
                            </Link>
                            <Link
                              href={`/novel/${announcement.novels.id}`}
                              onClick={() => handleNovelNavigation(announcement.novels.id)}
                              className={styles.announcementLink}
                            >
                              {announcement.novels.title}
                            </Link>
                            <span className={styles.announcementDate}>
                              {new Date(announcement.created_at).toLocaleDateString()}
                            </span>
                            {announcement.release_date && (
                              <span className={styles.announcementRelease}>
                                {new Date(announcement.release_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </Slider>
                ) : (
                  <p className={styles.noAnnouncements}>No recent announcements.</p>
                )}
              </div>
            )}
          </div>
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
        <Slider {...novelCarouselSettings} className={styles.carousel}>
          {novels.map((novel) => (
            <div key={novel.id} className={styles.carouselItem}>
              <div className={styles.novelCard}>
                <Link href={`/novel/${novel.id}`} onClick={(e) => { e.preventDefault(); handleNovelNavigation(novel.id); }}>
                  <img src={novel.image} alt={novel.title} className={styles.novelImage} />
                  <div className={styles.novelOverlay}>
                    <h3 className={styles.novelTitle}>{novel.title}</h3>
                  </div>
                </Link>
                {novel.users?.isWriter && (
                  <Link
                    href={`/writers-profile/${novel.user_id}`}
                    onClick={() => handleNavigation(`/writers-profile/${novel.user_id}`)}
                    className={styles.writerName}
                  >
                    <FaFeatherAlt className={styles.writerBadge} /> {novel.users.name || "Unknown Writer"}
                  </Link>
                )}
              </div>
            </div>
          ))}
          <div className={styles.carouselItem}>
            <div className={styles.novelCard}>
              <Link href="/kaito-adventure" onClick={(e) => { e.preventDefault(); connected ? handleNavigation("/kaito-adventure") : toggleConnectPopup(); }}>
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
              <Link href="/keep-it-simple" onClick={(e) => { e.preventDefault(); connected ? handleNavigation("/keep-it-simple") : toggleConnectPopup(); }}>
                <img src="/images/novel-4.jpg" alt="KISS" className={styles.novelImage} />
                <div className={styles.novelOverlay}>
                  <h3 className={styles.novelTitle}>KISS</h3>
                </div>
              </Link>
            </div>
          </div>
          <div className={styles.carouselItem}>
            <div className={styles.novelCard}>
              <Link href="/dao-governance" onClick={(e) => { e.preventDefault(); connected ? handleNavigation("/dao-governance") : toggleConnectPopup(); }}>
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