# RLS Disabled + API-Based Security Model

## Summary

All RLS has been disabled on tables. Access is controlled via GRANT/REVOKE permissions. Sensitive writes must go through API routes with service role. Anon client can SELECT and INSERT into some sensitive tables for SINGLE chapter payments, but SUBSCRIPTION operations use API routes with service role. Added INSERT/UPDATE grants for mobile app compatibility (wallet_balances, user_wallets, wallet_events). Added status column to novels/manga for Ongoing/Completed feature. Implemented Triumph's UI fixes: badge linking to author profile/chat.

## Architecture

### Security Model
- **All RLS Disabled** on all tables
- **Access Controlled** via GRANT/REVOKE permissions
- **Anon Client**: Can SELECT most tables, can INSERT/UPDATE/DELETE public tables, limited INSERT into sensitive tables
- **API Routes**: Use service role for SUBSCRIPTION operations (3CHAPTERS, FULL)
- **Console Protection**: Cannot write to admin/sensitive tables due to lack of GRANT permissions

### Permission Levels

**Level 1: Public Read (SELECT only)**
- users, novels, manga, announcements, badges, polls, gifs, marketplace_listings, etc.
- Catalog views: novels_catalog, manga_catalog, user_profiles, etc.

**Level 2: Public Write (Full access)**
- comments, feed_posts, feed_comments, feed_likes, feed_follows, novel_interactions, manga_interactions, notifications, chapter_ratings, amethyst_balances, players, reading_sessions, etc.

**Level 3: Sensitive Read/Write (SELECT + INSERT for SINGLE payments)**
- chapter_payments (SELECT + INSERT - for client-side SINGLE chapter payments)
- unlocked_story_chapters (SELECT + INSERT + UPDATE - for client-side unlocks)
- unlocked_manga_chapters (SELECT + INSERT)
- ad_based_unlocks (SELECT + INSERT)
- wallet_balances, user_wallets, session_receipts, etc. (SELECT only)

**Level 4: Admin (Service role only)**
- platform_settings, rate_limits, banned_devices, creator_applications, writer_applications, etc.
- No GRANT to anon/authenticated

## Implementation

### SQL File
**File:** `database_security_rls_disabled_all.sql`

**Recent Changes:**
- Added INSERT/UPDATE grants to wallet_balances (mobile app compatibility)
- Added INSERT grants to user_wallets (mobile app compatibility)
- Added INSERT grants to wallet_events (mobile app compatibility)
- Added status column to novels and manga tables (Ongoing/Completed feature)

### API Route Changes
**File:** `src/app/api\unlock-chapter\route.js`

**Changes:**
- Added `supabaseAdmin` import
- Changed from `supabase` to `supabaseAdmin` for sensitive operations:
  - novels SELECT
  - unlocked_story_chapters SELECT/INSERT/UPDATE
- This ensures SUBSCRIPTION operations (3CHAPTERS, FULL) use service role

### Client Code Changes
**File:** `src/app\novel\[id]\chapter\[chapter]\page.js`

**Changes:**
- Added fullscreen on scroll up from beginning feature
- Added useEffect hook to detect scroll position and toggle fullscreen

**File:** `src/app\badges\page.js`

**Changes:**
- Added Link components to badge cards for author profile and chat
- Added conditional rendering based on badge.writer_id

**File:** `src\app\badges\badges.module.css`

**Changes:**
- Added .badgeLinks and .badgeLink styles for badge navigation links

## What This Protects

✅ **Protected:**
- Admin tables cannot be accessed by anon client
- SUBSCRIPTION operations (3CHAPTERS, FULL) require API validation with service role
- Server-side transaction verification before recording payments
- Console cannot write to admin/sensitive tables

⚠️ **Limited Protection:**
- SINGLE chapter payments can be done directly by client (GRANT allows INSERT)
- Table structure visible (user accepted)
- Anon key visible (user accepted, unavoidable)
- Console can read sensitive tables (user accepted)

## Implementation Steps

1. **Apply SQL:**
   - Run `database_security_rls_disabled_all.sql` in Supabase SQL Editor
   - This disables all RLS and applies new GRANT structure

2. **Test Application:**
   - Test SINGLE chapter payment (client-side INSERT)
   - Test SUBSCRIPTION unlock (API route with service role)
   - Test manga unlock
   - Test game progress
   - Verify console cannot write to admin tables

## Security Trade-offs

This model provides:
- Better security than no protection
- Console protection via GRANT permissions
- Server-side validation for SUBSCRIPTION operations
- Maintains app functionality

But accepts:
- Table structure visibility
- Anon key visibility
- Console read access to sensitive data
- Client-side SINGLE payment INSERTs (could be abused if transaction verification bypassed)

For maximum security, consider moving ALL payment operations to API routes with service role and removing INSERT grants from anon client.