"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../services/supabase/supabaseClient";
import { useWallet } from "@solana/wallet-adapter-react";
import { FaComment, FaReply, FaTimes, FaTrash, FaEye, FaEyeSlash } from "react-icons/fa";
import UseAmethystBalance from "../../components/UseAmethystBalance";
import styles from "./CommentSection.module.css";

const Comment = ({ comment, replies, addReply, replyingTo, cancelReply, toggleReplies, showReplies, deleteComment, currentUserId }) => {
  const isOwner = comment.user_id === currentUserId;

  return (
    <div className={styles.comment}>
      <div className={styles.commentHeader}>
        <span className={styles.commentUsername}>{formatUsername(comment.username)}</span>
        <span className={styles.commentTimestamp}>
          {new Date(comment.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
        </span>
      </div>
      <div className={styles.commentContent}>
        <p>{comment.content}</p>
      </div>
      <div className={styles.commentActions}>
        <button
          className={`${styles.actionButton} ${replyingTo === comment.id ? styles.active : ""}`}
          onClick={() => addReply(comment.id)}
          title={replyingTo === comment.id ? "Replying..." : "Reply"}
        >
          <FaReply /> {replyingTo === comment.id ? "Replying" : "Reply"}
        </button>
        {replyingTo === comment.id && (
          <button className={`${styles.actionButton} ${styles.cancelButton}`} onClick={cancelReply} title="Cancel Reply">
            <FaTimes /> Cancel
          </button>
        )}
        {replies.length > 0 && (
          <button
            className={styles.actionButton}
            onClick={() => toggleReplies(comment.id)}
            title={showReplies[comment.id] ? "Hide Replies" : "Show Replies"}
          >
            {showReplies[comment.id] ? <FaEyeSlash /> : <FaEye />} {showReplies[comment.id] ? "Hide" : "Show"} ({replies.length})
          </button>
        )}
        {isOwner && (
          <button className={`${styles.actionButton} ${styles.deleteButton}`} onClick={() => deleteComment(comment.id)} title="Delete Comment">
            <FaTrash /> Delete
          </button>
        )}
      </div>
      {showReplies[comment.id] && replies.length > 0 && (
        <div className={styles.replies}>
          {replies.map((reply) => (
            <Comment
              key={reply.id}
              comment={reply}
              replies={reply.replies || []}
              addReply={addReply}
              replyingTo={replyingTo}
              cancelReply={cancelReply}
              toggleReplies={toggleReplies}
              showReplies={showReplies}
              deleteComment={deleteComment}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const formatUsername = (username) => {
  if (username.length > 15) return `${username.slice(0, 2)}**${username.slice(-2)}`;
  return username;
};

export default function CommentSection({ novelId, chapter }) {
  const { publicKey } = useWallet();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [showReplies, setShowReplies] = useState({});
  const { balance } = UseAmethystBalance();
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    if (!publicKey) return;

    const fetchUserId = async () => {
      const { data: user, error } = await supabase
        .from("users")
        .select("id")
        .eq("wallet_address", publicKey.toString())
        .single();

      if (error || !user) {
        console.error("Error fetching user ID:", error);
        return;
      }
      setCurrentUserId(user.id);
    };

    fetchUserId();
  }, [publicKey]);

  const deleteComment = async (commentId) => {
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", currentUserId);

    if (error) {
      console.error("Error deleting comment:", error);
      return;
    }
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("novel_id", novelId)
      .eq("chapter", chapter)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching comments:", error);
      return;
    }
    setComments(data);
  };

  useEffect(() => {
    fetchComments();
    const intervalId = setInterval(fetchComments, 5000);
    return () => clearInterval(intervalId);
  }, [novelId, chapter]);

  const handleCommentSubmit = async () => {
    if (!newComment.trim()) return;

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, name, weekly_points, wallet_address")
      .eq("wallet_address", publicKey.toString())
      .single();

    if (userError || !user) {
      console.error("Error fetching user:", userError);
      return;
    }

    try {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000).toISOString();
      const today = new Date(now.setHours(0, 0, 0, 0)).toISOString();

      const { data: recentComments } = await supabase
        .from("comments")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", oneMinuteAgo);

      if (recentComments.length > 0) {
        alert("You can only post one comment per minute.");
        return;
      }

      const { data: rewardedToday } = await supabase
        .from("comments")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_rewarded", true)
        .gte("created_at", today);

      const hasReachedDailyLimit = rewardedToday.length >= 10;

      const { data: comment, error: commentError } = await supabase
        .from("comments")
        .insert([{ novel_id: novelId, chapter, user_id: user.id, username: user.name, content: newComment, parent_id: replyingTo || null, is_rewarded: !hasReachedDailyLimit }])
        .select()
        .single();

      if (commentError) throw commentError;

      if (!hasReachedDailyLimit) {
        let rewardAmount = balance >= 5000000 ? 25 : balance >= 1000000 ? 20 : balance >= 500000 ? 17 : balance >= 250000 ? 15 : balance >= 100000 ? 12 : 10;

        await supabase.from("users").update({ weekly_points: user.weekly_points + rewardAmount }).eq("id", user.id);

        await supabase.from("wallet_events").insert([
          {
            destination_user_id: user.id,
            event_type: "credit",
            amount_change: rewardAmount,
            source_user_id: "6f859ff9-3557-473c-b8ca-f23fd9f7af27",
            destination_chain: "SOL",
            source_currency: "Token",
            event_details: "comment_reward",
            wallet_address: user.wallet_address,
            source_chain: "SOL",
          },
        ]);
      }

      if (replyingTo) {
        const { data: parentComment } = await supabase.from("comments").select("user_id").eq("id", replyingTo).single();
        if (parentComment && parentComment.user_id !== user.id) {
          await supabase.from("notifications").insert([
            { user_id: parentComment.user_id, novel_id: novelId, chapter, message: `${user.name} replied to your comment.`, type: "reply" },
          ]);
        }
      }

      setNewComment("");
      setReplyingTo(null);
      setComments((prev) => [comment, ...prev]);
    } catch (error) {
      console.error("Error submitting comment:", error.message);
    }
  };

  const addReply = (parentId) => {
    setReplyingTo(parentId);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const toggleReplies = (parentId) => {
    setShowReplies((prev) => ({ ...prev, [parentId]: !prev[parentId] }));
  };

  const buildThread = (comments) => {
    const map = {};
    comments.forEach((c) => (map[c.id] = { ...c, replies: [] }));
    const roots = [];

    comments.forEach((c) => {
      if (c.parent_id) map[c.parent_id]?.replies.push(map[c.id]);
      else roots.push(map[c.id]);
    });

    roots.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return roots;
  };

  return (
    <div className={styles.commentSection}>
      <h4 className={styles.title}>
        <FaComment /> Comments
      </h4>
      <textarea
        className={styles.textarea}
        value={newComment}
        onChange={(e) => setNewComment(e.target.value)}
        placeholder={replyingTo ? "Type your reply..." : "Add your comment..."}
      />
      <button className={styles.postButton} onClick={handleCommentSubmit}>
        <FaComment /> {replyingTo ? "Post Reply" : "Post Comment"}
      </button>
      <div className={styles.commentsContainer}>
        {buildThread(comments).map((comment) => (
          <Comment
            key={comment.id}
            comment={comment}
            replies={comment.replies}
            addReply={addReply}
            replyingTo={replyingTo}
            cancelReply={cancelReply}
            toggleReplies={toggleReplies}
            showReplies={showReplies}
            deleteComment={deleteComment}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </div>
  );
}