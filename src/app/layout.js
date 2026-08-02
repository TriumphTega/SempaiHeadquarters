// app/layout.js
import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";
import { EmbeddedWalletProvider } from "../components/EmbeddedWalletProvider"; // Embedded wallet provider
import { AuthProvider } from "../components/AuthProvider"; // Supabase auth provider
import WalletProvider from "../components/WalletProvider"; // Retained to avoid runtime errors in pages still using useWallet
import AppWrapper from "../components/AppWrapper"; // App wrapper for LinkEmailBanner
import MoonPayWrapper from "../components/MoonPayWrapper";

export const metadata = {
  title: "Sempai HQ",
  description: "Explore novels and chapters",
  openGraph: {
    title: "Sempai HQ - Explore Novels and Chapters",
    description: "Discover amazing novels and chapters on Sempai HQ. Join our community of readers and writers.",
    images: ["/images/sempaiCard.png"],
    type: "website",
    url: "https://sempaihq.com",
    siteName: "Sempai HQ",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sempai HQ - Explore Novels and Chapters",
    description: "Discover amazing novels and chapters on Sempai HQ. Join our community of readers and writers.",
    images: ["/images/sempaiCard.png"],
    site: "@HomeforSempai",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="google-site-verification" content="OYvDT560V78ZJJvCu6_innth8NB7fhLLWc_b3Wpk3xQ" />
      </head>
      <body>
        <AuthProvider>
          <WalletProvider>
            <EmbeddedWalletProvider>
              <MoonPayWrapper>
                <AppWrapper>{children}</AppWrapper>
              </MoonPayWrapper>
            </EmbeddedWalletProvider>
          </WalletProvider>
        </AuthProvider>
      </body>
    </html>
  );
}