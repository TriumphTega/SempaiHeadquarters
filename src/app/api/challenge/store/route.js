import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { novelId, chapterNumber, questions } = await request.json();
    
    console.log('[Challenge API] Storing questions for novel:', novelId, 'chapter:', chapterNumber);
    console.log('[Challenge API] Number of questions:', questions.length);
    
    // For now, just log the questions since we don't have database connection
    // In a real implementation, this would store in the database
    questions.forEach((question, index) => {
      console.log(`[Challenge API] Question ${index + 1}:`, question.question);
    });
    
    return NextResponse.json({ 
      success: true,
      stored: questions.length,
      message: 'Questions stored successfully (simulated)'
    });
    
  } catch (error) {
    console.error('[Challenge API] Error storing questions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
