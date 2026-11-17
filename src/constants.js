// src/constants.js
import { PublicKey, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

// The ONLY treasury: all platform shares and payments go here. Public
// address only — no private key is read or kept anywhere in this code.
const TREASURY_PUBLIC_KEY = '71fLWcS1rvkfyYZvBjHUwHZQbcenk5Bdj2ebXBsgfZzD';

export { TREASURY_PUBLIC_KEY };

export const AMETHYST_MINT_ADDRESS = new PublicKey('4TxguLvR4vXwpS4CJXEemZ9DUhVYjhmsaTkqJkYrpump');
export const SMP_MINT_ADDRESS = new PublicKey('SMP1xiPwpMiLPpnJtdEmsDGSL9fR1rvat6NFGznKPor');
export const USDC_MINT_ADDRESS = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
export const SKR_MINT_ADDRESS = new PublicKey('SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3'); // Replace with actual SKR mint address
export const DEVNET_RPC_URL = 'https://api.devnet.solana.com';
export const RPC_URL = 'https://mainnet.helius-rpc.com/?api-key=10569fbb-6306-4fd1-868d-ae082d32204a';
export const TARGET_WALLET = TREASURY_PUBLIC_KEY;
export const SMP_DECIMALS = 6;
export const AMETHYST_DECIMALS = 6;
export const LAMPORTS_PER_SOL = 1_000_000_000;

// Fallback SMP price: 1 USDC = 32,847,067.641303 SMP
// This is used when live price fetching fails due to low liquidity or network issues
export const SMP_FALLBACK_PRICE_USDC = 32_847_067.641303;
