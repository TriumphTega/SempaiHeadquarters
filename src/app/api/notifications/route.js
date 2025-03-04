import { supabase } from "@/services/supabase/supabaseClient";

export async function POST(req) {
  try {
    // Fetch all novels with titles and chapter counts
    const { data: novels, error: novelsError } = await supabase
      .from("novels")
      .select("id, title, chaptertitles");

    if (novelsError) {
      throw new Error("Error fetching novels: " + novelsError.message);
    }

    if (!novels.length) {
      return new Response(JSON.stringify({ message: "No novels found" }), { status: 200 });
    }

    // Fetch all users reading novels in one query
    const { data: userReads, error: userReadsError } = await supabase
      .from("user_read_novels")
      .select("user_id, novel_id, last_read_chapter");

    if (userReadsError) {
      throw new Error("Error fetching user reading data: " + userReadsError.message);
    }

    // Prepare notifications to insert
    const notifications = [];

    for (const novel of novels) {
      const { id: novelId, title: novelTitle, chaptertitles } = novel;
      const totalChapters = Object.keys(chaptertitles).length;

      // Find users who haven't read the latest chapter
      const usersToNotify = userReads.filter(
        (read) => read.novel_id === novelId && (read.last_read_chapter || 0) < totalChapters
      );

      usersToNotify.forEach(({ user_id }) => {
        notifications.push({
          user_id,
          novel_id: novelId,
          message: `A new chapter has been released for "${novelTitle}"!`, // More specific message
          type: "new_chapter", // Explicitly set type
          novel_title: novelTitle, // Store novel title
          is_read: false,
          created_at: new Date().toISOString(), // Ensure timestamp is set
        });
      });
    }

    // Bulk insert notifications
    if (notifications.length > 0) {
      const { error: notificationsError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (notificationsError) {
        throw new Error("Error inserting notifications: " + notificationsError.message);
      }
    }

    return new Response(JSON.stringify({ message: "Notifications sent successfully!" }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}