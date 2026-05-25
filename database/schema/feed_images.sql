-- Add image columns to feed_posts table
ALTER TABLE feed_posts 
ADD COLUMN IF NOT EXISTS image_urls TEXT[],
ADD COLUMN IF NOT EXISTS gif_url TEXT;

-- Create Supabase storage bucket for feed images
-- Run this in Supabase SQL Editor or via Supabase Dashboard
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'feed-images',
  'feed-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

-- Create storage policies for the bucket
-- Allow public read access
CREATE POLICY "Public read access for feed images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'feed-images');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload feed images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'feed-images');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete their own feed images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'feed-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Update feed_posts table to ensure image_urls array has max 2 elements
ALTER TABLE feed_posts 
ADD CONSTRAINT check_max_images CHECK (
  image_urls IS NULL OR array_length(image_urls, 1) <= 2
);

-- Add index for image-based queries
CREATE INDEX IF NOT EXISTS idx_feed_posts_has_images 
ON feed_posts USING GIN (image_urls) 
WHERE image_urls IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_feed_posts_has_gif 
ON feed_posts (gif_url) 
WHERE gif_url IS NOT NULL;
