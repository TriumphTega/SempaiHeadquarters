import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';

import BootstrapProvider from '../components/BootstrapProvider'; // Adjust the path if necessary

export const metadata = {
  title: 'Sempai HQ',
  description: 'Explore novels and chapters',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
