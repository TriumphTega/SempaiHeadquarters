import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { walletAddress } = params;
    console.log('[Achievements API] Fetching achievements for:', walletAddress);
    
    // Mock achievements data - in production, this would query your database
    const mockAchievements = [
      {
        id: 'firstRead',
        description: 'First chapter read',
        points: 10,
        earnedAt: '2024-01-15T10:30:00Z'
      },
      {
        id: 'streak7',
        description: '7-day reading streak',
        points: 50,
        earnedAt: '2024-01-22T14:20:00Z'
      },
      {
        id: 'speedReader',
        description: 'Read 10 chapters in one day',
        points: 100,
        earnedAt: '2024-02-01T16:45:00Z'
      },
      {
        id: 'dedicated',
        description: 'Read for 100 total hours',
        points: 300,
        earnedAt: '2024-03-10T12:00:00Z'
      }
    ];

    // Add some unearned achievements for demo
    const allAchievements = [
      ...mockAchievements,
      {
        id: 'streak30',
        description: '30-day reading streak',
        points: 200,
        earnedAt: null
      },
      {
        id: 'scholar',
        description: 'Complete 100 challenges with 80%+ accuracy',
        points: 500,
        earnedAt: null
      },
      {
        id: 'master',
        description: 'Reach Master reputation tier',
        points: 1000,
        earnedAt: null
      },
      {
        id: 'explorer',
        description: 'Read 50 different novels',
        points: 150,
        earnedAt: null
      }
    ];

    console.log('[Achievements API] Achievements data prepared:', allAchievements.length, 'achievements');
    
    return NextResponse.json(allAchievements);
    
  } catch (error) {
    console.error('[Achievements API] Error fetching achievements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch achievements' },
      { status: 500 }
    );
  }
}
