"use client";

import dynamic from "next/dynamic";

// Dynamic import for MoonPay provider to avoid SSR issues
const MoonPayProvider = dynamic(
  () => import("@moonpay/moonpay-react").then((mod) => mod.MoonPayProvider),
  { ssr: false }
);

export default function MoonPayWrapper({ children }) {
  return (
    <MoonPayProvider apiKey={process.env.NEXT_PUBLIC_MOONPAY_API_KEY || "pk_test_123"} debug={false}>
      {children}
    </MoonPayProvider>
  );
}
