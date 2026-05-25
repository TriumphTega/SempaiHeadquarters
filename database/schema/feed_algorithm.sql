-- User Follows Table (for network effects)
CREATE TABLE IF NOT EXISTS feed_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- User Engagement Tracking (for personalization)
CREATE TABLE IF NOT EXISTS feed_user_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  engagement_type VARCHAR(20) NOT NULL, -- 'like', 'comment', 'view', 'share'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, post_id, engagement_type)
);

-- Post Views Tracking
CREATE TABLE IF NOT EXISTS feed_post_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_feed_follows_follower ON feed_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_feed_follows_following ON feed_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_feed_user_engagement_user ON feed_user_engagement(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_user_engagement_post ON feed_user_engagement(post_id);
CREATE INDEX IF NOT EXISTS idx_feed_post_views_user ON feed_post_views(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_post_views_post ON feed_post_views(post_id);

-- Function to calculate post score based on X's algorithm principles
CREATE OR REPLACE FUNCTION calculate_post_score(
  p_post_id UUID,
  p_user_id UUID,
  p_current_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS NUMERIC AS $$
DECLARE
  v_score NUMERIC := 0;
  v_recency_score NUMERIC := 0;
  v_engagement_score NUMERIC := 0;
  v_network_score NUMERIC := 0;
  v_personalization_score NUMERIC := 0;
  v_diversity_score NUMERIC := 0;
  
  v_post_created_at TIMESTAMP WITH TIME ZONE;
  v_likes_count INTEGER;
  v_comments_count INTEGER;
  v_views_count INTEGER;
  v_post_author_id UUID;
  v_is_following BOOLEAN;
  v_user_engagement_count INTEGER;
  v_hours_since_post NUMERIC;
BEGIN
  -- Get post data
  SELECT 
    created_at,
    likes_count,
    comments_count,
    user_id
  INTO v_post_created_at, v_likes_count, v_comments_count, v_post_author_id
  FROM feed_posts
  WHERE id = p_post_id;
  
  -- Get view count
  SELECT COUNT(*) INTO v_views_count
  FROM feed_post_views
  WHERE post_id = p_post_id;
  
  -- Calculate hours since post (for recency decay)
  v_hours_since_post := EXTRACT(EPOCH FROM (p_current_time - v_post_created_at)) / 3600;
  
  -- 1. Recency Score (newer posts get higher scores, exponential decay)
  -- Using a 24-hour half-life for recency
  v_recency_score := 100 * EXP(-v_hours_since_post / 24);
  
  -- 2. Engagement Score (likes, comments, views)
  -- Weighted: likes (1.0), comments (2.0), views (0.1)
  v_engagement_score := 
    (v_likes_count * 1.0) + 
    (v_comments_count * 2.0) + 
    (v_views_count * 0.1);
  
  -- Normalize engagement score (cap at 100)
  v_engagement_score := LEAST(v_engagement_score / 10, 100);
  
  -- 3. Network Score (following relationship)
  -- Check if user follows the post author
  SELECT EXISTS(
    SELECT 1 FROM feed_follows 
    WHERE follower_id = p_user_id 
    AND following_id = v_post_author_id
  ) INTO v_is_following;
  
  IF v_is_following THEN
    v_network_score := 50; -- Boost for followed users
  ELSE
    v_network_score := 0;
  END IF;
  
  -- 4. Personalization Score (user's past engagement with author)
  -- Count how many times user engaged with this author's posts
  SELECT COUNT(*) INTO v_user_engagement_count
  FROM feed_user_engagement e
  JOIN feed_posts p ON e.post_id = p.id
  WHERE e.user_id = p_user_id
  AND p.user_id = v_post_author_id;
  
  -- Boost based on past engagement (diminishing returns)
  v_personalization_score := LEAST(v_user_engagement_count * 5, 30);
  
  -- 5. Diversity Score (penalize too many posts from same author in recent feed)
  -- This would be calculated at query time, not in this function
  
  -- Combine scores with weights (based on X's algorithm principles)
  -- Recency: 30%, Engagement: 25%, Network: 20%, Personalization: 25%
  v_score := 
    (v_recency_score * 0.30) +
    (v_engagement_score * 0.25) +
    (v_network_score * 0.20) +
    (v_personalization_score * 0.25);
  
  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Function to get personalized feed for a user
CREATE OR REPLACE FUNCTION get_personalized_feed(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  post_id UUID,
  user_id UUID,
  content TEXT,
  likes_count INTEGER,
  comments_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  score NUMERIC,
  user_name TEXT,
  user_wallet_address TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS post_id,
    p.user_id,
    p.content,
    p.likes_count,
    p.comments_count,
    p.created_at,
    calculate_post_score(p.id, p_user_id) AS score,
    u.name AS user_name,
    u.wallet_address AS user_wallet_address
  FROM feed_posts p
  JOIN users u ON p.user_id = u.id
  WHERE p.user_id != p_user_id -- Don't show own posts
  ORDER BY score DESC, p.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;
