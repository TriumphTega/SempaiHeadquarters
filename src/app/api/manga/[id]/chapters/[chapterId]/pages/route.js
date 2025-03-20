import { supabase } from "@/services/supabase/supabaseClient";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  const chapterId = params.chapterId; // Matches [chapterId] folder
  const walletAddress = request.headers.get("x-wallet-address"); // Wallet public key from client

  // If no wallet is connected, proceed as unauthenticated
  const isAuthenticated = !!walletAddress;

  // Fetch user ID from wallet address if authenticated
  let userId = null;
  if (isAuthenticated) {
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("wallet_address", walletAddress)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }
    userId = user.id;
  }

  // Fetch chapter details to check if it's premium
  const { data: chapter, error: chapterError } = await supabase
    .from("manga_chapters")
    .select("is_premium")
    .eq("id", chapterId)
    .single();

  if (chapterError || !chapter) {
    return NextResponse.json({ error: chapterError?.message || "Chapter not found" }, { status: 404 });
  }

  // Check if user has unlocked premium chapter
  let hasUnlocked = false;
  if (isAuthenticated && chapter.is_premium && userId) {
    const { data: unlockData } = await supabase
      .from("unlocked_manga_chapters")
      .select("id")
      .eq("chapter_id", chapterId)
      .eq("user_id", userId)
      .single();
    hasUnlocked = !!unlockData;
  }

  // Fetch pages (limit to 5 if premium and not unlocked)
  let query = supabase
    .from("manga_pages")
    .select("id, page_number, image_url")
    .eq("chapter_id", chapterId)
    .order("page_number", { ascending: true });

  if (!chapter.is_premium || hasUnlocked) {
    // Full access
  } else {
    query = query.lte("page_number", 5); // Limit to first 5 pages
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}