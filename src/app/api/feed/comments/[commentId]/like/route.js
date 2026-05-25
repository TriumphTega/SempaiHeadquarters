import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(request, { params }) {
  try {
    const { userId } = await request.json();
    const { commentId } = await params;

    if (!userId || !commentId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if user already liked the comment
    const { data: existingLike } = await supabase
      .from('feed_comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .single();

    if (existingLike) {
      // Unlike the comment
      await supabase
        .from('feed_comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', userId);

      // Decrement likes count
      await supabase.rpc('decrement_comment_likes', { comment_id: commentId });

      return NextResponse.json({ liked: false }, { status: 200 });
    } else {
      // Like the comment
      await supabase
        .from('feed_comment_likes')
        .insert({
          comment_id: commentId,
          user_id: userId,
        });

      // Increment likes count
      await supabase.rpc('increment_comment_likes', { comment_id: commentId });

      return NextResponse.json({ liked: true }, { status: 200 });
    }
  } catch (error) {
    console.error('Error toggling comment like:', error);
    return NextResponse.json({ error: 'Failed to toggle like' }, { status: 500 });
  }
}
