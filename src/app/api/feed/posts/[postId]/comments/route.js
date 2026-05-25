import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(request, { params }) {
  try {
    const { userId, content } = await request.json();
    const { postId } = await params;

    if (!userId || !content || !postId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (content.trim().length === 0) {
      return NextResponse.json({ error: 'Content cannot be empty' }, { status: 400 });
    }

    if (content.length > 500) {
      return NextResponse.json({ error: 'Content too long (max 500 characters)' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: comment, error } = await supabase
      .from('feed_comments')
      .insert({
        post_id: postId,
        user_id: userId,
        content: content.trim(),
      })
      .select(`
        *,
        user:user_id (
          id,
          name,
          wallet_address
        )
      `)
      .single();

    if (error) throw error;

    // Increment post comments count
    await supabase.rpc('increment_post_comments', { post_id: postId });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}

export async function GET(request, { params }) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { postId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { data: comments, error } = await supabase
      .from('feed_comments')
      .select(`
        *,
        user:user_id (
          id,
          name,
          wallet_address
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({ comments }, { status: 200 });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}
