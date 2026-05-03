import { NextResponse } from 'next/server';

export async function POST(request) {
  console.log('[Minimal API] HIT!');
  
  try {
    const body = await request.json();
    console.log('[Minimal API] Body:', body);
    
    return NextResponse.json({ 
      success: true,
      sessionId: 'minimal-session-' + Date.now(),
      message: 'Minimal API working',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Minimal API] Error:', error);
    return NextResponse.json({ error: 'Minimal API error' }, { status: 500 });
  }
}
