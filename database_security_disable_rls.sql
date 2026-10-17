-- Disable all RLS and remove security constraints
-- Use this to rollback the RLS implementation

-- ============================================================================
-- 1. Drop all policies
-- ============================================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ============================================================================
-- 2. Disable RLS on all tables
-- ============================================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;

-- ============================================================================
-- 3. Drop privilege escalation trigger
-- ============================================================================
DROP TRIGGER IF EXISTS prevent_users_privilege_escalation ON users;
DROP FUNCTION IF EXISTS prevent_privilege_escalation();

-- ============================================================================
-- 4. Drop helper functions (optional - uncomment if needed)
-- ============================================================================
-- DROP FUNCTION IF EXISTS get_current_wallet_address();
-- DROP FUNCTION IF EXISTS get_user_id_from_wallet(text);
-- DROP FUNCTION IF EXISTS current_user_email();
-- DROP FUNCTION IF EXISTS is_wallet_admin(text);
-- DROP FUNCTION IF EXISTS is_wallet_writer(text);
-- DROP FUNCTION IF EXISTS is_wallet_artist(text);
-- DROP FUNCTION IF EXISTS is_wallet_benefactor(text);
-- DROP FUNCTION IF EXISTS wallet_owns_content(text, uuid);

-- ============================================================================
-- 5. Remove unique wallet constraint (optional - uncomment if needed)
-- ============================================================================
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_wallet_address_key;

-- ============================================================================
-- 6. Grant full access to anon and authenticated (restore defaults)
-- ============================================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('GRANT ALL ON %I TO anon', r.tablename);
    EXECUTE format('GRANT ALL ON %I TO authenticated', r.tablename);
  END LOOP;
END $$;

-- ============================================================================
-- 7. Drop views created for RLS (optional - uncomment if needed)
-- ============================================================================
-- DROP VIEW IF EXISTS novels_catalog;
-- DROP VIEW IF EXISTS manga_catalog;
-- DROP VIEW IF EXISTS user_profiles;
-- DROP VIEW IF EXISTS users_me;
-- DROP VIEW IF EXISTS manga_chapters_catalog;
-- DROP VIEW IF EXISTS manga_pages_catalog;
-- DROP VIEW IF EXISTS comprehension_challenges_catalog;
-- DROP VIEW IF EXISTS user_wallet_info;
