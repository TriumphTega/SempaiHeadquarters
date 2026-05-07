/**
 * PoRP Status Indicator - Premium animated status with stunning UI
 */

import React, { useState, useEffect } from 'react';
import { FaBook, FaCheckCircle, FaExclamationTriangle, FaClock, FaChartLine, FaShieldAlt, FaGem, FaEye, FaTimes } from 'react-icons/fa';

export default function PoRPStatus({ isActive, receipt, onDismiss }) {
  const [showDetails, setShowDetails] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [userStats, setUserStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Function to toggle details view
  const toggleDetails = async () => {
    if (!showDetails && !userStats) {
      setLoadingStats(true);
      try {
        // Mock user stats for now
        const mockStats = {
          totalScore: 1250,
          tier: 'scholar',
          level: 12,
          readingSessions: 47,
          avgEntropyScore: 0.72,
          currentStreak: 7,
          withdrawalLimits: { daily: 1000, cooldown: 6 },
          withdrawalUsedToday: 250
        };
        setUserStats(mockStats);
      } catch (error) {
        console.error('[PoRPStatus] Error loading stats:', error);
      } finally {
        setLoadingStats(false);
      }
    }
    setShowDetails(!showDetails);
  };

  useEffect(() => {
    setMounted(true);
    let interval;
    if (isActive) {
      interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isActive && !receipt) {
    return null;
  }

  return (
    <div 
      style={{ 
        position: 'fixed', 
        bottom: '16px', 
        right: '16px',
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(12px)',
        borderRadius: showDetails ? '12px' : '8px',
        boxShadow: '0 4px 20px rgba(6, 182, 212, 0.15)',
        border: '1px solid rgba(6, 182, 212, 0.3)',
        padding: showDetails ? '16px' : '12px',
        display: 'flex',
        alignItems: showDetails ? 'flex-start' : 'center',
        gap: '12px',
        transition: 'all 0.3s ease',
        minWidth: showDetails ? '320px' : 'auto',
        maxWidth: showDetails ? '400px' : 'auto'
      }}
    >
      {/* Status icon */}
      <div style={{ position: 'relative', marginTop: showDetails ? '2px' : '0' }}>
        {isActive && (
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            borderRadius: '50%',
            animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite'
          }} />
        )}
        {receipt && (
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(34, 197, 94, 0.2)',
            borderRadius: '50%',
            animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite'
          }} />
        )}
        <div style={{ position: 'relative' }}>
          {isActive && (
            <FaClock style={{ 
              color: '#60a5fa', 
              fontSize: '14px',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }} />
          )}
          {receipt && (
            <FaCheckCircle style={{ color: '#4ade80', fontSize: '14px' }} />
          )}
        </div>
      </div>
      
      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: showDetails ? '12px' : '0' }}>
        {/* Status text */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ 
            color: '#ffffff', 
            fontSize: '14px', 
            fontWeight: '500',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            {isActive ? formatTime(timeElapsed) : 'Completed'}
          </span>
          <span style={{ 
            color: '#67e8f9', 
            fontSize: '12px',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            {isActive ? 'Reading' : 'Verified'}
          </span>
        </div>
        
        {/* Detailed stats */}
        {showDetails && (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '8px',
            borderTop: '1px solid rgba(6, 182, 212, 0.2)',
            paddingTop: '12px'
          }}>
            {loadingStats ? (
              <div style={{ textAlign: 'center', padding: '12px' }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid #60a5fa',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 8px'
                }} />
                <span style={{ color: '#9ca3af', fontSize: '12px' }}>Loading stats...</span>
              </div>
            ) : userStats ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#9ca3af', fontSize: '12px' }}>Tier</span>
                  <span style={{ 
                    color: '#f97316', 
                    fontSize: '14px', 
                    fontWeight: '600',
                    textTransform: 'capitalize'
                  }}>
                    {userStats.tier}
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#9ca3af', fontSize: '12px' }}>Score</span>
                  <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: '500' }}>
                    {userStats.totalScore.toLocaleString()}
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#9ca3af', fontSize: '12px' }}>Sessions</span>
                  <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: '500' }}>
                    {userStats.readingSessions}
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#9ca3af', fontSize: '12px' }}>Streak</span>
                  <span style={{ color: '#10b981', fontSize: '14px', fontWeight: '500' }}>
                    {userStats.currentStreak} days
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#9ca3af', fontSize: '12px' }}>Daily Limit</span>
                  <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: '500' }}>
                    ${userStats.withdrawalLimits.daily}
                  </span>
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>
      
      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
        {/* Dashboard toggle button */}
        <button
          onClick={toggleDetails}
          style={{
            color: '#60a5fa',
            fontSize: '12px',
            background: 'none',
            border: '1px solid #60a5fa',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '4px',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.target.style.color = '#ffffff';
            e.target.style.backgroundColor = '#60a5fa';
          }}
          onMouseOut={(e) => {
            e.target.style.color = '#60a5fa';
            e.target.style.backgroundColor = 'transparent';
          }}
        >
          <FaChartLine style={{ fontSize: '12px' }} />
        </button>
        
        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          style={{
            color: '#9ca3af',
            fontSize: '12px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            transition: 'color 0.2s ease'
          }}
          onMouseOver={(e) => e.target.style.color = '#ffffff'}
          onMouseOut={(e) => e.target.style.color = '#9ca3af'}
        >
          <FaTimes style={{ fontSize: '12px' }} />
        </button>
      </div>
    </div>
  );
}
