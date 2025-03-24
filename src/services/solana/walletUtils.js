// services/solana/walletUtils.js
import { Connection, Keypair } from "@solana/web3.js";
import { AMETHYST_MINT_ADDRESS, SMP_MINT_ADDRESS, RPC_URL } from "@/constants";
export const connection = new Connection(RPC_URL, "confirmed");

export const getWalletFromSecret = (secretKey) => {
  return Keypair.fromSecretKey(secretKey);
};

export const getBalance = async (publicKey) => {
  try {
    const balance = await connection.getBalance(new PublicKey(publicKey));
    return balance / 1e9; // Convert lamports to SOL
  } catch (err) {
    console.error("Error fetching balance:", err);
    return null;
  }
};