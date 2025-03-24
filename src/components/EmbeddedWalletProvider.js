// components/EmbeddedWalletProvider.js
"use client";

import { createContext, useState, useEffect } from "react";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import CryptoJS from "crypto-js";

export const EmbeddedWalletContext = createContext();

export const EmbeddedWalletProvider = ({ children }) => {
  const [wallet, setWallet] = useState(null); // { publicKey, encryptedSecret }
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const createEmbeddedWallet = (password, importedSecretKey = null) => {
    try {
      setIsLoading(true);
      setError(null);
      let keypair;
      if (importedSecretKey) {
        // Use the imported secret key
        keypair = Keypair.fromSecretKey(importedSecretKey);
      } else {
        // Generate a new keypair if no import
        keypair = Keypair.generate();
      }

      const walletData = {
        publicKey: keypair.publicKey.toBase58(),
        secretKey: keypair.secretKey, // Uint8Array (64 bytes)
      };

      const encryptedSecret = CryptoJS.AES.encrypt(
        JSON.stringify(Array.from(walletData.secretKey)),
        password
      ).toString();

      localStorage.setItem("embeddedWalletPublicKey", walletData.publicKey);
      localStorage.setItem("embeddedWalletSecretEncrypted", encryptedSecret);

      setWallet({ publicKey: walletData.publicKey, encryptedSecret });
      return {
        publicKey: walletData.publicKey,
        privateKey: bs58.encode(walletData.secretKey), // Return base58-encoded private key
      };
    } catch (err) {
      setError("Failed to create wallet. Please try again.");
      console.error(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const publicKey = localStorage.getItem("embeddedWalletPublicKey");
    const encryptedSecret = localStorage.getItem("embeddedWalletSecretEncrypted");
    if (publicKey && encryptedSecret) {
      setWallet({ publicKey, encryptedSecret });
    }
  }, []);

  const getSecretKey = (password) => {
    try {
      const encryptedSecret = localStorage.getItem("embeddedWalletSecretEncrypted");
      if (!encryptedSecret) throw new Error("No embedded wallet found.");
      const bytes = CryptoJS.AES.decrypt(encryptedSecret, password);
      const secretKeyArray = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
      return Uint8Array.from(secretKeyArray);
    } catch (err) {
      setError("Invalid password or corrupted wallet data.");
      console.error(err);
      return null;
    }
  };

  return (
    <EmbeddedWalletContext.Provider
      value={{ wallet, createEmbeddedWallet, getSecretKey, isLoading, error }}
    >
      {children}
    </EmbeddedWalletContext.Provider>
  );
};