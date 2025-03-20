"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  FaFeatherAlt,
  FaShareAlt,
} from "react-icons/fa";
import Link from "next/link";
import LoadingPage from "../components/LoadingPage";
import ConnectButton from "../components/ConnectButton";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import styles from "./page.module.css";

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
  const [isArtist, setIsArtist] = useState(false);
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [userId, setUserId] = useState(null);
  const [novels, setNovels] = useState([]);
  const [manga, setManga] = useState([]);
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
  const [referralCode, setReferralCode] = useState("");
  const [amount, setAmount] = useState(0);
  const [isReferralOpen, setIsReferralOpen] = useState(false);
  const [referralPosition, setReferralPosition] = useState({ x: 50, y: 50 });
  const [showCreatorChoice, setShowCreatorChoice] = useState(false);

  const referralRef = useRef(null);
  const dragStartPos = useRef({ x: 0, y: 0 });

  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  const toggleMenu = () => {
    setMenuOpen((prev) => !prev);
    setNotificationsOpen(false);
    setShowConnectPopup(false);
    setAnnouncementsOpen(false);
    setIsReferralOpen(false);
    setShowCreatorChoice(false);
  };

  const toggleNotifications = (e) => {
    e.stopPropagation();
    if (toggleNotifications.lastToggle && Date.now() - toggleNotifications.lastToggle < 100) return;
    toggleNotifications.lastToggle = Date.now();
    setNotificationsOpen((prev) => !prev);
    setShowConnectPopup(false);
    setAnnouncementsOpen(false);
    setIsReferralOpen(false);
    setShowCreatorChoice(false);
  };
  toggleNotifications.lastToggle = 0;

  const toggleConnectPopup = () => {
    setShowConnectPopup((prev) => !prev);
    setMenuOpen(false);
    setNotificationsOpen(false);
    setAnnouncementsOpen(false);
    setIsReferralOpen(false);
    setShowCreatorChoice(false);
  };

  const toggleAnnouncements = () => {
    setAnnouncementsOpen((prev) => !prev);
    setMenuOpen(false);
    setNotificationsOpen(false);
    setShowConnectPopup(false);
    setIsReferralOpen(false);
    setShowCreatorChoice(false);
  };

  const toggleReferral = () => {
    setIsReferralOpen((prev) => !prev);
    setMenuOpen(false);
    setNotificationsOpen(false);
    setShowConnectPopup(false);
    setAnnouncementsOpen(false);
    setShowCreatorChoice(false);
  };

  const handleMouseDown = (e) => {
    dragStartPos.current = { x: e.clientX - referralPosition.x, y: e.clientY - referralPosition.y };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e) => {
    const newX = e.clientX - dragStartPos.current.x;
    const newY = e.clientY - dragStartPos.current.y;
    const boundedX = Math.max(0, Math.min(newX, window.innerWidth - (referralRef.current?.offsetWidth || 200)));
    const boundedY = Math.max(0, Math.min(newY, window.innerHeight - (referralRef.current?.offsetHeight || 100)));
    setReferralPosition({ x: boundedX, y: boundedY });
  };

  const handleMouseUp = () => {
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    dragStartPos.current = { x: touch.clientX - referralPosition.x, y: touch.clientY - referralPosition.y };
    document.addEventListener("touchmove", handleTouchMove);
    document.addEventListener("touchend", handleTouchEnd);
  };

  const handleTouchMove = (e) => {
    const touch = e.touches[0];
    const newX = touch.clientX - dragStartPos.current.x;
    const newY = touch.clientY - dragStartPos.current.y;
    const boundedX = Math.max(0, Math.min(newX, window.innerWidth - (referralRef.current?.offsetWidth || 200)));
    const boundedY = Math.max(0, Math.min(newY, window.innerHeight - (referralRef.current?.offsetHeight || 100)));
    setReferralPosition({ x: boundedX, y: boundedY });
  };

  const handleTouchEnd = () => {
    document.removeEventListener("touchmove", handleTouchMove);
    document.removeEventListener("touchend", handleTouchEnd);
  };

  const fetchNotifications = useCallback(async () => {
    if (!connected || !publicKey) return;
    const walletAddress = publicKey.toString();
    let retryCount = 0;
    const maxRetries = 3;

    const fetchWithRetry = async () => {
      try {
        const { data: user } = await supabase
          .from("users")
          .select("id")
          .eq("wallet_address", walletAddress)
          .single();
        if (!user) throw new Error("User not found");

        const { data } = await supabase
          .from("notifications")
          .select("id, user_id, novel_id, message, type, is_read, created_at, novel_title, comment_id")
          .eq("user_id", user.id)
          .eq("is_read", false)
          .order("created_at", { ascending: false });

        setNotifications(data || []);
      } catch (err) {
        if (retryCount < maxRetries) {
          retryCount++;
          await new Promise((res) => setTimeout(res, 1000 * retryCount));
          return fetchWithRetry();
        }
        setError("Failed to load notifications.");
      }
    };

    await fetchWithRetry();
  }, [connected, publicKey]);

  const markAsRead = useCallback(async () => {
    if (!connected || !publicKey) return;
    try {
      const walletAddress = publicKey.toString();
      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("wallet_address", walletAddress)
        .single();
      if (!user) throw new Error("User not found");

      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id);
      setNotifications([]);
      setNotificationsOpen(false);
    } catch (err) {
      setError("Failed to update notifications.");
    }
  }, [connected, publicKey]);

  const fetchUserDetails = useCallback(async () => {
    if (!connected || !publicKey) return;

    const walletAddress = publicKey.toString();
    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("id, isWriter, isArtist, isSuperuser, referral_code")
        .eq("wallet_address", walletAddress)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (user) {
        setIsWriter(user.isWriter || false);
        setIsArtist(user.isArtist || false);
        setIsSuperuser(user.isSuperuser || false);
        setUserId(user.id);
        setReferralCode(user.referral_code || "");
      }
    } catch (err) {
      setError(`Failed to fetch user details: ${err.message}`);
    }
  }, [connected, publicKey]);

  const checkCreatorLogin = useCallback(async () => {
    setIsCreatorLoggedIn(connected);
  }, [connected]);

  const fetchNovels = useCallback(async () => {
    try {
      const { data: novelsData, error } = await supabase
        .from("novels")
        .select("id, title, image, summary, user_id");

      if (error) throw new Error(`Failed to fetch novels: ${error.message}`);
      if (!novelsData || novelsData.length === 0) {
        setNovels([]);
        return;
      }

      const userIds = novelsData.map((novel) => novel.user_id).filter((id) => id);
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, name, isWriter")
        .in("id", userIds);

      if (usersError) throw new Error(`Failed to fetch users: ${usersError.message}`);

      const usersMap = usersData.reduce((acc, user) => {
        acc[user.id] = { name: user.name || "Unknown", isWriter: user.isWriter || false };
        return acc;
      }, {});

      const enrichedNovels = novelsData.map((novel) => ({
        ...novel,
        writer: usersMap[novel.user_id] || { name: "Unknown", isWriter: false },
      }));
      setNovels(enrichedNovels);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const fetchManga = useCallback(async () => {
    try {
      const { data: mangaData, error } = await supabase
        .from("manga")
        .select("id, title, cover_image, summary, user_id, status")
        .in("status", ["ongoing", "completed"]);

      if (error) throw new Error(`Failed to fetch manga: ${error.message}`);
      if (!mangaData || mangaData.length === 0) {
        setManga([]);
        return;
      }

      const userIds = mangaData.map((manga) => manga.user_id).filter((id) => id);
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, name, isArtist")
        .in("id", userIds);

      if (usersError) throw new Error(`Failed to fetch users: ${usersError.message}`);

      const usersMap = usersData.reduce((acc, user) => {
        acc[user.id] = { name: user.name || "Unknown", isArtist: user.isArtist || false };
        return acc;
      }, {});

      const enrichedManga = mangaData.map((manga) => ({
        ...manga,
        image: manga.cover_image,
        writer: usersMap[manga.user_id] || { name: "Unknown", isArtist: false },
      }));
      setManga(enrichedManga);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const response = await fetch(`/api/announcements${publicKey ? `?publicKey=${publicKey.toString()}` : ""}`);
      const { data } = await response.json();
      const recentAnnouncements = data
        .filter((announcement) => {
          const createdAt = new Date(announcement.created_at);
          const now = new Date();
          return (now - createdAt) / (1000 * 60 * 60 * 24) <= 7;
        })
        .slice(0, 5);

      const userIds = recentAnnouncements.map((a) => a.users?.id).filter((id) => id);
      const { data: usersData } = await supabase
        .from("users")
        .select("id, name")
        .in("id", userIds);

      const userMap = usersData.reduce((acc, user) => {
        acc[user.id] = user.name || "Unknown";
        return acc;
      }, {});

      const enrichedAnnouncements = recentAnnouncements.map((announcement) => ({
        ...announcement,
        name: userMap[announcement.users?.id] || "Unknown",
        user_id: announcement.users?.id,
      }));
      setAnnouncements(enrichedAnnouncements);
    } catch (err) {
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
    try {
      const walletAddress = publicKey.toString();
      const { data: user, error } = await supabase
        .from("users")
        .select("isWriter, isArtist, isSuperuser")
        .eq("wallet_address", walletAddress)
        .single();

      if (error || !user) throw new Error("User not found");

      const { isWriter, isArtist, isSuperuser } = user;

      if (!isWriter && !isArtist && !isSuperuser) {
        setPageLoading(true);
        router.push("/apply");
      } else if (isSuperuser || (isWriter && isArtist)) {
        setShowCreatorChoice(true);
        setMenuOpen(false); // Close the mobile menu when showing the popup
      } else if (isWriter) {
        setPageLoading(true);
        router.push("/novel-creators-dashboard");
      } else if (isArtist) {
        setPageLoading(true);
        router.push("/manga-creators-dashboard");
      }
    } catch (err) {
      setError(err.message);
      setPageLoading(false);
    }
  }, [connected, publicKey, router]);

  const handleCreatorChoice = (path) => {
    setShowCreatorChoice(false);
    setPageLoading(true);
    router.push(path);
  };

  const handleNavigation = (path) => {
    setPageLoading(true);
    setMenuOpen(false);
    setNotificationsOpen(false);
    setShowConnectPopup(false);
    setAnnouncementsOpen(false);
    setIsReferralOpen(false);
    setShowCreatorChoice(false);
    router.push(path);
  };

  const handleNovelNavigation = (id) => {
    setPageLoading(true);
    setMenuOpen(false);
    setNotificationsOpen(false);
    setShowConnectPopup(false);
    setAnnouncementsOpen(false);
    setIsReferralOpen(false);
    setShowCreatorChoice(false);
    router.push(`/novel/${id}`);
  };

  const handleMangaNavigation = (id) => {
    setPageLoading(true);
    setMenuOpen(false);
    setNotificationsOpen(false);
    setShowConnectPopup(false);
    setAnnouncementsOpen(false);
    setIsReferralOpen(false);
    setShowCreatorChoice(false);
    router.push(`/manga/${id}`);
  };

  const fetchBalance = async () => {
    if (!connected || !publicKey) return;
    const walletAddress = publicKey.toString();

    const { data } = await supabase
      .from("users")
      .select("weekly_points")
      .eq("wallet_address", walletAddress)
      .single();
    if (data) setAmount(data.weekly_points);
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}/?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    alert("Referral link copied to clipboard!");
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        checkCreatorLogin(),
        fetchUserDetails(),
        fetchNovels(),
        fetchManga(),
        fetchNotifications(),
        fetchAnnouncements(),
        fetchBalance(),
      ]);
      setLoading(false);
    };
    loadData();
  }, [
    checkCreatorLogin,
    fetchUserDetails,
    fetchNovels,
    fetchManga,
    fetchNotifications,
    fetchAnnouncements,
    connected,
    publicKey,
  ]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      const notificationButton = document.querySelector(`.${styles.notificationButton}`);
      const notificationDropdown = document.querySelector(`.${styles.notificationDropdown}`);
      const referralButton = document.querySelector(`.${styles.referralToggle}`);
      const referralDropdown = document.querySelector(`.${styles.referralDropdown}`);
      const choicePopup = document.querySelector(`.${styles.creatorChoicePopup}`);
      if (
        notificationsOpen &&
        !notificationButton?.contains(e.target) &&
        !notificationDropdown?.contains(e.target)
      ) {
        setNotificationsOpen(false);
      }
      if (
        isReferralOpen &&
        !referralButton?.contains(e.target) &&
        !referralDropdown?.contains(e.target)
      ) {
        setIsReferralOpen(false);
      }
      if (
        showCreatorChoice &&
        !choicePopup?.contains(e.target)
      ) {
        setShowCreatorChoice(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [notificationsOpen, isReferralOpen, showCreatorChoice]);

  const carouselSettings = (itemCount) => ({
    dots: itemCount > 1,
    infinite: itemCount > 1,
    speed: 700,
    slidesToShow: Math.min(itemCount, 3),
    slidesToScroll: 1,
    autoplay: itemCount > 1,
    autoplaySpeed: 2500,
    arrows: itemCount > 1,
    prevArrow: <PrevArrow />,
    nextArrow: <NextArrow />,
    centerMode: itemCount > 1,
    centerPadding: itemCount > 1 ? "20px" : "0px",
    responsive: [
      { breakpoint: 1024, settings: { slidesToShow: Math.min(itemCount, 2), centerPadding: itemCount > 1 ? "30px" : "0px" } },
      { breakpoint: 768, settings: { slidesToShow: Math.min(itemCount, 2), centerPadding: itemCount > 1 ? "20px" : "0px" } },
      { breakpoint: 480, settings: { slidesToShow: 1, centerPadding: "0px" } },
    ],
  });

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
    customPaging: (i) => <button className={styles.customDot}>{i + 1}</button>,
  };

  if (loading || pageLoading) return <LoadingPage />;

  return (
    <div className={`${styles.page} ${theme === "light" ? styles.light : styles.dark}`}>
      <div className={styles.backgroundAnimation}></div>
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
              href={connected && (isWriter || isArtist) ? `/writers-profile/${userId}` : "/editprofile"}
              onClick={() => (connected ? handleNavigation((isWriter || isArtist) ? `/writers-profile/${userId}` : "/editprofile") : toggleConnectPopup())}
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
              {(isWriter || isArtist || isSuperuser) ? "Creator Dashboard" : "Become a Creator"}
            </button>
            {connected && (
              <div className={styles.notificationWrapper}>
                <button onClick={toggleNotifications} className={styles.notificationButton}>
                  <FaBell className={styles.bellIcon} />
                  {notifications.length > 0 && (
                    <span className={styles.notificationBadge}>{notifications.length}</span>
                  )}
                </button>
                {notificationsOpen && (
                  <div className={`${styles.notificationDropdown} ${notificationsOpen ? styles.open : ""}`}>
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
            {connected && (
              <button onClick={toggleReferral} className={styles.referralToggle}>
                <FaShareAlt className={styles.referralIcon} />
              </button>
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
                              <FaFeatherAlt className={styles.writerBadge} /> {announcement.name}
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
          <p className={styles.heroSubtitle}>Explore Novels & Manga, Earn Tokens, Unleash Your Imagination</p>
          <div className={styles.heroButtons}>
            <button onClick={() => handleNavigation("/novels")} className={styles.heroButton}>
              <FaBookOpen className={styles.heroIcon} /> Explore Novels
            </button>
            <button onClick={() => handleNavigation("/manga")} className={styles.heroButton}>
              <FaBookOpen className={styles.heroIcon} /> Explore Manga
            </button>
          </div>
        </div>
      </header>

      <main className={styles.mainContent}>
        {connected && isReferralOpen && (
          <div
            ref={referralRef}
            className={styles.referralDropdown}
            style={{ left: `${referralPosition.x}px`, top: `${referralPosition.y}px` }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            <div className={styles.referralHeader}>Referral</div>
            <p>Code: <strong>{referralCode || "N/A"}</strong></p>
            <p>Amount: <strong>{amount}</strong> points</p>
            <button onClick={copyReferralLink} className={styles.referralButton}>
              Copy Link
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
                {(isWriter || isSuperuser) && (
                  <button onClick={() => handleCreatorChoice("/novel-creators-dashboard")} className={styles.choiceButton}>
                    Novel Creators Dashboard
                  </button>
                )}
                {(isArtist || isSuperuser) && (
                  <button onClick={() => handleCreatorChoice("/manga-creators-dashboard")} className={styles.choiceButton}>
                    Manga Creators Dashboard
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        <section className={styles.contentSection}>
          <h2 className={styles.sectionTitle}>Featured Novels</h2>
          {error && <div className={styles.errorAlert}>{error}</div>}
          {novels.length > 0 ? (
            <Slider {...carouselSettings(novels.length)} className={styles.carousel}>
              {novels.map((novel) => (
                <div key={novel.id} className={styles.carouselItem}>
                  <div className={styles.contentCard}>
                    <Link href={`/novel/${novel.id}`} onClick={(e) => { e.preventDefault(); handleNovelNavigation(novel.id); }}>
                      <img src={novel.image} alt={novel.title} className={styles.contentImage} />
                      <div className={styles.contentOverlay}>
                        <h3 className={styles.contentTitle}>{novel.title}</h3>
                        <p className={styles.contentSummary}>{novel.summary}</p>
                      </div>
                    </Link>
                    {novel.writer.isWriter && (
                      <Link
                        href={`/writers-profile/${novel.user_id}`}
                        onClick={() => handleNavigation(`/writers-profile/${novel.user_id}`)}
                        className={styles.writerName}
                      >
                        <FaFeatherAlt className={styles.writerBadge} /> {novel.writer.name}
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </Slider>
          ) : (
            <p className={styles.noContent}>No novels available yet.</p>
          )}
        </section>

        <section className={styles.contentSection}>
          <h2 className={styles.sectionTitle}>Featured Manga</h2>
          {error && <div className={styles.errorAlert}>{error}</div>}
          {manga.length > 0 ? (
            <Slider {...carouselSettings(manga.length)} className={styles.carousel}>
              {manga.map((mangaItem) => (
                <div key={mangaItem.id} className={styles.carouselItem}>
                  <div className={styles.contentCard}>
                    <Link href={`/manga/${mangaItem.id}`} onClick={(e) => { e.preventDefault(); handleMangaNavigation(mangaItem.id); }}>
                      <img src={mangaItem.image} alt={mangaItem.title} className={styles.contentImage} />
                      <div className={styles.contentOverlay}>
                        <h3 className={styles.contentTitle}>{mangaItem.title}</h3>
                        <p className={styles.contentSummary}>{mangaItem.summary}</p>
                      </div>
                    </Link>
                    {mangaItem.writer.isArtist && (
                      <Link
                        href={`/writers-profile/${mangaItem.user_id}`}
                        onClick={() => handleNavigation(`/writers-profile/${mangaItem.user_id}`)}
                        className={styles.writerName}
                      >
                        <FaFeatherAlt className={styles.writerBadge} /> {mangaItem.writer.name}
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </Slider>
          ) : (
            <p className={styles.noContent}>No manga available yet.</p>
          )}
        </section>

        <section className={styles.featuresSection}>
          <h2 className={styles.sectionTitle}>Explore More</h2>
          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <Link href="/kaito-adventure" onClick={(e) => { e.preventDefault(); connected ? handleNavigation("/kaito-adventure") : toggleConnectPopup(); }}>
                <img src="/background.jpg" alt="Kaito Adventure" className={styles.featureImage} />
                <div className={styles.featureOverlay}>
                  <h3 className={styles.featureTitle}>Kaito's Adventure</h3>
                </div>
              </Link>
            </div>
            <div className={styles.featureCard}>
              <Link href="/dao-governance" onClick={(e) => { e.preventDefault(); connected ? handleNavigation("/dao-governance") : toggleConnectPopup(); }}>
                <img src="/images/dao.jpg" alt="DAO Governance" className={styles.featureImage} />
                <div className={styles.featureOverlay}>
                  <h3 className={styles.featureTitle}>DAO Governance</h3>
                </div>
              </Link>
            </div>
            <div className={styles.featureCard}>
              <Link href="/novels" onClick={(e) => { e.preventDefault(); handleNavigation("/novels"); }}>
                <img src="/images/novel-3.jpg" alt="Hoard" className={styles.featureImage} />
                <div className={styles.featureOverlay}>
                  <h3 className={styles.featureTitle}>Hoard</h3>
                </div>
              </Link>
            </div>
            <div className={styles.featureCard}>
              <Link href="/keep-it-simple" onClick={(e) => { e.preventDefault(); connected ? handleNavigation("/keep-it-simple") : toggleConnectPopup(); }}>
                <img src="/images/novel-4.jpg" alt="KISS" className={styles.featureImage} />
                <div className={styles.featureOverlay}>
                  <h3 className={styles.featureTitle}>KISS</h3>
                </div>
              </Link>
            </div>
          </div>
        </section>
      </main>

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