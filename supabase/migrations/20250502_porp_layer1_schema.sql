-- PoRP Layer 1: Reading Session Proof Database Schema
-- Migration for reading sessions, receipts, and behavioral tracking

-- Reading sessions and behavioral tracking
CREATE TABLE IF NOT EXISTS reading_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    novel_id UUID REFERENCES novels(id),
    chapter_number INTEGER,
    device_hash VARCHAR(64),
    session_data JSONB, -- scroll patterns, timing, interactions
    entropy_score DECIMAL(3,2),
    time_on_page_seconds INTEGER,
    status VARCHAR(20) DEFAULT 'active', -- active, completed, flagged
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Cryptographic session receipts
CREATE TABLE IF NOT EXISTS session_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES reading_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    pages_read INTEGER[],
    time_on_pages INTEGER[],
    entropy_score DECIMAL(3,2),
    device_hash VARCHAR(64),
    server_signature TEXT, -- Ed25519 signature
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    used_for_claim BOOLEAN DEFAULT FALSE
);

-- Reading comprehension challenges
CREATE TABLE IF NOT EXISTS comprehension_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novel_id UUID REFERENCES novels(id) ON DELETE CASCADE,
    chapter_number INTEGER,
    question TEXT,
    options TEXT[], -- 4 options array
    correct_answer INTEGER,
    difficulty VARCHAR(10) DEFAULT 'medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Challenge attempts
CREATE TABLE IF NOT EXISTS challenge_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES reading_sessions(id) ON DELETE CASCADE,
    challenge_id UUID REFERENCES comprehension_challenges(id) ON DELETE CASCADE,
    user_answer INTEGER,
    is_correct BOOLEAN,
    response_time_ms INTEGER,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reading reputation scoring
CREATE TABLE IF NOT EXISTS reading_reputation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    total_pages_read INTEGER DEFAULT 0,
    total_reading_time_seconds BIGINT DEFAULT 0,
    challenges_passed INTEGER DEFAULT 0,
    challenges_attempted INTEGER DEFAULT 0,
    reputation_score INTEGER DEFAULT 0, -- 0-1000+
    current_tier VARCHAR(20) DEFAULT 'seed', -- seed, reader, scholar, sage
    last_withdrawal_at TIMESTAMP WITH TIME ZONE,
    consecutive_failed_challenges INTEGER DEFAULT 0,
    flagged_for_review BOOLEAN DEFAULT FALSE,
    reward_multiplier DECIMAL(3,2) DEFAULT 1.0, -- 1.0 to 1.5
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reputation staking
CREATE TABLE IF NOT EXISTS reputation_stakes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount_smp BIGINT NOT NULL,
    staked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    slashed_at TIMESTAMP WITH TIME ZONE,
    slash_reason TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    multiplier_applied DECIMAL(3,2) DEFAULT 1.0 -- 1.0 to 1.5
);

-- Withdrawal gating
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount_smp BIGINT NOT NULL,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending', -- pending, queued, processed, rejected
    cooldown_end_at TIMESTAMP WITH TIME ZONE,
    tier_at_request VARCHAR(20),
    receipt_ids UUID[] DEFAULT '{}',
    transaction_signature TEXT
);

-- Slash events for tracking
CREATE TABLE IF NOT EXISTS slash_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount_slashed BIGINT NOT NULL,
    amount_burned BIGINT NOT NULL,
    amount_redistributed BIGINT NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Token burns tracking
CREATE TABLE IF NOT EXISTS token_burns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount BIGINT NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reading_sessions_user_id ON reading_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_novel_chapter ON reading_sessions(novel_id, chapter_number);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_status ON reading_sessions(status);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_created_at ON reading_sessions(created_at);

CREATE INDEX IF NOT EXISTS idx_session_receipts_user_id ON session_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_session_receipts_session_id ON session_receipts(session_id);
CREATE INDEX IF NOT EXISTS idx_session_receipts_expires_at ON session_receipts(expires_at);
CREATE INDEX IF NOT EXISTS idx_session_receipts_used_for_claim ON session_receipts(used_for_claim);

CREATE INDEX IF NOT EXISTS idx_comprehension_challenges_novel_chapter ON comprehension_challenges(novel_id, chapter_number);
CREATE INDEX IF NOT EXISTS idx_challenge_attempts_session_id ON challenge_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_challenge_attempts_challenge_id ON challenge_attempts(challenge_id);

