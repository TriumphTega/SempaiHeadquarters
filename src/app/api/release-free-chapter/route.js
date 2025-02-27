import { supabase } from "@/services/supabase/supabaseClient";

// app/api/release-free-chapter/route.js
import { NextResponse } from 'next/server';


export async function POST(req) {
  try {
    const { novelId } = await req.json(); // Optionally pass novelId

    const { error } = await supabase.rpc('release_one_free_chapter', { p_novel_id: novelId });

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Free chapter published" });
  } catch (error) {
    console.error("Release error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}