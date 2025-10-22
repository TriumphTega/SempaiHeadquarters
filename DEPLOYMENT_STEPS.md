# Option B - Complete Solution Deployment Steps

## ✅ Code Changes Complete!

All code has been integrated. Here's what was updated:

### Files Modified:
1. ✅ `src/components/EmbeddedWalletProvider.js` - Now supports wallet-only users
2. ✅ `src/app/layout.js` - Added AppWrapper for LinkEmailBanner

### Files Created:
3. ✅ `src/components/AppWrapper.js` - Banner logic wrapper
4. ✅ `src/components/LinkEmailBanner.js` - Banner UI component
5. ✅ `src/styles/LinkEmailBanner.module.css` - Banner styles
6. ✅ `src/app/api/link-wallet-to-email/route.js` - API endpoint
7. ✅ `src/app/link-wallet-callback/page.js` - OAuth callback handler
8. ✅ `src/app/link-wallet-callback/LinkCallback.module.css` - Callback styles

---

## 🚀 Deployment Checklist

### Step 1: Configure Google OAuth in Supabase (5 mins)

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/YOUR_PROJECT/auth/providers

2. **Enable Google Provider**
   - Find "Google" in the list
   - Toggle it ON
   - You'll need Google OAuth credentials

3. **Get Google OAuth Credentials**
   - Go to: https://console.cloud.google.com/apis/credentials
   - Create a new project (or select existing)
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "Sempai HQ"
   
4. **Add Authorized Redirect URIs**
   ```
   Development:
   http://localhost:3000/link-wallet-callback
   
   Production (replace with your domain):
   https://yourdomain.com/link-wallet-callback
   https://yourdomain.com/auth/callback
   ```

5. **Copy Client ID and Secret**
   - Copy the Client ID and Client Secret
   - Paste into Supabase Google provider settings
   - Click "Save"

6. **Add Supabase Callback URL**
   - In Google Cloud Console, also add:
   ```
   https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback
   ```

### Step 2: Verify Environment Variables (1 min)

Check your `.env.local` file has:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # Already set from email migration
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # Change to your domain in production
```

### Step 3: Test in Development (10 mins)

1. **Start your dev server**
   ```bash
   npm run dev
   ```

2. **Test Wallet-Only Access**
   - Connect a wallet (Phantom, Solflare, etc.)
   - Should NOT require sign-in
   - Should see LinkEmailBanner at top
   - Can dismiss the banner

3. **Test Linking Flow**
   - Connect wallet → See banner
   - Click "Link Email"
   - Click "Continue with Google"
   - Should redirect to Google
   - After authorization, should redirect to `/link-wallet-callback`
   - Should see success message
   - Should redirect to `/editprofile`

4. **Verify Data Migration**
   - Check in Supabase:
   ```sql
   SELECT 
     uw.user_id,
     uw.address,
     uw.linked_at,
     u.email,
     au.email as auth_email
   FROM user_wallets uw
   JOIN users u ON u.id = uw.user_id
   LEFT JOIN auth.users au ON au.id = uw.user_id
   WHERE uw.address = 'YOUR_TEST_WALLET_ADDRESS';
   ```
   - All IDs should match

### Step 4: Test Wallet Retrieval (5 mins)

1. **Sign out completely**
2. **Sign in with the linked email**
3. **Go to wallet section**
4. **Should see "Retrieve wallet" (not "Create")**
5. **Enter password and retrieve**
6. **Verify wallet loads correctly**

### Step 5: Deploy to Production (15 mins)

1. **Update NEXT_PUBLIC_SITE_URL**
   ```env
   NEXT_PUBLIC_SITE_URL=https://yourdomain.com
   ```

2. **Deploy to your hosting** (Vercel, Netlify, etc.)
   ```bash
   npm run build
   # Deploy using your platform's method
   ```

3. **Update Google OAuth redirect URLs**
   - Add production URLs to Google Cloud Console
   - Add production callback to Supabase settings

4. **Test on production**
   - Connect wallet → See banner
   - Test linking flow end-to-end
   - Verify wallet retrieval works

### Step 6: Monitor & Validate (Ongoing)

1. **Check server logs** for any errors
   ```
   Look for: "🔗 Linking wallet..."
   Look for: "✅ Successfully linked..."
   ```

2. **Monitor linking adoption**
   ```sql
   SELECT 
     COUNT(*) FILTER (WHERE linked_at IS NOT NULL) as linked,
     COUNT(*) FILTER (WHERE linked_at IS NULL) as not_linked
   FROM user_wallets;
   ```

3. **Check for errors**
   ```sql
   SELECT * FROM wallet_events 
   WHERE event_type = 'wallet_email_link'
   ORDER BY timestamp DESC 
   LIMIT 10;
   ```

---

## 🎯 Expected Behavior After Deployment

### For Wallet-Only Users (Before Linking):
✅ Connect wallet → Access app immediately  
✅ See banner: "🔒 Secure Your Account - Link email for recovery"  
✅ Can dismiss banner  
✅ Can use app normally  
✅ Banner reappears on next visit (unless dismissed)

### For Wallet-Only Users (After Linking):
✅ Banner disappears  
✅ Can sign in with email OR wallet  
✅ See "Retrieve wallet" option  
✅ Full account recovery enabled

### For New Email-First Users:
✅ Sign in with Google/Email  
✅ Create or import wallet  
✅ Wallet automatically linked  
✅ No banner shown

---

## 🔍 Troubleshooting

### Banner Not Showing
- Check: Is wallet connected?
- Check: Is user NOT authenticated?
- Check: Is `linkEmailBannerDismissed` in localStorage?
- Check: Does wallet exist in `user_wallets` table?

### OAuth Redirect Error
- Verify redirect URLs in Google Cloud Console
- Check callback URL in Supabase settings
- Clear browser cache and cookies
- Check browser console for errors

### Linking Fails
- Check server logs for detailed error
- Verify `/api/link-wallet-to-email` route exists
- Check `SUPABASE_SERVICE_ROLE_KEY` is set
- Test API endpoint directly with Postman

### Wallet Retrieval Still Shows "Create"
- Check if data actually migrated:
  ```sql
  SELECT * FROM user_wallets WHERE address = 'WALLET_ADDRESS';
  ```
- Verify `user_id` matches `auth.users.id`
- Check `EmbeddedWalletProvider` has latest code

---

## 📊 Success Metrics

Track these to measure adoption:

1. **Linking Rate**: % of wallet-only users who link email
2. **Time to Link**: How long after connecting before they link
3. **Dismissal Rate**: How many dismiss the banner
4. **Return Rate**: Do they link on second visit?

---

## 🎉 You're Ready!

Everything is set up. Just follow the steps above and you'll have:

✅ Wallet-only users can access their accounts  
✅ Optional email linking for account recovery  
✅ Seamless OAuth flow  
✅ Professional UX  

Start with Step 1 (Google OAuth setup) and test thoroughly in development before deploying to production!

---

## Need Help?

If you encounter issues:
1. Check the troubleshooting section above
2. Review server logs for detailed errors
3. Test the API endpoint independently
4. Verify database state with SQL queries

Good luck! 🚀
