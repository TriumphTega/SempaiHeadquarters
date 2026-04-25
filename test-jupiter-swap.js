// Test script to debug Jupiter swap execution
const fetch = require('cross-fetch');

async function testJupiterSwap() {
  console.log('Testing Jupiter Swap Execution...');

  const API_KEY = 'jup_4801d87679ec9083587ffd94be3e3abd233a0057963b63da729dd56ac4b53a3a';

  // Step 1: Get a quote
  const quoteUrl = 'https://api.jup.ag/swap/v1/quote?' +
    'inputMint=So11111111111111111111111111111111111111112' +     // SOL
    '&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' + // USDC
    '&amount=1000000' +                                           // 0.001 SOL
    '&slippageBps=50';

  try {
    console.log(`\nStep 1: Getting quote from: ${quoteUrl}`);
    const quoteRes = await fetch(quoteUrl, {
      method: 'GET',
      timeout: 10000,
      headers: {
        'User-Agent': 'SempaiHQ/1.0',
        'Accept': 'application/json',
        'x-api-key': API_KEY
      }
    });

    console.log(`Quote Status: ${quoteRes.status} ${quoteRes.statusText}`);

    if (!quoteRes.ok) {
      const errorText = await quoteRes.text();
      console.log(`Quote Error: ${errorText}`);
      return;
    }

    const quoteResponse = await quoteRes.json();
    console.log('✅ Quote successful!');
    console.log(`Input amount: ${quoteResponse.inAmount}`);
    console.log(`Output amount: ${quoteResponse.outAmount}`);
    console.log(`Price impact: ${quoteResponse.priceImpactPct || 'N/A'}%`);

    // Step 2: Execute swap
    const swapUrl = 'https://api.jup.ag/swap/v1/execute';
    const userPublicKey = '11111111111111111111111111111111'; // Test public key

    console.log(`\nStep 2: Executing swap from: ${swapUrl}`);
    console.log(`User Public Key: ${userPublicKey}`);

    const swapPayload = {
      quoteResponse,
      userPublicKey,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: {
        priorityLevelWithMaxLamports: { maxLamports: 10_000_000, priorityLevel: "high" },
      },
    };

    console.log(`Swap Payload:`, JSON.stringify(swapPayload, null, 2));

    const swapRes = await fetch(swapUrl, {
      method: 'POST',
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SempaiHQ/1.0',
        'Accept': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify(swapPayload)
    });

    console.log(`Swap Status: ${swapRes.status} ${swapRes.statusText}`);

    if (!swapRes.ok) {
      const errorText = await swapRes.text();
      console.log(`❌ Swap Error: ${errorText}`);
      return;
    }

    const swapResponse = await swapRes.json();
    console.log('✅ Swap execution successful!');
    console.log(`Transaction available: ${!!swapResponse.swapTransaction}`);
    console.log(`Last valid block height: ${swapResponse.lastValidBlockHeight}`);

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

testJupiterSwap().catch(console.error);
