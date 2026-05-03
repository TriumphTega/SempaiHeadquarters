import React, { useState, useEffect } from 'react';
import { FaTrophy, FaMedal, FaStar, FaChartLine, FaFire, FaUsers, FaBook, FaBrain, FaClock } from 'react-icons/fa';

const SocialFeatures = ({ userAddress, userStats, onClose }) => {
  const [activeTab, setActiveTab] = useState('leaderboard');
  const [leaderboard, setLeaderboard] = useState([]);
  const [userAchievements, setUserAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSocialData();
  }, [userAddress]);

  const loadSocialData = async () => {
    try {
      setLoading(true);
      
      // Load leaderboard data
      const leaderboardResponse = await fetch('/api/porp/leaderboard');
      const leaderboardData = await leaderboardResponse.json();
      setLeaderboard(leaderboardData);

      // Load user achievements
      const achievementsResponse = await fetch(`/api/porp/achievements/${userAddress}`);
      const achievementsData = await achievementsResponse.json();
      setUserAchievements(achievementsData);

    } catch (error) {
      console.error('[SocialFeatures] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <FaTrophy className="text-yellow-400" size={20} />;
    if (rank === 2) return <FaMedal className="text-gray-300" size={20} />;
    if (rank === 3) return <FaMedal className="text-orange-400" size={20} />;
    return <span className="text-gray-400 font-bold">#{rank}</span>;
  };

  const getTierColor = (tier) => {
    const colors = {
      'master': 'text-purple-400 bg-purple-400/10 border-purple-400/30',
      'scholar': 'text-blue-400 bg-blue-400/10 border-blue-400/30',
      'reader': 'text-green-400 bg-green-400/10 border-green-400/30',
      'seed': 'text-gray-400 bg-gray-400/10 border-gray-400/30'
    };
    return colors[tier] || colors.seed;
  };

  const getAchievementIcon = (achievementId) => {
    const icons = {
      'firstRead': <FaBook className="text-blue-400" />,
      'streak7': <FaFire className="text-orange-400" />,
      'streak30': <FaFire className="text-red-400" />,
      'speedReader': <FaClock className="text-green-400" />,
      'scholar': <FaBrain className="text-purple-400" />,
      'master': <FaTrophy className="text-yellow-400" />,
      'dedicated': <FaStar className="text-yellow-400" />,
      'explorer': <FaUsers className="text-blue-400" />
    };
    return icons[achievementId] || <FaStar className="text-gray-400" />;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center z-50">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-400 border-t-transparent mx-auto mb-4"></div>
          <p>Loading social features...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center z-50">
      <div className="bg-gray-900/95 rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden border border-orange-400/20">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <FaUsers className="text-orange-400" />
            PoRP Social Hub
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`pb-2 px-4 transition-colors ${
              activeTab === 'leaderboard'
                ? 'text-orange-400 border-b-2 border-orange-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FaTrophy className="inline mr-2" />
            Leaderboard
          </button>
          <button
            onClick={() => setActiveTab('achievements')}
            className={`pb-2 px-4 transition-colors ${
              activeTab === 'achievements'
                ? 'text-orange-400 border-b-2 border-orange-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FaMedal className="inline mr-2" />
            Achievements
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-2 px-4 transition-colors ${
              activeTab === 'profile'
                ? 'text-orange-400 border-b-2 border-orange-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FaChartLine className="inline mr-2" />
            Your Stats
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[60vh]">
          {activeTab === 'leaderboard' && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Global Rankings</h3>
              <div className="space-y-3">
                {leaderboard.map((user, index) => (
                  <div
                    key={user.walletAddress}
                    className={`flex items-center justify-between p-4 rounded-lg bg-gray-800/50 border ${
                      user.walletAddress === userAddress
                        ? 'border-orange-400/50 bg-orange-400/5'
                        : 'border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 flex items-center justify-center">
                        {getRankIcon(index + 1)}
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {user.walletAddress === userAddress ? 'You' : 
                           `${user.walletAddress.slice(0, 4)}...${user.walletAddress.slice(-4)}`}
                        </p>
                        <p className="text-gray-400 text-sm">Level {user.level}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">{user.score.toLocaleString()}</p>
                      <p className={`text-xs px-2 py-1 rounded-full border ${getTierColor(user.tier)}`}>
                        {user.tier}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'achievements' && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Your Achievements</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {userAchievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center hover:border-orange-400/50 transition-colors"
                  >
                    <div className="text-3xl mb-2 flex justify-center">
                      {getAchievementIcon(achievement.id)}
                    </div>
                    <h4 className="text-white font-medium text-sm">{achievement.description}</h4>
                    <p className="text-orange-400 text-xs mt-1">+{achievement.points} pts</p>
                    {achievement.earnedAt && (
                      <p className="text-gray-500 text-xs mt-2">
                        {new Date(achievement.earnedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Your Reading Profile</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Stats Overview */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                    <FaChartLine className="text-orange-400" />
                    Reading Statistics
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Score</span>
                      <span className="text-white font-bold">{userStats.totalScore?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Current Tier</span>
                      <span className={`text-xs px-2 py-1 rounded-full border ${getTierColor(userStats.tier)}`}>
                        {userStats.tier || 'seed'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Reading Streak</span>
                      <span className="text-orange-400 font-bold">{userStats.currentStreak || 0} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Chapters Read</span>
                      <span className="text-white">{userStats.totalChaptersRead || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Avg. Session</span>
                      <span className="text-white">{Math.round((userStats.avgSessionTime || 0) / 60000)} min</span>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                    <FaBrain className="text-purple-400" />
                    Performance Metrics
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Comprehension Rate</span>
                      <span className="text-white">{Math.round((userStats.comprehensionRate || 0) * 100)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Challenges Completed</span>
                      <span className="text-white">{userStats.totalChallengesCompleted || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Quality Rating</span>
                      <span className="text-white font-bold">{userStats.qualityRating || 'C'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Reading Speed</span>
                      <span className="text-white">{Math.round(userStats.avgWordsPerMinute || 0)} wpm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Focus Score</span>
                      <span className="text-white">{Math.round((userStats.avgFocusScore || 0) * 100)}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="mt-6 bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3">Recent Activity</h4>
                <div className="space-y-2">
                  {userStats.recentActivity?.slice(0, 5).map((activity, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">{activity.description}</span>
                      <span className="text-gray-500">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  )) || (
                    <p className="text-gray-500 text-center">No recent activity</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SocialFeatures;
