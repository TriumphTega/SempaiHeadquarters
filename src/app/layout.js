import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";

import WalletProvider from "../components/WalletProvider"; // Adjust path if necessary

export const metadata = {
  title: "Sempai HQ",
  description: "Explore novels and chapters",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{metadata.title}</title>
        <meta name="description" content={metadata.description} />
        {/* Add additional head elements like favicon or fonts here */}
      </head>
      <body>
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}