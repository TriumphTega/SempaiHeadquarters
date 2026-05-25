-- Function to increment post likes count
CREATE OR REPLACE FUNCTION increment_post_likes(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE feed_posts
  SET likes_count = likes_count + 1
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement post likes count
CREATE OR REPLACE FUNCTION decrement_post_likes(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE feed_posts
  SET likes_count = GREATEST(likes_count - 1, 0)
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment comment likes count
CREATE OR REPLACE FUNCTION increment_comment_likes(comment_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE feed_comments
  SET likes_count = likes_count + 1
  WHERE id = comment_id;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement comment likes count
CREATE OR REPLACE FUNCTION decrement_comment_likes(comment_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE feed_comments
  SET likes_count = GREATEST(likes_count - 1, 0)
  WHERE id = comment_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment post comments count
CREATE OR REPLACE FUNCTION increment_post_comments(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE feed_posts
  SET comments_count = comments_count + 1
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement post comments count
CREATE OR REPLACE FUNCTION decrement_post_comments(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE feed_posts
  SET comments_count = GREATEST(comments_count - 1, 0)
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;
