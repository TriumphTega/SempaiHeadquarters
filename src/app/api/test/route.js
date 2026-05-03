import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    message: 'API is working',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    console.log('[Test API] Received:', body);
    
    return NextResponse.json({ 
      message: 'Test POST successful',
      received: body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Test API] Error:', error);
    return NextResponse.json({ error: 'Test API failed' }, { status: 500 });
  }
}
