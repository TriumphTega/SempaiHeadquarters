import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { sessionId, challengeId, userAnswer, responseTime } = await request.json();
    
    console.log('[Challenge API] Submitting answer for session:', sessionId);
    console.log('[Challenge API] Challenge:', challengeId, 'Answer:', userAnswer, 'Time:', responseTime);
    
    // Get challenge details (simplified for now)
    const fallbackQuestions = {
      'fallback-1': { correct_answer: 0 },
      'fallback-2': { correct_answer: 2 },
      'fallback-3': { correct_answer: 1 },
      'fallback-4': { correct_answer: 2 }
    };
    
    const challenge = fallbackQuestions[challengeId];
    if (!challenge) {
      return NextResponse.json({ error: 'Invalid challenge' }, { status: 400 });
    }
    
    const isCorrect = userAnswer === challenge.correct_answer;
    
    console.log('[Challenge API] Answer is correct:', isCorrect);
    
    // Record attempt (simplified for now)
    console.log('[Challenge API] Recording attempt in database (simulated)');
    
    // Update user reputation (simplified for now)
    console.log('[Challenge API] Updating user reputation (simulated)');
    
    // Check for consecutive failures (simplified for now)
    if (!isCorrect) {
      console.log('[Challenge API] User failed challenge, checking consecutive failures');
    }
    
    return NextResponse.json({ 
      correct: isCorrect,
      canProceed: isCorrect || userAnswer === -1, // Allow proceed on timeout
      message: isCorrect ? 'Correct answer!' : 'Incorrect answer, but you can proceed'
    });
    
  } catch (error) {
    console.error('[Challenge API] Challenge submission error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
