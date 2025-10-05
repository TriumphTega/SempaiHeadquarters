"use client";

import { useState } from "react";
import Link from "next/link";
import { FaHome, FaBars, FaTimes, FaBookOpen, FaPaintBrush, FaUser, FaBell, FaSun, FaMoon } from "react-icons/fa";
import ConnectButton from "./ConnectButton";
import styles from "../styles/UnifiedNavbar.module.css";

export default function UnifiedNavbar({ 
  theme = "dark", 
  onThemeToggle,
  notificationCount = 0,
  userRole = null // 'writer', 'artist', 'superuser', or null
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => setMenuOpen(!menuOpen);

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        {/* Logo */}
        <Link href="/" className={styles.logo}>
          <img src="/images/logo.jpeg" alt="Sempai HQ" className={styles.logoImage} />
          <span className={styles.logoText}>Sempai HQ</span>
        </Link>

        {/* Desktop Navigation */}
        <div className={styles.navLinks}>
          <Link href="/" className={styles.navLink}>
            <FaHome /> Home
          </Link>
          <Link href="/novels" className={styles.navLink}>
            <FaBookOpen /> Novels
          </Link>
          <Link href="/manga" className={styles.navLink}>
            <FaPaintBrush /> Manga
          </Link>
          
          {/* Creator Links */}
          {userRole === 'writer' || userRole === 'superuser' ? (
            <Link href="/novel-creators-dashboard" className={styles.navLink}>
              Writer Dashboard
            </Link>
          ) : null}
          
          {userRole === 'artist' || userRole === 'superuser' ? (
            <Link href="/manga-creators-dashboard" className={styles.navLink}>
              Artist Dashboard
            </Link>
          ) : null}
        </div>

        {/* Right Side Actions */}
        <div className={styles.actions}>
          {/* Notifications */}
          <Link href="/notifications" className={styles.iconButton}>
            <FaBell />
            {notificationCount > 0 && (
              <span className={styles.badge}>{notificationCount}</span>
            )}
          </Link>

          {/* Theme Toggle */}
          {onThemeToggle && (
            <button onClick={onThemeToggle} className={styles.iconButton}>
              {theme === "dark" ? <FaSun /> : <FaMoon />}
            </button>
          )}

          {/* Profile */}
          <Link href="/editprofile" className={styles.iconButton}>
            <FaUser />
          </Link>

          {/* Connect Wallet */}
          <ConnectButton />

          {/* Mobile Menu Toggle */}
          <button className={styles.menuToggle} onClick={toggleMenu}>
            {menuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className={styles.mobileMenu}>
          <Link href="/" className={styles.mobileLink} onClick={toggleMenu}>
            <FaHome /> Home
          </Link>
          <Link href="/novels" className={styles.mobileLink} onClick={toggleMenu}>
            <FaBookOpen /> Novels
          </Link>
          <Link href="/manga" className={styles.mobileLink} onClick={toggleMenu}>
            <FaPaintBrush /> Manga
          </Link>
          
          {userRole === 'writer' || userRole === 'superuser' ? (
            <Link href="/novel-creators-dashboard" className={styles.mobileLink} onClick={toggleMenu}>
              Writer Dashboard
            </Link>
          ) : null}
          
          {userRole === 'artist' || userRole === 'superuser' ? (
            <Link href="/manga-creators-dashboard" className={styles.mobileLink} onClick={toggleMenu}>
              Artist Dashboard
            </Link>
          ) : null}
          
          <Link href="/editprofile" className={styles.mobileLink} onClick={toggleMenu}>
            <FaUser /> Profile
          </Link>
        </div>
      )}
    </nav>
  );
}
