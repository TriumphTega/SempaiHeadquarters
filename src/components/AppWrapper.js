"use client";

import { useState, useEffect, useContext } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAuth } from "./AuthProvider";
import { EmbeddedWalletContext } from "./EmbeddedWalletProvider";
import LinkEmailBanner from "./LinkEmailBanner";
import { supabase } from "@/services/supabase/supabaseClient";

export default function AppWrapper({ children }) {
  const { publicKey: externalPublicKey } = useWallet();
  const { wallet: embeddedWallet } = useContext(EmbeddedWalletContext);
  const { user } = useAuth();
  const [showBanner, setShowBanner] = useState(false);
  const [hasWallet, setHasWallet] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);

  useEffect(() => {
    const checkWalletAndBanner = async () => {
      // Determine active wallet (external or embedded)
      const activeWalletAddress = externalPublicKey?.toString() || embeddedWallet?.publicKey;
      
      // Only show banner if: wallet connected AND no auth user AND banner not dismissed
      if (!activeWalletAddress || user) {
        setShowBanner(false);
        return;
      }

      const dismissed = localStorage.getItem("linkEmailBannerDismissed");
      if (dismissed) {
        setShowBanner(false);
        return;
      }

      // Check if wallet has existing data in database
      try {
        const { data, error } = await supabase
          .from("user_wallets")
          .select("address")
          .eq("address", activeWalletAddress)
          .maybeSingle();

        if (data) {
          setHasWallet(true);
          setWalletAddress(activeWalletAddress);
          setShowBanner(true);
        } else {
          setShowBanner(false);
        }
      } catch (err) {
        console.error("Error checking wallet:", err);
        setShowBanner(false);
      }
    };

    checkWalletAndBanner();
  }, [externalPublicKey, embeddedWallet, user]);

  const handleDismiss = () => {
    localStorage.setItem("linkEmailBannerDismissed", "true");
    setShowBanner(false);
  };

  const handleLinked = () => {
    setShowBanner(false);
    // Refresh to load with new auth state
    window.location.reload();
  };

  return (
    <>
      {showBanner && hasWallet && walletAddress && (
        <div style={{ position: 'sticky', top: 0, zIndex: 1000 }}>
          <LinkEmailBanner
            walletAddress={walletAddress}
            onDismiss={handleDismiss}
            onLinked={handleLinked}
          />
        </div>
      )}
      {children}
    </>
  );
}
