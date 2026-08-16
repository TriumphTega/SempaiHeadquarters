"use client";

import { useState, useEffect, useContext, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../services/supabase/supabaseClient";
import { EmbeddedWalletContext } from "./EmbeddedWalletProvider";
import {
  FaHome,
  FaUser,
  FaComments,
  FaBell,
  FaBookOpen,
  FaSun,
  FaMoon,
  FaBars,
  FaTimes,
  FaGamepad,
  FaShareAlt,
  FaTrophy,
  FaRss,
} from "react-icons/fa";
import Link from "next/link";
import ConnectButton from "./ConnectButton";
import Sidebar from "./Sidebar";
import styles from "../styles/Navbar.module.css";

const THEME_STORAGE_KEY = "sempai-theme";

// Primary links shown inline in the desktop navbar, mirroring the
// simple, single-row layout of the legacy Navbar.
const NAV_LINKS = [
  { name: "Home", path: "/", icon: FaHome },
  { name: "Hoard", path: "/novels", icon: FaBookOpen },
  { name: "Feed", path: "/feed", icon: FaRss },
  { name: "Leaderboard", path: "/leaderboard", icon: FaTrophy },
];

export default function Navbar() {
  const { wallet: embeddedWallet } = useContext(EmbeddedWalletContext);
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [showConnectPopup, setShowConnectPopup] = useState(false);
  const [isReferralOpen, setIsReferralOpen] = useState(false);
  const [referralPosition, setReferralPosition] = useState({ x: 50, y: 50 });
  const [showCreatorChoice, setShowCreatorChoice] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isWriter, setIsWriter] = useState(false);
  const [isArtist, setIsArtist] = useState(false);
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [userId, setUserId] = useState(null);
  const [referralCode, setReferralCode] = useState("");
  const [theme, setTheme] = useState("dark");
  const [error, setError] = useState("");
  const [scrolled, setScrolled] = useState(false);

  const referralRef = useRef(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const lastNotifToggle = useRef(0);

  const isWalletConnected = !!embeddedWallet;
  const walletPublicKey = embeddedWallet?.publicKey || null;

  // ---------------------------------------------------------------------
  // Theme
  // ---------------------------------------------------------------------
  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "light" || current === "dark") setTheme(current);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch (e) {
        // Storage unavailable - theme still applies via the DOM attribute
      }
      return next;
    });
  };

  // ---------------------------------------------------------------------
  // Sticky-bar elevation on scroll (visual only, no layout impact)
  // ---------------------------------------------------------------------
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ---------------------------------------------------------------------
  // Panel toggles - closing every other panel keeps only one open at a time
  // ---------------------------------------------------------------------
  const closeAllPanels = () => {
    setNotificationsOpen(false);
    setShowConnectPopup(false);
    setIsReferralOpen(false);
    setShowCreatorChoice(false);
  };

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
    closeAllPanels();
  };

  const toggleNotifications = (e) => {
    e?.stopPropagation?.();
    // Debounce so a click that bubbles from the outside-click listener
    // can't immediately re-open the panel it just closed.
    if (Date.now() - lastNotifToggle.current < 150) return;
    lastNotifToggle.current = Date.now();
    const willOpen = !notificationsOpen;
    closeAllPanels();
    setNotificationsOpen(willOpen);
  };

  const toggleConnectPopup = () => {
    const willOpen = !showConnectPopup;
    closeAllPanels();
    setShowConnectPopup(willOpen);
  };

  const toggleReferral = (e) => {
    e?.stopPropagation?.();
    const willOpen = !isReferralOpen;
    closeAllPanels();
    setIsReferralOpen(willOpen);
  };

  // ---------------------------------------------------------------------
  // Referral popup drag handling (mouse + touch)
  // ---------------------------------------------------------------------
  const clampToViewport = (x, y) => {
    const width = referralRef.current?.offsetWidth || 200;
    const height = referralRef.current?.offsetHeight || 120;
    return {
      x: Math.max(0, Math.min(x, window.innerWidth - width)),
      y: Math.max(0, Math.min(y, window.innerHeight - height)),
    };
  };

  const handleMouseDown = (e) => {
    dragStartPos.current = { x: e.clientX - referralPosition.x, y: e.clientY - referralPosition.y };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e) => {
    setReferralPosition(clampToViewport(e.clientX - dragStartPos.current.x, e.clientY - dragStartPos.current.y));
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
    setReferralPosition(clampToViewport(touch.clientX - dragStartPos.current.x, touch.clientY - dragStartPos.current.y));
  };

  const handleTouchEnd = () => {
    document.removeEventListener("touchmove", handleTouchMove);
    document.removeEventListener("touchend", handleTouchEnd);
  };

  // ---------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------
  const fetchNotifications = async () => {
    if (!isWalletConnected || !walletPublicKey) {
      setNotifications([]);
      return;
    }
    try {
      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("wallet_address", walletPublicKey)
        .single();
      if (!user) {
        setNotifications([]);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("notifications")
        .select(
          "id, user_id, novel_id, message, type, is_read, created_at, novel_title, comment_id, chat_id, recipient_wallet_address"
        )
        .eq("user_id", user.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(10);

      if (fetchError) throw fetchError;
      setNotifications(data || []);
    } catch (err) {
      setError("Failed to load notifications.");
      setNotifications([]);
    }
  };

  const markAsRead = async () => {
    if (!isWalletConnected || !walletPublicKey) return;
    try {
      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("wallet_address", walletPublicKey)
        .single();
      if (!user) throw new Error("User not found");

      await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id);
      setNotifications([]);
      setNotificationsOpen(false);
    } catch (err) {
      setError("Failed to update notifications.");
    }
  };

  const fetchUserDetails = async () => {
    if (!isWalletConnected || !walletPublicKey) return;
    try {
      const { data: user, error: fetchError } = await supabase
        .from("users")
        .select("id, isWriter, isArtist, isSuperuser, referral_code")
        .eq("wallet_address", walletPublicKey)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

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
  };

  useEffect(() => {
    if (isWalletConnected && walletPublicKey) {
      fetchUserDetails();
      fetchNotifications();
    } else {
      setNotifications([]);
      setIsWriter(false);
      setIsArtist(false);
      setIsSuperuser(false);
      setUserId(null);
      setReferralCode("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWalletConnected, walletPublicKey]);

  // ---------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------
  const handleCreatorAccess = async () => {
    if (!isWalletConnected || !walletPublicKey) {
      toggleConnectPopup();
      return;
    }
    try {
      const { data: user, error: fetchError } = await supabase
        .from("users")
        .select("isWriter, isArtist, isSuperuser")
        .eq("wallet_address", walletPublicKey)
        .single();

      if (fetchError || !user) throw new Error("User not found");

      if (!user.isWriter && !user.isArtist && !user.isSuperuser) {
        router.push("/apply");
      } else if (user.isSuperuser || (user.isWriter && user.isArtist)) {
        closeAllPanels();
        setShowCreatorChoice(true);
      } else if (user.isWriter) {
        router.push("/novel-creators-dashboard");
      } else if (user.isArtist) {
        router.push("/manga-creators-dashboard");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreatorChoice = (path) => {
    setShowCreatorChoice(false);
    router.push(path);
  };

  const handleNavigation = (path) => {
    setSidebarOpen(false);
    closeAllPanels();
    router.push(path);
  };

  const handleProtectedNavigation = (path) => {
    if (isWalletConnected) {
      handleNavigation(path);
    } else {
      toggleConnectPopup();
    }
  };

  const handleChatNavigation = (type, chatId, recipientWallet) => {
    closeAllPanels();
    const path =
      type === "chat_reply"
        ? `/chat?messageId=${chatId}`
        : `/chat?messageId=${chatId}&recipient=${recipientWallet}`;
    router.push(path);
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}/?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    alert("Referral link copied to clipboard!");
  };

  // ---------------------------------------------------------------------
  // Outside click handling for all floating panels
  // ---------------------------------------------------------------------
  useEffect(() => {
    const handleOutsideClick = (e) => {
      const notificationButton = document.querySelector(`.${styles.notificationButton}`);
      const notificationDropdown = document.querySelector(`.${styles.notificationDropdown}`);
      const referralButton = document.querySelector(`.${styles.referralToggle}`);
      const referralDropdown = document.querySelector(`.${styles.referralDropdown}`);
      const choicePopup = document.querySelector(`.${styles.creatorChoicePopup}`);

      if (notificationsOpen && !notificationButton?.contains(e.target) && !notificationDropdown?.contains(e.target)) {
        setNotificationsOpen(false);
      }
      if (isReferralOpen && !referralButton?.contains(e.target) && !referralDropdown?.contains(e.target)) {
        setIsReferralOpen(false);
      }
      if (showCreatorChoice && !choicePopup?.contains(e.target)) {
        setShowCreatorChoice(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [notificationsOpen, isReferralOpen, showCreatorChoice, styles]);

  const notificationLabel = (notif) => {
    switch (notif.type) {
      case "reply":
        return { text: `Reply: "${notif.message}"`, path: `/novel/${notif.novel_id}/chapter/${notif.comment_id}` };
      case "new_chapter":
        return { text: notif.message, path: `/novel/${notif.novel_id}` };
      case "reward":
        return { text: "Weekly reward received", path: "/profile" };
      default:
        return null;
    }
  };

  const creatorLabel = isWriter || isArtist || isSuperuser ? "Creator Dashboard" : "Become a Creator";

  return (
    <>
      <Sidebar isVisible={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <nav className={`${styles.navbar} ${scrolled ? styles.scrolled : ""}`}>
        <div className={styles.navContainer}>
          {/* Section 1: theme + brand ------------------------------------ */}
          <div className={styles.leftSide}>
            <button
              onClick={toggleTheme}
              className={styles.themeToggleButton}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              <span className={styles.themeIconTrack} data-theme={theme}>
                <FaSun className={styles.themeIconSun} />
                <FaMoon className={styles.themeIconMoon} />
              </span>
            </button>

            <Link href="/" onClick={() => handleNavigation("/")} className={styles.logoLink}>
              <span className={styles.logoMarkWrap}>
                <img src="/images/logo.jpeg" alt="" className={styles.logo} />
              </span>
              <span className={styles.logoText}>
                Sempai <span className={styles.logoTextAccent}>HQ</span>
              </span>
            </Link>
          </div>

          {/* Section 2: primary destinations - desktop only --------------- */}
          <div className={styles.navLinks} role="navigation" aria-label="Primary">
            {NAV_LINKS.map(({ name, path, icon: Icon }, i) => (
              <Link
                key={path}
                href={path}
                onClick={() => handleNavigation(path)}
                className={styles.navLink}
                style={{ "--i": i }}
              >
                <Icon className={styles.navIcon} />
                <span>{name}</span>
              </Link>
            ))}
            <Link
              href="/chat"
              onClick={() => handleProtectedNavigation("/chat")}
              className={styles.navLink}
              style={{ "--i": NAV_LINKS.length }}
            >
              <FaComments className={styles.navIcon} />
              <span>Chat</span>
            </Link>
            <Link
              href={isWalletConnected && (isWriter || isArtist) ? `/profile/${userId}` : "/editprofile"}
              onClick={() =>
                handleProtectedNavigation(isWriter || isArtist ? `/profile/${userId}` : "/editprofile")
              }
              className={styles.navLink}
              style={{ "--i": NAV_LINKS.length + 1 }}
            >
              <FaUser className={styles.navIcon} />
              <span>Profile</span>
            </Link>
          </div>

          {/* Section 3: actions -------------------------------------------- */}
          <div className={styles.rightSide}>
            {isWalletConnected && (
              <div className={styles.notificationWrapper}>
                <button
                  onClick={toggleNotifications}
                  className={styles.notificationButton}
                  aria-label="Notifications"
                  aria-expanded={notificationsOpen}
                >
                  <FaBell className={styles.bellIcon} />
                  {notifications.length > 0 && (
                    <span className={styles.notificationBadge}>
                      {notifications.length > 9 ? "9+" : notifications.length}
                    </span>
                  )}
                </button>
                {notificationsOpen && (
                  <div className={`${styles.notificationDropdown} ${styles.open}`}>
                    <p className={styles.dropdownHeader}>Notifications</p>
                    {notifications.length > 0 ? (
                      <>
                        <div className={styles.notificationList}>
                          {notifications.map((notif) => {
                            if (notif.type === "chat_reply") {
                              return (
                                <div key={notif.id} className={styles.notificationItem}>
                                  <Link
                                    href={`/chat?messageId=${notif.chat_id}`}
                                    onClick={() => handleChatNavigation("chat_reply", notif.chat_id)}
                                  >
                                    <FaComments className={styles.notifItemIcon} />
                                    {notif.message}
                                  </Link>
                                </div>
                              );
                            }
                            if (notif.type === "private_message") {
                              return (
                                <div key={notif.id} className={styles.notificationItem}>
                                  <Link
                                    href={`/chat?recipient=${notif.recipient_wallet_address}&messageId=${notif.chat_id}`}
                                    onClick={() =>
                                      handleChatNavigation("private_message", notif.chat_id, notif.recipient_wallet_address)
                                    }
                                  >
                                    <FaComments className={styles.notifItemIcon} />
                                    {notif.message}
                                  </Link>
                                </div>
                              );
                            }
                            const label = notificationLabel(notif);
                            return (
                              <div key={notif.id} className={styles.notificationItem}>
                                {label ? (
                                  <Link href={label.path} onClick={() => handleNavigation(label.path)}>
                                    <FaBell className={styles.notifItemIcon} />
                                    {label.text}
                                  </Link>
                                ) : (
                                  <span>{notif.message || "New notification"}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <button onClick={markAsRead} className={styles.markReadButton}>
                          Mark all as read
                        </button>
                      </>
                    ) : (
                      <div className={styles.noNotifications}>You're all caught up</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {isWalletConnected && (
              <button onClick={handleCreatorAccess} className={styles.actionButton}>
                <FaBookOpen className={styles.actionButtonIcon} />
                <span className={styles.actionButtonLabel}>{creatorLabel}</span>
              </button>
            )}

            {isWalletConnected && (
              <button
                onClick={toggleReferral}
                className={styles.referralToggle}
                aria-label="Referral link"
                aria-expanded={isReferralOpen}
              >
                <FaShareAlt className={styles.referralIcon} />
              </button>
            )}

            <div className={styles.connectSlot}>
              <ConnectButton className={styles.connectButton} />
            </div>

            <button
              className={`${styles.menuToggle} ${sidebarOpen ? styles.menuToggleActive : ""}`}
              onClick={toggleSidebar}
              aria-label={sidebarOpen ? "Close menu" : "Open menu"}
              aria-expanded={sidebarOpen}
            >
              <span className={styles.menuIconTrack}>
                <FaBars className={styles.menuIconBars} />
                <FaTimes className={styles.menuIconTimes} />
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* Referral popup */}
      {isReferralOpen && (
        <div
          ref={referralRef}
          className={styles.referralDropdown}
          style={{ left: `${referralPosition.x}px`, top: `${referralPosition.y}px` }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <div className={styles.referralDragHandle} aria-hidden="true" />
          <div className={styles.referralContent}>
            <p className={styles.referralHeader}>Your referral code</p>
            <p className={styles.referralCode}>{referralCode || "—"}</p>
            <button onClick={copyReferralLink} className={styles.referralButton} disabled={!referralCode}>
              Copy link
            </button>
          </div>
        </div>
      )}

      {/* Connect prompt for gated links */}
      {showConnectPopup && (
        <div className={styles.creatorChoiceOverlay} onClick={() => setShowConnectPopup(false)}>
          <div className={styles.creatorChoicePopup} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.popupTitle}>Connect your wallet</h3>
            <p className={styles.popupMessage}>You need to connect a wallet to access this page.</p>
            <div className={styles.choiceButtons}>
              <ConnectButton className={styles.connectButton} />
            </div>
          </div>
        </div>
      )}

      {/* Creator dashboard chooser */}
      {showCreatorChoice && (
        <div className={styles.creatorChoiceOverlay} onClick={() => setShowCreatorChoice(false)}>
          <div className={styles.creatorChoicePopup} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.popupTitle}>Choose a dashboard</h3>
            <p className={styles.popupMessage}>You have access to both the Novel and Manga creator dashboards.</p>
            <div className={styles.choiceButtons}>
              <button onClick={() => handleCreatorChoice("/novel-creators-dashboard")} className={styles.choiceButton}>
                <FaBookOpen /> Novel Dashboard
              </button>
              <button onClick={() => handleCreatorChoice("/manga-creators-dashboard")} className={styles.choiceButton}>
                <FaGamepad /> Manga Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}