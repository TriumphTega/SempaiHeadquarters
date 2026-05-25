import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Helper function to compress image
async function compressImage(file, maxWidth = 1920, maxHeight = 1080, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: file.type }));
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          file.type,
          quality
        );
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

// Helper function to upload image to Supabase storage
async function uploadImageToSupabase(file, userId, bucket = 'feed-images') {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = fileName;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return publicUrl;
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const userId = formData.get('userId');
    const content = formData.get('content');
    const images = formData.getAll('images');
    const gif = formData.get('gif');

    if (!userId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (content.trim().length === 0 && !images.length && !gif) {
      return NextResponse.json({ error: 'Content or media required' }, { status: 400 });
    }

    if (content.length > 500) {
      return NextResponse.json({ error: 'Content too long (max 500 characters)' }, { status: 400 });
    }

    // Validate image count (max 2)
    if (images.length > 2) {
      return NextResponse.json({ error: 'Maximum 2 images allowed' }, { status: 400 });
    }

    // Validate GIF count (max 1)
    if (gif && images.length > 0) {
      return NextResponse.json({ error: 'Cannot have both images and GIF' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    let imageUrls = [];
    let gifUrl = null;

    // Process and upload images
    if (images.length > 0) {
      for (const image of images) {
        if (image instanceof File) {
          // Check file size (max 5MB)
          if (image.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: 'Image too large (max 5MB)' }, { status: 400 });
          }

          // Compress image if it's too large
          let processedImage = image;
          if (image.size > 1024 * 1024) { // If larger than 1MB
            try {
              processedImage = await compressImage(image, 1920, 1080, 0.7);
            } catch (error) {
              console.error('Image compression failed:', error);
              // Continue with original image if compression fails
            }
          }

          const imageUrl = await uploadImageToSupabase(processedImage, userId);
          imageUrls.push(imageUrl);
        }
      }
    }

    // Process and upload GIF
    if (gif && gif instanceof File) {
      // Check file size (max 5MB)
      if (gif.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'GIF too large (max 5MB)' }, { status: 400 });
      }

      // Don't compress GIFs to preserve animation
      gifUrl = await uploadImageToSupabase(gif, userId);
    }

    const { data: post, error } = await supabase
      .from('feed_posts')
      .insert({
        user_id: userId,
        content: content.trim(),
        image_urls: imageUrls.length > 0 ? imageUrls : null,
        gif_url: gifUrl,
      })
      .select(`
        *,
        user:user_id (
          id,
          name,
          wallet_address
        )
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { data: posts, error } = await supabase
      .from('feed_posts')
      .select(`
        *,
        user:user_id (
          id,
          name,
          wallet_address
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({ posts }, { status: 200 });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}
