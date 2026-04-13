import React from 'react';
import BenefactorBadge from './BenefactorBadge';
import { useBenefactorStatus } from '../hooks/useBenefactorStatus';
import styles from './UserDisplay.module.css';

const UserDisplay = ({ 
  userId, 
  username, 
  userImage, 
  size = 'small', 
  showBadge = true, 
  showLabel = false,
  badgeSize = 'small',
  className = '',
  onClick = null 
}) => {
  const { isBenefactor, benefactorLevel, loading } = useBenefactorStatus(userId);

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <div 
      className={`${styles.userDisplay} ${className} ${onClick ? styles.clickable : ''}`}
      onClick={handleClick}
    >
      {/* User Avatar */}
      {userImage && (
        <img 
          src={userImage} 
          alt={username || 'User'} 
          className={`${styles.avatar} ${styles[size]}`}
        />
      )}
      
      {/* Username */}
      <span className={`${styles.username} ${styles[size]}`}>
        {username || 'Anonymous'}
      </span>
      
      {/* Benefactor Badge */}
      {showBadge && !loading && isBenefactor && (
        <BenefactorBadge 
          level={benefactorLevel} 
          size={badgeSize}
          showLabel={showLabel}
        />
      )}
      
      {/* Loading placeholder */}
      {showBadge && loading && (
        <div className={`${styles.badgePlaceholder} ${styles[badgeSize]}`}></div>
      )}
    </div>
  );
};

// Inline version for tight spaces (like chat messages)
export const InlineUserDisplay = ({ 
  userId, 
  username, 
  showBadge = true,
  onClick = null 
}) => {
  const { isBenefactor, benefactorLevel, loading } = useBenefactorStatus(userId);

  return (
    <span 
      className={`${styles.inlineUserDisplay} ${onClick ? styles.clickable : ''}`}
      onClick={onClick}
    >
      {username || 'Anonymous'}
      
      {showBadge && !loading && isBenefactor && (
        <BenefactorBadge 
          level={benefactorLevel} 
          size="tiny"
          className={styles.inlineBadge}
        />
      )}
    </span>
  );
};

export default UserDisplay;
