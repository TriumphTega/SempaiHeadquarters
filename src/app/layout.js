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
    images: ["https://sempaihq.com/images/sempaiCard.png?v=2"],
    type: "website",
    url: "https://sempaihq.com",
    siteName: "Sempai HQ",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sempai HQ - Explore Novels and Chapters",
    description: "Discover amazing novels and chapters on Sempai HQ. Join our community of readers and writers.",
    images: ["https://sempaihq.com/images/sempaiCard.png?v=2"],
    site: "@HomeforSempai",
  },
};

// Runs synchronously in <head>, before the page paints or hydrates.
// Reads the saved preference (or falls back to dark, the site's brand
// default) and stamps it onto <html> so page.module.css's theme tokens
// are already correct on the very first frame — zero flash, zero
// hydration mismatch, and no dependency on React state for the initial
// paint.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('sempai-theme');
    var theme = stored === 'light' || stored === 'dark' ? stored : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="google-site-verification" content="OYvDT560V78ZJJvCu6_innth8NB7fhLLWc_b3Wpk3xQ" />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
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