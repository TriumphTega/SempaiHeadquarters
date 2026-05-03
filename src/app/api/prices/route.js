import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('[Prices API] Fetching current token prices');
    
    // You can integrate with your existing price fetching system
    // For now, return common prices that you can update as needed
    
    const prices = {
      'SOL': 150.25,        // Solana
      'SMP': 0.012,         // Your token
      'USDC': 1.0,          // USD Coin
      'USDT': 1.0,          // Tether
      'BTC': 65000,         // Bitcoin
      'ETH': 3500,          // Ethereum
    };
    
    console.log('[Prices API] Prices fetched:', prices);
    
    return NextResponse.json(prices);
    
  } catch (error) {
    console.error('[Prices API] Error fetching prices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prices' },
      { status: 500 }
    );
  }
}
