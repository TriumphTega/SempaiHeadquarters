# Wallet-Email Linking Integration Guide

## Overview

This guide shows you how to integrate the wallet-email linking feature into your app to solve the "wallet-only users can't access their accounts" problem.

## Quick Start

### Step 1: Add the Banner to Your Main App Layout

Edit your main layout or home page to show the banner for wallet-only users:

```jsx
// Example: src/app/page.js or src/app/layout.js
import { useWallet } from "@solana/wallet-adapter-react";
import { useAuth } from "@/components/AuthProvider";
import LinkEmailBanner from "@/components/LinkEmailBanner";
import { useState, useEffect } from "react";

export default function YourApp() {
  const { publicKey } = useWallet();
  const { user } = useAuth();
  const [showBanner, setShowBanner] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    // Show banner if: wallet connected BUT no auth user
    const dismissed = localStorage.getItem("linkEmailBannerDismissed");
    if (publicKey && !user && !dismissed) {
      setShowBanner(true);
    } else {
      setShowBanner(false);
    }
  }, [publicKey, user]);

  const handleDismiss = () => {
    localStorage.setItem("linkEmailBannerDismissed", "true");
    setShowBanner(false);
    setBannerDismissed(true);
  };

  const handleLinked = () => {
    setShowBanner(false);
    // Optionally refresh the page or update user state
    window.location.reload();
  };

  return (
    <div>
      {showBanner && (
        <LinkEmailBanner
          walletAddress={publicKey.toString()}
          onDismiss={handleDismiss}
          onLinked={handleLinked}
        />
      )}
      
      {/* Your app content */}
    </div>
  );
}
```

### Step 2: Update EmbeddedWalletProvider to Allow Wallet-Only Access

Modify your `EmbeddedWalletProvider.js` to work without requiring auth:

```jsx
// In src/components/EmbeddedWalletProvider.js

// Update retrieveEmbeddedWallet to check by wallet_address if user is not authenticated
const retrieveEmbeddedWallet = async (userPassword, walletAddress) => {
  const password = String(userPassword || "");
  if (password.length < 8) throw new Error("Password must be at least 8 characters long");
  
  try {
    setIsLoading(true);
    setError(null);

    let walletRow;

    // If user is authenticated, use user.id
    if (user) {
      const { data: userRow, error: userErr } = await supabase
        .from("users")
        .select("id, wallet_address")
        .eq("id", user.id)
        .single();
      
      if (userErr) throw userErr;
      if (!userRow?.wallet_address) throw new Error("No wallet associated with this account");

      const { data: wallet, error: walletErr } = await supabase
        .from("user_wallets")
        .select("address, private_key")
        .eq("user_id", userRow.id)
        .eq("address", userRow.wallet_address)
        .single();
      
      if (walletErr) throw walletErr;
      walletRow = wallet;
    } 
    // If NOT authenticated but has wallet address, retrieve by wallet address
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

    // Rest of the decryption logic...
    const decryptedPrivateKey = await edgeDecrypt(walletRow.private_key);
    // ... continue with existing logic
  } catch (err) {
    console.error(err);
    setError(err.message || "Failed to retrieve wallet");
    return null;
  } finally {
    setIsLoading(false);
  }
};
```

### Step 3: Update Your Wallet Component

Add wallet-only access to your wallet UI:

```jsx
// Example: src/components/CreateWallet.js or wherever you handle wallet creation

import { useWallet } from "@solana/wallet-adapter-react";
import { useAuth } from "@/components/AuthProvider";
import { useContext, useState, useEffect } from "react";
import { EmbeddedWalletContext } from "./EmbeddedWalletProvider";

export default function WalletComponent() {
  const { publicKey } = useWallet();
  const { user } = useAuth();
  const { wallet, retrieveEmbeddedWallet, createEmbeddedWallet } = useContext(EmbeddedWalletContext);
  const [hasWallet, setHasWallet] = useState(false);

  useEffect(() => {
    const checkWallet = async () => {
      if (!publicKey) return;

      // Check if wallet exists in database
      const { data } = await supabase
        .from("user_wallets")
        .select("address")
        .eq("address", publicKey.toString())
        .maybeSingle();

      setHasWallet(!!data);
    };

    checkWallet();
  }, [publicKey]);

  // If wallet connected but no auth, show retrieve option
  if (publicKey && !user && hasWallet) {
    return (
      <div>
        <h3>Welcome Back!</h3>
        <p>Wallet: {publicKey.toString()}</p>
        <button onClick={() => retrieveEmbeddedWallet(password, publicKey.toString())}>
          Retrieve Wallet
        </button>
        <p>
          <small>Want email sign-in? Link your email in settings.</small>
        </p>
      </div>
    );
  }

  // Rest of your existing wallet UI logic...
}
```

