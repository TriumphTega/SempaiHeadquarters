'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function ConnectButton() {
  const { connected } = useWallet();

  return (
    <div>
      {!connected ? (
        <WalletMultiButton className="btn btn-warning text-dark" />
      ) : (
        <button className="btn btn-success" disabled>
          Wallet Connected
        </button>
      )}
    </div>
  );
}
