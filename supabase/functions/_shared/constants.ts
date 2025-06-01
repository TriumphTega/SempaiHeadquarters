import { Connection, PublicKey } from "@solana/web3.js";

export const SMP_MINT_ADDRESS = new PublicKey(
  "SMP1xiPwpMiLPpnJtdEmsDGSL9fR1rvat6NFGznKPor",
);

export const RPC_URL =
  "https://mainnet.helius-rpc.com/?api-key=ad8457f8-9c51-4122-95d4-91b15728ea90";
export const connection = new Connection(RPC_URL);
