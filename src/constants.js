// src/constants.js
import { Keypair, PublicKey } from "@solana/web3.js";

if (!process.env.BACKEND_WALLET_KEYPAIR) {
  throw new Error("BACKEND_WALLET_KEYPAIR not found in .env");
}

const treasuryKeypairArray = JSON.parse(process.env.BACKEND_WALLET_KEYPAIR);
export const TREASURY_KEYPAIR = Keypair.fromSecretKey(new Uint8Array(treasuryKeypairArray));
export const TREASURY_PUBLIC_KEY = TREASURY_KEYPAIR.publicKey.toString();

export const AMETHYST_MINT_ADDRESS = new PublicKey("4TxguLvR4vXwpS4CJXEemZ9DUhVYjhmsaTkqJkYrpump");
export const SMP_MINT_ADDRESS = new PublicKey("SMP1xiPwpMiLPpnJtdEmsDGSL9fR1rvat6NFGznKPor");
export const RPC_URL = "https://mainnet.helius-rpc.com/?api-key=ad8457f8-9c51-4122-95d4-91b15728ea90";
export const DEVNET_RPC_URL = "https://api.devnet.solana.com"; // Separate Devnet RPC