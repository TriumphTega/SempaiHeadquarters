import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { walletAddress } = params;
    console.log('[UserStats API] Fetching stats for:', walletAddress);
    
    // Mock comprehensive user stats - in production, this would query your database
    const mockUserStats = {
      walletAddress,
      totalScore: 1250,
      tier: 'scholar',
      level: 12,
      qualityRating: 'A',
      bestQualityRating: 'S',
      
      // Reading statistics
      totalChaptersRead: 47,
      totalReadingTime: 36000000, // 10 hours in ms
      avgSessionTime: 300000, // 5 minutes
      avgWordsPerMinute: 250,
      avgFocusScore: 0.85,
      avgEntropyScore: 0.72,
      avgEngagementRate: 0.78,
      sessionConsistency: 0.82,
      uniqueNovelsRead: 8,
      
      // Streak and activity
      currentStreak: 7,
      bestStreak: 15,
      lastReadDate: new Date().toISOString(),
      readingDays: Array.from({ length: 7 }, (_, i) => 
        new Date(Date.now() - i * 24 * 60 * 60 * 1000).toDateString()
      ),
      
      // Challenge statistics
      totalChallengesCompleted: 23,
      challengeSuccessRate: 0.87,
      avgChallengeScore: 0.82,
      challengeStreak: 5,
      bestChallengeStreak: 12,
      currentDifficulty: 'advanced',
      totalQuestionsAnswered: 115,
      accuracyRate: 0.82,
      adaptiveDifficulty: 0.65,
      improvementRate: 0.15,
      
      // Withdrawal information
      withdrawalLimits: {
        daily: 1000,
        cooldown: 6
      },
      withdrawalUsedToday: 250,
      withdrawalHistory: [
        {
          amount: 50,
          token: 'SMP',
          amountUSD: 0.60,
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          amount: 0.1,
          token: 'SOL',
          amountUSD: 15.00,
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        },
        {
          amount: 100,
          token: 'USDC',
          amountUSD: 100.00,
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        }
      ],
      
      // Recent activity
      recentActivity: [
        {
          description: 'Completed chapter 5 of "Novel Title"',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          type: 'reading',
          score: 85
        },
        {
          description: 'Answered comprehension challenge correctly',
          timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          type: 'challenge',
          score: 90
        },
        {
          description: 'Unlocked new achievement: "Speed Reader"',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          type: 'achievement',
          score: 100
        },
        {
          description: 'Completed chapter 4 of "Another Novel"',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          type: 'reading',
          score: 78
        },
        {
          description: 'Maintained 7-day reading streak',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          type: 'streak',
          score: 50
        }
      ],
      
      // Recent challenges
      recentChallenges: [
        {
          novelTitle: 'Novel Title',
          chapterNumber: 5,
          score: 90,
          passed: true,
          difficulty: 'advanced',
          timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString()
        },
        {
          novelTitle: 'Another Novel',
          chapterNumber: 3,
          score: 75,
          passed: true,
          difficulty: 'intermediate',
          timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
        },
        {
          novelTitle: 'Third Novel',
          chapterNumber: 7,
          score: 60,
          passed: false,
          difficulty: 'advanced',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
        },
        {
          novelTitle: 'Novel Title',
          chapterNumber: 4,
          score: 85,
          passed: true,
          difficulty: 'intermediate',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        },
        {
          novelTitle: 'Another Novel',
          chapterNumber: 2,
          score: 95,
          passed: true,
          difficulty: 'basic',
          timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
        }
      ],
      
      // Achievements earned
      achievements: [
        'firstRead',
        'streak7',
        'speedReader',
        'dedicated'
      ],
      
      // Progress metrics
      progressMetrics: {
        weeklyProgress: 85,
        monthlyProgress: 72,
        yearlyProgress: 68,
        consistencyScore: 0.82,
        improvementRate: 0.15,
        engagementTrend: 'increasing'
      }
    };

    console.log('[UserStats API] User stats prepared for:', walletAddress);
    
    return NextResponse.json(mockUserStats);
    
  } catch (error) {
    console.error('[UserStats API] Error fetching user stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user stats' },
      { status: 500 }
    );
  }
}
