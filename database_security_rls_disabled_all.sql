-- RLS Disabled + API-Based Security Model
-- All RLS disabled, access controlled via GRANT/REVOKE permissions
-- Sensitive writes must go through API routes with service role

-- Phase 1: Disable RLS on all tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE novels DISABLE ROW LEVEL SECURITY;
ALTER TABLE manga DISABLE ROW LEVEL SECURITY;
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE manga_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE manga_detail_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE feed_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE feed_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE feed_post_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE feed_comment_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE feed_follows DISABLE ROW LEVEL SECURITY;
ALTER TABLE feed_shares DISABLE ROW LEVEL SECURITY;
ALTER TABLE feed_post_views DISABLE ROW LEVEL SECURITY;
ALTER TABLE feed_user_engagement DISABLE ROW LEVEL SECURITY;
ALTER TABLE novel_interactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE manga_interactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE announcements DISABLE ROW LEVEL SECURITY;
ALTER TABLE benefactor_announcements DISABLE ROW LEVEL SECURITY;
ALTER TABLE badges DISABLE ROW LEVEL SECURITY;
ALTER TABLE polls DISABLE ROW LEVEL SECURITY;
ALTER TABLE gifs DISABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_listings DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE private_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE writer_announcements DISABLE ROW LEVEL SECURITY;
ALTER TABLE votes DISABLE ROW LEVEL SECURITY;
ALTER TABLE amethyst_balances DISABLE ROW LEVEL SECURITY;
ALTER TABLE amethyst_inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE hoard_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE players DISABLE ROW LEVEL SECURITY;
ALTER TABLE reading_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE reading_reputation DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_ratings DISABLE ROW LEVEL SECURITY;
ALTER TABLE manga_chapters DISABLE ROW LEVEL SECURITY;
ALTER TABLE manga_pages DISABLE ROW LEVEL SECURITY;
ALTER TABLE comprehension_challenges DISABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE feed_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE unlocked_story_chapters DISABLE ROW LEVEL SECURITY;
ALTER TABLE unlocked_manga_chapters DISABLE ROW LEVEL SECURITY;
ALTER TABLE session_receipts DISABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_balances DISABLE ROW LEVEL SECURITY;
ALTER TABLE points_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE pending_withdrawals DISABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE airdrop_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE referrals DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE writer_subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE ad_based_unlocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits DISABLE ROW LEVEL SECURITY;
ALTER TABLE banned_devices DISABLE ROW LEVEL SECURITY;
ALTER TABLE creator_applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE writer_applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE writer_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE slash_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE token_burns DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges DISABLE ROW LEVEL SECURITY;
ALTER TABLE android_downloads DISABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_queue DISABLE ROW LEVEL SECURITY;
ALTER TABLE creator_schedule_tracking DISABLE ROW LEVEL SECURITY;
ALTER TABLE kaito_leaderboard_rewards DISABLE ROW LEVEL SECURITY;
ALTER TABLE nfts DISABLE ROW LEVEL SECURITY;
ALTER TABLE reputation_stakes DISABLE ROW LEVEL SECURITY;
ALTER TABLE rewards_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE rock_paper_scissors DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity DISABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_leaderboard DISABLE ROW LEVEL SECURITY;
ALTER TABLE support_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE writer_access_log DISABLE ROW LEVEL SECURITY;

-- Phase 2: Revoke all existing grants from anon and authenticated
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- Phase 3: Apply new grants based on permission levels

