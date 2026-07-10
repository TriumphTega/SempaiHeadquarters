import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 50;

    console.log('[Reading Leaderboard API] Fetching reading leaderboard with limit:', limit);

    // Query users table for reading leaderboard (pages_read)
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('wallet_address, name, image_url, pages_read')
      .order('pages_read', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (usersError) {
      console.error('[Reading Leaderboard API] Error fetching users:', usersError);
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard data', details: usersError.message },
        { status: 500 }
      );
    }

    if (!usersData || usersData.length === 0) {
      console.log('[Reading Leaderboard API] No users found');
      return NextResponse.json([]);
    }

    // Transform data to match expected format
    const leaderboard = usersData
      .filter(user => user.wallet_address)
      .map((user, index) => ({
        wallet_address: user.wallet_address,
        name: user.name || 'Anonymous',
        image_url: user.image_url,
        pages_read: user.pages_read || 0,
        rank: index + 1
      }));

    console.log('[Reading Leaderboard API] Successfully prepared', leaderboard.length, 'entries');

    return NextResponse.json(leaderboard);

  } catch (error) {
    console.error('[Reading Leaderboard API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
