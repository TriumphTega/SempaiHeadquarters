import { supabase } from "@/services/supabase/supabaseClient";

export async function GET() {
  const { data, error } = await supabase
    .from('novels')
    .select('id, title, image, summary, tags, user_id, is_visible, show_in_home')
    .eq('is_visible', true)
    .order('id', { ascending: false });

  if (error) {
    console.error("Novels API error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify(data), { status: 200 });
}
