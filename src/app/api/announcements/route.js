import { supabase } from "@/services/supabase/supabaseClient";

export async function POST(req) {
  try {
    const { writer_id, novel_id, title, message, release_date } = await req.json();

    const { data: writer, error: writerError } = await supabase
      .from("users")
      .select("id, isWriter")
      .eq("id", writer_id)
      .single();

    if (writerError || !writer || !writer.isWriter) {
      return new Response(JSON.stringify({ error: "Only writers can create announcements" }), { status: 403 });
    }

    const { data: novel, error: novelError } = await supabase
      .from("novels")
      .select("user_id")
      .eq("id", novel_id)
      .single();

    if (novelError || novel.user_id !== writer_id) {
      return new Response(JSON.stringify({ error: "You can only announce for your own novels" }), { status: 403 });
    }

    const { data, error } = await supabase
      .from("writer_announcements")
      .insert([{ writer_id, novel_id, title, message, release_date }])
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ message: "Announcement created", data }), { status: 201 });
  } catch (error) {
    console.error("Error creating announcement:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function GET(req) {
  const url = new URL(req.url);
  const publicKey = url.searchParams.get("publicKey");

  try {
    let query = supabase
      .from("writer_announcements")
      .select(`
        id, title, message, created_at, release_date,
        novels (id, title),
        users (id, wallet_address)
      `)
      .order("created_at", { ascending: false })
      .limit(10);

    if (publicKey) {
      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("wallet_address", publicKey)
        .single();

      if (user) {
        const { data: interactions } = await supabase
          .from("novel_interactions")
          .select("novel_id")
          .eq("user_id", user.id);

        const novelIds = interactions.map(i => i.novel_id);
        query = query.in("novel_id", novelIds);
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    return new Response(JSON.stringify({ data }), { status: 200 });
  } catch (error) {
    console.error("Error fetching announcements:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}