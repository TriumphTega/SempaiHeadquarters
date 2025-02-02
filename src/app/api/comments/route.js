import { supabase } from '@/services/supabase/supabaseClient';

// Create a comment or reply
export async function POST(req) {
    const { user_id, novel_id, chapter_key = null, content, parent_id = null } = await req.json();

    const { data, error } = await supabase
        .from('comments')
        .insert([{ user_id, novel_id, chapter_key, content, parent_id }])
        .select();

    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json(data[0], { status: 201 });
}

// Fetch comments
export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const novel_id = searchParams.get('novel_id');
    const chapter_key = searchParams.get('chapter_key');

    let query = supabase
        .from('comments')
        .select('*')
        .eq('novel_id', novel_id)
        .order('created_at', { ascending: true });

    if (chapter_key) query = query.eq('chapter_key', chapter_key);
    else query = query.is('chapter_key', null); // For novel-level comments

    const { data, error } = await query;

    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json(data);
}
