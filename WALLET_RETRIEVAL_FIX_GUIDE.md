# Wallet Retrieval Issue - Diagnostic & Fix Guide

## Your Situation

You mentioned: "I am still seeing create in-app wallet instead of retrieve" and "user email already exist in users public table (not authenticated users table)".

This means:
1. ✅ You have data in the `users` table (including a wallet)
2. ❌ You DON'T have an auth account linked to that data
3. ❌ When you sign in, it creates a NEW auth user with a NEW user.id
4. ❌ The new auth user.id doesn't match your wallet's user_id in `user_wallets`

## The Root Cause

When you authenticate (e.g., sign in with Google), Supabase creates an auth user with a UUID like `abc-123-def`.

Your existing wallet data is linked to a DIFFERENT UUID (let's call it `old-456-xyz`) in the `users` and `user_wallets` tables.

The system looks for wallets using the auth user.id (`abc-123-def`), but your wallet is linked to `old-456-xyz`, so it can't find it.

## The Fix (Updated Code)

I just fixed a critical bug in the migration code:
- ✅ Fixed variable scoping issue (`userId` is now properly mutable)
- ✅ Added comprehensive logging to track the migration
- ✅ Now returns `finalUserId` in the response

## How to Fix Your Account

### Option 1: Use Email Migration (Recommended)

1. **Sign in** with any email that creates an auth account
2. **Go to your profile** page
3. **Click "Migrate to New Email"**
4. **Enter your OLD email** (the one that has your wallet data)
5. The system will:
   - Create a new auth account for your old email
   - Migrate ALL your wallet data to the new auth user ID
   - Link everything properly

### Option 2: Manual Database Fix (Advanced)

If you have database access, you can manually link your auth account:

```sql
-- 1. Find your auth user ID
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- 2. Find your existing user data
SELECT id, email, wallet_address FROM public.users WHERE email = 'your-email@example.com';

-- 3. Update user_wallets to use auth user ID
UPDATE user_wallets 
SET user_id = 'your-auth-user-id-here' 
WHERE user_id = 'your-old-user-id-here';

-- 4. Update users table
UPDATE users 
SET id = 'your-auth-user-id-here' 
WHERE id = 'your-old-user-id-here';
```

## Testing the Fix

After migration, check the server logs. You should see:
```
✅ Successfully migrated ALL user data from [old-id] to [new-id]
✅ userId is now set to: [new-id]
Migrating user_wallets from [old-id] to [new-id]
user_wallets updated: [...]
📧 Email migration complete! Final userId: [new-id], Auth User ID: [new-id]
```

Then:
1. **Sign out completely**
2. **Sign in** with your migrated email
3. **Check the magic link** in your email and click it
4. **Go to wallet section**
5. You should now see **"Retrieve wallet"** instead of "Create wallet"

## Debugging

If still not working, check the browser console and server logs for:
- The `finalUserId` from the migration response
- Whether `user_wallets` was updated (check the logs)
- Whether you're signing in with the correct email

### Check Database Directly

Run this query to verify the migration worked:
```sql
-- Check if wallet is linked to correct user_id
SELECT 
    uw.user_id,
    uw.address,
    u.email,
    au.email as auth_email
FROM user_wallets uw
JOIN users u ON u.id = uw.user_id
LEFT JOIN auth.users au ON au.id = uw.user_id
WHERE uw.address = 'your-wallet-address-here';
```

The `user_id` should match between `user_wallets`, `users`, and `auth.users`.

## Prevention

To prevent this in the future:
- Always authenticate BEFORE creating a wallet
- The wallet creation should automatically use your auth user.id

## Need Help?

If this still doesn't work:
1. Check the server console logs during migration
2. Share the `finalUserId` from the migration response
3. Check if `user_wallets` table was actually updated
4. Verify you're signing in with the correct (migrated) email
