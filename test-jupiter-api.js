// Updated test script - Jupiter Swap v1 Quote API (2026)
const fetch = require('cross-fetch');

async function testJupiterAPI() {
  console.log('Testing CURRENT Jupiter API (v1/quote)...');

  // Get your free API key at https://developers.jup.ag/portal
  const API_KEY = 'jup_4801d87679ec9083587ffd94be3e3abd233a0057963b63da729dd56ac4b53a3a';   // ←←← REPLACE THIS

  const quoteUrl = 'https://api.jup.ag/swap/v1/quote?' +
    'inputMint=So11111111111111111111111111111111111111112' +     // SOL
    '&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' + // USDC
    '&amount=2000000' +                                           // 0.002 SOL
    '&slippageBps=50';

  try {
    console.log(`\nTesting: ${quoteUrl}`);
    const startTime = Date.now();

    const res = await fetch(quoteUrl, {
      method: 'GET',
      timeout: 10000,
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
      console.log('✅ Success! Quote received');
      console.log(`Input amount : ${data.inAmount}`);
      console.log(`Output amount: ${data.outAmount}`);
      console.log(`Price impact : ${data.priceImpactPct || 'N/A'}%`);
      console.log(`Route plan steps: ${data.routePlan?.length || 0}`);
    } else {
      console.log(`❌ Failed: ${res.status} ${res.statusText}`);
      const errorText = await res.text();
      console.log(`Error body: ${errorText}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

testJupiterAPI().catch(console.error);