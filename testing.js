/**
 * token-prices.js
 * ---------------------------------------------------------------------------
 * Standalone debug script — no React Native, no wallet, no dependencies
 * beyond Node's built-in fetch (Node 18+). Run it directly:
 *
 *   node token-prices.js
 *   node token-prices.js --raw     (also dumps full raw API JSON per token)
 *
 * It prints everything relevant to how a token's price/conversion is
 * derived: mint address, decimals, what "1 whole token" looks like in raw
 * base units (the "lamports" style integer that actually goes on-chain),
 * the live USD price from Jupiter's Price API v3, and — for any token v3
 * doesn't have a reliable price for (thin liquidity, single-pool tokens
 * like SMP) — the live /quote-derived price instead, with the full quote
 * response so you can see exactly what produced that number.
 *
 * Fill in TOKENS below with the exact mint addresses from your app's
 * constants.js. SOL and USDC use their standard mainnet addresses by
 * default; SMP / SKR / AMETHYST are placeholders — swap in your real ones.
 * ---------------------------------------------------------------------------
 */

const RAW = process.argv.includes('--raw');

// ---------------------------------------------------------------------------
// Token list — edit this to match your constants.js
// ---------------------------------------------------------------------------
const TOKENS = [
  { symbol: 'SOL', mint: 'So11111111111111111111111111111111111111112', decimals: 9 },
  { symbol: 'USDC', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6 },
  { symbol: 'SMP', mint: 'PASTE_SMP_MINT_ADDRESS_HERE', decimals: 6 },
  { symbol: 'SKR', mint: 'PASTE_SKR_MINT_ADDRESS_HERE', decimals: 6 },
  { symbol: 'AMETHYST', mint: 'PASTE_AMETHYST_MINT_ADDRESS_HERE', decimals: 6 },
];

const USDC_MINT = TOKENS.find((t) => t.symbol === 'USDC').mint;

const priceV3Url = (mints) => `https://lite-api.jup.ag/price/v3?ids=${mints.join(',')}`;
const quoteUrl = (inputMint, outputMint, amountBaseUnits) =>
  `https://lite-api.jup.ag/swap/v1/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountBaseUnits}&slippageBps=50`;

// Pretty-print helpers -------------------------------------------------------
const divider = (char = '─') => console.log(char.repeat(78));
const fmtUsd = (n) =>
  n === null || n === undefined ? '—' : `$${n.toLocaleString('en-US', { maximumFractionDigits: 8 })}`;

async function fetchJson(url) {
  const res = await fetch(url);
  const body = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body };
}

// Ask Jupiter's Swap API what 1 whole token would get you, denominated in
// the outputMint. This is the same fallback used in the app for any token
// the Price API v3 won't quote directly.
async function fetchQuoteDerivedPrice(inputMint, decimals, outputMint) {
  const amountBaseUnits = Math.round(10 ** decimals); // "1 whole token" in raw base units
  const { ok, status, body } = await fetchJson(quoteUrl(inputMint, outputMint, amountBaseUnits));
  if (!ok || !body?.outAmount) {
    return { amountBaseUnits, ok: false, status, raw: body, price: null };
  }
  const outDecimals = outputMint === USDC_MINT ? 6 : null; // extend if you add non-USDC outputs
  const price = outDecimals !== null ? Number(body.outAmount) / 10 ** outDecimals : null;
  return { amountBaseUnits, ok: true, status, raw: body, price };
}

