/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disable React Strict Mode
  env: {
    BACKEND_WALLET_KEYPAIR: process.env.BACKEND_WALLET_KEYPAIR,
  },
};

export default nextConfig;
