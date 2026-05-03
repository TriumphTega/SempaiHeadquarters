import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    console.log('[Simple DB API] Request received');
    
    const body = await request.json();
    console.log('[Simple DB API] Body:', body);
    
    const { novelId, chapterNumber, deviceHash, walletAddress } = body;
    
    // Simple validation
    if (!novelId || !chapterNumber || !deviceHash || !walletAddress) {
      console.log('[Simple DB API] Missing fields:', { novelId, chapterNumber, deviceHash, walletAddress });
      return NextResponse.json({ 
        error: 'Missing required fields',
        received: { novelId, chapterNumber, deviceHash, walletAddress }
      }, { status: 400 });
    }
    
    // Simulate database operations with logging
    console.log('[Simple DB API] Simulating user lookup for wallet:', walletAddress);
    console.log('[Simple DB API] User found or created successfully');
    console.log('[Simple DB API] Creating session for novel:', novelId, 'chapter:', chapterNumber);
    
    // Return success with simulated session ID
    const sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    return NextResponse.json({ 
      sessionId: sessionId,
      message: 'Session started successfully (simulated)',
      received: { novelId, chapterNumber, deviceHash, walletAddress }
    });
    
  } catch (error) {
    console.error('[Simple DB API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
