 
import Image from "next/image";
import { FaShieldAlt, FaCoins, FaStar } from "react-icons/fa";
import styles from "../../styles/KaitoAdventure.module.css";

const PlayerStats = ({ player, xpProgress }) => (
  <div className={`${styles.kaStatsPanel} ${styles.kaSlideUp}`}>
    <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
      <div className={styles.kaAvatarFrame}>
        <Image
          src={`/avatars/${player.avatar}.jpg`}
          alt="Avatar"
          width={50}
          height={50}
          style={{ borderRadius: "50%", objectFit: "cover" }}
        />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className={styles.kaTitle} style={{ fontSize: "clamp(1.2rem, 3.2vw, 2rem)", lineHeight: 1.15 }}>
          {player.name}
          <span className={styles.kaSubtitle} style={{ marginLeft: 10 }}>
            Lv {player.level}
          </span>
        </div>

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 10 }}>
          <div className={styles.kaStatRow}>
            <FaShieldAlt className={styles.kaStatIcon} />
            <span className={styles.kaStatLabel}>HP</span>
            <span className={styles.kaStatValue}>
              {player.health}/{player.max_health}
            </span>
          </div>
          <div className={styles.kaStatRow}>
            <FaCoins className={styles.kaStatIcon} />
            <span className={styles.kaStatLabel}>Gold</span>
            <span className={styles.kaStatValue}>{player.gold}</span>
          </div>
          <div className={styles.kaStatRow}>
            <FaStar className={styles.kaStatIcon} />
            <span className={styles.kaStatLabel}>XP</span>
            <span className={styles.kaStatValue}>{player.xp}</span>
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <div className={styles.kaXpTrack}>
            <div className={styles.kaXpFill} style={{ width: `${Math.max(0, Math.min(100, xpProgress))}%` }} />
          </div>
          <div className={styles.kaXpText}>{Math.round(xpProgress)}% to next level</div>
        </div>
      </div>
    </div>
  </div>
);

export default PlayerStats;