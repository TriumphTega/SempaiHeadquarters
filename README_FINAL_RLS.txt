COMPREHENSIVE RLS IMPLEMENTATION FOR WALLET-FIRST ARCHITECTURE

USE THIS FILE: database_security_rls_comprehensive.sql (the only correct RLS file)

DELETED OLD FILES (incorrect for your architecture):
- database_security_rls_minimal.sql (incorrect - disabled RLS on too many tables)
- database_security_rls_functional.sql (incorrect - JWT-based, not anon model)
- database_security_rls_disable_rls.sql (keep for rollback if needed)
- interaction_tables_rls_fix.sql (replaced by comprehensive version)
- wallet-auth-edge-function.ts (not needed for anon model)
- All old implementation guides and checklists

🔒 ARCHITECTURE:

- Wallet connection = real authentication
- Supabase Auth = ONLY for encrypted wallet private key retrieval
- Google Auth required BEFORE accessing user_wallets (via Edge Function)
- Users can use entire app without Supabase Auth
- RLS DISABLED on novels, manga, users, and interaction tables for direct app access
- RLS ENABLED on sensitive financial/unlock tables with SELECT-only policies for access checking
- RLS ENABLED on admin/sensitive tables (service role only)
- INSERT/UPDATE/DELETE on financial tables blocked (must use API routes with service role)
- API routes use service role for financial operations, anon client for user creation

📋 WHAT THIS PROTECTS:

1. Private keys (user_wallets) - service role only via Edge Function
2. Financial tables (chapter_payments, wallet_balances, etc.) - service role only
3. Unlock tables (unlocked_manga_chapters, unlocked_story_chapters) - service role only
4. Privileged field changes via triggers (isSuperuser, isWriter, balance, etc.)
5. Sensitive columns via column-level REVOKE (email, tokens, balances on users)

✅ WHAT THIS ALLOWS:

1. Public catalog access (anon can read novels, manga, users public fields)
2. Guest user creation (anon can INSERT users with wallet_address)
3. Profile updates (anon can UPDATE name, image, has_updated_profile)
4. Public content (comments, feed posts, announcements - all anon readable)
5. Trigger sanitizes INSERT (cannot set isWriter, balance, etc.)
6. Trigger blocks UPDATE of privileged fields

🚀 HOW IT WORKS:

Browse (no login):
```js
supabase.from('novels_catalog').select('*')
supabase.from('user_profiles').select('*').eq('wallet_address', connectedWallet)
```

Retrieve encrypted key (Google only):
```js
const { data: { session } } = await supabase.auth.getSession()
await supabase.functions.invoke('retrieve-wallet', {
  headers: { Authorization: `Bearer ${session.access_token}` },
})
```

The Edge Function uses service role to read user_wallets after Google verification.

⚠️ SECURITY MODEL:

- Anon users (wallet-connected only) can create/update users (trigger protects privileged fields)
- Anyone can read public fields from users (email, tokens, balances revoked)
- Private keys require Google Auth + Edge Function + service role
- Financial operations require service role
- Privileged role changes require service role (trigger blocks direct changes)

📝 APP CHANGES NEEDED:

1. Use novels_catalog instead of novels for browsing
2. Use user_profiles instead of users for public user data
3. Never select('*') on users (sensitive columns revoked)
4. Use Edge Function + service role for wallet key retrieval
5. Use Edge Function + service role for financial operations
6. Use Edge Function + signature verification for writer/artist content writes

🎯 IMPLEMENTATION STEPS:

1. Check for duplicate wallet addresses:
   ```sql
   SELECT wallet_address, COUNT(*)
   FROM users
   WHERE wallet_address IS NOT NULL
   GROUP BY 1
   HAVING COUNT(*) > 1;
   ```

2. Apply database_security_rls_comprehensive.sql in Supabase SQL Editor
   - This DISABLES RLS on all content/interaction/game tables
   - This ENABLES RLS on financial/unlock tables with SELECT-only policies
   - This ENABLES RLS on admin/sensitive tables (service role only)
   - This adds proper grants for all tables

3. Fix critical API route security issue
   - File: src/app/api/user/signup/route.js
   - Changed from anon client to service role for wallet_balances operations
   - This was a critical security vulnerability

4. Test the application
   - Test chapter unlock flow
   - Test manga unlock flow
   - Test game progress tracking
   - Test user profile updates
   - Test public content access

This is the correct RLS implementation for your wallet-first architecture.

📁 FILES:
- database_security_rls_comprehensive.sql - Apply this to database (complete RLS configuration)
- src/app/api/user/signup/route.js - Fixed to use service role for financial operations
- database_security_rls_disable_rls.sql - Rollback if needed
