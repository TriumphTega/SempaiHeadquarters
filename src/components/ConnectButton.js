"use client";

import { useEffect, useState, useCallback, useContext, useRef } from "react";
import { supabase } from "../services/supabase/supabaseClient";
import { useRouter } from "next/navigation";
import { EmbeddedWalletContext } from "./EmbeddedWalletProvider";
import { useAuth } from "./AuthProvider";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import styles from "../styles/ConnectButton.module.css";
import { FaWallet, FaRocket, FaKey, FaCopy, FaCheckCircle, FaSpinner, FaTimes, FaGoogle, FaPlug } from "react-icons/fa";

export default function ConnectButton() {
  const { wallet: embeddedWallet, createEmbeddedWallet, retrieveEmbeddedWallet, isLoading: embeddedLoading, error: embeddedError } = useContext(EmbeddedWalletContext);
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  const { publicKey: externalPublicKey, connected: externalConnected, disconnect: externalDisconnect } = useWallet();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userCreated, setUserCreated] = useState(false);
  const [showReferralPrompt, setShowReferralPrompt] = useState(false);
  const [showEmbeddedForm, setShowEmbeddedForm] = useState(false);
  const [showRetrieveForm, setShowRetrieveForm] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [privateKey, setPrivateKey] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrapperRef = useRef(null);
  const [hasWallet, setHasWallet] = useState(null); // null = unknown, true/false known
  const [walletType, setWalletType] = useState(null); // 'embedded' or 'external'
  const [showWalletChoice, setShowWalletChoice] = useState(false);

  const createUserAndBalance = useCallback(async (walletAddress, isExternal = false) => {
    if (!walletAddress) return;

    setIsLoading(true);
    setError(null);
    setUserCreated(false);
    setShowReferralPrompt(false);

    try {
      console.log("Wallet connected:", walletAddress);
      localStorage.setItem("walletAddress", walletAddress);
      localStorage.setItem("walletType", isExternal ? "external" : "embedded");

      const { data: existingUser, error: fetchError } = await supabase
        .from("users")
        .select("id, referral_code, has_updated_profile, email")
        .eq("wallet_address", walletAddress)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        console.error("Error fetching user:", fetchError.message);
        throw new Error(`Failed to check user: ${fetchError.message}`);
      }

      let userId = existingUser?.id;
      const url = new URL(window.location.href);
      const referralCodeFromUrl = url.searchParams.get("ref");
      let referredBy = null;

      if (referralCodeFromUrl && !existingUser) {
        const { data: referrer, error: referrerError } = await supabase
          .from("users")
          .select("wallet_address")
          .eq("referral_code", referralCodeFromUrl)
          .single();
        if (referrerError) {
          console.warn("Referrer lookup failed:", referrerError.message);
        } else {
          referredBy = referrer?.wallet_address || null;
        }
      }

      if (!existingUser) {
        const newReferralCode = `${walletAddress.slice(0, 4)}${Math.random()
          .toString(36)
          .slice(2, 6)
          .toUpperCase()}`;
        const { data: newUser, error: insertError } = await supabase
          .from("users")
          .insert({
            wallet_address: walletAddress,
            isWriter: false,
            isSuperuser: false,
            referral_code: newReferralCode,
            referred_by: referredBy,
            has_updated_profile: false,
          })
          .select("id, referral_code")
          .single();

        if (insertError) {
          console.error("Error creating user:", insertError.message);
          throw new Error(`Failed to create user: ${insertError.message}`);
        }

        userId = newUser.id;
        console.log("New user created successfully:", newUser);
        setUserCreated(true);

        // Save external wallet to user_wallets table (no private key for external wallets)
        if (isExternal) {
          const { error: walletError } = await supabase
            .from("user_wallets")
            .insert({
              user_id: userId,
              address: walletAddress,
              private_key: null // External wallets don't store private keys
            });
          
          if (walletError && walletError.code !== '23505') { // Ignore duplicate key errors
            console.warn("Warning: Could not save external wallet to user_wallets:", walletError.message);
          }
        }

        const { error: balanceError } = await supabase
          .from("wallet_balances")
          .insert({
            user_id: userId,
            wallet_address: walletAddress,
            chain: "SOL",
            currency: "SMP",
            decimals: 6,
            amount: 50000,
          });

        if (balanceError) {
          console.error("Error creating wallet balance:", balanceError.message);
          alert(`Danger: Failed to credit 50,000 SMP - ${balanceError.message}`); // Danger alert
          throw new Error(`Failed to create wallet balance: ${balanceError.message}`);
        }
        console.log("Wallet balance initialized successfully.");
        alert("Success: 50,000 SMP credited to your wallet!"); // Success alert
      }

      if (referralCodeFromUrl && !existingUser?.has_updated_profile) {
        setShowReferralPrompt(true);
      }
    } catch (err) {
      console.error("Error in createUserAndBalance:", err.message);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCreateEmbeddedWallet = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long!");
      return;
    }
    
    // Allow wallet creation without sign-in (wallet-only mode)
    const result = await createEmbeddedWallet(password);
    if (result) {
      const { publicKey, privateKey: newPrivateKey } = result;
      await createUserAndBalance(publicKey, false);
      setPrivateKey(newPrivateKey);
      setShowEmbeddedForm(false);
      setPassword("");
      setConfirmPassword("");
      setShowPopup(false);
      setWalletType('embedded');
      
      // Show the LinkEmailBanner after wallet creation (handled by AppWrapper)
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    function onDocClick(e) {
      if (!wrapperRef?.current) return;
      if (!wrapperRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    }
    if (showMenu) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [showMenu, wrapperRef]);

  // When popup opens and user is signed in, detect if wallet exists on server
  useEffect(() => {
    const checkWallet = async () => {
      if (!showPopup || !user) return;
      try {
        setHasWallet(null);
        const { data, error } = await supabase
          .from("users")
          .select("wallet_address")
          .eq("id", user.id)
          .single();
        if (error) throw error;
        setHasWallet(!!data?.wallet_address);
      } catch (e) {
        console.warn("[ConnectButton] wallet check failed", e?.message || e);
        setHasWallet(false);
      }
    };
    checkWallet();
  }, [showPopup, user]);

  const handleRetrieveEmbeddedWallet = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters long!");
      return;
    }
    const result = await retrieveEmbeddedWallet(password);
    if (result) {
      const { publicKey } = result;
      await createUserAndBalance(publicKey, false);
      setShowRetrieveForm(false);
      setPassword("");
      setShowPopup(false);
      setWalletType('embedded');
    }
  };

  // Handle external wallet connection
  useEffect(() => {
    const handleExternalWallet = async () => {
      if (externalConnected && externalPublicKey) {
        const address = externalPublicKey.toBase58();
        await createUserAndBalance(address, true);
        setWalletType('external');
        setShowPopup(false);
        setShowWalletChoice(false);
      }
    };
    handleExternalWallet();
  }, [externalConnected, externalPublicKey, createUserAndBalance]);

  // Link external wallet to Google account when user signs in after connecting
  useEffect(() => {
    const linkWalletToAccount = async () => {
      if (user && externalConnected && externalPublicKey && walletType === 'external') {
        try {
          const address = externalPublicKey.toBase58();
          
          // Update user with wallet address
          const { error: updateError } = await supabase
            .from('users')
            .update({ wallet_address: address })
            .eq('id', user.id);
          
          if (updateError) {
            console.error('Error linking wallet to account:', updateError);
            return;
          }

          // Check if wallet already exists in user_wallets
          const { data: existingWallet } = await supabase
            .from('user_wallets')
            .select('id')
            .eq('user_id', user.id)
            .eq('address', address)
            .single();

          // Only insert if wallet doesn't exist
          if (!existingWallet) {
            const { error: walletError } = await supabase
              .from('user_wallets')
              .insert({ 
                user_id: user.id, 
                address: address,
                private_key: null // External wallets don't store private keys
              });
            
            if (walletError && walletError.code !== '23505') { // Ignore duplicate key errors
              console.error('Error saving wallet to user_wallets:', walletError);
            }
          }

          console.log('External wallet linked to Google account successfully');
        } catch (err) {
          console.error('Error in linkWalletToAccount:', err);
        }
      }
    };
    linkWalletToAccount();
  }, [user, externalConnected, externalPublicKey, walletType]);

  const handlePromptClose = () => {
    setShowReferralPrompt(false);
    router.push("/");
  };

  const handleProfileUpdate = () => {
    setShowReferralPrompt(false);
    router.push("/editprofile");
  };

  const copyPrivateKey = () => {
    navigator.clipboard.writeText(privateKey);
    alert("Private key copied to clipboard! Store it securely.");
    setPrivateKey(null);
  };

  const clearEmbeddedFromLocal = () => {
    try {
      // Legacy keys
      localStorage.removeItem("embeddedWalletPublicKey");
      localStorage.removeItem("embeddedWalletSecretEncrypted");
      // Per-user scoped keys
      const uid = user?.id || "";
      if (uid) {
        localStorage.removeItem(`embeddedWalletPublicKey:${uid}`);
        localStorage.removeItem(`embeddedWalletSecretEncrypted:${uid}`);
      }
      // Defensive: remove any key matching prefixes
      const toDelete = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (k.startsWith("embeddedWalletPublicKey:") || k.startsWith("embeddedWalletSecretEncrypted:")) {
          toDelete.push(k);
        }
      }
      toDelete.forEach((k) => localStorage.removeItem(k));
    } catch {}
  };

  const handleCopyAddress = () => {
    const address = activeWallet?.publicKey;
    if (address) {
      navigator.clipboard.writeText(address);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const handleDisconnectOnly = async () => {
    if (walletType === 'external' && externalConnected) {
      await externalDisconnect();
    }
    clearEmbeddedFromLocal();
    localStorage.removeItem('walletType');
    setWalletType(null);
    setShowMenu(false);
    window.location.reload();
  };

  const handleSignOutAll = async () => {
    try {
      await signOut(); // sign out Supabase/Google
    } catch {}
    if (walletType === 'external' && externalConnected) {
      await externalDisconnect();
    }
    clearEmbeddedFromLocal();
    localStorage.removeItem('walletType');
    setWalletType(null);
    setShowMenu(false);
    // On next Google sign-in, app can re-link the wallet via existing server association
    window.location.reload();
  };

  if (isLoading || embeddedLoading || authLoading) {
    return (
      <div className={styles.loadingContainer}>
        <FaSpinner className={styles.spinner} />
        <span>Warping...</span>
      </div>
    );
  }

  if (error || embeddedError) {
    return (
      <div className={styles.errorContainer}>
        <p>Error: {error || embeddedError}</p>
        <button className={styles.retryButton} onClick={() => setError(null)}>
          <FaRocket /> Retry
        </button>
      </div>
    );
  }

  // Determine which wallet is active
  const activeWallet = embeddedWallet || (externalConnected && externalPublicKey ? { publicKey: externalPublicKey.toBase58() } : null);
  const isExternal = walletType === 'external' || (externalConnected && !embeddedWallet);

  return (
    <div className={styles.connectButtonWrapper} ref={wrapperRef}>
      {activeWallet ? (
        <div className={styles.walletInfo}>
          <button className={`${styles.singleButton} ${styles.addressButton}`} onClick={() => setShowMenu((m) => !m)} aria-haspopup="menu" aria-expanded={showMenu}>
            <FaWallet className={styles.buttonIcon} /> {activeWallet.publicKey.slice(0, 4)}...{activeWallet.publicKey.slice(-4)}
            {isExternal && <span className={styles.externalBadge}>🔌</span>}
          </button>
          {showMenu && (
            <div className={styles.dropdownMenu}>
              <div className={styles.menuHeader}>
                <div className={styles.menuHeaderTitle}>{isExternal ? 'External Wallet' : 'Embedded Wallet'}</div>
                <div className={styles.menuHeaderSub}>{activeWallet.publicKey.slice(0, 6)}...{activeWallet.publicKey.slice(-6)}</div>
              </div>
              <div className={styles.menuDivider} />
              <button className={styles.menuItem} onClick={handleCopyAddress}>
                <FaCopy /> Copy Address
              </button>
              {copied && <div className={styles.tooltip}>Copied!</div>}
              <div className={styles.menuDivider} />
              <button className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={handleSignOutAll}>
                <FaGoogle /> Sign out
              </button>
              <button className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={handleDisconnectOnly}>
                <FaTimes /> Disconnect
              </button>
            </div>
          )}
        </div>
      ) : (
        <button className={styles.singleButton} onClick={() => setShowPopup(true)}>
          <FaWallet className={styles.buttonIcon} />
        </button>
      )}
      {activeWallet && <span className={styles.connectedStatus}></span>}
      {userCreated && (
        <p className={styles.successMessage}>
          <FaCheckCircle /> Welcome!
        </p>
      )}

      {showPopup && !activeWallet && (
        <div className={styles.popupOverlay}>
          <div className={styles.popup}>
            <button className={styles.closeButton} onClick={() => { setShowPopup(false); setShowWalletChoice(false); }}>
              <FaTimes />
            </button>
            <h3>Get Started</h3>
            <div className={styles.popupOptions}>
              {user && hasWallet === null ? (
                <div className={styles.loadingContainer}>
                  <FaSpinner className={styles.spinner} />
                  <span>Checking wallet...</span>
                </div>
              ) : user && hasWallet ? (
                <>
                  <button
                    className={styles.popupEmbeddedButton}
                    onClick={() => {
                      setShowRetrieveForm(true);
                      setShowPopup(false);
                    }}
                  >
                    <FaKey className={styles.buttonIcon} /> Retrieve My Wallet
                  </button>
                  <button
                    className={styles.cancelButton}
                    onClick={async () => {
                      await signOut();
                      setShowPopup(false);
                    }}
                  >
                    <FaTimes className={styles.buttonIcon} /> Sign Out
                  </button>
                </>
              ) : user && !hasWallet ? (
                <>
                  <button
                    className={styles.popupEmbeddedButton}
                    onClick={() => {
                      setShowEmbeddedForm(true);
                      setShowPopup(false);
                    }}
                  >
                    <FaRocket className={styles.buttonIcon} /> Create In-App Wallet
                  </button>
                  <button
                    className={styles.cancelButton}
                    onClick={async () => {
                      await signOut();
                      setShowPopup(false);
                    }}
                  >
                    <FaTimes className={styles.buttonIcon} /> Sign Out
                  </button>
                </>
              ) : showWalletChoice ? (
                <>
                  <p className={styles.walletOnlyNote}>
                    Choose how you want to connect:
                  </p>
                  <button
                    className={styles.popupEmbeddedButton}
                    onClick={() => {
                      setShowEmbeddedForm(true);
                      setShowPopup(false);
                      setShowWalletChoice(false);
                    }}
                  >
                    <FaRocket className={styles.buttonIcon} /> Create In-App Wallet
                  </button>
                  <div className={styles.divider}>
                    <span>or</span>
                  </div>
                  <div className={styles.externalWalletWrapper}>
                    <WalletMultiButton className={styles.externalWalletButton} />
                  </div>
                  <button
                    className={styles.cancelButton}
                    onClick={() => setShowWalletChoice(false)}
                  >
                    Back
                  </button>
                </>
              ) : (
                <>
                  <p className={styles.walletOnlyNote}>
                    Create a wallet to get started. Sign in is optional for account recovery.
                  </p>
                  <button
                    className={styles.popupEmbeddedButton}
                    onClick={signInWithGoogle}
                  >
                    <FaGoogle className={styles.buttonIcon} /> Sign in with Google (Optional)
                  </button>
                  <div className={styles.divider}>
                    <span>or continue without sign-in</span>
                  </div>
                  <button
                    className={styles.popupWalletButton}
                    onClick={() => setShowWalletChoice(true)}
                  >
                    <FaWallet className={styles.buttonIcon} /> Connect Wallet
                  </button>
                </>
              )}
              <button
                className={styles.cancelButton}
                onClick={() => setShowPopup(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showEmbeddedForm && !activeWallet && (
        <div className={styles.embeddedFormOverlay}>
          <div className={styles.embeddedForm}>
            <h3><FaKey /> Forge Key</h3>
            <p className={styles.securityNote}>
              Secure your cosmic key!
            </p>
            <form onSubmit={handleCreateEmbeddedWallet}>
              <input
                type="password"
                placeholder="Code"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
              />
              <input
                type="password"
                placeholder="Confirm"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={styles.input}
              />
              <button type="submit" className={styles.submitButton}>
                <FaRocket /> Create
              </button>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setShowEmbeddedForm(false)}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      {showRetrieveForm && !activeWallet && (
        <div className={styles.embeddedFormOverlay}>
          <div className={styles.embeddedForm}>
            <h3><FaKey /> Unlock Wallet</h3>
            <p className={styles.securityNote}>
              Enter your wallet password to restore it.
            </p>
            <form onSubmit={handleRetrieveEmbeddedWallet}>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
              />
              <button type="submit" className={styles.submitButton}>
                <FaKey /> Retrieve
              </button>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setShowRetrieveForm(false)}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      {privateKey && (
        <div className={styles.privateKeyOverlay}>
          <div className={styles.privateKeyBox}>
            <h3><FaKey /> Your Key</h3>
            <p className={styles.securityNote}>
              Guard this well!
            </p>
            <textarea
              readOnly
              value={privateKey}
              className={styles.privateKeyText}
            />
            <button onClick={copyPrivateKey} className={styles.copyButton}>
              <FaCopy /> Copy
            </button>
          </div>
        </div>
      )}

      {showReferralPrompt && (
        <div className={styles.referralPromptOverlay}>
          <div className={styles.referralPrompt}>
            <h3 className={styles.promptTitle}>Greetings!</h3>
            <p className={styles.promptMessage}>
              Update profile for rewards!
            </p>
            <div className={styles.promptButtons}>
              <button className={styles.updateButton} onClick={handleProfileUpdate}>
                <FaRocket /> Update
              </button>
              <button className={styles.laterButton} onClick={handlePromptClose}>
                Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}