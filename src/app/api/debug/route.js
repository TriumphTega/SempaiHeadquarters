import { NextResponse } from 'next/server';

export async function GET() {
  console.log('[Debug API] GET request received');
  return NextResponse.json({ 
    message: 'Debug API working',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request) {
  try {
    console.log('[Debug API] POST request received');
    const body = await request.json();
    console.log('[Debug API] Body:', body);
    
    return NextResponse.json({ 
      message: 'Debug POST successful',
      received: body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Debug API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
