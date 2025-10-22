"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAuth } from "./AuthProvider";
import LinkEmailBanner from "./LinkEmailBanner";
import { supabase } from "@/services/supabase/supabaseClient";

export default function AppWrapper({ children }) {
  const { publicKey } = useWallet();
  const { user } = useAuth();
  const [showBanner, setShowBanner] = useState(false);
  const [hasWallet, setHasWallet] = useState(false);

  useEffect(() => {
    const checkWalletAndBanner = async () => {
      // Only show banner if: wallet connected AND no auth user AND banner not dismissed
      if (!publicKey || user) {
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
          .eq("address", publicKey.toString())
          .maybeSingle();

        if (data) {
          setHasWallet(true);
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
  }, [publicKey, user]);

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
      {showBanner && hasWallet && (
        <div style={{ position: 'sticky', top: 0, zIndex: 1000 }}>
          <LinkEmailBanner
            walletAddress={publicKey.toString()}
            onDismiss={handleDismiss}
            onLinked={handleLinked}
          />
        </div>
      )}
      {children}
    </>
  );
}
