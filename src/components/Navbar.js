import Link from "next/link";
import { useState } from "react";
import { FaHome, FaExchangeAlt, FaUser, FaComments, FaBell } from "react-icons/fa"; // Icons from react-icons
import ConnectButton from "../components/ConnectButton";
import styles from "./comments/Navbar.module.css"; // New CSS module

export default function Navbar({ connected, isWriter, notifications, markAsRead, handleCreatorAccess }) {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <nav className={`${styles.navbar} navbar navbar-expand-lg navbar-dark bg-dark py-3 shadow`}>
      <div className="container">
        {/* Brand Logo */}
        <Link href="/" className={`${styles.brand} navbar-brand`}>
          <img
            src="/images/logo.jpg"
            alt="Sempai HQ"
            className={styles.logo}
          />
        </Link>

        {/* Notification Bell */}
        <div className={styles.notificationWrapper}>
          <button
            className={styles.notificationButton}
            onClick={() => setShowDropdown(!showDropdown)}
            aria-label="Notifications"
          >
            <FaBell />
            {notifications.length > 0 && (
              <span className={styles.notificationBadge}>{notifications.length}</span>
            )}
          </button>
          {showDropdown && (
            <div className={styles.dropdown}>
              {notifications.length > 0 ? (
                notifications.map((notif) => (
                  <div key={notif.id} className={styles.dropdownItem}>
                    {notif.type === "reply" && notif.comment_id ? (
                      <Link href={`/novel/${notif.novel_id}/chapter/${notif.comment_id}`}>
                        📩 Someone replied: "{notif.message}"
                      </Link>
                    ) : notif.type === "new_chapter" ? (
                      <Link href={`/novel/${notif.novel_id}`}>
                        📖 New chapter: "{notif.novel_title}"
                      </Link>
                    ) : notif.type === "reward" ? (
                      <Link href="/profile">
                        🎉 Weekly reward received!
                      </Link>
                    ) : (
                      <span>{notif.message || "New notification"}</span>
                    )}
                  </div>
                ))
              ) : (
                <div className={styles.dropdownItem}>No new notifications</div>
              )}
              {notifications.length > 0 && (
                <button
                  className={styles.markReadButton}
                  onClick={() => {
                    markAsRead();
                    setShowDropdown(false);
                  }}
                >
                  Mark as Read
                </button>
              )}
            </div>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Navbar Content */}
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto text-center">
            <li className="nav-item">
              <Link href="/" className={styles.navLink}>
                <FaHome className={styles.icon} /> Home
              </Link>
            </li>
            <li className="nav-item">
              <Link href="/swap" className={styles.navLink}>
                <FaExchangeAlt className={styles.icon} /> Swap
              </Link>
            </li>
            <li className="nav-item">
              <Link href="/profile" className={styles.navLink}>
                <FaUser className={styles.icon} /> Profile
              </Link>
            </li>
            <li className="nav-item">
              <Link href="/chat" className={styles.navLink}>
                <FaComments className={styles.icon} /> Chat
              </Link>
            </li>
          </ul>

         {/* Wallet and Creator Dashboard Section */}
      <ul className="navbar-nav ms-auto text-center">
        {/* Wallet Connect Button */}
        <li className="nav-item me-lg-3 mb-3 mb-lg-0">
          <ConnectButton className="btn btn-light btn-sm rounded-pill px-3 py-2 text-dark" />
        </li>

        {/* Conditional Rendering for Creator Dashboard & Writer Application */}
        <li className="nav-item">
          {connected ? (
            isWriter ? (
              <button
                onClick={handleCreatorAccess}
                className="btn btn-warning btn-sm rounded-pill text-dark fw-bold px-4 py-2"
              >
                Creator Dashboard
              </button>
            ) : (
              <Link href="/apply" className="btn btn-primary btn-sm rounded-pill px-4 py-2 text-dark fw-bold">
                  Apply to be a Creator
              </Link>
            )
          ) : (
            <button className="btn btn-light btn-sm rounded-pill text-dark fw-bold px-4 py-2" disabled>
              Connect Wallet to Access
            </button>
          )}
        </li>
      </ul>
           
        </div>
      </div>
    </nav>
  );
}