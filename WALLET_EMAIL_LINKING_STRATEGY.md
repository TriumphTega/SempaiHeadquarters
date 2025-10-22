# Wallet-Email Linking Strategy

## The Problem

Your dApp started as fully decentralized (wallet-only), but now requires authentication for wallet access. This breaks the experience for existing wallet-only users.

## The Professional Solution

### Multi-Tier Access System

#### Tier 1: Wallet-Only Users (Original/Decentralized)
- ✅ Can connect wallet and use basic features
- ✅ Data stored using wallet_address as primary key
- ⚠️ No email = No account recovery if wallet is lost
- 💡 Show optional "Link Email" prompt for account recovery

#### Tier 2: Email-Linked Users (Hybrid)
- ✅ Have both wallet AND email/auth account
- ✅ Can sign in via email OR wallet
- ✅ Account recovery via email if wallet is lost
- ✅ Access to all features

#### Tier 3: Email-Only Users (Web2-like)
- ✅ Created account via email/Google
- ✅ Can create in-app wallet later
- ✅ Full account recovery

## Implementation Plan

### Phase 1: Allow Wallet-Only Access (PRIORITY)
**Goal**: Let existing wallet-only users continue using the app

**Changes Needed**:
1. Update `EmbeddedWalletProvider` to work without auth
2. Check for wallet in `user_wallets` by `wallet_address` first
3. If found, load user data without requiring auth
4. Show "Link Email" banner (optional, dismissible)

### Phase 2: Add "Link Wallet to Email" Feature
**Goal**: Let wallet-only users optionally link to email

**User Flow**:
1. User connects wallet → sees their data
2. Banner: "🔒 Link Email for Account Recovery"
3. User clicks → Google/Email sign-in modal
4. After auth, link auth user ID to existing wallet data
5. Migration: wallet_address → auth user ID

### Phase 3: Add "Import Wallet to Account" Feature  
**Goal**: Let email-only users import existing wallet

**User Flow**:
1. User signs in with email (no wallet yet)
2. Option: "Import Existing Wallet"
3. User enters private key/seed phrase
4. Check if wallet has existing data
5. Merge wallet data with email account

## Technical Architecture

### Database Schema Update

```sql
-- Add optional auth linkage to user_wallets
ALTER TABLE user_wallets 
ADD COLUMN linked_at TIMESTAMP,
ADD COLUMN linked_via TEXT; -- 'migration', 'manual_link', 'auto_link'

-- Add flag to track wallet-only vs email-linked
ALTER TABLE users
ADD COLUMN account_type TEXT DEFAULT 'wallet_only'; 
-- Options: 'wallet_only', 'email_linked', 'email_only'
```

### API Endpoints Needed

1. **POST /api/link-wallet-to-email**
   - Input: { walletAddress, authUserId }
   - Action: Migrate wallet data to auth user ID
   - Similar to email migration, but triggered by wallet user

2. **GET /api/check-wallet-status**
   - Input: { walletAddress }
   - Output: { hasAuth, email?, userId, accountType }

3. **POST /api/import-wallet**
   - Input: { authUserId, privateKey }
   - Action: Import wallet and merge data

### Frontend Components Needed

1. **LinkEmailBanner.js** - Dismissible banner prompting email link
2. **LinkWalletModal.js** - Modal for linking process
3. **WalletStatusIndicator.js** - Shows if wallet is linked

## User Journey Examples

### Journey 1: Old Wallet-Only User
```
1. User connects wallet → ✅ Access granted (no auth required)
2. Banner: "Link email for recovery?" → User dismisses
3. Continues using app normally
4. Later decides to link → Signs in with Google
5. System migrates data to auth ID
6. Can now sign in via email OR wallet
```

### Journey 2: New User (Email First)
```
1. User signs in with Google
2. No wallet detected → "Create" or "Import" wallet options
3. User creates in-app wallet
4. Wallet is automatically linked to email
```

### Journey 3: New User (Wallet First)
```
1. User connects wallet (Phantom/Solflare)
2. No existing data → Create new account
3. Banner: "Link email for recovery?"
4. User links email immediately
5. Account is secured
```

## Priority Implementation Order

### Week 1: Emergency Fix (Allow Wallet-Only Access)
- [ ] Update wallet provider to check wallet_address first
- [ ] Remove auth requirement for basic app access
- [ ] Test with wallet-only users

### Week 2: Link Feature
- [ ] Create LinkEmailBanner component
- [ ] Create /api/link-wallet-to-email endpoint
- [ ] Create LinkWalletModal component
- [ ] Test linking flow

### Week 3: Polish & Testing
- [ ] Add account type indicators
- [ ] Add "Import Wallet" feature
- [ ] Write comprehensive tests
- [ ] Documentation

## Benefits

✅ **Backward Compatible**: Old wallet-only users can still access app
✅ **Progressive Enhancement**: Email linking is optional, not required
✅ **Account Recovery**: Users who link email can recover accounts
✅ **Flexible**: Supports wallet-first OR email-first journeys
✅ **Professional**: Matches industry best practices (MetaMask, Rainbow, etc.)

## Security Considerations

1. **Wallet Verification**: Always verify wallet ownership via signature
2. **One-Time Link**: Once linked, can't unlink (prevents account theft)
3. **Conflict Resolution**: If email has existing data, prompt merge or separate accounts
4. **Audit Trail**: Log all linking events in wallet_events table
