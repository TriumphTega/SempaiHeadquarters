"use client";

import { useState, useEffect, useContext } from "react";
import { supabase } from "../services/supabase/supabaseClient";
import { EmbeddedWalletContext } from "./EmbeddedWalletProvider";
import { useWallet } from "@solana/wallet-adapter-react";
import { FaToggleOn, FaToggleOff, FaShieldAlt, FaCheckCircle } from "react-icons/fa";
import styles from "../styles/AutopaySettings.module.css";

const AutopaySettings = ({ onAutopayToggle, walletAddress: propWalletAddress }) => {
  const { activeWalletAddress: embeddedWalletAddress } = useContext(EmbeddedWalletContext);
  const { publicKey: externalPublicKey, connected: externalConnected } = useWallet();

  // Use prop wallet address first, then embedded wallet, then external wallet
  const activeWalletAddress = propWalletAddress || embeddedWalletAddress || (externalConnected && externalPublicKey ? externalPublicKey.toString() : null);

  const [autopayEnabled, setAutopayEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [embers, setEmbers] = useState([]);

  useEffect(() => {
    const buildEmbers = (count = 12) =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 6}s`,
        duration: `${7 + Math.random() * 6}s`,
        size: 2 + Math.floor(Math.random() * 3),
        opacity: 0.3 + Math.random() * 0.6,
      }));
    setEmbers(buildEmbers(12));
  }, []);

  useEffect(() => {
    fetchAutopayPreference();
  }, [activeWalletAddress]);

  const fetchAutopayPreference = async () => {
    if (!activeWalletAddress) {
      setLoading(false);
      return;
    }

    try {
      // First get user ID from wallet address
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, autopay_enabled")
        .eq("wallet_address", activeWalletAddress)
        .maybeSingle();

      if (userError) throw userError;

      if (userData) {
        setAutopayEnabled(userData.autopay_enabled || false);
      } else {
        setAutopayEnabled(false);
      }
    } catch (error) {
      console.error("[AutopaySettings] Error fetching preference:", error);
      setAutopayEnabled(false);
    } finally {
      setLoading(false);
    }
  };

  const toggleAutopay = async () => {
    if (!activeWalletAddress) return;

    setSaving(true);
    try {
      const newValue = !autopayEnabled;

      // First get user ID from wallet address
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("wallet_address", activeWalletAddress)
        .maybeSingle();

      if (userError || !userData) {
        throw new Error("User not found");
      }

      // Update by user ID
      const { error } = await supabase
        .from("users")
        .update({ autopay_enabled: newValue })
        .eq("id", userData.id);

      if (error) throw error;

      setAutopayEnabled(newValue);
      if (onAutopayToggle) onAutopayToggle(newValue);
    } catch (error) {
      console.error("[AutopaySettings] Error toggling autopay:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '20px', color: '#ccc' }}>Loading autopay settings...</div>;

  if (!activeWalletAddress) {
    return (
      <div className={styles.autopaySettings}>
        <div className={styles.header}>
          <FaShieldAlt className={styles.icon} />
          <h3 className={styles.title}>Autopay Settings</h3>
        </div>
        <div className={styles.content}>
          <p className={styles.description}>Please connect your wallet to enable autopay settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.autopaySettings}>
      {/* Ember Particles */}
      <div className={styles.emberContainer}>
        {embers.map((ember) => (
          <div
            key={ember.id}
            className={styles.ember}
            style={{
              left: ember.left,
              animationDelay: ember.delay,
              animationDuration: ember.duration,
              width: ember.size,
              height: ember.size,
              opacity: ember.opacity,
            }}
          />
        ))}
      </div>

      {/* Corner Ornaments */}
      <div className={styles.cornerTL}></div>
      <div className={styles.cornerTR}></div>
      <div className={styles.cornerBL}></div>
      <div className={styles.cornerBR}></div>

      <div className={styles.header}>
        <FaShieldAlt className={styles.icon} />
        <h3 className={styles.title}>Autopay Settings</h3>
      </div>
      <div className={styles.content}>
        <p className={styles.description}>
          Enable autopay to automatically unlock chapters using your SMP balance.
        </p>
        <div className={styles.toggleContainer}>
          <button
            onClick={toggleAutopay}
            disabled={saving}
            className={`${styles.toggleButton} ${autopayEnabled ? styles.enabled : styles.disabled}`}
          >
            {autopayEnabled ? (
              <FaToggleOn className={styles.toggleIcon} />
            ) : (
              <FaToggleOff className={styles.toggleIcon} />
            )}
            <span className={styles.toggleText}>
              {saving ? "Saving..." : autopayEnabled ? "Autopay Enabled" : "Autopay Disabled"}
            </span>
          </button>
        </div>
        {autopayEnabled && (
          <div className={styles.benefits}>
            <FaCheckCircle className={styles.benefitIcon} />
            <span className={styles.benefitText}>Chapters will unlock automatically</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AutopaySettings;
