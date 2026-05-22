"use server";

import { supabase } from "@/services/supabase/supabaseClient";
import { NextResponse } from 'next/server';

export async function GET() {
  const { data, error } = await supabase
    .from('marketplace_listings')
    .select(`
      *,
      hoard_items (
        content_type,
        novel_id,
        manga_id,
        added_at,
        novels(id,title,image,summary,user_id),
        manga(id,title,cover_image,summary,author,user_id)
      ),
      seller:seller_id (id, name, email, image)
    `)
    .eq('status', 'active')
    .order('listed_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ listings: data || [] });
}

export async function POST(request) {
  const authHeader = request.headers.get('authorization');
  const accessToken = authHeader?.replace('Bearer ', '');

  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabase.auth.getUser(accessToken);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { hoard_item_id, price, currency = 'SMP', description } = await request.json();

  if (!hoard_item_id || !price) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const { data: hoardItem } = await supabase
    .from('hoard_items')
    .select('user_id, status')
    .eq('id', hoard_item_id)
    .single();

  if (!hoardItem || hoardItem.user_id !== user.id) {
    return NextResponse.json({ error: "Invalid item" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('marketplace_listings')
    .insert({
      hoard_item_id,
      seller_id: user.id,
      price: Number(price),
      currency,
      description: description || null,
      status: 'active'
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('hoard_items').update({ status: 'listed' }).eq('id', hoard_item_id);

  return NextResponse.json({ success: true, listing: data });
}