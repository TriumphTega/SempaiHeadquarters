import { NextResponse } from 'next/server';
import { SMP_FALLBACK_PRICE_USDC } from '../../../constants';

export async function GET() {
  try {
    console.log('[SMP Fallback Price API] Returning fallback SMP price');
    console.log('[SMP Fallback Price API] SMP_FALLBACK_PRICE_USDC constant value:', SMP_FALLBACK_PRICE_USDC);
    console.log('[SMP Fallback Price API] Converted to USDC per SMP:', 1 / SMP_FALLBACK_PRICE_USDC);
    
    return NextResponse.json({
      token: 'SMP',
      fallbackPrice: SMP_FALLBACK_PRICE_USDC,
      description: 'SMP per 1 USDC (fallback when live price unavailable due to low liquidity or network issues)',
      lastUpdated: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('[SMP Fallback Price API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fallback price' },
      { status: 500 }
    );
  }
}
