import { useState, useEffect } from "react";
import { FaHeart, FaComment, FaRegHeart, FaUserPlus, FaUserCheck } from "react-icons/fa";
import { formatDistanceToNow } from "date-fns";
import styles from "./FeedPost.module.css";
import CommentSection from "./CommentSection";

export default function FeedPost({ post, currentUserId }) {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
  const [showComments, setShowComments] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  // Track post view when component mounts
  useEffect(() => {
    if (currentUserId) {
      fetch("/api/feed/engagement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, postId: post.id, engagementType: "view" }),
      }).catch(console.error);
    }
  }, [currentUserId, post.id]);

  // Check if user is following the post author
  useEffect(() => {
    if (currentUserId && post.user.id !== currentUserId) {
      fetch(`/api/feed/follow?userId=${currentUserId}`)
        .then(res => res.json())
        .then(data => {
          const following = data.follows?.some(f => f.following_id === post.user.id);
          setIsFollowing(following);
        })
        .catch(console.error);
    }
  }, [currentUserId, post.user.id]);

  const handleLike = async () => {
    try {
      const res = await fetch(`/api/feed/posts/${post.id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to toggle like");

      setLiked(data.liked);
      setLikesCount((prev) => (data.liked ? prev + 1 : prev - 1));

      // Track engagement for algorithm
      if (data.liked) {
        await fetch("/api/feed/engagement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: currentUserId, postId: post.id, engagementType: "like" }),
        });
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handleCommentAdded = () => {
    setCommentsCount((prev) => prev + 1);
  };

  const handleFollow = async () => {
    if (!currentUserId) return;
    
    try {
      const res = await fetch("/api/feed/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followerId: currentUserId, followingId: post.user.id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to toggle follow");

      setIsFollowing(data.following);
    } catch (error) {
      console.error("Error toggling follow:", error);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });

  return (
    <div className={styles.post}>
      <div className={styles.postHeader}>
        <div className={styles.userAvatar}>
          {post.user.name?.charAt(0)?.toUpperCase() || "?"}
        </div>
        <div className={styles.userInfo}>
          <div className={styles.userName}>{post.user.name || "Anonymous"}</div>
          <div className={styles.postTime}>{timeAgo}</div>
        </div>
        {currentUserId && post.user.id !== currentUserId && (
          <button
            className={`${styles.followButton} ${isFollowing ? styles.following : ""}`}
            onClick={handleFollow}
          >
            {isFollowing ? <FaUserCheck /> : <FaUserPlus />}
            {isFollowing ? "Following" : "Follow"}
          </button>
        )}
      </div>

      <div className={styles.postContent}>
        <p>{post.content}</p>
        
        {/* Images */}
        {post.image_urls && post.image_urls.length > 0 && (
          <div className={styles.postImages}>
            {post.image_urls.map((url, index) => (
              <img
                key={index}
                src={url}
                alt={`Post image ${index + 1}`}
                className={styles.postImage}
              />
            ))}
          </div>
        )}

        {/* GIF */}
        {post.gif_url && (
          <div className={styles.postGif}>
            <img
              src={post.gif_url}
              alt="Post GIF"
              className={styles.postGifImage}
            />
          </div>
        )}
      </div>

      <div className={styles.postActions}>
        <button
          className={`${styles.actionButton} ${liked ? styles.liked : ""}`}
          onClick={handleLike}
        >
          {liked ? <FaHeart /> : <FaRegHeart />}
          <span>{likesCount}</span>
        </button>
        <button
          className={styles.actionButton}
          onClick={() => setShowComments(!showComments)}
        >
          <FaComment />
          <span>{commentsCount}</span>
        </button>
      </div>

      {showComments && (
        <CommentSection postId={post.id} userId={currentUserId} onCommentAdded={handleCommentAdded} />
      )}
    </div>
  );
}
