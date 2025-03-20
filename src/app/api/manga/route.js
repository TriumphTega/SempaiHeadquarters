import { supabase } from "@/services/supabase/supabaseClient";

export async function GET() {

  const { data, error } = await supabase
    .from('manga')
    .select('id, title, summary, cover_image, author, status, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify(data), { status: 200 });
}