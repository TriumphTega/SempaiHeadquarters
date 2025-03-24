// app/wallet-import/page.js
"use client";

import { useState, useContext } from "react";
import { useRouter } from "next/navigation";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import CryptoJS from "crypto-js";
import * as bip39 from "bip39";
import { derivePath } from "ed25519-hd-key"; // Import for HD key derivation
import { EmbeddedWalletContext } from "../../components/EmbeddedWalletProvider";
import styles from "../../styles/WalletImport.module.css";

export default function WalletImport() {
  const { createEmbeddedWallet } = useContext(EmbeddedWalletContext);
  const router = useRouter();
  const [input, setInput] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);

  const handleImport = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long!");
      return;
    }

    try {
      setError(null);
      let secretKey;

      // Check if input is a 12-word seed phrase
      if (input.split(/\s+/).length === 12 && bip39.validateMnemonic(input)) {
        const seed = await bip39.mnemonicToSeed(input); // 64-byte seed
        // Derive Solana keypair using standard path m/44'/501'/0'/0'
        const derivedSeed = derivePath("m/44'/501'/0'/0'", seed).key; // 32-byte seed
        const keypair = Keypair.fromSeed(derivedSeed);
        secretKey = keypair.secretKey; // 64-byte secretKey (32-byte private + 32-byte public)
      }
      // Assume base58 private key (Solana's secretKey is 64 bytes)
      else {
        secretKey = bs58.decode(input); // Decode base58 to Uint8Array
        if (secretKey.length !== 64) {
          throw new Error("Invalid private key length. Expected 64 bytes.");
        }
        // Verify the keypair is valid
        Keypair.fromSecretKey(secretKey); // This will throw if invalid
      }

      // Encrypt the secret key with the user's password
      const encryptedSecret = CryptoJS.AES.encrypt(
        JSON.stringify(Array.from(secretKey)),
        password
      ).toString();

      // Store in localStorage
      const publicKey = Keypair.fromSecretKey(secretKey).publicKey.toBase58();
      localStorage.setItem("embeddedWalletPublicKey", publicKey);
      localStorage.setItem("embeddedWalletSecretEncrypted", encryptedSecret);

      // Use the imported secret key instead of generating a new one
      const result = await createEmbeddedWallet(password, secretKey);
      if (result) {
        router.push("/");
      } else {
        throw new Error("Failed to initialize wallet context.");
      }
    } catch (err) {
      setError("Invalid private key or seed phrase. Please check your input.");
      console.error(err);
    }
  };

  return (
    <div className={styles.container}>
      <h1>Import Wallet</h1>
      <p className={styles.securityNote}>
        Enter your private key (base58 format) or 12-word seed phrase to import your wallet. This process happens client-side; no one, including developers, can access your input.
      </p>
      <form onSubmit={handleImport} className={styles.form}>
        <textarea
          placeholder="Enter your private key (base58) or 12-word seed phrase"
          value={input}
          onChange={(e) => setInput(e.target.value.trim())}
          className={styles.textarea}
          rows={4}
        />
        <input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.input}
        />
        <input
          type="password"
          placeholder="Confirm password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={styles.input}
        />
        <button type="submit" className={styles.importButton}>
          Import Wallet
        </button>
        {error && <p className={styles.error}>{error}</p>}
      </form>
      <button onClick={() => router.push("/")} className={styles.backButton}>
        Back to Home
      </button>
    </div>
  );
}