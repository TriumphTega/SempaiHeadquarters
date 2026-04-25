// Test script for Jupiter v2 order endpoint
const fetch = require('cross-fetch');

async function testJupiterV2() {
  console.log('Testing Jupiter v2 Order API...');

  const API_KEY = 'jup_4801d87679ec9083587ffd94be3e3abd233a0057963b63da729dd56ac4b53a3a';

  const orderUrl = 'https://api.jup.ag/swap/v2/order?' +
    'inputMint=So11111111111111111111111111111111111111112' +     // SOL
    '&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' + // USDC
    '&amount=1000000' +                                           // 0.001 SOL
    '&slippageBps=50' +
    '&taker=11111111111111111111111111111111' +                   // Test public key
    '&mode=ExactIn';

  try {
    console.log(`\nTesting: ${orderUrl}`);
    const startTime = Date.now();

    const res = await fetch(orderUrl, {
      method: 'GET',
      timeout: 15000,
      headers: {
        'User-Agent': 'SempaiHQ/1.0',
        'Accept': 'application/json',
        'x-api-key': API_KEY
      }
    });

    const endTime = Date.now();
    console.log(`Status: ${res.status} ${res.statusText}`);
    console.log(`Response time: ${endTime - startTime}ms`);

    if (res.ok) {
      const data = await res.json();
      console.log('✅ Success! Order received');
      console.log(`Input amount: ${data.inAmount}`);
      console.log(`Output amount: ${data.outAmount}`);
      console.log(`Price impact: ${data.priceImpactPct || 'N/A'}%`);
      console.log(`Route plan steps: ${data.routePlan?.length || 0}`);
      console.log(`Transaction available: ${!!data.transaction}`);
      console.log(`Last valid block height: ${data.lastValidBlockHeight}`);
      console.log(`Gasless: ${data.gasless}`);
      
      if (data.transaction) {
        console.log(`Transaction length: ${data.transaction.length} characters`);
      }
    } else {
      console.log(`❌ Failed: ${res.status} ${res.statusText}`);
      const errorText = await res.text();
      console.log(`Error body: ${errorText}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

testJupiterV2().catch(console.error);
