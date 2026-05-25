import { useState, useEffect } from "react";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { formatDistanceToNow } from "date-fns";
import styles from "./CommentSection.module.css";

export default function CommentSection({ postId, userId, onCommentAdded }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/feed/posts/${postId}/comments`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch comments");

      setComments(data.comments || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/feed/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, content: newComment }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create comment");

      setNewComment("");
      setComments([data.comment, ...comments]);
      if (onCommentAdded) onCommentAdded();

      // Track engagement for algorithm
      await fetch("/api/feed/engagement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, postId, engagementType: "comment" }),
      });
    } catch (error) {
      console.error("Error creating comment:", error);
      alert("Failed to create comment: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentLike = async (commentId, currentLiked) => {
    try {
      const res = await fetch(`/api/feed/comments/${commentId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to toggle like");

      setComments(comments.map(comment => 
        comment.id === commentId
          ? { 
              ...comment, 
              likes_count: data.liked ? comment.likes_count + 1 : comment.likes_count - 1,
              liked: data.liked
            }
          : comment
      ));
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  if (loading) return <div className={styles.loading}>Loading comments...</div>;

  return (
    <div className={styles.commentSection}>
      <form onSubmit={handleSubmitComment} className={styles.commentForm}>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          className={styles.commentInput}
          maxLength={500}
          rows={2}
        />
        <button
          type="submit"
          disabled={!newComment.trim() || isSubmitting}
          className={styles.commentButton}
        >
          {isSubmitting ? "Posting..." : "Post Comment"}
        </button>
      </form>

      <div className={styles.commentsList}>
        {comments.length > 0 ? (
          comments.map((comment) => (
            <div key={comment.id} className={styles.comment}>
              <div className={styles.commentHeader}>
                <div className={styles.commentAvatar}>
                  {comment.user.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className={styles.commentUserInfo}>
                  <div className={styles.commentUserName}>
                    {comment.user.name || "Anonymous"}
                  </div>
                  <div className={styles.commentTime}>
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </div>
                </div>
              </div>
              <div className={styles.commentContent}>
                <p>{comment.content}</p>
              </div>
              <div className={styles.commentActions}>
                <button
                  className={`${styles.likeButton} ${comment.liked ? styles.liked : ""}`}
                  onClick={() => handleCommentLike(comment.id, comment.liked)}
                >
                  {comment.liked ? <FaHeart /> : <FaRegHeart />}
                  <span>{comment.likes_count || 0}</span>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className={styles.noComments}>No comments yet. Be the first!</div>
        )}
      </div>
    </div>
  );
}
