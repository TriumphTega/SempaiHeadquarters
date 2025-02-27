import { supabase } from "@/services/supabase/supabaseClient";
import { NextResponse } from "next/server";

export async function POST(req) {
  const { userId, novelId, chapterNumber } = await req.json();

  if (!userId || !novelId || chapterNumber == null) {
    console.error("Missing fields:", { userId, novelId, chapterNumber });
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Check if chapter exists in novel
  const { data: novel, error: novelError } = await supabase
    .from('novels')
    .select('chaptercontents')
    .eq('id', novelId)
    .single();

  if (novelError || !novel) {
    console.error("Novel fetch error:", novelError);
    return NextResponse.json({ error: "Novel not found" }, { status: 404 });
  }

  const chapterKey = chapterNumber.toString();
  if (!Object.keys(novel.chaptercontents || {}).includes(chapterKey)) {
    console.error("Chapter not found in novel:", chapterNumber);
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }

  // Check active subscription
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('plan, expires_at')
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (subError || !subscription) {
    console.error("Subscription check error:", subError);
    // Assume chapter 1 is free if no subscription
    if (chapterNumber === 1) {
      return NextResponse.json({ success: true, message: "Chapter 1 is free" });
    }
    return NextResponse.json({ error: "No active subscription" }, { status: 403 });
  }

  // Unlock based on plan
  if (subscription.plan === 'all_chapters') {
    return NextResponse.json({ success: true, message: "Chapter unlocked" });
  }

  if (subscription.plan === '3_chapters' && chapterNumber <= 3) {
    return NextResponse.json({ success: true, message: "Chapter unlocked" });
  }

  return NextResponse.json({ error: "Chapter requires higher plan" }, { status: 403 });
}