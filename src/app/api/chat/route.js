// e.g., app/api/chat/route.js or pages/api/chat.js
import { supabase } from "@/services/supabase/supabaseClient";

// GET: Fetch all messages
export async function GET(req) {
  try {
    console.log("[GET] Fetching messages...");
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[GET] Error fetching messages:", error);
      return new Response(
        JSON.stringify({ success: false, message: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("[GET] Fetched messages:", data);
    return new Response(
      JSON.stringify({ success: true, messages: data }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[GET] Unexpected error:", err);
    return new Response(
      JSON.stringify({ success: false, message: "Internal Server Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// POST: Create a new message
export async function POST(req) {
  try {
    const body = await req.json();
    console.log("[POST] Received Message Request:", body);

    const { wallet_address, content, media_url, parent_id } = body;
    // Require wallet_address, but allow content or media_url to be optional
    if (!wallet_address) {
      console.error("[POST] Missing required field: wallet_address");
      return new Response(
        JSON.stringify({ success: false, message: "Missing wallet_address" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    // Require at least one of content or media_url
    if (!content && !media_url) {
      console.error("[POST] No content or media provided");
      return new Response(
        JSON.stringify({ success: false, message: "Must provide content or media" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("wallet_address", wallet_address)
      .single();

    if (userError || !user) {
      console.error("[POST] Error fetching user:", userError || "No user found");
      return new Response(
        JSON.stringify({ success: false, message: "User not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data, error } = await supabase
      .from("messages")
      .insert([
        {
          user_id: user.id,
          wallet_address,
          content: content || null, // Allow null content
          media_url: media_url || null,
          parent_id: parent_id || null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("[POST] Error inserting message:", error);
      return new Response(
        JSON.stringify({ success: false, message: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("[POST] Message inserted successfully:", data);
    return new Response(
      JSON.stringify({ success: true, message: "Message sent", data }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[POST] Unexpected error:", err);
    return new Response(
      JSON.stringify({ success: false, message: "Internal Server Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}