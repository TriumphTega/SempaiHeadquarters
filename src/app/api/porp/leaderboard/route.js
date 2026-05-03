import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('[Leaderboard API] Fetching global leaderboard');
    
    // Mock leaderboard data - in production, this would query your database
    const mockLeaderboard = [
      {
        walletAddress: 'A6jwr4omFrFhLKrjc2fi9djmt6kay2iKt4oQytNKaBsN',
        score: 1250,
        tier: 'scholar',
        level: 12,
        rank: 1
      },
      {
        walletAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        score: 980,
        tier: 'reader',
        level: 9,
        rank: 2
      },
      {
        walletAddress: '5KQwrPbwdL6PhXujxW37FSSQyJ1q1A1b3oQ6BhJxL7y',
        score: 750,
        tier: 'reader',
        level: 7,
        rank: 3
      },
      {
        walletAddress: '7xKXtg2CW87d97TXJSDpbD5jBTk8ynL7AhGn9sQTYB2',
        score: 520,
        tier: 'seed',
        level: 5,
        rank: 4
      },
      {
        walletAddress: '3Z9zJrAXdYyJjWzCtGxRqBvLmNpKsQhTd8FvG7nH2kL',
        score: 350,
        tier: 'seed',
        level: 3,
        rank: 5
      },
      {
        walletAddress: '8FgHjK2LmNpQrStUvWxYzAbCdEfGhIjKlMnOpQrStUv',
        score: 280,
        tier: 'seed',
        level: 2,
        rank: 6
      },
      {
        walletAddress: '2HjKlMnOpQrStUvWxYzAbCdEfGhIjKlMnOpQrStUvW',
        score: 150,
        tier: 'seed',
        level: 1,
        rank: 7
      },
      {
        walletAddress: '6GhIjKlMnOpQrStUvWxYzAbCdEfGhIjKlMnOpQrStU',
        score: 120,
        tier: 'seed',
        level: 1,
        rank: 8
      },
      {
        walletAddress: '4LmNoPqRsTuVwXyZaBcDeFgHiJkLmNoPqRsTuVwXy',
        score: 95,
        tier: 'seed',
        level: 0,
        rank: 9
      },
      {
        walletAddress: '9OpQrStUvWxYzAbCdEfGhIjKlMnOpQrStUvWxYzA',
        score: 75,
        tier: 'seed',
        level: 0,
        rank: 10
      }
    ];

    console.log('[Leaderboard API] Leaderboard data prepared:', mockLeaderboard.length, 'entries');
    
    return NextResponse.json(mockLeaderboard);
    
  } catch (error) {
    console.error('[Leaderboard API] Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
