import React, { useState, useEffect } from 'react';
import { FaChartLine, FaBrain, FaShieldAlt, FaTrophy, FaBook, FaFire, FaStar, FaClock, FaUsers, FaCog } from 'react-icons/fa';
import SocialFeatures from './SocialFeatures.jsx';

const PoRPDashboard = ({ userAddress, isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState('overview');
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSocial, setShowSocial] = useState(false);

  useEffect(() => {
    if (isOpen && userAddress) {
      loadUserStats();
    }
  }, [isOpen, userAddress]);

  const loadUserStats = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/porp/user-stats/${userAddress}`);
      const stats = await response.json();
      setUserStats(stats);
      
    } catch (error) {
      console.error('[PoRPDashboard] Error loading user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTierProgress = () => {
    if (!userStats) return 0;
    
    const tiers = {
      seed: { min: 0, max: 100 },
      reader: { min: 100, max: 500 },
      scholar: { min: 500, max: 1000 },
      master: { min: 1000, max: Infinity }
    };
    
    const currentTier = userStats.tier || 'seed';
    const nextTier = currentTier === 'master' ? 'master' : 
                   Object.keys(tiers)[Object.keys(tiers).indexOf(currentTier) + 1];
    
    if (nextTier === 'master') return 100;
    
    const currentMin = tiers[currentTier].min;
    const nextMin = tiers[nextTier].min;
    const progress = ((userStats.totalScore - currentMin) / (nextMin - currentMin)) * 100;
    
    return Math.min(Math.max(progress, 0), 100);
  };

  const getNextTierRequirement = () => {
    if (!userStats) return null;
    
    const tiers = {
      seed: { min: 0, max: 100 },
      reader: { min: 100, max: 500 },
      scholar: { min: 500, max: 1000 },
      master: { min: 1000, max: Infinity }
    };
    
    const currentTier = userStats.tier || 'seed';
    const nextTier = currentTier === 'master' ? null : 
                   Object.keys(tiers)[Object.keys(tiers).indexOf(currentTier) + 1];
    
    return nextTier ? tiers[nextTier].min : null;
  };

  const getQualityColor = (rating) => {
    const colors = {
      'S': 'text-purple-400 bg-purple-400/10 border-purple-400/30',
      'A': 'text-green-400 bg-green-400/10 border-green-400/30',
      'B': 'text-blue-400 bg-blue-400/10 border-blue-400/30',
      'C': 'text-gray-400 bg-gray-400/10 border-gray-400/30',
      'D': 'text-orange-400 bg-orange-400/10 border-orange-400/30',
      'F': 'text-red-400 bg-red-400/10 border-red-400/30'
    };
    return colors[rating] || colors.C;
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center z-50">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-400 border-t-transparent mx-auto mb-4"></div>
          <p>Loading PoRP Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center z-50">
      <div className="bg-gray-900/95 rounded-2xl p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden border border-orange-400/20">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <FaChartLine className="text-orange-400" />
            PoRP Dashboard
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSocial(true)}
              className="px-4 py-2 bg-orange-400/20 text-orange-400 rounded-lg hover:bg-orange-400/30 transition-colors flex items-center gap-2"
            >
              <FaUsers />
              Social Hub
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-4 mb-6 border-b border-gray-700">
          <button
            onClick={() => setActiveSection('overview')}
            className={`pb-2 px-4 transition-colors ${
              activeSection === 'overview'
                ? 'text-orange-400 border-b-2 border-orange-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FaChartLine className="inline mr-2" />
            Overview
          </button>
          <button
            onClick={() => setActiveSection('reading')}
            className={`pb-2 px-4 transition-colors ${
              activeSection === 'reading'
                ? 'text-orange-400 border-b-2 border-orange-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FaBook className="inline mr-2" />
            Reading
          </button>
          <button
            onClick={() => setActiveSection('challenges')}
            className={`pb-2 px-4 transition-colors ${
              activeSection === 'challenges'
                ? 'text-orange-400 border-b-2 border-orange-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FaBrain className="inline mr-2" />
            Challenges
          </button>
          <button
            onClick={() => setActiveSection('withdrawal')}
            className={`pb-2 px-4 transition-colors ${
              activeSection === 'withdrawal'
                ? 'text-orange-400 border-b-2 border-orange-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FaShieldAlt className="inline mr-2" />
            Withdrawal
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[60vh]">
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* Tier Progress */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Reputation Progress</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium capitalize">{userStats?.tier || 'seed'} Tier</p>
                      <p className="text-gray-400 text-sm">Score: {userStats?.totalScore?.toLocaleString() || 0}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-orange-400 font-bold">Level {userStats?.level || 0}</p>
                      <p className="text-gray-400 text-xs">Next: {getNextTierRequirement() || 'MAX'}</p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-orange-400 to-orange-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${getTierProgress()}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
                  <FaFire className="text-orange-400 text-2xl mx-auto mb-2" />
                  <p className="text-white font-bold">{userStats?.currentStreak || 0}</p>
                  <p className="text-gray-400 text-xs">Day Streak</p>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
                  <FaBook className="text-blue-400 text-2xl mx-auto mb-2" />
                  <p className="text-white font-bold">{userStats?.totalChaptersRead || 0}</p>
                  <p className="text-gray-400 text-xs">Chapters Read</p>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
                  <FaBrain className="text-purple-400 text-2xl mx-auto mb-2" />
                  <p className="text-white font-bold">{userStats?.totalChallengesCompleted || 0}</p>
                  <p className="text-gray-400 text-xs">Challenges</p>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
                  <FaStar className="text-yellow-400 text-2xl mx-auto mb-2" />
                  <p className="text-white font-bold">{userStats?.qualityRating || 'C'}</p>
                  <p className="text-gray-400 text-xs">Quality</p>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
                <div className="space-y-2">
                  {userStats?.recentActivity?.slice(0, 5).map((activity, index) => (
                    <div key={index} className="flex items-center justify-between text-sm p-2 bg-gray-700/30 rounded">
                      <span className="text-gray-300">{activity.description}</span>
                      <span className="text-gray-500">
                        {new Date(activity.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  )) || (
                    <p className="text-gray-500 text-center">No recent activity</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'reading' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Reading Stats */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <FaBook className="text-blue-400" />
                    Reading Statistics
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Reading Time</span>
                      <span className="text-white font-medium">
                        {Math.round((userStats?.totalReadingTime || 0) / 3600000)}h {Math.round(((userStats?.totalReadingTime || 0) % 3600000) / 60000)}m
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Average Session</span>
                      <span className="text-white font-medium">
                        {Math.round((userStats?.avgSessionTime || 0) / 60000)} min
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Reading Speed</span>
                      <span className="text-white font-medium">
                        {Math.round(userStats?.avgWordsPerMinute || 0)} wpm
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Focus Score</span>
                      <span className="text-white font-medium">
                        {Math.round((userStats?.avgFocusScore || 0) * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Novels Started</span>
                      <span className="text-white font-medium">{userStats?.uniqueNovelsRead || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Quality Metrics */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <FaStar className="text-yellow-400" />
                    Quality Metrics
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Overall Quality</span>
                      <span className={`px-2 py-1 rounded-full border text-xs font-medium ${getQualityColor(userStats?.qualityRating)}`}>
                        {userStats?.qualityRating || 'C'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Avg. Entropy Score</span>
                      <span className="text-white font-medium">
                        {Math.round((userStats?.avgEntropyScore || 0) * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Engagement Rate</span>
                      <span className="text-white font-medium">
                        {Math.round((userStats?.avgEngagementRate || 0) * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Session Consistency</span>
                      <span className="text-white font-medium">
                        {Math.round((userStats?.sessionConsistency || 0) * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Best Quality Rating</span>
                      <span className={`px-2 py-1 rounded-full border text-xs font-medium ${getQualityColor(userStats?.bestQualityRating)}`}>
                        {userStats?.bestQualityRating || 'C'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reading Calendar */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Reading Calendar</h3>
                <div className="grid grid-cols-7 gap-2 text-center">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                    <div key={index} className="text-gray-500 text-xs font-medium py-2">
                      {day}
                    </div>
                  ))}
                  {/* Mock calendar data */}
                  {Array.from({ length: 35 }, (_, i) => {
                    const hasActivity = Math.random() > 0.7;
                    const intensity = hasActivity ? Math.random() : 0;
                    return (
                      <div
                        key={i}
                        className={`aspect-square rounded flex items-center justify-center text-xs ${
                          intensity > 0.7 ? 'bg-green-500/30 text-green-400' :
                          intensity > 0.4 ? 'bg-green-400/20 text-green-300' :
                          intensity > 0 ? 'bg-green-300/10 text-green-200' :
                          'bg-gray-700/30 text-gray-500'
                        }`}
                      >
                        {i + 1}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'challenges' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Challenge Stats */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <FaBrain className="text-purple-400" />
                    Challenge Performance
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Completed</span>
                      <span className="text-white font-medium">{userStats?.totalChallengesCompleted || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Success Rate</span>
                      <span className="text-white font-medium">
                        {Math.round((userStats?.challengeSuccessRate || 0) * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Average Score</span>
                      <span className="text-white font-medium">
                        {Math.round((userStats?.avgChallengeScore || 0) * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Current Streak</span>
                      <span className="text-white font-medium">{userStats?.challengeStreak || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Best Streak</span>
                      <span className="text-white font-medium">{userStats?.bestChallengeStreak || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Difficulty Progress */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <FaChartLine className="text-orange-400" />
                    Difficulty Progress
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Current Level</span>
                      <span className="text-white font-medium capitalize">
                        {userStats?.currentDifficulty || 'intermediate'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Questions Answered</span>
                      <span className="text-white font-medium">{userStats?.totalQuestionsAnswered || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Accuracy Rate</span>
                      <span className="text-white font-medium">
                        {Math.round((userStats?.accuracyRate || 0) * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Adaptive Score</span>
                      <span className="text-white font-medium">
                        {Math.round((userStats?.adaptiveDifficulty || 0.5) * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Improvement Rate</span>
                      <span className="text-white font-medium">
                        {Math.round((userStats?.improvementRate || 0) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Challenges */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Recent Challenges</h3>
                <div className="space-y-2">
                  {userStats?.recentChallenges?.slice(0, 5).map((challenge, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-700/30 rounded">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          challenge.passed ? 'bg-green-400' : 'bg-red-400'
                        }`} />
                        <div>
                          <p className="text-white text-sm">{challenge.novelTitle}</p>
                          <p className="text-gray-400 text-xs">Chapter {challenge.chapterNumber}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-medium">{challenge.score}%</p>
                        <p className="text-gray-500 text-xs">
                          {new Date(challenge.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  )) || (
                    <p className="text-gray-500 text-center">No challenges completed yet</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'withdrawal' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Withdrawal Limits */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <FaShieldAlt className="text-orange-400" />
                    Withdrawal Limits
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Current Tier</span>
                      <span className="text-white font-medium capitalize">{userStats?.tier || 'seed'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Daily Limit</span>
                      <span className="text-orange-400 font-medium">
                        ${userStats?.withdrawalLimits?.daily || 50}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Cooldown Period</span>
                      <span className="text-white font-medium">
                        {userStats?.withdrawalLimits?.cooldown || 24}h
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Used Today</span>
                      <span className="text-white font-medium">
                        ${userStats?.withdrawalUsedToday || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Remaining</span>
                      <span className="text-green-400 font-medium">
                        ${(userStats?.withdrawalLimits?.daily || 50) - (userStats?.withdrawalUsedToday || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Withdrawal History */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <FaClock className="text-blue-400" />
                    Withdrawal History
                  </h3>
                  <div className="space-y-2">
                    {userStats?.withdrawalHistory?.slice(0, 5).map((withdrawal, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-700/30 rounded text-sm">
                        <div>
                          <p className="text-white">{withdrawal.amount} {withdrawal.token}</p>
                          <p className="text-gray-400 text-xs">${withdrawal.amountUSD}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-400 text-xs">
                            {new Date(withdrawal.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    )) || (
                      <p className="text-gray-500 text-center">No withdrawals yet</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Tier Requirements */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Tier Requirements</h3>
                <div className="space-y-3">
                  {[
                    { tier: 'Seed', required: 0, limit: '$50', cooldown: '24h' },
                    { tier: 'Reader', required: 100, limit: '$200', cooldown: '12h' },
                    { tier: 'Scholar', required: 500, limit: '$1,000', cooldown: '6h' },
                    { tier: 'Master', required: 1000, limit: '$5,000', cooldown: '2h' }
                  ].map((tier) => (
                    <div
                      key={tier.tier}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        userStats?.tier === tier.tier.toLowerCase()
                          ? 'border-orange-400/50 bg-orange-400/5'
                          : 'border-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          userStats?.tier === tier.tier.toLowerCase()
                            ? 'bg-orange-400'
                            : (userStats?.totalScore || 0) >= tier.required
                            ? 'bg-green-400'
                            : 'bg-gray-600'
                        }`} />
                        <div>
                          <p className="text-white font-medium">{tier.tier}</p>
                          <p className="text-gray-400 text-xs">{tier.required} points required</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-orange-400 font-medium">{tier.limit}</p>
                        <p className="text-gray-400 text-xs">{tier.cooldown}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Social Features Modal */}
      {showSocial && (
        <SocialFeatures
          userAddress={userAddress}
          userStats={userStats}
          onClose={() => setShowSocial(false)}
        />
      )}
    </div>
  );
};

export default PoRPDashboard;
