import { Keypair } from '@solana/web3.js';

export async function GET() {
  try {
    // Parse the keypair from .env
    const keypairArray = JSON.parse(process.env.TREASURY_WALLET_KEYPAIR);
    const treasuryKeypair = Keypair.fromSecretKey(Uint8Array.from(keypairArray));
    const publicKey = treasuryKeypair.publicKey.toBase58();

    return Response.json({ publicKey });
  } catch (error) {
    console.error("Error deriving treasury public key:", error);
    return Response.json({ error: "Failed to retrieve treasury public key" }, { status: 500 });
  }
}