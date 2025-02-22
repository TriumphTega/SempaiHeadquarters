import { NextResponse } from 'next/server';
import { supabase } from "@/services/supabase/supabaseClient";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        id,
        wallet_address,
        content,
        media_url,
        parent_id,
        created_at,
        users (name, image)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    const messages = data.map((msg) => ({
      id: msg.id,
      wallet_address: msg.wallet_address,
      content: msg.content,
      media_url: msg.media_url,
      parent_id: msg.parent_id,
      created_at: msg.created_at,
      name: msg.users?.name || msg.wallet_address, // Fallback to wallet_address if name is missing
      profile_image: msg.users?.image
        ? msg.users.image.startsWith('data:image/')
          ? msg.users.image
          : `data:image/jpeg;base64,${msg.users.image}` // Convert to base64 if needed
        : null,
    })).reverse();

    return NextResponse.json({ success: true, messages }, { status: 200 });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { wallet_address, content, media_url, parent_id } = await request.json();

    if (!wallet_address || (!content && !media_url)) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    // Lookup the user_id from the users table using the wallet_address
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', wallet_address)
      .single();

    if (userError || !userData) {
      console.error('Error fetching user id:', userError);
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const user_id = userData.id;

    // Insert the new message, including the user_id field
    const { data, error } = await supabase
      .from('messages')
      .insert([{
        wallet_address,
        user_id, // new field
        content,
        media_url,
        parent_id,
        created_at: new Date().toISOString()
      }])
      .select(`
        id,
        wallet_address,
        content,
        media_url,
        parent_id,
        created_at,
        users (name, image)
      `)
      .single();

    if (error) throw error;

    const message = {
      id: data.id,
      wallet_address: data.wallet_address,
      content: data.content,
      media_url: data.media_url,
      parent_id: data.parent_id,
      created_at: data.created_at,
      name: data.users?.name || data.wallet_address,
      profile_image: data.users?.image
        ? data.users.image.startsWith('data:image/')
          ? data.users.image
          : `data:image/jpeg;base64,${data.users.image}`
        : null,
    };

    return NextResponse.json({ success: true, message }, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ success: false, message: 'Failed to send message' }, { status: 500 });
  }
}
