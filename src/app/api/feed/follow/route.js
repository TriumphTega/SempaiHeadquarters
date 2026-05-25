import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(request) {
  try {
    const { followerId, followingId } = await request.json();

    if (!followerId || !followingId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (followerId === followingId) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if already following
    const { data: existingFollow } = await supabase
      .from('feed_follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .single();

    if (existingFollow) {
      // Unfollow
      await supabase
        .from('feed_follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', followingId);

      return NextResponse.json({ following: false }, { status: 200 });
    } else {
      // Follow
      await supabase
        .from('feed_follows')
        .insert({
          follower_id: followerId,
          following_id: followingId,
        });

      return NextResponse.json({ following: true }, { status: 200 });
    }
  } catch (error) {
    console.error('Error toggling follow:', error);
    return NextResponse.json({ error: 'Failed to toggle follow' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: follows, error } = await supabase
      .from('feed_follows')
      .select(`
        following_id,
        user:following_id (
          id,
          name,
          wallet_address
        )
      `)
      .eq('follower_id', userId);

    if (error) throw error;

    return NextResponse.json({ follows }, { status: 200 });
  } catch (error) {
    console.error('Error fetching follows:', error);
    return NextResponse.json({ error: 'Failed to fetch follows' }, { status: 500 });
  }
}
