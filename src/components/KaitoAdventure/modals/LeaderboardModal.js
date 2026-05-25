 
import { Button } from "react-bootstrap";
import { FaStar, FaShieldAlt, FaCrown, FaIdBadge, FaMedal as FaMilitaryMedal, FaFlag, FaCrosshairs, FaShareAlt, FaTimes } from "react-icons/fa";
import styles from "../../../styles/Combat.module.css";
import KaitoAdventureShareCard from "../../KaitoAdventureShareCard/KaitoAdventureShareCard";
import { useState } from "react";

const LeaderboardModal = ({ connected, leaderboardData, toggleModal }) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);

  const handleShare = (entry) => {
    setSelectedEntry(entry);
    setShowShareModal(true);
  };

  const shareToX = () => {
    if (!selectedEntry) return;
    
    const username = selectedEntry.name || 'Anonymous';
    const rank = leaderboardData.findIndex(e => e.wallet_address === selectedEntry.wallet_address) + 1;
    const cardUrl = `https://www.sempaihq.com/api/kaito-adventure-leaderboard/card?username=${encodeURIComponent(username)}&rank=${rank}&points=${selectedEntry.gold}&timeFrame=All Time`;
    const shareUrl = `https://www.sempaihq.com/kaito-adventure`;
    const shareText = `⚔️ I'm ranked #${rank} on the Kaito Brewmaster League with ${selectedEntry.gold.toLocaleString()} Gold! Join the military campaign:`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    
    window.open(twitterUrl, '_blank');
    setShowShareModal(false);
  };

  return (
    <>
      <div className={styles.militaryLeaderboard}>
        <div className={styles.militaryHeader}>
          <FaShieldAlt className={styles.militaryIcon} />
          <h2>Military Campaign Leaderboard</h2>
          <FaFlag className={styles.militaryIcon} />
        </div>
        
        {!connected ? (
          <p className={styles.militaryMessage}>Please connect your wallet to view the leaderboard.</p>
        ) : leaderboardData.length === 0 ? (
          <p className={styles.militaryMessage}>Loading leaderboard...</p>
        ) : (
          <div className={styles.militaryLeaderboardList}>
            {leaderboardData.map((entry, index) => (
              <div key={entry.wallet_address} className={styles.militaryEntry}>
                <div className={styles.militaryRank}>
                  {index < 3 ? (
                    <div className={`${styles.militaryRankBadge} ${styles[`rank${index + 1}`]}`}>
                      {index === 0 && <FaCrown />}
                      {index === 1 && <FaMilitaryMedal />}
                      {index === 2 && <FaIdBadge />}
                      {index + 1}
                    </div>
                  ) : (
                    <span className={styles.militaryRankNumber}>{index + 1}</span>
                  )}
                </div>
                <div className={styles.militaryPlayer}>
                  <div className={styles.militaryAvatar}>
                    {entry.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className={styles.militaryPlayerInfo}>
                    <div className={styles.militaryName}>{entry.name}</div>
                    <div className={styles.militaryAddress}>
                      {entry.wallet_address.slice(0, 6)}...{entry.wallet_address.slice(-4)}
                    </div>
                  </div>
                </div>
                <div className={styles.militaryStats}>
                  <div className={styles.militaryStat}>
                    <FaCrosshairs />
                    <span>Lv. {entry.level}</span>
                  </div>
                  <div className={styles.militaryStat}>
                    <FaStar />
                    <span>{entry.gold.toLocaleString()} Gold</span>
                  </div>
                </div>
                <div className={styles.militaryShare}>
                  <button
                    className={styles.militaryShareButton}
                    onClick={() => handleShare(entry)}
                    title="Share on X"
                  >
                    <FaShareAlt />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3">
          <Button variant="secondary" onClick={() => toggleModal("leaderboard")} className={`${styles.glowButton} ${styles.militaryCloseButton}`}>Close</Button>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && selectedEntry && (
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
              <KaitoAdventureShareCard
                username={selectedEntry.name || 'Anonymous'}
                rank={leaderboardData.findIndex(e => e.wallet_address === selectedEntry.wallet_address) + 1}
                points={selectedEntry.gold}
                timeFrame="All Time"
                leaderboardUrl="https://sempaihq.com/kaito-adventure"
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
    </>
  );
};

export default LeaderboardModal;