import { supabase } from "@/services/supabase/supabaseClient";

export async function GET(request, { params }) {
  const mangaId = params.id;

  const { data, error } = await supabase
    .from('manga_chapters')
    .select('id, chapter_number, title, is_premium, created_at')
    .eq('manga_id', mangaId)
    .order('chapter_number', { ascending: true });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify(data), { status: 200 });
}