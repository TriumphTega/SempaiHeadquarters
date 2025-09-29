"use client";

import { createContext, useState, useEffect } from "react";
import { Connection, Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import CryptoJS from "crypto-js";
import { RPC_URL } from "@/constants"; // Ensure RPC_URL is defined in your constants
import { supabase } from "@/services/supabase/supabaseClient";
import { useAuth } from "./AuthProvider";

// Fast proxy fetch with timeout and 1 retry (improves perceived latency)
const callProxy = async (payload) => {
  const attempt = async (signal) => {
    const resp = await fetch("/api/wallet-encryption", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(json?.error || `Proxy error (${resp.status})`);
    if (!json?.result) throw new Error("Proxy did not return 'result'");
    return json.result;
  };

  const runWithTimeout = (ms) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort("timeout"), ms);
    return attempt(ctrl.signal)
      .finally(() => clearTimeout(timer));
  };

  try {
    return await runWithTimeout(7000);
  } catch (e1) {
    // brief backoff and retry once
    await new Promise((r) => setTimeout(r, 300));
    return await runWithTimeout(7000);
  }
};

export const EmbeddedWalletContext = createContext();

export const EmbeddedWalletProvider = ({ children }) => {
  const [wallet, setWallet] = useState(null); // { publicKey, encryptedSecret }
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [passwordPrompt, setPasswordPrompt] = useState(false);
  const [password, setPassword] = useState("");
  const [transactionToSign, setTransactionToSign] = useState(null);
  const [resolveSignPromise, setResolveSignPromise] = useState(null);
  const { user, loading: authLoading } = useAuth();

  const connection = new Connection(RPC_URL);
  const WALLET_FUNCTION = process.env.NEXT_PUBLIC_WALLET_FUNCTION || "wallet-encryption";
  // Session-scoped cache to avoid repeated decrypts
  const [cachedPrivateKeyBase58, setCachedPrivateKeyBase58] = useState(null);

  // localStorage key helpers (per-user scoping)
  const pubKeyName = (uid) => `embeddedWalletPublicKey:${uid || "nouser"}`;
  const encKeyName = (uid) => `embeddedWalletSecretEncrypted:${uid || "nouser"}`;

  const getAuthHeaders = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data?.session?.access_token;
      return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
    } catch {
      return {};
    }
  };

  // Mobile parity: body { action, data }, response { result }
  const edgeEncrypt = async (privateKeyBase58) => {
    try {
      return await callProxy({ action: "encrypt", data: privateKeyBase58 });
    } catch (e) {
      console.error("[EmbeddedWallet] Edge encrypt failed:", e?.message || e);
      throw new Error("Encryption service unavailable. Please try again in a moment.");
    }
  };

  const edgeDecrypt = async (encryptedSecret) => {
    try {
      return await callProxy({ action: "decrypt", data: encryptedSecret });
    } catch (e) {
      console.error("[EmbeddedWallet] Edge decrypt failed:", e?.message || e);
      throw new Error("Decryption service unavailable. Please try again in a moment.");
    }
  };

  // Create an embedded wallet for the authenticated user
  const createEmbeddedWallet = async (userPassword) => {
    if (!user && !authLoading) {
      throw new Error("Please sign in to create a wallet");
    }
    const password = String(userPassword || "");
    if (password.length < 8) throw new Error("Password must be at least 8 characters long");
    try {
      setIsLoading(true);
      setError(null);

      const keypair = Keypair.generate();
      const publicKeyStr = keypair.publicKey.toBase58();
      const secretKey = keypair.secretKey;
      const privateKeyBase58 = bs58.encode(secretKey);

      // Encrypt via Edge Function (fallback to local if needed)
      const encryptedSecret = await edgeEncrypt(privateKeyBase58);
      // Cache private key for session speed
      setCachedPrivateKeyBase58(privateKeyBase58);

      // Persist locally for quick access (scoped to user)
      // Clear legacy generic keys to avoid cross-account bleed
      try {
        localStorage.removeItem("embeddedWalletPublicKey");
        localStorage.removeItem("embeddedWalletSecretEncrypted");
      } catch {}
      const uid = user?.id || "nouser";
      localStorage.setItem(pubKeyName(uid), publicKeyStr);
      localStorage.setItem(encKeyName(uid), encryptedSecret);

      // Upsert user and wallet in Supabase
      if (user) {
        const email = user.email;
        const name = user.user_metadata?.full_name || email?.split("@")[0] || null;
        const image = user.user_metadata?.avatar_url || null;

        const { data: upserted, error: upsertErr } = await supabase
          .from("users")
          .upsert(
            { id: user.id, email, name, image, wallet_address: publicKeyStr, has_updated_profile: false },
            { onConflict: "id" }
          )
          .select("id")
          .single();
        if (upsertErr) throw upsertErr;

        const { error: walletErr } = await supabase
          .from("user_wallets")
          .insert({ user_id: upserted.id, address: publicKeyStr, private_key: encryptedSecret });
        if (walletErr) throw walletErr;
      }

      setWallet({ publicKey: publicKeyStr, encryptedSecret });
      return { publicKey: publicKeyStr, privateKey: privateKeyBase58 };
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to create wallet");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Retrieve wallet from Supabase for the authenticated user
  const retrieveEmbeddedWallet = async (userPassword) => {
    if (!user && !authLoading) {
      throw new Error("Please sign in to retrieve your wallet");
    }
    const password = String(userPassword || "");
    if (password.length < 8) throw new Error("Password must be at least 8 characters long");
    try {
      setIsLoading(true);
      setError(null);
      const { data: userRow, error: userErr } = await supabase
        .from("users")
        .select("id, wallet_address")
        .eq("id", user.id)
        .single();
      if (userErr) throw userErr;
      if (!userRow?.wallet_address) throw new Error("No wallet associated with this account");

      const { data: walletRow, error: walletErr } = await supabase
        .from("user_wallets")
        .select("address, private_key")
        .eq("user_id", userRow.id)
        .eq("address", userRow.wallet_address)
        .single();
      if (walletErr) throw walletErr;

      // Decrypt via Edge Function (fallback to local if needed)
      const decryptedPrivateKey = await edgeDecrypt(walletRow.private_key);
      if (!decryptedPrivateKey) throw new Error("Invalid password or corrupted key");
      // Cache private key for session speed
      setCachedPrivateKeyBase58(decryptedPrivateKey);

      // Validate matches address
      const keypair = Keypair.fromSecretKey(bs58.decode(decryptedPrivateKey));
      const publicKeyStr = keypair.publicKey.toBase58();
      if (publicKeyStr !== walletRow.address) throw new Error("Public key mismatch");

      // Re-encrypt (using edge for consistency) and store locally for use
      const encryptedSecret = await edgeEncrypt(decryptedPrivateKey);
      // Persist locally (scoped to user) and clear legacy keys
      try {
        localStorage.removeItem("embeddedWalletPublicKey");
        localStorage.removeItem("embeddedWalletSecretEncrypted");
      } catch {}
      const uid = user?.id || "nouser";
      localStorage.setItem(pubKeyName(uid), publicKeyStr);
      localStorage.setItem(encKeyName(uid), encryptedSecret);
      setWallet({ publicKey: publicKeyStr, encryptedSecret });
      return { publicKey: publicKeyStr, privateKey: decryptedPrivateKey };
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to retrieve wallet");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Load wallet from localStorage when auth is ready
  useEffect(() => {
    if (authLoading) return;
    const uid = user?.id;
    if (!uid) {
      // No signed-in user: do not auto-load any wallet
      setWallet(null);
      return;
    }
    const publicKey = localStorage.getItem(pubKeyName(uid));
    const encryptedSecret = localStorage.getItem(encKeyName(uid));
    if (publicKey && encryptedSecret) {
      setWallet({ publicKey, encryptedSecret });
    } else {
      setWallet(null);
    }
  }, [authLoading, user?.id]);

  // Pre-warm decryption cache in background to reduce first-time latency
  useEffect(() => {
    const prewarm = async () => {
      try {
        if (wallet?.encryptedSecret && !cachedPrivateKeyBase58) {
          const pk = await edgeDecrypt(wallet.encryptedSecret);
          if (pk) setCachedPrivateKeyBase58(pk);
        }
      } catch {
        // Silent: if prewarm fails, normal flow will handle errors later
      }
    };
    prewarm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet?.encryptedSecret]);

  // Decrypt secret key using Edge Function (ignores local password, aligns with mobile)
  const getSecretKey = async () => {
    try {
      // Prefer cached private key for speed
      let privateKeyBase58 = cachedPrivateKeyBase58;
      if (!privateKeyBase58) {
        const uid = user?.id || "nouser";
        const encryptedSecret = localStorage.getItem(encKeyName(uid));
        if (!encryptedSecret) throw new Error("No embedded wallet found.");
        privateKeyBase58 = await edgeDecrypt(encryptedSecret);
        setCachedPrivateKeyBase58(privateKeyBase58);
      }
      if (!privateKeyBase58) throw new Error("Corrupted wallet data.");
      return bs58.decode(privateKeyBase58);
    } catch (err) {
      setError("Failed to decrypt wallet data.");
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
      const secretKey = await getSecretKey();
      if (!secretKey) {
        resolveSignPromise.reject(new Error("Failed to decrypt wallet"));
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
      value={{ wallet, createEmbeddedWallet, retrieveEmbeddedWallet, getSecretKey, signAndSendTransaction, isLoading, error }}
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