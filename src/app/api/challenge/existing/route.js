import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { novelId, chapterNumber } = await request.json();
    
    // For now, return empty array since we don't have database connection
    // In a real implementation, this would query the database
    console.log('[Challenge API] Fetching existing questions for novel:', novelId, 'chapter:', chapterNumber);
    
    return NextResponse.json({ 
      questions: [],
      message: 'No existing questions found'
    });
    
  } catch (error) {
    console.error('[Challenge API] Error fetching existing questions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
