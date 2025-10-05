# Quick Integration Guide

## Final Step: Add Migration Banner to Home Page

To complete the implementation, you need to integrate the migration banner into your home page. Here's how:

### Option 1: Manual Integration (Recommended)

Open `src/app/page.js` and make these changes:

**1. Add import at the top (around line 33):**
```javascript
import MigrationBanner from "../components/MigrationBanner";
```

**2. Add userEmail state (around line 87, after userId):**
```javascript
const [userId, setUserId] = useState(null);
const [userEmail, setUserEmail] = useState(null); // Add this line
```

**3. Find where you fetch user data and add email to the query:**
Look for a supabase query that fetches user data. Add `email` to the select statement and set it:
```javascript
// Example - adjust based on your actual code
const { data } = await supabase
  .from("users")
  .select("id, email, isWriter, isArtist, isSuperuser") // Add email here
  .eq("wallet_address", walletAddress)
  .single();

setUserId(data.id);
setUserEmail(data.email); // Add this line
```

**4. Add the banner component in your JSX (after the main div, before or after navbar):**
```javascript
return (
  <div className={styles.page}>
    <MigrationBanner userId={userId} userEmail={userEmail} />
    {/* Rest of your page */}
  </div>
);
```

---

## Testing Your Implementation

### 1. Test Visibility Toggle (Novels)
```bash
1. Go to /novel-creators-dashboard
2. Create or edit a novel
3. Uncheck "Make novel visible to readers"
4. Save
5. Go to home page - novel should NOT appear
6. Go back and check the box
7. Save
8. Go to home page - novel should appear
```

### 2. Test Visibility Toggle (Manga)
```bash
1. Go to /manga-creators-dashboard
2. Create or edit manga
3. Uncheck "Make manga visible to readers"
4. Save
5. Go to home page - manga should NOT appear
6. Go back and check the box
7. Save
8. Go to home page - manga should appear
```

### 3. Test Superuser Carousel Control
```bash
1. Login as superuser
2. Edit a novel/manga
3. Check "Make novel visible" but UNCHECK "Show in home carousel"
4. Save
5. Novel is visible in listings but NOT in home carousel
```

### 4. Test Wallet Migration
```bash
1. Navigate to /migrate-wallet
2. Connect your current wallet
3. Enter a new wallet address (make sure you have access to it!)
4. Enter your email
5. Click "Migrate Wallet"
6. Wait for success message
7. Disconnect current wallet
8. Connect with new wallet
9. Verify all your data is accessible
```

### 5. Test Migration Banner
```bash
1. Create a new account (without email)
2. Go to home page
3. Banner should appear at top
4. Click dismiss - banner disappears
5. Refresh page - banner reappears
6. Click "Migrate Now" - should go to /migrate-wallet
7. Complete migration with email
8. Go to home page - banner should NOT appear
```

---

## Database Verification

Run these queries in Supabase to verify everything is set up:

### Check if columns exist:
```sql
-- Check novels table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'novels' 
AND column_name IN ('is_visible', 'show_in_home');

-- Check manga table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'manga' 
AND column_name IN ('is_visible', 'show_in_home');

-- Check users table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'email';
```

### Set default values (if needed):
```sql
-- Set default visibility for existing novels
UPDATE novels 
SET is_visible = true, show_in_home = true 
WHERE is_visible IS NULL;

-- Set default visibility for existing manga
UPDATE manga 
SET is_visible = true, show_in_home = true 
WHERE is_visible IS NULL;
```

---

## Troubleshooting

### Issue: Visibility toggle doesn't work
**Solution:** Check that the database columns exist and have the correct data type (boolean)

### Issue: Migration fails
**Solution:** 
- Verify new wallet address is valid Solana address
- Check that new wallet isn't already registered
- Ensure wallet_events table exists

### Issue: Banner doesn't show
**Solution:**
- Verify user doesn't have email in database
- Check that MigrationBanner is imported and rendered
- Check browser console for errors

### Issue: Superuser can't see carousel toggle
**Solution:**
- Verify user has `isSuperuser = true` in database
- Check that the conditional rendering uses correct variable name

---

## Quick Links

- **Migration Page:** `/migrate-wallet`
- **Novel Dashboard:** `/novel-creators-dashboard`
- **Manga Dashboard:** `/manga-creators-dashboard`
- **Home Page:** `/`

---

## Summary of Changes

✅ **Novels:** Can be hidden from view, superusers control carousel
✅ **Manga:** Can be hidden from view, admins control carousel  
✅ **Wallet Migration:** Self-service migration with email linking
✅ **Migration Banner:** Persistent reminder for users without email
✅ **Wallet Interface:** Already exists (DraggableWalletPanel)

---

## Need Help?

All implementation details are in `UPDATES_COMPLETED.md`

**Everything is ready to go! Just integrate the migration banner and test! 🚀**
