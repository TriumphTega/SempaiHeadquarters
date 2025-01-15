import { NextResponse } from 'next/server';
import { addNovel } from '../../../novelsData';  // Import the addNovel function

export async function POST(req) {
  const newNovel = await req.json();

  // Add the new novel to the novelsData.js
  addNovel(newNovel);

  // Respond with success message
  return NextResponse.json({ success: true, novel: newNovel });
}
