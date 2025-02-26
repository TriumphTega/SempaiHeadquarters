"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../services/supabase/supabaseClient";
import { useWallet } from "@solana/wallet-adapter-react";
import { FaComment, FaReply, FaTimes, FaTrash, FaEye, FaEyeSlash } from "react-icons/fa";
import UseAmethystBalance from "../../components/UseAmethystBalance";
import styles from "./CommentSection.module.css";

const Comment = ({ comment, replies, addReply, replyingTo, cancelReply, toggleRepliesVisibility, areRepliesVisible, deleteComment, currentUserId }) => {
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
            onClick={() => toggleRepliesVisibility(comment.id)}
            title={areRepliesVisible[comment.id] ? "Hide Replies" : "Show Replies"}
          >
            {areRepliesVisible[comment.id] ? <FaEyeSlash /> : <FaEye />} {areRepliesVisible[comment.id] ? "Hide" : "Show"} ({replies.length})
          </button>
        )}
        {isOwner && (
          <button className={`${styles.actionButton} ${styles.deleteButton}`} onClick={() => deleteComment(comment.id)} title="Delete Comment">
            <FaTrash /> Delete
          </button>
        )}
      </div>
      {areRepliesVisible[comment.id] && replies.length > 0 && (
        <div className={styles.replies}>
          {replies.map((reply) => (
            <Comment
              key={reply.id}
              comment={reply}
              replies={reply.replies || []}
              addReply={addReply}
              replyingTo={replyingTo}
              cancelReply={cancelReply}
              toggleRepliesVisibility={toggleRepliesVisibility}
              areRepliesVisible={areRepliesVisible}
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

export default function NovelCommentSection({ novelId, novelTitle = "Unknown Novel" }) {
  const { publicKey } = useWallet();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [areRepliesVisible, setAreRepliesVisible] = useState({});
  const [lastCommentTime, setLastCommentTime] = useState(0);
  const [rewardedCountToday, setRewardedCountToday] = useState(0);
  const COMMENT_COOLDOWN = 60 * 1000;
  const DAILY_REWARD_LIMIT = 10;
  const MIN_COMMENT_LENGTH = 2;
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

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("novel_id", novelId)
      .order("created_at", { ascending: false });

    if (!error) setComments(data);
  };

  useEffect(() => {
    if (!publicKey) return;

    fetchComments();

    const subscription = supabase
      .channel("comments")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments" }, fetchComments)
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [novelId, publicKey]);

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

  const sendNotification = async (receiverId, message, type = "comment") => {
    if (!receiverId) return;

    const { error } = await supabase.from("notifications").insert([
      { user_id: receiverId, message, type, is_read: false, created_at: new Date().toISOString() },
    ]);

    if (error) console.error("Error inserting notification:", error.message);
  };

  const handleCommentSubmit = async () => {
    if (!newComment || newComment.length < MIN_COMMENT_LENGTH) {
      alert(`Comment must be at least ${MIN_COMMENT_LENGTH} characters long.`);
      return;
    }

    const now = Date.now();
    if (now - lastCommentTime < COMMENT_COOLDOWN) {
      alert(`Please wait ${(COMMENT_COOLDOWN - (now - lastCommentTime)) / 1000} seconds before posting again.`);
      return;
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, name, weekly_points, wallet_address")
      .eq("wallet_address", publicKey?.toString())
      .single();

    if (userError || !user) {
      console.error("Error fetching user:", userError);
      return;
    }

    try {
      const today = new Date().setHours(0, 0, 0, 0);
      const { data: rewardedToday } = await supabase
        .from("comments")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_rewarded", true)
        .gte("created_at", new Date(today).toISOString());

      const hasReachedDailyLimit = rewardedToday.length >= DAILY_REWARD_LIMIT;
      let rewardAmount = balance >= 5000000 ? 25 : balance >= 1000000 ? 20 : balance >= 500000 ? 17 : balance >= 250000 ? 15 : balance >= 100000 ? 12 : 10;

      const { data: insertedComment, error: commentError } = await supabase
        .from("comments")
        .insert([{ novel_id: novelId, user_id: user.id, username: user.name, content: newComment, parent_id: replyingTo || null, is_rewarded: !hasReachedDailyLimit }])
        .select()
        .single();

      if (commentError) throw commentError;

      if (replyingTo) {
        const { data: parentComment } = await supabase.from("comments").select("user_id").eq("id", replyingTo).single();
        if (parentComment?.user_id) {
          await sendNotification(parentComment.user_id, `${user.name} replied to your comment on "${novelTitle}".`);
        }
      }

      await sendNotification(user.id, `Your comment on "${novelTitle || "a novel"}" was posted successfully.`);

      if (!hasReachedDailyLimit) {
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

      setNewComment("");
      setReplyingTo(null);
      setLastCommentTime(now);
      setRewardedCountToday(rewardedToday.length + 1);
      fetchComments();
    } catch (error) {
      console.error("Error submitting comment:", error.message);
    }
  };

  const addReply = (parentId) => {
    setReplyingTo(replyingTo === parentId ? null : parentId);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const toggleRepliesVisibility = (parentId) => {
    setAreRepliesVisible((prev) => ({ ...prev, [parentId]: !prev[parentId] }));
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
            toggleRepliesVisibility={toggleRepliesVisibility}
            areRepliesVisible={areRepliesVisible}
            deleteComment={deleteComment}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </div>
  );
}