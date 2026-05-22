"use server";

import { supabase } from "@/services/supabase/supabaseClient";
import { headers } from "next/headers";
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    const accessToken = authHeader?.replace('Bearer ', '');

    if (!accessToken) {
      console.log("GET /api/hoard - No access token found");
      return NextResponse.json({ hoard: [] });
    }

    const { data: { user } } = await supabase.auth.getUser(accessToken);

    if (!user) {
      console.log("GET /api/hoard - Invalid access token");
      return NextResponse.json({ hoard: [] });
    }

    const { data: hoard, error } = await supabase
      .from('hoard_items')
      .select(`
        *,
        novels (id, title, image, summary, user_id),
        manga (id, title, cover_image, summary, author, user_id)
      `)
      .eq('user_id', user.id)
      .order('added_at', { ascending: false });

    if (error) {
      console.error("DB Error:", error);
      return NextResponse.json({ hoard: [] });
    }

    return NextResponse.json({ hoard: hoard || [] });
  } catch (err) {
    console.error("GET /api/hoard error:", err);
    return NextResponse.json({ hoard: [] });
  }
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.replace('Bearer ', '');

    console.log("POST /api/hoard - Auth header exists:", !!authHeader);
    console.log("POST /api/hoard - Access token exists:", !!accessToken);
    console.log("POST /api/hoard - Token length:", accessToken?.length);

    if (!accessToken) {
      console.log("POST /api/hoard - No access token found");
      return NextResponse.json({ error: "Unauthorized - No access token" }, { status: 401 });
    }

    const { data: { user } } = await supabase.auth.getUser(accessToken);
    
    console.log("POST /api/hoard - User from token:", !!user);
    
    if (!user) {
      console.log("POST /api/hoard - Invalid access token");
      return NextResponse.json({ error: "Unauthorized - Invalid token" }, { status: 401 });
    }

    const { content_type, novel_id, manga_id, notes } = await request.json();

    if (!content_type) {
      return NextResponse.json({ error: "content_type is required (novel or manga)" }, { status: 400 });
    }

    if (content_type === 'novel' && !novel_id) {
      return NextResponse.json({ error: "novel_id is required for novels" }, { status: 400 });
    }

    if (content_type === 'manga' && !manga_id) {
      return NextResponse.json({ error: "manga_id is required for manga" }, { status: 400 });
    }

    const insertData = {
      user_id: user.id,
      content_type,
      notes: notes || null,
      status: 'hoarded'
    };

    if (content_type === 'novel') {
      insertData.novel_id = novel_id;
    } else {
      insertData.manga_id = manga_id;
    }

    console.log("POST /api/hoard - Insert data:", insertData);
    console.log("POST /api/hoard - User ID from auth:", user.id);

    const { data, error } = await supabase
      .from('hoard_items')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: "This item is already in your Hoard" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Added to Hoard successfully",
      item: data 
    });
  } catch (err) {
    console.error("POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}