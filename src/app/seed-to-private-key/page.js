// app/seed-to-private-key/page.js
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as bip39 from "bip39";
import { derivePath } from "ed25519-hd-key";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import styles from "../../styles/SeedToPrivateKey.module.css"; // Create a corresponding CSS module

export default function SeedToPrivateKey() {
  const [seedPhrase, setSeedPhrase] = useState("");
  const [privateKey, setPrivateKey] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const handleConvert = async (e) => {
    e.preventDefault();
    setError(null);
    setPrivateKey(null);
    setCopied(false);

    try {
      // Validate seed phrase
      if (seedPhrase.split(/\s+/).length !== 12 || !bip39.validateMnemonic(seedPhrase)) {
        throw new Error("Invalid seed phrase. Please enter a valid 12-word seed phrase.");
      }

      // Convert seed phrase to seed
      const seed = await bip39.mnemonicToSeed(seedPhrase); // 64-byte seed
      // Derive Solana keypair using standard path m/44'/501'/0'/0'
      const derivedSeed = derivePath("m/44'/501'/0'/0'", seed).key; // 32-byte seed
      const keypair = Keypair.fromSeed(derivedSeed);
      const secretKey = keypair.secretKey; // 64-byte secretKey

      // Convert secret key to base58
      const privateKeyBase58 = bs58.encode(secretKey);
      setPrivateKey(privateKeyBase58);
    } catch (err) {
      setError("Error converting seed phrase. Please check your input.");
      console.error(err);
    }
  };

  const handleCopy = () => {
    if (privateKey) {
      navigator.clipboard.writeText(privateKey).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // Reset copied state after 2 seconds
      });
    }
  };

  return (
    <div className={styles.container}>
      <h1>Convert Seed Phrase to Private Key</h1>
      <p className={styles.securityNote}>
        Enter your 12-word seed phrase to convert it to a Solana private key (base58 format). This process is performed client-side; your seed phrase and private key are not sent anywhere.
      </p>
      <form onSubmit={handleConvert} className={styles.form}>
        <textarea
          placeholder="Enter your 12-word seed phrase"
          value={seedPhrase}
          onChange={(e) => setSeedPhrase(e.target.value.trim())}
          className={styles.textarea}
          rows={4}
        />
        <button type="submit" className={styles.convertButton}>
          Convert
        </button>
      </form>
      {privateKey && (
        <div className={styles.result}>
          <h3>Private Key (base58):</h3>
          <p className={styles.privateKey}>{privateKey}</p>
          <button onClick={handleCopy} className={styles.copyButton}>
            {copied ? "Copied!" : "Copy to Clipboard"}
          </button>
          <p className={styles.warning}>
            Warning: Keep your private key secure. Do not share it with anyone.
          </p>
        </div>
      )}
      {error && <p className={styles.error}>{error}</p>}
      <button onClick={() => router.push("/")} className={styles.backButton}>
        Back to Home
      </button>
    </div>
  );
}