async function main() {
  divider('═');
  console.log('TOKEN CONVERSION / PRICE INSPECTOR');
  divider('═');

  // 1) Batch-fetch USD prices for every token from Price API v3 -------------
  const ids = TOKENS.map((t) => t.mint);
  const v3 = await fetchJson(priceV3Url(ids));
  if (RAW) {
    console.log('\n[raw] Price API v3 response:');
    console.log(JSON.stringify(v3.body, null, 2));
  }
  if (!v3.ok) {
    console.log(`\n⚠ Price API v3 request failed (HTTP ${v3.status}). Continuing with /quote fallback for everything.\n`);
  }

  // 2) Walk every token and print its full conversion picture ---------------
  for (const token of TOKENS) {
    divider();
    console.log(`${token.symbol}`);
    divider();

    console.log(`  Mint address        : ${token.mint}`);
    console.log(`  Decimals            : ${token.decimals}`);

    const oneTokenBaseUnits = Math.round(10 ** token.decimals);
    console.log(`  1 ${token.symbol} in base units${' '.repeat(Math.max(0, 6 - token.symbol.length))}: ${oneTokenBaseUnits.toLocaleString('en-US')}`);
    console.log(`  (i.e. the raw integer amount that goes into an on-chain instruction`);
    console.log(`   for exactly 1 whole ${token.symbol} — SOL calls this unit "lamports";`);
    console.log(`   SPL tokens don't have a special name, it's just base units.)`);

    const v3Entry = v3.body?.[token.mint];
    const v3Price = v3Entry?.usdPrice ?? null;

    console.log(`  Price API v3         : ${v3Price !== null ? fmtUsd(v3Price) + ' (usdPrice, direct)' : 'not returned — v3 considers this mint unreliably priced'}`);

    let finalPrice = v3Price;
    let source = 'price/v3';

    if (v3Price === null) {
      // Fall back to a live quote: "1 whole token -> USDC"
      const quote = await fetchQuoteDerivedPrice(token.mint, token.decimals, USDC_MINT);
      if (quote.ok) {
        finalPrice = quote.price;
        source = '/quote fallback (1 token → USDC)';
        console.log(`  /quote fallback      : ${fmtUsd(quote.price)}`);
        console.log(`    inputMint          : ${token.mint}`);
        console.log(`    outputMint (USDC)  : ${USDC_MINT}`);
        console.log(`    inAmount (base)    : ${quote.raw.inAmount}`);
        console.log(`    outAmount (base)   : ${quote.raw.outAmount}`);
        console.log(`    priceImpactPct     : ${quote.raw.priceImpactPct ?? '—'}`);
        console.log(`    slippageBps        : ${quote.raw.slippageBps ?? '—'}`);
        if (Array.isArray(quote.raw.routePlan)) {
          console.log(`    route (${quote.raw.routePlan.length} hop${quote.raw.routePlan.length === 1 ? '' : 's'}):`);
          quote.raw.routePlan.forEach((hop, i) => {
            const info = hop.swapInfo || {};
            console.log(`      ${i + 1}. ${info.label ?? 'unknown DEX'}  (${info.inputMint?.slice(0, 4)}…→${info.outputMint?.slice(0, 4)}…)`);
          });
        }
        if (RAW) {
          console.log('\n  [raw] /quote response:');
          console.log('  ' + JSON.stringify(quote.raw, null, 2).replace(/\n/g, '\n  '));
        }
      } else {
        console.log(`  /quote fallback      : FAILED (HTTP ${quote.status}) — no price available for ${token.symbol}`);
        if (RAW && quote.raw) {
          console.log('  [raw] /quote error response:');
          console.log('  ' + JSON.stringify(quote.raw, null, 2).replace(/\n/g, '\n  '));
        }
      }
    }

    console.log(`  ── Final price used  : ${finalPrice !== null ? fmtUsd(finalPrice) : '— unavailable —'}  (source: ${source})`);

    if (finalPrice !== null && token.symbol !== 'USDC') {
      const usdcPrice = v3.body?.[USDC_MINT]?.usdPrice ?? 1; // USDC ~= $1, but use live value if we have it
      const priceInUsdc = finalPrice / usdcPrice;
      console.log(`  Price in USDC        : ${priceInUsdc.toLocaleString('en-US', { maximumFractionDigits: 8 })} USDC`);
    }
  }

  // 3) Summary table ----------------------------------------------------------
  divider('═');
  console.log('SUMMARY');
  divider('═');

  const rows = await Promise.all(
    TOKENS.map(async (token) => {
      const v3Price = v3.body?.[token.mint]?.usdPrice ?? null;
      let price = v3Price;
      let source = 'v3';
      if (price === null) {
        const quote = await fetchQuoteDerivedPrice(token.mint, token.decimals, USDC_MINT);
        price = quote.price;
        source = quote.ok ? 'quote' : 'FAILED';
      }
      return {
        symbol: token.symbol,
        decimals: token.decimals,
        '1 token (base units)': Math.round(10 ** token.decimals).toLocaleString('en-US'),
        'price (USD)': price !== null ? fmtUsd(price) : '—',
        source,
      };
    })
  );
  console.table(rows);
}

main().catch((err) => {
  console.error('\nFatal error:', err);
  process.exit(1);
});