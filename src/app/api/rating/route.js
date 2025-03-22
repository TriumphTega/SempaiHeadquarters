import { supabase } from '@/services/supabase/supabaseClient';

export async function POST(request) {
  const { user_id, content_type, content_id, chapter_number, rating } = await request.json();

  // Insert rating
  const { error: insertError } = await supabase
    .from('chapter_ratings')
    .insert([{ user_id, content_type, content_id, chapter_number, rating }]);

  if (insertError) return new Response(JSON.stringify({ error: insertError }), { status: 500 });

  // Calculate average rating
  const { data: ratings, error: fetchError } = await supabase
    .from('chapter_ratings')
    .select('rating')
    .eq('content_type', content_type)
    .eq('content_id', content_id)
    .eq('chapter_number', chapter_number);

  if (fetchError) return new Response(JSON.stringify({ error: fetchError }), { status: 500 });

  const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
  const ratingsCount = ratings.length;

  // Update chapter data
  if (content_type === 'manga') {
    const { error: updateError } = await supabase
      .from('manga_chapters')
      .update({ average_rating: avgRating, ratings_count: ratingsCount })
      .eq('manga_id', content_id)
      .eq('chapter_number', chapter_number);
    if (updateError) return new Response(JSON.stringify({ error: updateError }), { status: 500 });
  } else if (content_type === 'novel') {
    const { data: novel, error: fetchError } = await supabase
      .from('novels')
      .select('chaptercontents')
      .eq('id', content_id)
      .single();

    if (fetchError) return new Response(JSON.stringify({ error: fetchError }), { status: 500 });

    const updatedChapterContents = {
      ...novel.chaptercontents,
      [chapter_number]: {
        ...novel.chaptercontents[chapter_number],
        ratings_count: ratingsCount,
        average_rating: avgRating,
      },
    };

    const { error: updateError } = await supabase
      .from('novels')
      .update({ chaptercontents: updatedChapterContents })
      .eq('id', content_id);

    if (updateError) return new Response(JSON.stringify({ error: updateError }), { status: 500 });
  }

  return new Response(JSON.stringify({ average_rating: avgRating, ratings_count: ratingsCount }), { status: 200 });
}