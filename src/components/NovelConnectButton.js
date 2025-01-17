import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';

export const NovelConnectButton = () => {
  return (
    <div>
      <WalletMultiButton>
        <span>Connect to Read</span>
      </WalletMultiButton>
    </div>
  );
}
