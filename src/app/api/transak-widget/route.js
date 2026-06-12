import { NextRequest } from 'next/server';

export async function POST(req) {
  console.log('🚀 [Transak] Request received');

  try {
    // Check environment variables first
    if (!process.env.TRANSAK_API_SECRET) {
      console.error('❌ Missing TRANSAK_API_SECRET');
      return Response.json({ 
        error: 'Missing TRANSAK_API_SECRET in .env.local' 
      }, { status: 500 });
    }

    if (!process.env.TRANSAK_API_KEY) {
      console.error('❌ Missing TRANSAK_API_KEY');
      return Response.json({ 
        error: 'Missing TRANSAK_API_KEY in .env.local' 
      }, { status: 500 });
    }

    const body = await req.json();
    console.log('📦 Request body:', body);

    const { walletAddress, fiatCurrency = 'USD', defaultFiatAmount = '100' } = body;

    // === 1. Get Access Token ===
    console.log('🔑 Getting access token from Transak...');

    const tokenRes = await fetch('https://api-stg.transak.com/partners/api/v2/refresh-token', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-secret': process.env.TRANSAK_API_SECRET,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: process.env.TRANSAK_API_KEY,
      }),
    });

    const tokenData = await tokenRes.json();
    console.log('Token response status:', tokenRes.status);

    if (!tokenRes.ok || !tokenData.data?.accessToken) {
      console.error('❌ Access token failed:', tokenData);
      return Response.json({ 
        error: 'Failed to get access token', 
        details: tokenData 
      }, { status: 500 });
    }

    const accessToken = tokenData.data.accessToken;
    console.log('✅ Access token obtained');

    // === 2. Create Widget URL ===
    const referrerDomain = process.env.NEXT_PUBLIC_SITE_URL || 'localhost:3000';

    console.log('🌐 Creating widget URL with referrerDomain:', referrerDomain);

    const widgetRes = await fetch('https://api-gateway-stg.transak.com/api/v2/auth/session', {
      method: 'POST',
      headers: {
        'access-token': accessToken,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        widgetParams: {
          apiKey: process.env.NEXT_PUBLIC_TRANSAK_API_KEY,
          referrerDomain,
          walletAddress,
          fiatCurrency,
          defaultFiatAmount,
          cryptoCurrencyCode: 'SOL',
          defaultNetwork: 'solana',
        },
      }),
    });

    const widgetData = await widgetRes.json();
    console.log('Widget response status:', widgetRes.status);

    if (!widgetRes.ok || !widgetData.data?.widgetUrl) {
      console.error('❌ Widget URL creation failed:', widgetData);
      return Response.json({ 
        error: 'Failed to create widget URL', 
        details: widgetData 
      }, { status: 500 });
    }

    console.log('✅ Widget URL created successfully');

    return Response.json({
      widgetUrl: widgetData.data.widgetUrl,
    });

  } catch (error) {
    console.error('💥 Unexpected error in Transak route:', error);
    return Response.json({ 
      error: error.message || 'Internal server error',
      stack: error.stack 
    }, { status: 500 });
  }
}
