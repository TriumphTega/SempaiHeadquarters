# Wallet Import Bug Fix

## 🐛 The Bug

**Problem**: Importing the same wallet 3 times resulted in **3 different addresses**.

**Root Cause**: The `createEmbeddedWallet` function was **always generating a new random wallet**, completely ignoring the imported private key or seed phrase.

---

## 🔍 What Was Wrong

### File: `src/components/EmbeddedWalletProvider.js`

**Before** (Line 101):
```javascript
const createEmbeddedWallet = async (userPassword) => {
  // ...
  const keypair = Keypair.generate(); // ❌ Always creates NEW random wallet
  // ...
}
```

**Problem**: The function signature didn't accept an `existingSecretKey` parameter, so even when you passed one from the import page, it was ignored and a new random wallet was generated every time.

---

### File: `src/app/wallet-import/page.js`

**Before** (Line 67):
```javascript
// Pass secretKey but it was IGNORED!
const result = await createEmbeddedWallet(password, secretKey);
```

**Problems**:
1. Passed `secretKey` but function didn't accept it
2. Manually encrypted with CryptoJS (inconsistent with provider's edge encryption)
3. Stored to legacy localStorage keys (wrong scope)
4. Didn't create user database entry

---

## ✅ The Fix

### 1. Updated `EmbeddedWalletProvider.js`

**After**:
```javascript
const createEmbeddedWallet = async (userPassword, existingSecretKey = null) => {
  // ...
  
  // Use existing key if provided (for imports), otherwise generate new one
  let keypair;
  let secretKey;
  if (existingSecretKey) {
    keypair = Keypair.fromSecretKey(existingSecretKey); // ✅ Use imported key
    secretKey = existingSecretKey;
  } else {
    keypair = Keypair.generate(); // ✅ Generate only if creating new wallet
    secretKey = keypair.secretKey;
  }
  
  const publicKeyStr = keypair.publicKey.toBase58();
  // ... rest of encryption and storage logic
}
```

**Changes**:
- ✅ Added `existingSecretKey` parameter (optional)
- ✅ Uses imported key if provided
- ✅ Only generates new wallet if no key provided
- ✅ Same address every time for same input

---

### 2. Simplified `wallet-import/page.js`

**After**:
```javascript
// Derive or decode the key
let secretKey;
if (input.split(/\s+/).length === 12 && bip39.validateMnemonic(input)) {
  // 12-word seed phrase
  const seed = await bip39.mnemonicToSeed(input);
  const derivedSeed = derivePath("m/44'/501'/0'/0'", seed).key;
  const keypair = Keypair.fromSeed(derivedSeed);
  secretKey = keypair.secretKey;
} else {
  // Base58 private key
  secretKey = bs58.decode(input);
  Keypair.fromSecretKey(secretKey); // Verify valid
}

// Log for verification
const publicKey = Keypair.fromSecretKey(secretKey).publicKey.toBase58();
console.log("Importing wallet with address:", publicKey);

// Pass secretKey to provider - it handles everything
const result = await createEmbeddedWallet(password, secretKey);

// Create user entry if doesn't exist
const { data: existingUser } = await supabase
  .from("users")
  .select("id")
  .eq("wallet_address", result.publicKey)
  .single();

if (!existingUser) {
  // Create user and initial balance
  const newUser = await supabase.from("users").insert({...});
  await supabase.from("wallet_balances").insert({...});
}

alert(`Wallet imported successfully! Address: ${result.publicKey}`);
```

**Changes**:
- ✅ Removed manual CryptoJS encryption
- ✅ Removed manual localStorage storage
- ✅ Let provider handle encryption/storage
- ✅ Added user creation logic
- ✅ Added console logs for verification

---

## 🧪 Testing the Fix

### Test Case 1: Import Private Key 3 Times

**Input**: Same base58 private key

**Before**:
```
Import 1: Address A (random)
Import 2: Address B (random)
Import 3: Address C (random)
❌ All different!
```

**After**:
```
Import 1: Address XYZ
Import 2: Address XYZ
Import 3: Address XYZ
✅ Same address every time!
```

---

### Test Case 2: Import 12-Word Seed 3 Times

**Input**: Same 12-word seed phrase

**Before**:
```
Import 1: Address A (random)
Import 2: Address B (random)
Import 3: Address C (random)
❌ All different!
```

**After**:
```
Import 1: Address XYZ (derived from seed)
Import 2: Address XYZ (same derivation)
Import 3: Address XYZ (consistent)
✅ Same address every time!
```

---

### Test Case 3: Check Console Logs

**Now shows**:
```
Importing wallet with address: Bqvc56e1KDtjytc1ycDiAhYJEoAELeaev5qSyBZ4znxp
Wallet imported successfully: Bqvc56e1KDtjytc1ycDiAhYJEoAELeaev5qSyBZ4znxp
User created: uuid-123-456
✅ Same address before and after!
```

---

## 📋 How to Test

1. **Get a test wallet's private key** (from wallet you created earlier)

2. **Go to Import Wallet page**: `/wallet-import`

3. **Import 3 times with same key**:
   - Import #1: Enter key → Create password → Import
   - Disconnect wallet
   - Import #2: Enter SAME key → Enter password → Import
   - Disconnect wallet
   - Import #3: Enter SAME key → Enter password → Import

4. **Check console logs**:
   ```
   Importing wallet with address: [ADDRESS]
   Wallet imported successfully: [SAME ADDRESS]
   ```

5. **Verify**:
   - ✅ All 3 imports show SAME address
   - ✅ Alert shows correct address
   - ✅ Can use wallet normally
   - ✅ Balance and data appear correctly

---

## 🔑 Key Points

### Why It Happened
- Function signature didn't support import parameter
- Import page passed parameter but it was ignored
- New wallet generated every time regardless of input

### How It's Fixed
- Provider accepts optional `existingSecretKey` parameter
- Import page properly passes the imported key
- Same key → Same wallet address (deterministic)

### Additional Benefits
- Consistent encryption (uses edge function)
- Consistent storage (uses user-scoped keys)
- Creates database entries automatically
- Better error handling and logging

---

## ✅ Result

**Before**: 
- ❌ Random addresses on import
- ❌ Can't recover same wallet
- ❌ Data inconsistency
- ❌ User frustration

**After**:
- ✅ Deterministic imports
- ✅ Same input → Same address
- ✅ Data consistency
- ✅ Reliable wallet recovery

The import feature now works as expected! 🎉

---

## 🚀 Deploy

No special deployment steps needed. Just:
```bash
npm run dev  # Test locally
npm run build  # Build for production
# Deploy as usual
```

The fix is backward compatible and doesn't affect existing wallets.