### Step 4: Add Link Option in Settings/Profile

Add a "Link Email" button in your profile/settings page:

```jsx
// src/app/editprofile/page.js or settings page

import LinkEmailBanner from "@/components/LinkEmailBanner";

export default function ProfilePage() {
  const { user } = useAuth();
  const { publicKey } = useWallet();
  const [showLinkModal, setShowLinkModal] = useState(false);

  // If wallet connected but no auth user, user is wallet-only
  const isWalletOnly = publicKey && !user;

  return (
    <div>
      {/* Existing profile content */}

      {isWalletOnly && (
        <div className="settingsSection">
          <h3>🔒 Account Security</h3>
          <p>Link your wallet to an email for account recovery</p>
          <button onClick={() => setShowLinkModal(true)}>
            Link Email Address
          </button>
        </div>
      )}

      {showLinkModal && (
        <LinkEmailBanner
          walletAddress={publicKey.toString()}
          onDismiss={() => setShowLinkModal(false)}
          onLinked={() => window.location.reload()}
        />
      )}
    </div>
  );
}
```

## Testing the Integration

### Test Case 1: Existing Wallet-Only User
1. Connect wallet (without signing in)
2. Should see LinkEmailBanner
3. Click "Link Email"
4. Sign in with Google
5. Wallet data should migrate to email account
6. Can now sign in with email OR wallet

### Test Case 2: New User (Wallet First)
1. Connect new wallet
2. Create account
3. See banner suggesting email link
4. Can dismiss or link immediately

### Test Case 3: New User (Email First)
1. Sign in with Google/Email
2. Create or import wallet
3. Wallet automatically linked to email

## Database Migration (Optional)

Add columns to track linking status:

```sql
-- Add to user_wallets table
ALTER TABLE user_wallets 
ADD COLUMN IF NOT EXISTS linked_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS linked_via TEXT;

-- Add to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'wallet_only';

-- Update existing users based on whether they have auth
UPDATE users u
SET account_type = CASE
  WHEN EXISTS (
    SELECT 1 FROM auth.users au WHERE au.id = u.id
  ) THEN 'email_linked'
  ELSE 'wallet_only'
END;
```

## Configuration

### Enable Google OAuth in Supabase

1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Google
3. Add OAuth credentials from Google Cloud Console
4. Add redirect URLs:
   - `https://yourdomain.com/link-wallet-callback`
   - `http://localhost:3000/link-wallet-callback` (for development)

## Monitoring & Analytics

Track linking events:

```jsx
// After successful link
await supabase
  .from("wallet_events")
  .insert({
    wallet_address: walletAddress,
    event_type: "wallet_email_link",
    event_details: `User linked wallet to email`,
    // ... other fields
  });
```

Query linking stats:

```sql
-- How many users have linked?
SELECT 
  COUNT(*) FILTER (WHERE account_type = 'wallet_only') as wallet_only,
  COUNT(*) FILTER (WHERE account_type = 'email_linked') as email_linked,
  COUNT(*) FILTER (WHERE account_type = 'email_only') as email_only
FROM users;
```

## Troubleshooting

### Users Can't Find "Retrieve Wallet" Option
- Check if `retrieveEmbeddedWallet` accepts `walletAddress` parameter
- Verify `user_wallets` table has the wallet entry
- Check if wallet provider is initialized

### "Failed to link wallet" Error
- Verify `/api/link-wallet-to-email` route exists
- Check Supabase service role key is set
- Verify OAuth callback URL is correct

### Duplicate Data After Linking
- This shouldn't happen with the migration script
- If it does, check that old user row was deleted
- Verify foreign keys are updated correctly

## Next Steps

1. ✅ Deploy the API routes
2. ✅ Add the LinkEmailBanner to your app
3. ✅ Update EmbeddedWalletProvider
4. ✅ Test with wallet-only users
5. ✅ Monitor linking events
6. 📧 Send email to wallet-only users about new feature
7. 📊 Track adoption metrics

## Support

If users have issues:
1. Check if they're truly wallet-only (no auth.users entry)
2. Verify their wallet has data in `user_wallets` table
3. Use the diagnostic query from earlier
4. Can manually link via SQL if needed (see WALLET_EMAIL_LINKING_STRATEGY.md)
