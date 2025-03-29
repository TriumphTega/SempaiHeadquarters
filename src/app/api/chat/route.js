import { NextResponse } from "next/server";
import { supabase } from "@/services/supabase/supabaseClient";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("messages")
      .select(`
        id,
        wallet_address,
        content,
        media_url,
        parent_id,
        created_at,
        users (id, name, image, isWriter)
      `)
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) throw error;

    const messages = data.map((msg) => ({
      id: msg.id,
      wallet_address: msg.wallet_address,
      user_id: msg.users?.id || null,
      content: msg.content,
      media_url: msg.media_url,
      parent_id: msg.parent_id,
      created_at: msg.created_at,
      name: msg.users?.name || msg.wallet_address,
      profile_image: msg.users?.image
        ? msg.users.image.startsWith("data:image/")
          ? msg.users.image
          : `data:image/jpeg;base64,${msg.users.image}`
        : null,
      is_writer: msg.users?.isWriter || false,
    }));

    return NextResponse.json({ success: true, messages }, { status: 200 });
  } catch (error) {
    console.error("Error fetching messages:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to fetch messages", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { wallet_address, user_id, content, media_url, parent_id } = await request.json();

    if (!wallet_address || (!content && !media_url)) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("messages")
      .insert([
        {
          wallet_address,
          user_id,
          content,
          media_url,
          parent_id,
          created_at: new Date().toISOString(),
        },
      ])
      .select(`
        id,
        wallet_address,
        content,
        media_url,
        parent_id,
        created_at,
        users (id, name, image, isWriter)
      `)
      .single();

    if (error) throw error;

    const message = {
      id: data.id,
      wallet_address: data.wallet_address,
      user_id: data.users?.id || null,
      content: data.content,
      media_url: data.media_url,
      parent_id: data.parent_id,
      created_at: data.created_at,
      name: data.users?.name || data.wallet_address,
      profile_image: data.users?.image
        ? data.users.image.startsWith("data:image/")
          ? data.users.image
          : `data:image/jpeg;base64,${data.users.image}`
        : null,
      is_writer: data.users?.isWriter || false,
    };

    // Insert notification for reply in group chat
    if (parent_id) {
      const { data: parentMessage, error: parentError } = await supabase
        .from("messages")
        .select("wallet_address, user_id, content")
        .eq("id", parent_id)
        .single();

      if (parentError) throw parentError;

      if (parentMessage && parentMessage.wallet_address !== wallet_address) {
        const notificationMessage = `${data.users?.name || wallet_address} replied to your message: "${content || "Media"}"`;
        await supabase.from("notifications").insert({
          user_id: parentMessage.user_id,
          recipient_wallet_address: parentMessage.wallet_address,
          message: notificationMessage,
          type: "chat_reply",
          chat_id: data.id,
          is_read: false,
          created_at: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({ success: true, message }, { status: 201 });
  } catch (error) {
    console.error("Error sending message:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to send message", error: error.message },
      { status: 500 }
    );
  }
}