import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';

import BootstrapProvider from '../components/BootstrapProvider'; // Adjust the path if necessary
import WalletProvider from '../components/WalletProvider';


export const metadata = {
  title: 'Sempai HQ',
  description: 'Explore novels and chapters',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
