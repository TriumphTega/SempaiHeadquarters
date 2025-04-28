"use client";

import { createContext, useState, useEffect } from "react";
import { Connection, Keypair, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import CryptoJS from "crypto-js";
import { RPC_URL } from "@/constants"; // Ensure RPC_URL is defined in your constants

export const EmbeddedWalletContext = createContext();

export const EmbeddedWalletProvider = ({ children }) => {
  const [wallet, setWallet] = useState(null); // { publicKey, encryptedSecret }
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [passwordPrompt, setPasswordPrompt] = useState(false);
  const [password, setPassword] = useState("");
  const [transactionToSign, setTransactionToSign] = useState(null);
  const [resolveSignPromise, setResolveSignPromise] = useState(null);

  const connection = new Connection(RPC_URL);

  // Create or import an embedded wallet
  const createEmbeddedWallet = (password, importedSecretKey = null) => {
    try {
      setIsLoading(true);
      setError(null);
      let keypair;
      if (importedSecretKey) {
        keypair = Keypair.fromSecretKey(importedSecretKey);
      } else {
        keypair = Keypair.generate();
      }

      const walletData = {
        publicKey: keypair.publicKey.toBase58(),
        secretKey: keypair.secretKey,
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
        privateKey: bs58.encode(walletData.secretKey),
      };
    } catch (err) {
      setError("Failed to create wallet. Please try again.");
      console.error(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Load wallet from localStorage on mount
  useEffect(() => {
    const publicKey = localStorage.getItem("embeddedWalletPublicKey");
    const encryptedSecret = localStorage.getItem("embeddedWalletSecretEncrypted");
    if (publicKey && encryptedSecret) {
      setWallet({ publicKey, encryptedSecret });
    }
  }, []);

  // Decrypt secret key with password
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

  // Sign and send transaction with password prompt
  const signAndSendTransaction = async (transaction) => {
    if (!wallet) {
      throw new Error("Embedded wallet not initialized");
    }

    setPasswordPrompt(true);
    setTransactionToSign(transaction);

    try {
      const signature = await new Promise((resolve, reject) => {
        setResolveSignPromise(() => ({ resolve, reject }));
      });
      return signature;
    } finally {
      setPasswordPrompt(false);
      setPassword("");
      setTransactionToSign(null);
      setResolveSignPromise(null);
    }
  };

  // Handle password submission
  const handlePasswordSubmit = async () => {
    if (!resolveSignPromise || !transactionToSign) return;

    try {
      const secretKey = getSecretKey(password);
      if (!secretKey) {
        resolveSignPromise.reject(new Error("Invalid password"));
        return;
      }

      const keypair = Keypair.fromSecretKey(secretKey);
      const transaction = transactionToSign;

      // Sign the transaction
      transaction.sign([keypair]);

      // Send the transaction
      const signature = await connection.sendRawTransaction(transaction.serialize(), {
        skipPreflight: false,
        maxRetries: 2,
      });

      resolveSignPromise.resolve(signature);
    } catch (error) {
      setError(`Failed to sign transaction: ${error.message}`);
      resolveSignPromise.reject(error);
    }
  };

  // Handle password prompt cancellation
  const handlePasswordCancel = () => {
    if (resolveSignPromise) {
      resolveSignPromise.reject(new Error("Transaction signing cancelled"));
    }
    setPasswordPrompt(false);
    setPassword("");
    setTransactionToSign(null);
    setResolveSignPromise(null);
  };

  return (
    <EmbeddedWalletContext.Provider
      value={{ wallet, createEmbeddedWallet, getSecretKey, signAndSendTransaction, isLoading, error }}
    >
      {passwordPrompt && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "8px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
              width: "300px",
              textAlign: "center",
            }}
          >
            <h2>Enter Password</h2>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={{
                width: "100%",
                padding: "8px",
                margin: "10px 0",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button
                onClick={handlePasswordSubmit}
                style={{
                  padding: "8px 16px",
                  background: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Submit
              </button>
              <button
                onClick={handlePasswordCancel}
                style={{
                  padding: "8px 16px",
                  background: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
            {error && (
              <p style={{ color: "red", marginTop: "10px" }}>{error}</p>
            )}
          </div>
        </div>
      )}
      {children}
    </EmbeddedWalletContext.Provider>
  );
};