"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../services/supabase/supabaseClient";
import Link from "next/link";
import { FaHome, FaTrophy, FaStar, FaMedal, FaCrown, FaGem, FaCalendarWeek, FaCalendarAlt, FaInfinity, FaShareAlt, FaTimes } from "react-icons/fa";
import LoadingPage from "../../components/LoadingPage";
import LeaderboardShareCard from "../../components/LeaderboardShareCard/LeaderboardShareCard";
import styles from "../../styles/LeaderboardPage.module.css";

export default function LeaderboardClient() {
  const router = useRouter();
  const [readers, setReaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeFrame, setTimeFrame] = useState("week");
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedReader, setSelectedReader] = useState(null);

  // Fetch leaderboard data
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        // Query users and their unlocked chapters count
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, email, wallet_address, weekly_points, amethyst_count, balance")
        .or("weekly_points.gt.0,balance.gt.0") // Get users with either weekly_points or balance
        .order("weekly_points", { ascending: false, nullsFirst: false })
        .limit(50);

      if (usersError) throw usersError;

      // Get unlocked chapters count and cached Amethyst balances for each user
      const data = await Promise.all(
        (users || []).map(async (user) => {
          // Count unlocked story chapters
          const { data: storyChapters } = await supabase
            .from("unlocked_story_chapters")
            .select("chapters_unlocked_count")
            .eq("user_id", user.id);

          // Count unlocked manga chapters  
          const { data: mangaChapters } = await supabase
            .from("unlocked_manga_chapters")
            .select("id")
            .eq("user_id", user.id);

          const storyCount = storyChapters?.reduce((sum, chapter) => sum + (chapter.chapters_unlocked_count || 1), 0) || 0;
          const mangaCount = mangaChapters?.length || 0;
          const totalUnlockedChapters = storyCount + mangaCount;

          // Get cached Amethyst balance from database
          const { data: amethystData } = await supabase
            .from("amethyst_balances")
            .select("amethyst_balance")
            .eq("user_id", user.id)
            .single();

          const cachedAmethystBalance = Number(amethystData?.amethyst_balance) || 0;

          return {
            ...user,
            total_points_read: totalUnlockedChapters, // Override with actual chapters count
            cached_amethyst_balance: cachedAmethystBalance // Use cached balance
          };
        })
      );
        
        // Process readers with Amethyst multiplier using cached balances
        const processedReaders = (data || []).map(user => {
          // Handle actual database data types
          // weekly_points is numeric
          const weeklyPoints = Number(user.weekly_points) || 0;
          const totalChaptersUnlocked = Number(user.total_points_read) || 0; // Now contains actual chapters count
          const amethystCount = Number(user.cached_amethyst_balance) || 0; // Use cached balance
          
          // If no weekly_points, use balance as fallback
          const basePoints = weeklyPoints > 0 ? weeklyPoints : (Number(user.balance) || 0);
          
          // Amethyst tier-based reward system (show full reward amount)
          let amethystBonus = 0;
          
          // Debug logging to see actual values
          console.log(`[Leaderboard] User: ${user.email}, AmethystCount: ${amethystCount}, Type: ${typeof amethystCount}`);
          
          if (amethystCount >= 5000000) amethystBonus = 250;
          else if (amethystCount >= 1000000) amethystBonus = 200;
          else if (amethystCount >= 500000) amethystBonus = 170;
          else if (amethystCount >= 250000) amethystBonus = 150;
          else if (amethystCount >= 100000) amethystBonus = 120;
          // Default: 0 bonus (just use base points)
          
          console.log(`[Leaderboard] User: ${user.email}, Amethyst: ${amethystCount}, Bonus: ${amethystBonus}, EffectivePoints: ${basePoints + amethystBonus}`);
          
          const effectivePoints = basePoints + amethystBonus;
          
          return {
            id: user.id,
            email: user.email,
            walletAddress: user.wallet_address,
            weeklyPoints: basePoints,
            totalPointsRead: totalChaptersUnlocked, // Shows actual unlocked chapters count
            amethystCount: amethystCount,
            multiplierBonus: amethystBonus, // Show the bonus amount
            effectivePoints: effectivePoints,
            rank: 0 // Will be calculated
          };
        });

        // Assign ranks
        processedReaders.sort((a, b) => b.effectivePoints - a.effectivePoints);
        processedReaders.forEach((reader, index) => {
          reader.rank = index + 1;
        });

        setReaders(processedReaders);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
        setError("Failed to load leaderboard.");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <FaCrown className={styles.crownIcon} />;
      case 2:
        return <FaTrophy className={styles.trophyIcon} />;
      case 3:
        return <FaMedal className={styles.medalIcon} />;
      default:
        return <FaStar className={styles.starIcon} />;
    }
  };

  const getRankBadge = (rank) => {
    switch (rank) {
      case 1:
        return <span className={`${styles.rankBadge} ${styles.first}`}>1st</span>;
      case 2:
        return <span className={`${styles.rankBadge} ${styles.second}`}>2nd</span>;
      case 3:
        return <span className={`${styles.rankBadge} ${styles.third}`}>3rd</span>;
      default:
        return <span className={`${styles.rankBadge} ${styles.default}`}>{rank}th</span>;
    }
  };

  const handleShare = (reader) => {
    setSelectedReader(reader);
    setShowShareModal(true);
  };

  const shareToX = () => {
    if (!selectedReader) return;
    
    const username = selectedReader.email ? selectedReader.email.split('@')[0] : 'Anonymous';
    const cardUrl = `https://sempaihq.com/api/leaderboard/card?username=${encodeURIComponent(username)}&rank=${selectedReader.rank}&points=${selectedReader.effectivePoints}&timeFrame=${timeFrame === 'week' ? 'Weekly' : timeFrame === 'month' ? 'Monthly' : 'All Time'}`;
    const shareUrl = `https://sempaihq.com/leaderboard?username=${encodeURIComponent(username)}&rank=${selectedReader.rank}&points=${selectedReader.effectivePoints}&timeFrame=${timeFrame === 'week' ? 'Weekly' : timeFrame === 'month' ? 'Monthly' : 'All Time'}`;
    const shareText = `🏆 I'm ranked #${selectedReader.rank} on the Sempai HQ Leaderboard with ${selectedReader.effectivePoints.toLocaleString()} points! Check out the full Top 50 leaderboard:`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    
    window.open(twitterUrl, '_blank');
    setShowShareModal(false);
  };

  if (loading) return <LoadingPage />;

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <h2 className={styles.errorText}>Leaderboard Error</h2>
        <p className={styles.errorMessage}>{error}</p>
        <Link href="/" className={styles.backHomeButton}>
          <FaHome /> Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Link href="/" className={styles.logoLink}>
            <img src="/images/logo.jpeg" alt="Sempai HQ" className={styles.logo} />
            <span className={styles.logoText}>Sempai HQ</span>
          </Link>
          <h1 className={styles.pageTitle}><FaTrophy /> Reader Leaderboard</h1>
        </div>
      </header>

      {/* Time Frame Selector */}
      <div className={styles.timeFrameSelector}>
        <button 
          className={`${styles.timeButton} ${timeFrame === 'week' ? styles.active : ''}`}
          onClick={() => setTimeFrame('week')}
        >
          <FaCalendarWeek /> Weekly
        </button>
        <button 
          className={`${styles.timeButton} ${timeFrame === 'month' ? styles.active : ''}`}
          onClick={() => setTimeFrame('month')}
        >
          <FaCalendarAlt /> Monthly
        </button>
        <button 
          className={`${styles.timeButton} ${timeFrame === 'all' ? styles.active : ''}`}
          onClick={() => setTimeFrame('all')}
        >
          <FaInfinity /> All Time
        </button>
      </div>

      {/* Leaderboard */}
      <main className={styles.main}>
        {readers.length === 0 ? (
          <div className={styles.noResults}>
            <FaTrophy className={styles.noResultsIcon} />
            <h3>No readers found</h3>
            <p>Start reading to earn points and appear on the leaderboard!</p>
          </div>
        ) : (
          <div className={styles.leaderboard}>
            {/* Header Row */}
            <div className={styles.leaderboardHeader}>
              <div className={styles.rankHeader}>Rank</div>
              <div className={styles.readerHeader}>Reader</div>
              <div className={styles.pointsHeader}>Weekly Points</div>
              <div className={styles.amethystHeader}>Amethyst</div>
              <div className={styles.effectiveHeader}>Effective Points</div>
              <div className={styles.totalHeader}>Total Read</div>
              <div className={styles.shareHeader}>Share</div>
            </div>

            {/* Reader Rows */}
            {readers.map((reader, index) => (
              <div 
                key={reader.id} 
                className={`${styles.readerRow} ${index < 3 ? styles.topReader : ''}`}
              >
                <div className={styles.rankCell}>
                  {getRankIcon(reader.rank)}
                  {getRankBadge(reader.rank)}
                </div>
                <div className={styles.readerCell}>
                  <div className={styles.readerInfo}>
                    <span className={styles.readerName}>
                      {reader.email ? 
                        reader.email.split('@')[0].length > 15 ? 
                          `${reader.email.split('@')[0].slice(0, 15)}...` : 
                          reader.email.split('@')[0]
                        : 'Anonymous'
                      }
                    </span>
                    <span className={styles.walletAddress}>
                      {reader.walletAddress ? 
                        `${reader.walletAddress.slice(0, 6)}...${reader.walletAddress.slice(-4)}` 
                        : 'No Wallet'
                      }
                    </span>
                  </div>
                </div>
                <div className={styles.pointsCell}>
                  <span className={styles.pointsValue}>{reader.weeklyPoints.toLocaleString()}</span>
                </div>
                <div className={styles.amethystCell}>
                  <div className={styles.amethystContainer}>
                    <FaGem className={styles.amethystIcon} />
                    <span className={styles.amethystCount}>{reader.amethystCount}</span>
                  </div>
                  <div className={styles.multiplier}>
                    +{reader.multiplierBonus}
                  </div>
                </div>
                <div className={styles.effectiveCell}>
                  <span className={styles.effectivePoints}>
                    +{reader.multiplierBonus}
                  </span>
                </div>
                <div className={styles.totalCell}>
                  <span className={styles.totalValue}>{reader.totalPointsRead.toLocaleString()}</span>
                </div>
                <div className={styles.shareCell}>
                  <button 
                    className={styles.shareButton}
                    onClick={() => handleShare(reader)}
                    title="Share on X"
                  >
                    <FaShareAlt />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>© 2025 Sempai HQ. All rights reserved.</p>
      </footer>

      {/* Share Modal */}
      {showShareModal && selectedReader && (
        <div className={styles.shareModalOverlay} onClick={() => setShowShareModal(false)}>
          <div className={styles.shareModalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.shareModalHeader}>
              <h3 className={styles.shareModalTitle}>Share Your Achievement</h3>
              <button 
                className={styles.shareModalClose}
                onClick={() => setShowShareModal(false)}
              >
                <FaTimes />
              </button>
            </div>
            
            <div className={styles.shareModalBody}>
              <LeaderboardShareCard
                username={selectedReader.email ? selectedReader.email.split('@')[0] : 'Anonymous'}
                profilePicture="/avatars/default.jpg"
                rank={selectedReader.rank}
                points={selectedReader.effectivePoints}
                leaderboardUrl="https://sempaihq.com/leaderboard"
                timeFrame={timeFrame === 'week' ? 'Weekly' : timeFrame === 'month' ? 'Monthly' : 'All Time'}
              />
            </div>

            <div className={styles.shareModalFooter}>
              <button 
                className={styles.shareButtonX}
                onClick={shareToX}
              >
                <FaShareAlt /> Share on X
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
