import { useState } from "react";
import { FaPaperPlane, FaImage, FaFilm } from "react-icons/fa";
import styles from "./PostCreator.module.css";

export default function PostCreator({ userId, onNewPost }) {
  const [content, setContent] = useState("");
  const [images, setImages] = useState([]);
  const [gif, setGif] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    // Validate max 2 images
    if (images.length + selectedFiles.length > 2) {
      alert("Maximum 2 images allowed");
      return;
    }

    // Validate file types (images only, no GIFs)
    const validFiles = selectedFiles.filter(file => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        alert(`Invalid file type: ${file.name}. Only JPEG, PNG, and WebP allowed.`);
        return false;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert(`File too large: ${file.name}. Maximum 5MB allowed.`);
        return false;
      }
      return true;
    });

    setImages([...images, ...validFiles]);
  };

  const handleGifChange = (e) => {
    const selectedFile = e.target.files[0];
    
    if (!selectedFile) return;

    // Validate file type (GIF only)
    if (selectedFile.type !== 'image/gif') {
      alert("Only GIF files allowed");
      return;
    }

    // Validate file size (max 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      alert("GIF too large. Maximum 5MB allowed");
      return;
    }

    // Clear images if GIF is selected (mutually exclusive)
    setImages([]);
    setGif(selectedFile);
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const removeGif = () => {
    setGif(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && images.length === 0 && !gif || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("userId", userId);
      formData.append("content", content);
      
      images.forEach((image) => {
        formData.append("images", image);
      });

      if (gif) {
        formData.append("gif", gif);
      }

      const res = await fetch("/api/feed/posts", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create post");

      setContent("");
      setImages([]);
      setGif(null);
      if (onNewPost) onNewPost(data.post);
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Failed to create post: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.postCreator}>
      <form onSubmit={handleSubmit} className={styles.postForm}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          className={styles.postInput}
          maxLength={500}
          rows={3}
        />

        {/* Image Preview */}
        {images.length > 0 && (
          <div className={styles.mediaPreview}>
            {images.map((image, index) => (
              <div key={index} className={styles.mediaItem}>
                <img
                  src={URL.createObjectURL(image)}
                  alt={`Preview ${index + 1}`}
                  className={styles.previewImage}
                />
                <button
                  type="button"
                  className={styles.removeButton}
                  onClick={() => removeImage(index)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* GIF Preview */}
        {gif && (
          <div className={styles.mediaPreview}>
            <div className={styles.mediaItem}>
              <img
                src={URL.createObjectURL(gif)}
                alt="GIF preview"
                className={styles.previewImage}
              />
              <button
                type="button"
                className={styles.removeButton}
                onClick={removeGif}
              >
                ×
              </button>
            </div>
          </div>
        )}

        <div className={styles.postFooter}>
          <div className={styles.mediaButtons}>
            <label className={styles.mediaButton}>
              <FaImage />
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple
                onChange={handleImageChange}
                disabled={gif !== null || images.length >= 2}
                className={styles.fileInput}
              />
            </label>
            <label className={styles.mediaButton}>
              <FaFilm />
              <input
                type="file"
                accept="image/gif"
                onChange={handleGifChange}
                disabled={images.length > 0 || gif !== null}
                className={styles.fileInput}
              />
            </label>
          </div>
          <span className={styles.charCount}>{content.length}/500</span>
          <button
            type="submit"
            disabled={!content.trim() && images.length === 0 && !gif || isSubmitting}
            className={styles.postButton}
          >
            {isSubmitting ? (
              "Posting..."
            ) : (
              <>
                <FaPaperPlane /> Post
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
