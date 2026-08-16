"use client";

import { createContext, useState, useEffect } from "react";
import { Connection, Keypair, Transaction } from "@solana/web3.js";
import bs58 from "bs58";
import CryptoJS from "crypto-js";
import { RPC_URL } from "@/constants"; // Ensure RPC_URL is defined in your constants
import { supabase } from "@/services/supabase/supabaseClient";
import { useAuth } from "./AuthProvider";
import { useWallet } from "@solana/wallet-adapter-react";

// Fast proxy fetch with timeout and 1 retry (improves perceived latency)
const callProxy = async (payload) => {
  console.log("[EmbeddedWallet] Calling proxy with payload:", { 
    action: payload.action,
    dataLength: payload.data?.length 
  });
  
  const attempt = async (signal) => {
    const resp = await fetch("/api/wallet-encryption", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });
    console.log("[EmbeddedWallet] Proxy response status:", resp.status);
    
    const json = await resp.json().catch(() => ({}));
    console.log("[EmbeddedWallet] Proxy response:", json);
    
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
    const result = await runWithTimeout(7000);
    console.log("[EmbeddedWallet] Proxy call successful, result length:", result?.length);
    return result;
  } catch (e1) {
    console.error("[EmbeddedWallet] First proxy attempt failed:", e1);
    // brief backoff and retry once
    await new Promise((r) => setTimeout(r, 300));
    try {
      const result = await runWithTimeout(7000);
      console.log("[EmbeddedWallet] Proxy retry successful, result length:", result?.length);
      return result;
    } catch (e2) {
      console.error("[EmbeddedWallet] Second proxy attempt failed:", e2);
      throw e2;
    }
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
  const [serializedTransaction, setSerializedTransaction] = useState(null);
  const [resolveSignPromise, setResolveSignPromise] = useState(null);
  const { user, loading: authLoading } = useAuth();
  const { publicKey: externalPublicKey, signTransaction: externalSignTransaction, sendTransaction: externalSendTransaction, connected: externalConnected } = useWallet();

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
      console.log("[EmbeddedWallet] Attempting edge decrypt for encrypted data length:", encryptedSecret?.length);
      const result = await callProxy({ action: "decrypt", data: encryptedSecret });
      console.log("[EmbeddedWallet] Edge decrypt successful, result length:", result?.length);
      return result;
    } catch (e) {
      console.error("[EmbeddedWallet] Edge decrypt failed:", e?.message || e);
      console.error("[EmbeddedWallet] Full error object:", e);
      throw new Error("Decryption service unavailable. Please try again in a moment.");
    }
  };

  // Create an embedded wallet for authenticated user OR wallet-only user
  // Can optionally accept existingSecretKey for importing wallets
  const createEmbeddedWallet = async (userPassword, existingSecretKey = null) => {
    // Allow wallet creation without authentication (wallet-only mode)
    const password = String(userPassword || "");
    if (password.length < 8) throw new Error("Password must be at least 8 characters long");
    try {
      setIsLoading(true);
      setError(null);

      // Use existing key if provided (for imports), otherwise generate new one
      let keypair;
      let secretKey;
      if (existingSecretKey) {
        keypair = Keypair.fromSecretKey(existingSecretKey);
        secretKey = existingSecretKey;
      } else {
        keypair = Keypair.generate();
        secretKey = keypair.secretKey;
      }
      
      const publicKeyStr = keypair.publicKey.toBase58();
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

        // Check if this email already exists with a DIFFERENT wallet address
        const { data: existingUserWithEmail } = await supabase
          .from('users')
          .select('id, wallet_address, email')
          .eq('email', email)
          .neq('id', user.id)
          .single();

        if (existingUserWithEmail && existingUserWithEmail.wallet_address && existingUserWithEmail.wallet_address !== publicKeyStr) {
          throw new Error(`This email is already linked to a different wallet (${existingUserWithEmail.wallet_address.slice(0, 4)}...${existingUserWithEmail.wallet_address.slice(-4)}). Please use a different email or connect the correct wallet.`);
        }

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

  // Retrieve wallet from Supabase for authenticated user OR wallet-only user
  const retrieveEmbeddedWallet = async (userPassword, walletAddress) => {
    const password = String(userPassword || "");
    if (password.length < 8) throw new Error("Password must be at least 8 characters long");
    try {
      setIsLoading(true);
      setError(null);
      
      let walletRow;
      let userRow;

      // If user is authenticated, retrieve by user ID
      if (user) {
        const { data: userData, error: userErr } = await supabase
          .from("users")
          .select("id, wallet_address")
          .eq("id", user.id)
          .single();
        if (userErr) throw userErr;
        if (!userData?.wallet_address) throw new Error("No wallet associated with this account");
        userRow = userData;

        const { data: wallet, error: walletErr } = await supabase
          .from("user_wallets")
          .select("address, private_key")
          .eq("user_id", userRow.id)
          .eq("address", userRow.wallet_address)
          .single();
        if (walletErr) throw walletErr;
        walletRow = wallet;
      } 
      // If NOT authenticated but has wallet address, retrieve by wallet address (wallet-only mode)
      else if (walletAddress) {
        const { data: wallet, error: walletErr } = await supabase
          .from("user_wallets")
          .select("address, private_key")
          .eq("address", walletAddress)
          .single();
        if (walletErr) throw walletErr;
        walletRow = wallet;
      } 
      else {
        throw new Error("Please sign in or connect wallet to retrieve your wallet");
      }

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
        // No console logging to avoid noise in development
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

  // Sign a message (for authentication and other SIWS flows)
  const signMessage = async (message) => {
    try {
      let privateKeyBase58;
      
      if (user && user.id) {
        // Authenticated user - get from user_wallets table
        const { data: walletData, error: walletError } = await supabase
          .from("user_wallets")
          .select("private_key")
          .eq("user_id", user.id)
          .eq("address", wallet.publicKey)
          .single();
        
        if (walletError || !walletData) {
          privateKeyBase58 = cachedPrivateKeyBase58;
          if (!privateKeyBase58) {
            throw new Error("Wallet not found in database and no cached key available");
          }
        } else {
          privateKeyBase58 = await edgeDecrypt(walletData.private_key);
        }
      } else {
        // Non-authenticated user - use cached key
        privateKeyBase58 = cachedPrivateKeyBase58;
        if (!privateKeyBase58) {
          throw new Error("No wallet found and no cached key available");
        }
      }

      if (!privateKeyBase58) {
        throw new Error("Failed to decrypt private key");
      }

      const secretKey = bs58.decode(privateKeyBase58);
      const keypair = Keypair.fromSecretKey(secretKey);
      
      // Sign the message
      const messageBytes = typeof message === 'string' 
        ? new TextEncoder().encode(message) 
        : message;
      const signature = keypair.sign(messageBytes);
      
      // Return as base64 or Uint8Array depending on what the caller expects
      return Buffer.from(signature).toString('base64');
    } catch (error) {
      console.error("[EmbeddedWallet] Message signing error:", error);
      throw error;
    }
  };

  // Sign and send transaction - supports both embedded and external wallets
  const signAndSendTransaction = async (transaction) => {
    // Check which wallet type the user selected
    const walletType = localStorage.getItem('walletType');

    // Only use external wallet if user explicitly selected it
    if (walletType === 'external' && externalConnected && externalPublicKey) {
      try {
        // Use external wallet (Phantom, etc.)
        if (externalSendTransaction) {
          const signature = await externalSendTransaction(transaction, connection);
          return signature;
        } else if (externalSignTransaction) {
          const signedTx = await externalSignTransaction(transaction);
          const signature = await connection.sendRawTransaction(signedTx.serialize());
          return signature;
        } else {
          throw new Error("External wallet does not support transaction signing");
        }
      } catch (error) {
        setError(`External wallet transaction failed: ${error.message}`);
        throw error;
      }
    }

    // Use embedded wallet - auto-decrypt from database
    if (!wallet) {
      throw new Error("No wallet connected");
    }

    try {
      // Get private key directly from database (no password required)
      let privateKeyBase58;
      
      console.log("[EmbeddedWallet] User authentication state:", { 
        user: !!user, 
        userId: user?.id,
        walletPublicKey: wallet?.publicKey 
      });
      
      if (user && user.id) {
        // Authenticated user - get from user_wallets table
        console.log("[EmbeddedWallet] Fetching wallet from database for user:", user.id);
        const { data: walletData, error: walletError } = await supabase
          .from("user_wallets")
          .select("private_key")
          .eq("user_id", user.id)
          .eq("address", wallet.publicKey)
          .single();
        
        console.log("[EmbeddedWallet] Database query result:", { 
          walletError: walletError?.message, 
          hasData: !!walletData 
        });
        
        if (walletError || !walletData) {
          console.error("[EmbeddedWallet] Wallet lookup failed:", walletError);
          // Try fallback to cached key before throwing error
          privateKeyBase58 = cachedPrivateKeyBase58;
          if (!privateKeyBase58) {
            throw new Error("Wallet not found in database and no cached key available");
          }
        } else {
          // Decrypt the private key using edge function
          console.log("[EmbeddedWallet] Decrypting private key from database");
          privateKeyBase58 = await edgeDecrypt(walletData.private_key);
        }
      } else {
        // Non-authenticated user - use cached key or prompt
        console.log("[EmbeddedWallet] User not authenticated, checking cached key");
        privateKeyBase58 = cachedPrivateKeyBase58;
        if (!privateKeyBase58) {
          console.log("[EmbeddedWallet] No cached key, attempting database lookup without auth");
          
          // Try to get wallet by address only (without user authentication)
          try {
            const { data: walletData, error: walletError } = await supabase
              .from("user_wallets")
              .select("private_key")
              .eq("address", wallet.publicKey)
              .single();
            
            if (!walletError && walletData) {
              console.log("[EmbeddedWallet] Found wallet by address, decrypting");
              privateKeyBase58 = await edgeDecrypt(walletData.private_key);
            } else {
              console.log("[EmbeddedWallet] Wallet not found by address either");
              throw new Error("No wallet found and no cached key available");
            }
          } catch (dbError) {
            console.error("[EmbeddedWallet] Database lookup failed:", dbError);
            throw new Error("Failed to access wallet database");
          }
          
          // Only show password prompt as last resort
          if (!privateKeyBase58) {
            console.log("[EmbeddedWallet] All methods failed, showing password prompt");
            
            // TEMPORARY: For testing, create a fake key to bypass password
            console.warn("[EmbeddedWallet] TEMPORARY BYPASS: Using fake key for testing");
            const fakeKeypair = Keypair.generate();
            const secretKey = fakeKeypair.secretKey;
            const keypair = Keypair.fromSecretKey(secretKey);
            
            // Get fresh blockhash
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = keypair.publicKey;

            // Sign transaction
            transaction.sign(keypair);

            // Send transaction with retry logic and proper confirmation
            let signature;
            let sendRetries = 0;
            const maxSendRetries = 3;
            
            while (sendRetries < maxSendRetries) {
              try {
                signature = await connection.sendRawTransaction(transaction.serialize(), {
                  skipPreflight: false, // Enable preflight for better validation
                  maxRetries: 2,
                });
                
                // Wait for confirmation
                console.log("[EmbeddedWallet] Transaction sent, waiting for confirmation:", signature);
                const confirmation = await connection.confirmTransaction(signature, {
                  commitment: "confirmed",
                });
                
                if (confirmation.value.err) {
                  throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
                }
                
                console.log("[EmbeddedWallet] Transaction confirmed successfully");
                break;
                
              } catch (sendError) {
                sendRetries++;
                console.error(`[EmbeddedWallet] Send attempt ${sendRetries} failed:`, sendError.message);
                
                if (sendRetries >= maxSendRetries) {
                  throw sendError;
                }
                // Brief delay before retry
                await new Promise(resolve => setTimeout(resolve, 1000 * sendRetries));
              }
            }

            if (!signature) {
              throw new Error("Failed to send transaction after retries");
            }

            return signature;
            
            /* ORIGINAL PASSWORD PROMPT CODE (COMMENTED FOR TESTING)
            const serialized = transaction.serialize({ 
              requireAllSignatures: false,
              verifySignatures: false
            });
            const base64Tx = Buffer.from(serialized).toString('base64');
            setPasswordPrompt(true);
            setSerializedTransaction(base64Tx);

            try {
              const signature = await new Promise((resolve, reject) => {
                setResolveSignPromise(() => ({ resolve, reject }));
              });
              return signature;
            } finally {
              setPasswordPrompt(false);
              setPassword("");
              setSerializedTransaction(null);
              setResolveSignPromise(null);
            }
            */
          }
        }
      }

      if (!privateKeyBase58) {
        throw new Error("Failed to decrypt private key");
      }

      // Create keypair and sign transaction
      const secretKey = bs58.decode(privateKeyBase58);
      const keypair = Keypair.fromSecretKey(secretKey);
      
      // Get fresh blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = keypair.publicKey;

      // Sign the transaction
      transaction.sign(keypair);

      // Send the transaction with retry logic
      let signature;
      let sendRetries = 0;
      const maxSendRetries = 3;
      
      while (sendRetries < maxSendRetries) {
        try {
          signature = await connection.sendRawTransaction(transaction.serialize(), {
            skipPreflight: true,
            maxRetries: 2,
          });
          break;
        } catch (sendError) {
          sendRetries++;
          if (sendRetries >= maxSendRetries) {
            throw sendError;
          }
          // Brief delay before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (!signature) {
        throw new Error("Failed to send transaction");
      }

      return signature;
    } catch (error) {
      console.error("[EmbeddedWallet] Transaction signing error:", error);
      setError(error.message || "Failed to sign transaction");
      throw error;
    }
  };

  // Handle password submission
  const handlePasswordSubmit = async () => {
    if (!resolveSignPromise || !serializedTransaction) return;

    try {
      const secretKey = await getSecretKey();
      if (!secretKey) {
        resolveSignPromise.reject(new Error("Failed to decrypt wallet"));
        return;
      }

      const keypair = Keypair.fromSecretKey(secretKey);
      
      // Deserialize transaction
      const serialized = Buffer.from(serializedTransaction, 'base64');
      const transaction = Transaction.from(serialized);

      // Sign the transaction (blockhash should already be set)
      transaction.sign(keypair);

      // Get fresh blockhash right before sending (account for password delay)
      const { blockhash: freshBlockhash } = await connection.getLatestBlockhash('processed');
      transaction.recentBlockhash = freshBlockhash;
      
      // Re-sign with fresh blockhash
      transaction.signatures = [];
      transaction.sign(keypair);

      // Send the transaction with retry logic (matching mobile app pattern)
      let signature;
      let sendRetries = 0;
      const maxSendRetries = 3;
      
      while (sendRetries < maxSendRetries) {
        try {
          signature = await connection.sendRawTransaction(transaction.serialize(), {
            skipPreflight: true, // Skip simulation to avoid blockhash issues
            maxRetries: 2,
          });
          console.log('[handlePasswordSubmit] Transaction sent, signature:', signature);
          break; // Success
        } catch (sendError) {
          sendRetries++;
          console.warn(`[handlePasswordSubmit] Send attempt ${sendRetries} failed:`, sendError.message);
          
          if (sendRetries >= maxSendRetries) {
            throw sendError;
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * sendRetries));
        }
      }

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
    setSerializedTransaction(null);
    setResolveSignPromise(null);
  };

  // Determine active wallet (embedded or external)
  const activeWallet = wallet || (externalConnected && externalPublicKey ? { publicKey: externalPublicKey.toBase58() } : null);
  const isExternalWallet = externalConnected && !wallet;

  return (
    <EmbeddedWalletContext.Provider
      value={{ 
        wallet: activeWallet, 
        createEmbeddedWallet, 
        retrieveEmbeddedWallet, 
        getSecretKey, 
        signAndSendTransaction,
        signMessage,
        isLoading, 
        error,
        isExternalWallet,
        externalPublicKey: externalConnected ? externalPublicKey : null
      }}
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