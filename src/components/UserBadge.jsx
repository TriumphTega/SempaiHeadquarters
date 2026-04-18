import React from 'react';
import styles from './UserBadge.module.css';

const UserBadge = ({ user, size = 'medium' }) => {
  if (!user || !user.is_benefactor) {
    return null;
  }

  const getBadgeImage = (level) => {
    const badges = {
      bronze: '/plan-image/Black.svg',
      blue: '/plan-image/Blue.svg',
      silver: '/plan-image/Silver.svg',
      gold: '/plan-image/Gold.svg',
      platinum: '/plan-image/Gold.svg',
    };
    return badges[level] || badges.bronze;
  };

  const getBadgeSize = (size) => {
    const sizes = {
      small: '24px',
      medium: '32px',
      large: '48px',
    };
    return sizes[size] || sizes.medium;
  };

  return (
    <div className={styles.userBadge} style={{ fontSize: getBadgeSize(size) }}>
      <img 
        src={getBadgeImage(user.benefactor_level)} 
        alt={`${user.benefactor_level} badge`}
        className={styles.badgeIcon}
      />
      <span className={styles.userName}>{user.name}</span>
    </div>
  );
};

export default UserBadge;
