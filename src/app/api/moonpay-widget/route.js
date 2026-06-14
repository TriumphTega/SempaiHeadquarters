import { NextRequest } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const { walletAddress, fiatCurrency = 'USD', defaultFiatAmount = '100' } = body;

    console.log('[MoonPay API] Request received:', { walletAddress, fiatCurrency, defaultFiatAmount });

    // Generate MoonPay widget URL
    const apiKey = process.env.NEXT_PUBLIC_MOONPAY_API_KEY || 'pk_test_123';
    
    if (!apiKey || apiKey === 'pk_test_123') {
      console.warn('[MoonPay API] Using placeholder API key');
    }
    
    // MoonPay widget URL construction
    const baseUrl = 'https://buy.moonpay.com';
    const params = new URLSearchParams({
      apiKey: apiKey,
      currencyCode: 'sol',
      walletAddress: walletAddress,
      baseCurrencyAmount: defaultFiatAmount,
      baseCurrencyCode: fiatCurrency,
      themeColor: '#D94F04',
    });

    const widgetUrl = `${baseUrl}?${params.toString()}`;
    console.log('[MoonPay API] Widget URL generated:', widgetUrl);

    return Response.json({
      widgetUrl: widgetUrl,
    });

  } catch (error) {
    console.error('[MoonPay API] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
