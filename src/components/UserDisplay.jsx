import React from 'react';
import BenefactorBadge from './BenefactorBadge';
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
      
      {/* Benefactor Badge - TODO: Add benefactor status check */}
      {showBadge && (
        <BenefactorBadge 
          level="bronze" 
          size={badgeSize}
          showLabel={showLabel}
        />
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
  return (
    <span 
      className={`${styles.inlineUserDisplay} ${onClick ? styles.clickable : ''}`}
      onClick={onClick}
    >
      {username || 'Anonymous'}
      
      {/* Benefactor Badge - TODO: Add benefactor status check */}
      {showBadge && (
        <BenefactorBadge 
          level="bronze" 
          size="tiny"
          className={styles.inlineBadge}
        />
      )}
    </span>
  );
};

export default UserDisplay;
