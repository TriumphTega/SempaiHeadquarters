// Supabase address + PUBLISHABLE key for public reads (covers, titles, counts, share cards).
// The publishable key is public by design (the app ships the same one). The old "anon" key in
// NEXT_PUBLIC_SUPABASE_ANON_KEY was switched off by Supabase on 2026-11-17, so it is not used here.
// Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in Vercel to override.
export const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xqeimsncmnqsiowftdmz.supabase.co';
export const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_LesabbiWnsNBCmVc4GFHAw_Vp7IQKTZ';
