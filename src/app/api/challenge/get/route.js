import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { sessionId, novelId, chapterNumber } = await request.json();
    
    console.log('[Challenge API] Getting challenge for session:', sessionId);
    console.log('[Challenge API] Novel:', novelId, 'Chapter:', chapterNumber);
    
    // Validate session (simplified for now)
    if (!sessionId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
    }
    
    // Get random challenge (12.5% chance)
    if (Math.random() > 0.125) {
      console.log('[Challenge API] No challenge this time (87.5% chance)');
      return NextResponse.json({ challenge: null }); // No challenge this time
    }
    
    // For now, use fallback questions since we don't have database connection
    const fallbackQuestions = [
      {
        id: 'fallback-1',
        question: "What was the main theme of this chapter?",
        options: ["Love and friendship", "Betrayal and revenge", "Adventure and discovery", "Mystery and suspense"],
        correct_answer: 0
      },
      {
        id: 'fallback-2',
        question: "How would you describe the pacing of this chapter?",
        options: ["Fast-paced and action-packed", "Slow and contemplative", "Varied pacing", "Consistent rhythm"],
        correct_answer: 2
      },
      {
        id: 'fallback-3',
        question: "Which emotion was most prominent in this chapter?",
        options: ["Joy and excitement", "Sadness and loss", "Tension and anticipation", "Confusion and doubt"],
        correct_answer: 1
      },
      {
        id: 'fallback-4',
        question: "What best describes the chapter's ending?",
        options: ["Satisfying conclusion", "Unexpected twist", "Left you wanting more", "Resolved the main conflict"],
        correct_answer: 2
      }
    ];
    
    const randomQuestion = fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];
    
    console.log('[Challenge API] Selected challenge:', randomQuestion.id);
    
    return NextResponse.json({ 
      challenge: {
        id: randomQuestion.id,
        question: randomQuestion.question,
        options: randomQuestion.options
      }
    });
    
  } catch (error) {
    console.error('[Challenge API] Challenge retrieval error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
