"use client";

import React from "react";
import styles from "./KaitoAdventureShareCard.module.css";

const KaitoAdventureShareCard = ({ 
  username, 
  rank, 
  points, 
  leaderboardUrl = "https://sempaihq.com/kaito-adventure",
  timeFrame = "All Time"
}) => {
  return (
    <div className={styles.shareCard}>
      {/* Military background with gradient */}
      <div className={styles.cardBackground}>
        {/* Military decorative elements */}
        <div className={styles.militaryGrid}></div>
        <div className={styles.glowOrb1}></div>
        <div className={styles.glowOrb2}></div>
        
        {/* Military border decoration */}
        <div className={styles.militaryBorder1}></div>
        <div className={styles.militaryBorder2}></div>
        
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
              <span className={styles.badgeText}>⚔️ BREWMASTER LEAGUE ⚔️</span>
            </div>
          </div>

          {/* User info section */}
          <div className={styles.userSection}>
            <div className={styles.rankBadge}>
              <span className={styles.rankNumber}>#{rank}</span>
              <span className={styles.rankLabel}>RANK</span>
            </div>
            <div className={styles.userInfo}>
              <div className={styles.avatar}>
                {username?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className={styles.userDetails}>
                <h3 className={styles.username}>{username}</h3>
                <p className={styles.timeFrame}>{timeFrame}</p>
              </div>
            </div>
          </div>

          {/* Stats section */}
          <div className={styles.statsSection}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>GOLD</span>
              <span className={styles.statValue}>{points.toLocaleString()}</span>
            </div>
            <div className={styles.statDivider}></div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>RANK</span>
              <span className={styles.statValue}>#{rank}</span>
            </div>
          </div>

          {/* Footer with CTA */}
          <div className={styles.cardFooter}>
            <p className={styles.ctaText}>Join the Military Campaign</p>
            <div className={styles.urlDisplay}>
              <span className={styles.urlText}>{leaderboardUrl}</span>
            </div>
          </div>
        </div>

        {/* Military corner decorations */}
        <div className={styles.cornerTopLeft}></div>
        <div className={styles.cornerTopRight}></div>
        <div className={styles.cornerBottomLeft}></div>
        <div className={styles.cornerBottomRight}></div>
      </div>
    </div>
  );
};

export default KaitoAdventureShareCard;
