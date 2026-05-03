import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    console.log('[Simple API] Request received');
    
    const body = await request.json();
    console.log('[Simple API] Body:', body);
    
    const { novelId, chapterNumber, deviceHash, walletAddress } = body;
    
    // Simple validation
    if (!novelId || !chapterNumber || !deviceHash || !walletAddress) {
      console.log('[Simple API] Missing fields:', { novelId, chapterNumber, deviceHash, walletAddress });
      return NextResponse.json({ 
        error: 'Missing required fields',
        received: { novelId, chapterNumber, deviceHash, walletAddress }
      }, { status: 400 });
    }
    
    // Return success for now
    return NextResponse.json({ 
      sessionId: 'test-session-' + Date.now(),
      message: 'Test session started',
      received: { novelId, chapterNumber, deviceHash, walletAddress }
    });
    
  } catch (error) {
    console.error('[Simple API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
