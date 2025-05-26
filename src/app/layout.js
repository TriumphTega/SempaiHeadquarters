// app/layout.js
import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";
import WalletProvider from "../components/WalletProvider"; // Existing external wallet provider
import { EmbeddedWalletProvider } from "../components/EmbeddedWalletProvider"; // New embedded wallet provider

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
       <meta name="google-site-verification" content="OYvDT560V78ZJJvCu6_innth8NB7fhLLWc_b3Wpk3xQ" />
        <title>{metadata.title}</title>
        <meta name="description" content={metadata.description} />
        {/* Add additional head elements like favicon or fonts here */}
      </head>
      <body>
        <WalletProvider>
          <EmbeddedWalletProvider>{children}</EmbeddedWalletProvider>
        </WalletProvider>
      </body>
    </html>
  );
}