CREATE INDEX IF NOT EXISTS idx_reading_reputation_user_id ON reading_reputation(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_reputation_score ON reading_reputation(reputation_score);
CREATE INDEX IF NOT EXISTS idx_reading_reputation_tier ON reading_reputation(current_tier);
CREATE INDEX IF NOT EXISTS idx_reading_reputation_flagged ON reading_reputation(flagged_for_review);

CREATE INDEX IF NOT EXISTS idx_reputation_stakes_user_id ON reputation_stakes(user_id);
CREATE INDEX IF NOT EXISTS idx_reputation_stakes_active ON reputation_stakes(is_active);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_requested_at ON withdrawal_requests(requested_at);

CREATE INDEX IF NOT EXISTS idx_slash_events_user_id ON slash_events(user_id);
CREATE INDEX IF NOT EXISTS idx_slash_events_created_at ON slash_events(created_at);

-- Update wallet_balances table to add staked_amount column
ALTER TABLE wallet_balances 
ADD COLUMN IF NOT EXISTS staked_amount BIGINT DEFAULT 0;

-- Create function to calculate reading reputation score
CREATE OR REPLACE FUNCTION calculate_reading_reputation_score(
    p_user_id UUID
) RETURNS INTEGER AS $$
DECLARE
    v_pages_read INTEGER;
    v_reading_time_seconds BIGINT;
    v_challenges_passed INTEGER;
    v_challenges_attempted INTEGER;
    v_success_rate DECIMAL(3,2);
    v_consistency_bonus INTEGER;
    v_penalty INTEGER;
    v_score INTEGER;
BEGIN
    -- Get user's reading statistics
    SELECT 
        COALESCE(total_pages_read, 0),
        COALESCE(total_reading_time_seconds, 0),
        COALESCE(challenges_passed, 0),
        COALESCE(challenges_attempted, 0)
    INTO v_pages_read, v_reading_time_seconds, v_challenges_passed, v_challenges_attempted
    FROM reading_reputation 
    WHERE user_id = p_user_id;
    
    -- Base score from pages read (1 point per page)
    v_score := v_pages_read;
    
    -- Bonus from challenge success rate (max 200 points)
    IF v_challenges_attempted > 0 THEN
        v_success_rate := v_challenges_passed::DECIMAL / v_challenges_attempted::DECIMAL;
        v_score := v_score + FLOOR(v_success_rate * 200);
    END IF;
    
    -- Bonus from reading time (max 100 points, 1 point per 2 hours)
    v_score := v_score + LEAST(100, FLOOR(v_reading_time_seconds / 7200));
    
    -- Consistency bonus (50 points if read in 3+ of last 7 days)
    SELECT COUNT(DISTINCT DATE(created_at))
    INTO v_consistency_bonus
    FROM reading_sessions 
    WHERE user_id = p_user_id 
        AND status = 'completed'
        AND created_at >= NOW() - INTERVAL '7 days';
    
    IF v_consistency_bonus >= 3 THEN
        v_score := v_score + 50;
    END IF;
    
    -- Penalty for flagged accounts
    SELECT CASE WHEN flagged_for_review THEN -500 ELSE 0 END
    INTO v_penalty
    FROM reading_reputation 
    WHERE user_id = p_user_id;
    
    v_score := v_score + v_penalty;
    
    -- Ensure score is not negative
    RETURN GREATEST(0, v_score);
END;
$$ LANGUAGE plpgsql;

-- Create function to determine user tier
CREATE OR REPLACE FUNCTION get_user_tier(
    p_reputation_score INTEGER
) RETURNS TEXT AS $$
BEGIN
    IF p_reputation_score >= 1000 THEN
        RETURN 'sage';
    ELSIF p_reputation_score >= 500 THEN
        RETURN 'scholar';
    ELSIF p_reputation_score >= 100 THEN
        RETURN 'reader';
    ELSE
        RETURN 'seed';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to update user reputation
CREATE OR REPLACE FUNCTION update_user_reputation(
    p_user_id UUID,
    p_pages_read INTEGER DEFAULT 0,
    p_reading_time_seconds INTEGER DEFAULT 0,
    p_challenge_passed BOOLEAN DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_new_score INTEGER;
    v_new_tier TEXT;
BEGIN
    -- Update reading statistics
    UPDATE reading_reputation SET
        total_pages_read = total_pages_read + p_pages_read,
        total_reading_time_seconds = total_reading_time_seconds + p_reading_time_seconds,
        challenges_attempted = CASE WHEN p_challenge_passed IS NOT NULL THEN challenges_attempted + 1 ELSE challenges_attempted END,
        challenges_passed = CASE WHEN p_challenge_passed = TRUE THEN challenges_passed + 1 ELSE challenges_passed END,
        consecutive_failed_challenges = CASE 
            WHEN p_challenge_passed = TRUE THEN 0
            WHEN p_challenge_passed = FALSE THEN consecutive_failed_challenges + 1
            ELSE consecutive_failed_challenges
        END,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Calculate new score and tier
    v_new_score := calculate_reading_reputation_score(p_user_id);
    v_new_tier := get_user_tier(v_new_score);
    
    -- Update score and tier
    UPDATE reading_reputation SET
        reputation_score = v_new_score,
        current_tier = v_new_tier
    WHERE user_id = p_user_id;
    
    -- Flag for review if 3 consecutive failures
    UPDATE reading_reputation SET
        flagged_for_review = TRUE
    WHERE user_id = p_user_id 
        AND consecutive_failed_challenges >= 3;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update reputation on session completion
CREATE OR REPLACE FUNCTION update_reputation_on_session_complete()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        PERFORM update_user_reputation(
            NEW.user_id,
            1, -- 1 page read
            NEW.time_on_page_seconds,
            NULL -- No challenge info here
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for session completion
CREATE TRIGGER trigger_update_reputation_on_session_complete
    AFTER UPDATE ON reading_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_reputation_on_session_complete();

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for reading_reputation table
CREATE TRIGGER trigger_reading_reputation_updated_at
    BEFORE UPDATE ON reading_reputation
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE reading_sessions IS 'Tracks user reading sessions with behavioral data';
COMMENT ON TABLE session_receipts IS 'Cryptographic receipts proving genuine reading';
COMMENT ON TABLE comprehension_challenges IS 'Reading comprehension questions for chapters';
COMMENT ON TABLE challenge_attempts IS 'Records of user challenge attempts';
COMMENT ON TABLE reading_reputation IS 'User reputation scores and tier information';
COMMENT ON TABLE reputation_stakes IS 'SMP staking for reward multipliers';
COMMENT ON TABLE withdrawal_requests IS 'Withdrawal requests with PoRP gating';
COMMENT ON TABLE slash_events IS 'Records of stake slashing events';
COMMENT ON TABLE token_burns IS 'Records of token burning events';
