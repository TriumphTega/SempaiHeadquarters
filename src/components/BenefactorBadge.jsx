import React from 'react';
import { FaCrown, FaGem, FaStar, FaMedal } from 'react-icons/fa';
import styles from './BenefactorBadge.module.css';

const BenefactorBadge = ({ level = 'bronze', size = 'small', showLabel = false }) => {
  const getBadgeConfig = (level) => {
    switch (level.toLowerCase()) {
      case 'platinum':
        return {
          icon: FaCrown,
          color: '#e5e4e2',
          bgColor: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
          borderColor: '#e5e4e2',
          label: 'Platinum Benefactor',
          shadow: '0 4px 15px rgba(229, 228, 226, 0.3)'
        };
      case 'gold':
        return {
          icon: FaGem,
          color: '#ffd700',
          bgColor: 'linear-gradient(135deg, #ffed4e 0%, #ffa500 100%)',
          borderColor: '#ffd700',
          label: 'Gold Benefactor',
          shadow: '0 4px 15px rgba(255, 215, 0, 0.3)'
        };
      case 'silver':
        return {
          icon: FaStar,
          color: '#c0c0c0',
          bgColor: 'linear-gradient(135deg, #e8e8e8 0%, #b8b8b8 100%)',
          borderColor: '#c0c0c0',
          label: 'Silver Benefactor',
          shadow: '0 4px 15px rgba(192, 192, 192, 0.3)'
        };
      case 'bronze':
      default:
        return {
          icon: FaMedal,
          color: '#cd7f32',
          bgColor: 'linear-gradient(135deg, #d4a574 0%, #8b4513 100%)',
          borderColor: '#cd7f32',
          label: 'Bronze Benefactor',
          shadow: '0 4px 15px rgba(205, 127, 50, 0.3)'
        };
    }
  };

  const getSizeClass = (size) => {
    switch (size) {
      case 'tiny':
        return styles.tiny;
      case 'small':
        return styles.small;
      case 'medium':
        return styles.medium;
      case 'large':
        return styles.large;
      default:
        return styles.small;
    }
  };

  const config = getBadgeConfig(level);
  const Icon = config.icon;
  const sizeClass = getSizeClass(size);

  return (
    <div 
      className={`${styles.benefactorBadge} ${sizeClass}`}
      style={{
        background: config.bgColor,
        border: `2px solid ${config.borderColor}`,
        boxShadow: config.shadow,
        color: config.color
      }}
      title={config.label}
    >
      <Icon className={styles.icon} />
      {showLabel && (
        <span className={styles.label}>{config.label}</span>
      )}
    </div>
  );
};

export default BenefactorBadge;
