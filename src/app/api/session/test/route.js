import { NextResponse } from 'next/server';

export async function POST(request) {
  console.log('[Test API] Request received');
  
  try {
    const body = await request.json();
    console.log('[Test API] Body:', body);
    
    return NextResponse.json({ 
      success: true,
      sessionId: 'test-session-' + Date.now(),
      message: 'Test API working',
      received: body
    });
  } catch (error) {
    console.error('[Test API] Error:', error);
    return NextResponse.json({ error: 'Test API failed' }, { status: 500 });
  }
}
