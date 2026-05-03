import { NextResponse } from 'next/server';

export async function POST(request) {
  console.log('[Session API] HIT!');
  
  try {
    const body = await request.json();
    console.log('[Session API] Body:', body);
    
    const { novelId, chapterNumber, deviceHash, walletAddress } = body;
    
    // Simple validation - handle chapterNumber = 0 correctly
    if (novelId === null || novelId === undefined || novelId === '' ||
        chapterNumber === null || chapterNumber === undefined || 
        deviceHash === null || deviceHash === undefined || deviceHash === '' ||
        walletAddress === null || walletAddress === undefined || walletAddress === '') {
      console.log('[Session API] Missing fields:', { novelId, chapterNumber, deviceHash, walletAddress });
      return NextResponse.json({ 
        error: 'Missing required fields',
        received: { novelId, chapterNumber, deviceHash, walletAddress }
      }, { status: 400 });
    }
    
    // Return success with session ID
    const sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    return NextResponse.json({ 
      sessionId: sessionId,
      message: 'Session started successfully',
      received: { novelId, chapterNumber, deviceHash, walletAddress }
    });
    
  } catch (error) {
    console.error('[Session API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
