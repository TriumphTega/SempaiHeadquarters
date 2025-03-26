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
    let novelIds = [];
    let userId = null;
    let isWriter = false;
    let isArtist = false;

    // Fetch user details if publicKey is provided
    if (publicKey) {
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id, isWriter, isArtist")
        .eq("wallet_address", publicKey)
        .single();

      if (userError) throw userError;
      if (user) {
        userId = user.id;
        isWriter = user.isWriter;
        isArtist = user.isArtist;
        const { data: interactions, error: interactionsError } = await supabase
          .from("novel_interactions")
          .select("novel_id")
          .eq("user_id", user.id);

        if (interactionsError) throw interactionsError;
        novelIds = interactions.map((i) => i.novel_id);
      }
    }

    // Query writer_announcements
    let writerQuery = supabase
      .from("writer_announcements")
      .select(`
        id, title, message, created_at, release_date,
        novels (id, title),
        users!writer_id (id, wallet_address)
      `)
      .order("created_at", { ascending: false });

    if (novelIds.length > 0) {
      writerQuery = writerQuery.in("novel_id", novelIds);
    }

    const { data: writerAnnouncements, error: writerError } = await writerQuery;
    if (writerError) throw writerError;

    // Query announcements with audience filtering
    let announcementsQuery = supabase
      .from("announcements")
      .select(`
        id, title, message, created_at, release_date, audience,
        users!user_id (id, wallet_address)
      `)
      .order("created_at", { ascending: false });

    const { data: generalAnnouncements, error: announcementsError } = await announcementsQuery;
    if (announcementsError) throw announcementsError;

    // Filter general announcements based on audience and user role
    const filteredGeneralAnnouncements = generalAnnouncements.filter((ann) => {
      if (ann.audience === "creators") {
        return isWriter || isArtist; // Only writers or artists see "creators" announcements
      }
      return true; // All other audiences ("all", "writers", "artists") are visible to everyone
    });

    // Normalize writer_announcements
    const normalizedWriterAnnouncements = writerAnnouncements.map((ann) => ({
      id: ann.id,
      title: ann.title,
      message: ann.message,
      created_at: ann.created_at,
      release_date: ann.release_date,
      novels: ann.novels ? { id: ann.novels.id, title: ann.novels.title } : null,
      users: ann.users ? { id: ann.users.id, wallet_address: ann.users.wallet_address } : null,
    }));

    // Normalize filtered general announcements
    const normalizedGeneralAnnouncements = filteredGeneralAnnouncements.map((ann) => ({
      id: ann.id,
      title: ann.title,
      message: ann.message,
      created_at: ann.created_at,
      release_date: ann.release_date,
      novels: null, // General announcements don’t have a novel association
      users: ann.users ? { id: ann.users.id, wallet_address: ann.users.wallet_address } : null,
    }));

    // Combine and limit to 10 most recent
    const combinedAnnouncements = [...normalizedWriterAnnouncements, ...normalizedGeneralAnnouncements]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);

    return new Response(JSON.stringify({ data: combinedAnnouncements }), { status: 200 });
  } catch (error) {
    console.error("Error fetching announcements:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}