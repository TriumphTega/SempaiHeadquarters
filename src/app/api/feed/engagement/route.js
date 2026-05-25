import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(request) {
  try {
    const { userId, postId, engagementType } = await request.json();

    if (!userId || !postId || !engagementType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['like', 'comment', 'view', 'share'].includes(engagementType)) {
      return NextResponse.json({ error: 'Invalid engagement type' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Track engagement
    const { error } = await supabase
      .from('feed_user_engagement')
      .insert({
        user_id: userId,
        post_id: postId,
        engagement_type: engagementType,
      }, {
        onConflict: 'user_id,post_id,engagement_type'
      });

    if (error && error.code !== '23505') { // Ignore duplicate key error
      throw error;
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error tracking engagement:', error);
    return NextResponse.json({ error: 'Failed to track engagement' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const postId = searchParams.get('postId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let query = supabase
      .from('feed_user_engagement')
      .select('*')
      .eq('user_id', userId);

    if (postId) {
      query = query.eq('post_id', postId);
    }

    const { data: engagements, error } = await query;

    if (error) throw error;

    return NextResponse.json({ engagements }, { status: 200 });
  } catch (error) {
    console.error('Error fetching engagements:', error);
    return NextResponse.json({ error: 'Failed to fetch engagements' }, { status: 500 });
  }
}
