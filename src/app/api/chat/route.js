import { supabase } from "@/services/supabase/supabaseClient";

export async function GET(req) {
  try {
    console.log("[GET] Fetching messages...");
    // Order ascending so that the oldest message is first and the newest last.
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true });
      
    if (error) {
      console.error("[GET] Error fetching messages:", error);
      return new Response(
        JSON.stringify({ success: false, message: error.message }),
        { status: 500 }
      );
    }
    
    console.log("[GET] Fetched messages:", data);
    return new Response(
      JSON.stringify({ success: true, messages: data }),
      { status: 200 }
    );
  } catch (err) {
    console.error("[GET] Unexpected error:", err);
    return new Response(
      JSON.stringify({ success: false, message: "Internal Server Error" }),
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    console.log("[POST] Received Message Request:", body);

    const { wallet_address, content, media_url, parent_id } = body;
    if (!wallet_address || !content) {
      console.error("[POST] Missing required fields:", { wallet_address, content });
      return new Response(
        JSON.stringify({ success: false, message: "Missing required fields" }),
        { status: 400 }
      );
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("wallet_address", wallet_address)
      .single();

    if (userError || !user) {
      console.error("[POST] Error fetching user:", userError);
      return new Response(
        JSON.stringify({ success: false, message: "User not found" }),
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from("messages")
      .insert([{
        user_id: user.id,
        wallet_address,
        content,
        media_url: media_url || null,
        parent_id: parent_id || null,
      }])
      .select()
      .single();

    if (error) {
      console.error("[POST] Error inserting message:", error);
      return new Response(
        JSON.stringify({ success: false, message: error.message }),
        { status: 500 }
      );
    }

    console.log("[POST] Message inserted successfully:", data);
    return new Response(
      JSON.stringify({ success: true, message: "Message sent", data }),
      { status: 200 }
    );
  } catch (err) {
    console.error("[POST] Unexpected error:", err);
    return new Response(
      JSON.stringify({ success: false, message: "Internal Server Error" }),
      { status: 500 }
    );
  }
}
