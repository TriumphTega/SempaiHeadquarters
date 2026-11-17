// The treasury's public address. (This route used to load a private key from
// TREASURY_WALLET_KEYPAIR just to work out the address — no longer.)
import { TREASURY_PUBLIC_KEY } from "@/constants";

export async function GET() {
  return Response.json({ publicKey: TREASURY_PUBLIC_KEY });
}
