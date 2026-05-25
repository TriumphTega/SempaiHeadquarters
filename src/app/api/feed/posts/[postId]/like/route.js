import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(request, { params }) {
  try {
    const { userId } = await request.json();
    const { postId } = await params;

    if (!userId || !postId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if user already liked the post
    const { data: existingLike } = await supabase
      .from('feed_post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (existingLike) {
      // Unlike the post
      await supabase
        .from('feed_post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);

      // Decrement likes count
      await supabase.rpc('decrement_post_likes', { post_id: postId });

      return NextResponse.json({ liked: false }, { status: 200 });
    } else {
      // Like the post
      await supabase
        .from('feed_post_likes')
        .insert({
          post_id: postId,
          user_id: userId,
        });

      // Increment likes count
      await supabase.rpc('increment_post_likes', { post_id: postId });

      return NextResponse.json({ liked: true }, { status: 200 });
    }
  } catch (error) {
    console.error('Error toggling post like:', error);
    return NextResponse.json({ error: 'Failed to toggle like' }, { status: 500 });
  }
}