-- Level 1: Public Read (SELECT only)
GRANT SELECT ON users TO anon, authenticated;
GRANT SELECT ON novels TO anon, authenticated;
GRANT SELECT ON manga TO anon, authenticated;
GRANT SELECT ON announcements TO anon, authenticated;
GRANT SELECT ON benefactor_announcements TO anon, authenticated;
GRANT SELECT ON badges TO anon, authenticated;
GRANT SELECT ON polls TO anon, authenticated;
GRANT SELECT ON gifs TO anon, authenticated;
GRANT SELECT ON marketplace_listings TO anon, authenticated;
GRANT SELECT ON writer_announcements TO anon, authenticated;
GRANT SELECT ON manga_chapters TO anon, authenticated;
GRANT SELECT ON manga_pages TO anon, authenticated;
GRANT SELECT ON comprehension_challenges TO anon, authenticated;
GRANT SELECT ON kaito_leaderboard_rewards TO anon, authenticated;
GRANT SELECT ON nfts TO anon, authenticated;
GRANT SELECT ON weekly_leaderboard TO anon, authenticated;

-- Catalog views (SELECT only)
GRANT SELECT ON novels_catalog TO anon, authenticated;
GRANT SELECT ON manga_catalog TO anon, authenticated;
GRANT SELECT ON manga_chapters_catalog TO anon, authenticated;
GRANT SELECT ON manga_pages_catalog TO anon, authenticated;
GRANT SELECT ON comprehension_challenges_catalog TO anon, authenticated;
GRANT SELECT ON user_profiles TO anon, authenticated;
GRANT SELECT ON users_me TO anon, authenticated;
GRANT SELECT ON user_wallet_info TO anon, authenticated;
GRANT SELECT ON writer_subscription_stats TO anon, authenticated;

-- Level 2: Public Write (Full access)
GRANT SELECT, INSERT, UPDATE, DELETE ON comments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON manga_comments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON manga_detail_comments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON feed_posts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON feed_comments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON feed_post_likes TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON feed_comment_likes TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON feed_follows TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON feed_shares TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON feed_post_views TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON feed_user_engagement TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON novel_interactions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON manga_interactions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON private_messages TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON votes TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON amethyst_balances TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON amethyst_inventory TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON hoard_items TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON players TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON reading_sessions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON reading_reputation TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chapter_ratings TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON challenge_attempts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON feed_likes TO anon, authenticated;

-- Level 3: Sensitive Read/Write (SELECT + INSERT - for client-side SINGLE payments)
GRANT SELECT, INSERT ON chapter_payments TO anon, authenticated;
GRANT SELECT ON user_payments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON unlocked_story_chapters TO anon, authenticated;
GRANT SELECT, INSERT ON unlocked_manga_chapters TO anon, authenticated;
GRANT SELECT ON session_receipts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON wallet_balances TO anon, authenticated;
GRANT SELECT ON points_history TO anon, authenticated;
GRANT SELECT, INSERT ON user_wallets TO anon, authenticated;
GRANT SELECT ON pending_withdrawals TO anon, authenticated;
GRANT SELECT ON withdrawal_requests TO anon, authenticated;
GRANT SELECT ON airdrop_transactions TO anon, authenticated;
GRANT SELECT ON referrals TO anon, authenticated;
GRANT SELECT ON subscriptions TO anon, authenticated;
GRANT SELECT ON writer_subscriptions TO anon, authenticated;
GRANT SELECT, INSERT ON ad_based_unlocks TO anon, authenticated;
GRANT SELECT, INSERT ON wallet_events TO anon, authenticated;

-- Level 4: Admin (No grants - service role only)
-- No GRANT statements for: platform_settings, rate_limits, banned_devices, creator_applications,
-- writer_applications, writer_profiles, slash_events, token_burns, user_badges, android_downloads,
-- chapter_queue, creator_schedule_tracking, reputation_stakes, rewards_log, rock_paper_scissors,
-- settings, user_activity, wallet_events, support_requests, writer_access_log

-- Phase 4: Add status column for Ongoing/Completed feature
ALTER TABLE novels ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ongoing';
ALTER TABLE manga ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ongoing';

-- Phase 5: Verification query
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'novels', 'manga', 'chapter_payments', 'unlocked_story_chapters', 'amethyst_balances', 'wallet_balances', 'user_wallets')
ORDER BY tablename;