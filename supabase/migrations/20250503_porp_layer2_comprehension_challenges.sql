-- PoRP Layer 2: Reading Comprehension Challenges
-- Migration for comprehension challenge system

-- Reading comprehension challenges
CREATE TABLE IF NOT EXISTS comprehension_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novel_id UUID REFERENCES novels(id),
    chapter_number INTEGER,
    question TEXT NOT NULL,
    options TEXT[] NOT NULL, -- 4 options array
    correct_answer INTEGER NOT NULL, -- 0-3 index of correct option
    difficulty VARCHAR(10) DEFAULT 'medium', -- easy, medium, hard
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CHECK (array_length(options, 1) = 4),
    CHECK (correct_answer >= 0 AND correct_answer <= 3),
    CHECK (difficulty IN ('easy', 'medium', 'hard'))
);

-- Challenge attempts tracking
CREATE TABLE IF NOT EXISTS challenge_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES reading_sessions(id),
    challenge_id UUID REFERENCES comprehension_challenges(id),
    user_answer INTEGER NOT NULL,
    is_correct BOOLEAN NOT NULL,
    response_time_ms INTEGER NOT NULL,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CHECK (user_answer >= -1 AND user_answer <= 3), -- -1 for timeout
    CHECK (response_time_ms >= 0)
);

-- Reading reputation scoring
CREATE TABLE IF NOT EXISTS reading_reputation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) UNIQUE,
    total_pages_read INTEGER DEFAULT 0,
    total_reading_time_seconds BIGINT DEFAULT 0,
    challenges_passed INTEGER DEFAULT 0,
    challenges_attempted INTEGER DEFAULT 0,
    reputation_score INTEGER DEFAULT 0, -- 0-1000+
    current_tier VARCHAR(20) DEFAULT 'seed', -- seed, reader, scholar, sage
    last_withdrawal_at TIMESTAMP WITH TIME ZONE,
    consecutive_failed_challenges INTEGER DEFAULT 0,
    flagged_for_review BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CHECK (reputation_score >= 0),
    CHECK (consecutive_failed_challenges >= 0),
    CHECK (current_tier IN ('seed', 'reader', 'scholar', 'sage'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_comprehension_challenges_novel_chapter 
    ON comprehension_challenges(novel_id, chapter_number);

CREATE INDEX IF NOT EXISTS idx_challenge_attempts_session 
    ON challenge_attempts(session_id);

CREATE INDEX IF NOT EXISTS idx_challenge_attempts_challenge 
    ON challenge_attempts(challenge_id);

CREATE INDEX IF NOT EXISTS idx_reading_reputation_user 
    ON reading_reputation(user_id);

CREATE INDEX IF NOT EXISTS idx_reading_reputation_score 
    ON reading_reputation(reputation_score);

-- RLS Policies
ALTER TABLE comprehension_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_reputation ENABLE ROW LEVEL SECURITY;

-- Comprehension challenges - read access for all authenticated users
CREATE POLICY "Comprehension challenges read access" ON comprehension_challenges
    FOR SELECT USING (auth.role() = 'authenticated');

-- Challenge attempts - users can only see their own attempts
CREATE POLICY "Challenge attempts own access" ON challenge_attempts
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM reading_sessions 
            WHERE id = session_id
        )
    );

-- Challenge attempts - users can insert their own attempts
CREATE POLICY "Challenge attempts insert own" ON challenge_attempts
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM reading_sessions 
            WHERE id = session_id
        )
    );

-- Reading reputation - users can only see their own reputation
CREATE POLICY "Reading reputation own access" ON reading_reputation
    FOR ALL USING (auth.uid() = user_id);

-- Function to update reputation score
CREATE OR REPLACE FUNCTION update_reputation_score()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate new reputation score based on various factors
    UPDATE reading_reputation SET 
        reputation_score = GREATEST(0, 
            (total_pages_read * 1) + -- Base score from pages read
            CASE 
                WHEN challenges_attempted > 0 
                THEN (challenges_passed::FLOAT / challenges_attempted::FLOAT) * 200 -- Challenge success bonus
                ELSE 0 
            END +
            LEAST(100, (total_reading_time_seconds / 3600) * 2) -- Time bonus (max 100)
        ),
        current_tier = CASE 
            WHEN GREATEST(0, 
                (total_pages_read * 1) + 
                CASE 
                    WHEN challenges_attempted > 0 
                    THEN (challenges_passed::FLOAT / challenges_attempted::FLOAT) * 200 
                    ELSE 0 
                END +
                LEAST(100, (total_reading_time_seconds / 3600) * 2)
            ) >= 1000 THEN 'sage'
            WHEN GREATEST(0, 
                (total_pages_read * 1) + 
                CASE 
                    WHEN challenges_attempted > 0 
                    THEN (challenges_passed::FLOAT / challenges_attempted::FLOAT) * 200 
                    ELSE 0 
                END +
                LEAST(100, (total_reading_time_seconds / 3600) * 2)
            ) >= 500 THEN 'scholar'
            WHEN GREATEST(0, 
                (total_pages_read * 1) + 
                CASE 
                    WHEN challenges_attempted > 0 
                    THEN (challenges_passed::FLOAT / challenges_attempted::FLOAT) * 200 
                    ELSE 0 
                END +
                LEAST(100, (total_reading_time_seconds / 3600) * 2)
            ) >= 100 THEN 'reader'
            ELSE 'seed'
        END,
        updated_at = NOW()
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update reputation score
CREATE TRIGGER update_reputation_score_trigger
    AFTER INSERT OR UPDATE ON reading_reputation
    FOR EACH ROW
    EXECUTE FUNCTION update_reputation_score();
