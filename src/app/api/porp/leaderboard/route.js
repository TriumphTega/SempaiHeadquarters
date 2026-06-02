import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 50;

    console.log('[Leaderboard API] Fetching Kaito Adventure leaderboard with limit:', limit);

    // Query players table for Kaito Adventure leaderboard
    const { data: playersData, error: playersError } = await supabase
      .from('players')
      .select('wallet_address, name, level, gold, xp')
      .order('gold', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (playersError) {
      console.error('[Leaderboard API] Error fetching players:', playersError);
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard data', details: playersError.message },
        { status: 500 }
      );
    }

    if (!playersData || playersData.length === 0) {
      console.log('[Leaderboard API] No players found');
      return NextResponse.json([]);
    }

    // Transform data to match expected format
    const leaderboard = playersData
      .filter(player => player.wallet_address)
      .map((player, index) => ({
        walletAddress: player.wallet_address,
        name: player.name || 'Anonymous',
        score: player.gold || 0,
        tier: 'player',
        level: player.level || 1,
        rank: index + 1
      }));

    console.log('[Leaderboard API] Successfully prepared', leaderboard.length, 'entries');

    return NextResponse.json(leaderboard);

  } catch (error) {
    console.error('[Leaderboard API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
