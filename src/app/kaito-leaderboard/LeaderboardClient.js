"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import LoadingPage from "@/components/LoadingPage";
import { FaTrophy, FaMedal, FaAward, FaShareAlt, FaTimes, FaShieldAlt, FaStar, FaCrown, FaFlag, FaSkullCrossbones, FaCrosshairs, FaDragon, FaFire, FaBolt, FaSkull, FaBomb, FaJetFighter, FaIdBadge, FaMilitary, FaMedal as FaMilitaryMedal } from "react-icons/fa";
import LeaderboardShareCard from "@/components/LeaderboardShareCard/LeaderboardShareCard";
import styles from "@/styles/KaitoLeaderboard.module.css";

export default function LeaderboardClient() {
  const { user, session } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeFrame, setTimeFrame] = useState("week");
  const [selectedReader, setSelectedReader] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const fetchLeaderboard = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const token = session?.access_token;
      const res = await fetch("/api/porp/leaderboard", {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch leaderboard");

      setLeaderboard(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchLeaderboard();
  }, [user, timeFrame]);

  const handleShare = (reader) => {
    setSelectedReader(reader);
    setShowShareModal(true);
  };

  const shareToX = () => {
    if (!selectedReader) return;
    
    const username = selectedReader.name || 'Anonymous';
    const cardUrl = `https://www.sempaihq.com/api/kaito-leaderboard/card?username=${encodeURIComponent(username)}&rank=${selectedReader.rank}&points=${selectedReader.score}&timeFrame=${timeFrame}`;
    const shareUrl = `https://www.sempaihq.com/kaito-leaderboard?username=${encodeURIComponent(username)}&rank=${selectedReader.rank}&points=${selectedReader.score}&timeFrame=${timeFrame}`;
    const shareText = `⚔️ I'm ranked #${selectedReader.rank} on the Kaito Brewmaster League with ${selectedReader.score.toLocaleString()} points! Join the military campaign:`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    
    console.log('[Kaito Leaderboard Share] Sharing with:', { username, cardUrl, shareUrl, twitterUrl });
    
    window.open(twitterUrl, '_blank');
    setShowShareModal(false);
  };

  if (loading) return <LoadingPage />;

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <h2 className={styles.errorText}>Leaderboard Error</h2>
        <p className={styles.errorMessage}>{error}</p>
        <button onClick={fetchLeaderboard} className={styles.retryButton}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={styles.kaitoLeaderboard}>
      {/* Military Campaign Header */}
      <div className={styles.campaignHeader}>
        <div className={styles.campaignBanner}>
          <div className={styles.campaignTitle}>
            <FaShieldAlt className={styles.shieldIcon} />
            <h1>Kaito Military Campaign</h1>
            <FaFlag className={styles.flagIcon} />
          </div>
          <p className={styles.campaignSubtitle}>
            ⚔️ Rise Through the Ranks - Conquer the Leaderboard ⚔️
          </p>
          <div className={styles.campaignBadges}>
            <div className={styles.campaignBadge}>
              <FaCrosshairs />
              <span>Tactical</span>
            </div>
            <div className={styles.campaignBadge}>
              <FaFire />
              <span>Elite</span>
            </div>
            <div className={styles.campaignBadge}>
              <FaDragon />
              <span>Legendary</span>
            </div>
          </div>
        </div>
      </div>

      {/* Time Frame Selector */}
      <div className={styles.timeFrameSelector}>
        <button
          className={`${styles.timeFrameButton} ${timeFrame === 'week' ? styles.active : ''}`}
          onClick={() => setTimeFrame('week')}
        >
          This Week
        </button>
        <button
          className={`${styles.timeFrameButton} ${timeFrame === 'month' ? styles.active : ''}`}
          onClick={() => setTimeFrame('month')}
        >
          This Month
        </button>
        <button
          className={`${styles.timeFrameButton} ${timeFrame === 'all' ? styles.active : ''}`}
          onClick={() => setTimeFrame('all')}
        >
          All Time
        </button>
      </div>

      {/* Leaderboard Table */}
      <div className={styles.leaderboardContainer}>
        <div className={styles.leaderboardHeader}>
          <div className={styles.headerRank}>Rank</div>
          <div className={styles.headerPlayer}>Player</div>
          <div className={styles.headerScore}>Score</div>
          <div className={styles.headerLevel}>Level</div>
          <div className={styles.headerTier}>Tier</div>
          <div className={styles.headerShare}>Share</div>
        </div>

        {leaderboard.map((reader, index) => (
          <div key={reader.walletAddress} className={styles.readerRow}>
            <div className={styles.rankCell}>
              {index < 3 ? (
                <div className={`${styles.rankBadge} ${styles[`rank${index + 1}`]}`}>
                  {index === 0 && <FaCrown className={styles.rankIcon} />}
                  {index === 1 && <FaMilitaryMedal className={styles.rankIcon} />}
                  {index === 2 && <FaIdBadge className={styles.rankIcon} />}
                  {index + 1}
                </div>
              ) : (
                <span className={styles.rankNumber}>{index + 1}</span>
              )}
            </div>
            <div className={styles.playerCell}>
              <div className={styles.playerInfo}>
                <div className={styles.playerAvatar}>
                  {reader.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className={styles.playerDetails}>
                  <div className={styles.playerName}>{reader.name || 'Anonymous'}</div>
                  <div className={styles.playerAddress}>
                    {reader.walletAddress?.slice(0, 6)}...{reader.walletAddress?.slice(-4)}
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.scoreCell}>
              <span className={styles.scoreValue}>{reader.score?.toLocaleString() || 0}</span>
            </div>
            <div className={styles.levelCell}>
              <span className={styles.levelValue}>Lv. {reader.level || 0}</span>
            </div>
            <div className={styles.tierCell}>
              <span className={`${styles.tierBadge} ${styles[`tier${reader.tier}`]}`}>
                {reader.tier || 'Seed'}
              </span>
            </div>
            <div className={styles.shareCell}>
              <button
                className={styles.shareButton}
                onClick={() => handleShare(reader)}
              >
                <FaShareAlt />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Share Modal */}
      {showShareModal && selectedReader && (
        <div className={styles.shareModalOverlay} onClick={() => setShowShareModal(false)}>
          <div className={styles.shareModal} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.closeModalButton}
              onClick={() => setShowShareModal(false)}
            >
              <FaTimes />
            </button>
            <h2 className={styles.shareModalTitle}>Share Your Achievement</h2>
            <LeaderboardShareCard
              username={selectedReader.name || 'Anonymous'}
              rank={selectedReader.rank}
              points={selectedReader.score}
              timeFrame={timeFrame}
              league="Kaito Brewmaster League"
            />
            <button
              className={styles.shareToXButton}
              onClick={shareToX}
            >
              Share on X
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
