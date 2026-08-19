"use client";

import { useState, useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import { EmbeddedWalletContext } from "./EmbeddedWalletProvider";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/services/supabase/supabaseClient";
import {
  FaHome,
  FaExchangeAlt,
  FaUser,
  FaComments,
  FaBookOpen,
  FaGamepad,
  FaImages,
  FaWallet,
  FaTrophy,
  FaUserPlus,
  FaDownload,
  FaChevronDown,
  FaChevronUp,
  FaCopy,
  FaSignOutAlt,
  FaPlug,
  FaBars,
  FaTimes,
  FaStar,
  FaBell,
  FaChartBar,
  FaNewspaper,
} from "react-icons/fa";
import styles from "../styles/Sidebar.module.css";

const Sidebar = ({ isVisible, onClose }) => {
  const router = useRouter();
  const walletContext = useContext(EmbeddedWalletContext);
  const { user } = useAuth();
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [userRole, setUserRole] = useState(null); // "writer", "artist", "both", "superuser", "user"

  const wallet = walletContext?.wallet;
  const disconnectWallet = walletContext?.disconnectWallet;
  const setShowModal = walletContext?.setShowModal;
  const isLoading = walletContext?.isLoading;

  const isWalletConnected = !!wallet;
  const walletPublicKey = wallet?.publicKey || null;

  // Fetch user role when authenticated
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user?.id) {
        setUserRole(null);
        return;
      }

      try {
        const { data: userData, error } = await supabase
          .from("users")
          .select("isWriter, isArtist, isSuperuser")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        if (userData) {
          if (userData.isSuperuser) setUserRole("superuser");
          else if (userData.isWriter && userData.isArtist) setUserRole("both");
          else if (userData.isArtist) setUserRole("artist");
          else if (userData.isWriter) setUserRole("writer");
          else setUserRole("user");
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        setUserRole("user");
      }
    };

    fetchUserRole();
  }, [user?.id]);

  const navGroups = [
    {
      title: isWalletConnected
        ? `${walletPublicKey.toString().slice(0, 6)}...${walletPublicKey.toString().slice(-4)}`
        : "Connect Wallet",
      icon: isWalletConnected ? FaWallet : FaPlug,
      isWallet: true,
      items: isWalletConnected
        ? [
            { name: "Copy Address", action: "copyAddress", icon: FaCopy },
            { name: "Disconnect", action: "disconnect", icon: FaSignOutAlt },
          ]
        : [{ name: "Connect Wallet", action: "connect", icon: FaPlug }],
    },
    {
      title: "Main",
      icon: FaHome,
      items: [
        { name: "Home", path: "/", icon: FaHome },
        { name: "Feed", path: "/feed", icon: FaNewspaper },
        { name: "Profile", path: user?.id ? `/profile/${user.id}` : (isWalletConnected ? "/profile" : "/editprofile"), icon: FaUser },
      ],
    },
    {
      title: "Content",
      icon: FaBookOpen,
      items: [
        ...(userRole === "writer" || userRole === "both" || userRole === "superuser"
          ? [{ name: "Novel Dashboard", path: "/novel-creators-dashboard", icon: FaBookOpen }]
          : []),
        ...(userRole === "artist" || userRole === "both" || userRole === "superuser"
          ? [{ name: "Manga Dashboard", path: "/manga-creators-dashboard", icon: FaImages }]
          : []),
        { name: "Hoard", path: "/novels", icon: FaBookOpen },
        { name: "Manga Hoard", path: "/manga", icon: FaImages },
      ],
    },
    {
      title: "Nexus",
      icon: FaExchangeAlt,
      items: [
        { name: "Swap", path: "/swap", icon: FaExchangeAlt },
        { name: "Import Wallet", path: "/wallet-import", icon: FaWallet },
      ],
    },
    {
      title: "Community",
      icon: FaComments,
      items: [
        { name: "Chat", path: "/chat", icon: FaComments },
        { name: "Leaderboard", path: "/leaderboard", icon: FaTrophy },
      ],
    },
    {
      title: "Features",
      icon: FaStar,
      items: [
        { name: "Badges", path: "/badges", icon: FaStar },
        { name: "Notifications", path: "/notifications", icon: FaBell },
        { name: "Stats", path: "/stat-page", icon: FaChartBar },
        { name: "Kaito's Adventure", path: "/kaito-adventure", icon: FaGamepad },
      ],
    },
    {
      title: "Other",
      icon: FaBars,
      items: [
        { name: "Become a Creator", path: "/apply", icon: FaUserPlus },
        { name: "Download App", path: "/download", icon: FaDownload },
      ],
    },
  ];

  const toggleDropdown = (index) => {
    setActiveDropdown(activeDropdown === index ? null : index);
  };

  const handleWalletAction = (action) => {
    if (action === "connect") {
      if (setShowModal) setShowModal(true);
    } else if (action === "copyAddress" && walletPublicKey) {
      navigator.clipboard.writeText(walletPublicKey.toString());
      alert("Wallet address copied to clipboard");
    } else if (action === "disconnect") {
      if (disconnectWallet) disconnectWallet();
    }
    setActiveDropdown(null);
  };

  const navigateToPath = (path) => {
    const isPublicPath = ["/", "/feed", "/download", "/apply"].includes(path);
    if (!isWalletConnected && !isPublicPath) {
      if (setShowModal) setShowModal(true);
      return;
    }
    setIsNavigating(true);
    router.push(path);
    setActiveDropdown(null);
    onClose();
    setTimeout(() => setIsNavigating(false), 500);
  };

  return (
    <>
      {isVisible && <div className={styles.overlay} onClick={onClose} />}
      <div className={`${styles.sidebar} ${isVisible ? styles.sidebarOpen : styles.sidebarClosed}`}>
        <div className={styles.sidebarContent}>
          <div className={styles.sidebarHeader}>
            <img src="/images/logo.jpeg" alt="Sempai HQ" className={styles.sidebarLogo} />
            <span className={styles.sidebarTitle}>Sempai HQ</span>
            <button className={styles.closeButton} onClick={onClose} aria-label="Close menu">
              <FaTimes />
            </button>
          </div>

          <div className={styles.navLinksContainer}>
            {navGroups.map((group, groupIndex) => (
              <div key={groupIndex} className={styles.navGroup}>
                <button
                  className={`${styles.navGroupButton} ${
                    group.isWallet && isWalletConnected ? styles.walletButtonConnected : ""
                  }`}
                  onClick={() => toggleDropdown(groupIndex)}
                  disabled={group.isWallet && isLoading}
                >
                  <group.icon className={styles.navIcon} />
                  <span className={styles.navGroupText}>{group.title}</span>
                  {activeDropdown === groupIndex ? (
                    <FaChevronUp className={styles.dropdownIcon} />
                  ) : (
                    <FaChevronDown className={styles.dropdownIcon} />
                  )}
                </button>

                {activeDropdown === groupIndex && (
                  <div className={styles.dropdown}>
                    {group.items.map((item, itemIndex) => (
                      <button
                        key={`${groupIndex}-${item.name}-${itemIndex}`}
                        className={styles.dropdownItem}
                        onClick={() =>
                          group.isWallet ? handleWalletAction(item.action) : navigateToPath(item.path)
                        }
                        disabled={isNavigating || isLoading}
                      >
                        {isNavigating && !group.isWallet ? (
                          <span className={styles.navIcon}>...</span>
                        ) : (
                          <item.icon className={styles.navIcon} />
                        )}
                        <span className={styles.dropdownItemText}>
                          {isNavigating && !group.isWallet ? "Loading..." : item.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;