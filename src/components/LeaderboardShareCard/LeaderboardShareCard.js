"use client";

import React from "react";
import styles from "./LeaderboardShareCard.module.css";

const LeaderboardShareCard = ({ 
  username, 
  profilePicture, 
  rank, 
  points, 
  leaderboardUrl = "https://sempaihq.com/leaderboard",
  timeFrame = "All Time"
}) => {
  return (
    <div className={styles.shareCard}>
      {/* Background with gradient */}
      <div className={styles.cardBackground}>
        {/* Decorative elements */}
        <div className={styles.glowOrb1}></div>
        <div className={styles.glowOrb2}></div>
        <div className={styles.glowOrb3}></div>
        
        {/* Card content */}
        <div className={styles.cardContent}>
          {/* Header */}
          <div className={styles.cardHeader}>
            <div className={styles.logoSection}>
              <img 
                src="/images/logo.jpeg" 
                alt="Sempai HQ" 
                className={styles.logo}
              />
              <span className={styles.logoText}>Sempai HQ</span>
            </div>
            <div className={styles.badge}>
              <span className={styles.badgeText}>LEADERBOARD</span>
            </div>
          </div>

          {/* User info section */}
          <div className={styles.userSection}>
            <div className={styles.rankBadge}>
              <span className={styles.rankNumber}>#{rank}</span>
            </div>
            <div className={styles.userInfo}>
              <img 
                src={profilePicture || "/avatars/default.jpg"} 
                alt={username} 
                className={styles.profilePicture}
              />
              <div className={styles.userDetails}>
                <h3 className={styles.username}>{username}</h3>
                <p className={styles.timeFrame}>{timeFrame}</p>
              </div>
            </div>
          </div>

          {/* Stats section */}
          <div className={styles.statsSection}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Points</span>
              <span className={styles.statValue}>{points.toLocaleString()}</span>
            </div>
            <div className={styles.statDivider}></div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Rank</span>
              <span className={styles.statValue}>#{rank}</span>
            </div>
          </div>

          {/* Footer with CTA */}
          <div className={styles.cardFooter}>
            <p className={styles.ctaText}>View the full Top 50 Leaderboard</p>
            <div className={styles.urlDisplay}>
              <span className={styles.urlText}>{leaderboardUrl}</span>
            </div>
          </div>
        </div>

        {/* Border effects */}
        <div className={styles.borderTop}></div>
        <div className={styles.borderBottom}></div>
        <div className={styles.borderLeft}></div>
        <div className={styles.borderRight}></div>
      </div>
    </div>
  );
};

export default LeaderboardShareCard;
