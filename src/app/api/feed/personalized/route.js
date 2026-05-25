import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Call the personalized feed function
    const { data: posts, error } = await supabase
      .rpc('get_personalized_feed', {
        p_user_id: userId,
        p_limit: limit,
        p_offset: offset
      });

    if (error) throw error;

    // Format the response to match the expected structure
    const formattedPosts = posts.map(post => ({
      id: post.post_id,
      user_id: post.user_id,
      content: post.content,
      likes_count: post.likes_count,
      comments_count: post.comments_count,
      created_at: post.created_at,
      score: post.score,
      user: {
        id: post.user_id,
        name: post.user_name,
        wallet_address: post.user_wallet_address
      }
    }));

    return NextResponse.json({ posts: formattedPosts }, { status: 200 });
  } catch (error) {
    console.error('Error fetching personalized feed:', error);
    return NextResponse.json({ error: 'Failed to fetch personalized feed' }, { status: 500 });
  }
}
