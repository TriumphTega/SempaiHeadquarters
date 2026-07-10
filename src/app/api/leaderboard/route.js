import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 50;

    console.log('[Leaderboard API] Fetching leaderboard with limit:', limit);

    // Query users and their weekly_points/balance
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, email, wallet_address, weekly_points, amethyst_count, balance")
      .or("weekly_points.gt.0,balance.gt.0")
      .order("weekly_points", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (usersError) {
      console.error('[Leaderboard API] Error fetching users:', usersError);
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard data', details: usersError.message },
        { status: 500 }
      );
    }

    if (!users || users.length === 0) {
      console.log('[Leaderboard API] No users found');
      return NextResponse.json([]);
    }

    // Get unlocked chapters count and cached Amethyst balances for each user
    const data = await Promise.all(
      (users || []).map(async (user) => {
        // Count unlocked story chapters
        const { data: storyChapters } = await supabase
          .from("unlocked_story_chapters")
          .select("chapters_unlocked_count")
          .eq("user_id", user.id);

        // Count unlocked manga chapters  
        const { data: mangaChapters } = await supabase
          .from("unlocked_manga_chapters")
          .select("id")
          .eq("user_id", user.id);

        const storyCount = storyChapters?.reduce((sum, chapter) => sum + (chapter.chapters_unlocked_count || 1), 0) || 0;
        const mangaCount = mangaChapters?.length || 0;
        const totalUnlockedChapters = storyCount + mangaCount;

        // Get cached Amethyst balance from database
        const { data: amethystData } = await supabase
          .from("amethyst_balances")
          .select("amethyst_balance")
          .eq("user_id", user.id)
          .single();

        const cachedAmethystBalance = Number(amethystData?.amethyst_balance) || 0;

        return {
          ...user,
          total_points_read: totalUnlockedChapters,
          cached_amethyst_balance: cachedAmethystBalance
        };
      })
    );

    // Process readers with Amethyst multiplier using cached balances
    const processedReaders = (data || []).map(user => {
      const weeklyPoints = Number(user.weekly_points) || 0;
      const totalChaptersUnlocked = Number(user.total_points_read) || 0;
      const amethystCount = Number(user.cached_amethyst_balance) || 0;
      
      const basePoints = weeklyPoints > 0 ? weeklyPoints : (Number(user.balance) || 0);
      
      let amethystBonus = 0;
      
      if (amethystCount >= 5000000) amethystBonus = 250;
      else if (amethystCount >= 1000000) amethystBonus = 200;
      else if (amethystCount >= 500000) amethystBonus = 170;
      else if (amethystCount >= 250000) amethystBonus = 150;
      else if (amethystCount >= 100000) amethystBonus = 120;
      
      const effectivePoints = basePoints + amethystBonus;
      
      return {
        wallet_address: user.wallet_address,
        name: user.email ? user.email.split('@')[0] : 'Anonymous',
        points: effectivePoints,
        weekly_points: weeklyPoints,
        amethyst_count: amethystCount,
        pages_read: totalChaptersUnlocked,
        rank: 0
      };
    });

    // Assign ranks
    processedReaders.sort((a, b) => b.points - a.points);
    processedReaders.forEach((reader, index) => {
      reader.rank = index + 1;
    });

    console.log('[Leaderboard API] Successfully prepared', processedReaders.length, 'entries');

    return NextResponse.json(processedReaders);

  } catch (error) {
    console.error('[Leaderboard API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
