-- Novel view tracking functions

-- Function to increment novel view count
CREATE OR REPLACE FUNCTION increment_novel_view(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE novels
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get novel with view count
CREATE OR REPLACE FUNCTION get_novel_with_views(novel_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  summary TEXT,
  image TEXT,
  user_id UUID,
  is_visible BOOLEAN,
  view_count BIGINT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.title,
    n.summary,
    n.image,
    n.user_id,
    n.is_visible,
    COALESCE(n.view_count, 0) as view_count,
    n.created_at,
    n.updated_at
  FROM novels n
  WHERE n.id = novel_id;
END;
$$ LANGUAGE plpgsql;
