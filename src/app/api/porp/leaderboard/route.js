import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    console.log('[Leaderboard API] Fetching global leaderboard');

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 50;

    // Query weekly_leaderboard and join with users to get names
    const { data: leaderboardData, error } = await supabase
      .from('weekly_leaderboard')
      .select(`
        user_id,
        weekly_points,
        effective_points,
        rank,
        users (
          name,
          wallet_address
        )
      `)
      .order('effective_points', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[Leaderboard API] Database error:', error);
      throw error;
    }

    // Transform data to match expected format
    const leaderboard = leaderboardData.map((entry, index) => ({
      walletAddress: entry.users?.wallet_address || '',
      name: entry.users?.name || 'Anonymous',
      score: entry.effective_points || entry.weekly_points || 0,
      tier: 'reader', // Default tier since it's not in weekly_leaderboard
      level: 1, // Default level since it's not in weekly_leaderboard
      rank: entry.rank || index + 1
    }));

    console.log('[Leaderboard API] Leaderboard data prepared:', leaderboard.length, 'entries');

    return NextResponse.json(leaderboard);

  } catch (error) {
    console.error('[Leaderboard API] Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
