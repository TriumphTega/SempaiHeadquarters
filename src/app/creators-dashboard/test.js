'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase/supabaseClient';
import { useWallet } from '@solana/wallet-adapter-react';
import './CommentSection.css';
import UseAmethystBalance from '../../components/UseAmethystBalance';

const Comment = ({ comment, replies, addReply, replyingTo, cancelReply, toggleRepliesVisibility, areRepliesVisible }) => (
  <div className="comment">
    <div className="comment-header">
      <span className="username-text">
        {formatUsername(comment.username)} {new Date(comment.created_at).toLocaleDateString()} {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
    <div className="comment-content">
      <p>{comment.content}</p>
    </div>
    <div className="comment-actions">
      <button className="btn-reply" onClick={() => addReply(comment.id)}>
        {replyingTo === comment.id ? 'Replying...' : 'Reply'}
      </button>
      {replyingTo === comment.id && (
        <button className="btn-cancel" onClick={cancelReply}>Cancel</button>
      )}
      {replies.length > 0 && (
        <button className="btn-toggle-replies" onClick={() => toggleRepliesVisibility(comment.id)}>
          {areRepliesVisible[comment.id] ? 'Hide Replies' : 'Show Replies'}
        </button>
      )}
    </div>

    {areRepliesVisible[comment.id] && replies.length > 0 && (
      <div className="replies">
        {replies.map((reply) => (
          <Comment
            key={reply.id}
            comment={reply}
            replies={reply.replies}
            addReply={addReply}
            replyingTo={replyingTo}
            cancelReply={cancelReply}
            toggleRepliesVisibility={toggleRepliesVisibility}
            areRepliesVisible={areRepliesVisible}
          />
        ))}
      </div>
    )}
  </div>
);

const formatUsername = (username) => {
  if (username.length > 15) {
    return `${username.slice(0, 2)}**${username.slice(-2)}`;
  }
  return username;
};

export default function NovelCommentSection({ novelId }) {
  const { publicKey } = useWallet();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [areRepliesVisible, setAreRepliesVisible] = useState({});
  const [lastCommentTime, setLastCommentTime] = useState(0);
  const [rewardedCountToday, setRewardedCountToday] = useState(0);
  const [notifications, setNotifications] = useState([]); // Store notifications

  const COMMENT_COOLDOWN = 60 * 1000;
  const DAILY_REWARD_LIMIT = 10;
  const MIN_COMMENT_LENGTH = 2;
  const { balance } = UseAmethystBalance();

  useEffect(() => {
    const fetchComments = async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('novel_id', novelId)
        .order('created_at', { ascending: false });

      if (!error) setComments(data);
    };

    const fetchRewardedCommentsToday = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('comments')
        .select('*', { count: 'exact' })
        .eq('user_id', publicKey?.toString())
        .gte('created_at', `${today}T00:00:00Z`);

      if (!error) setRewardedCountToday(data.length);
    };

    const fetchNotifications = async () => {
      if (!publicKey) return;

      const walletAddress = publicKey.toString();
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', walletAddress)
        .single();

      if (userError || !user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (!error) setNotifications(data);
    };

    if (publicKey) {
      fetchComments();
      fetchRewardedCommentsToday();
      fetchNotifications();
    }

    const intervalId = setInterval(fetchComments, 5000);
    return () => clearInterval(intervalId);
  }, [novelId, publicKey]);

  const handleCommentSubmit = async () => {
    if (!newComment || newComment.length < MIN_COMMENT_LENGTH) {
      alert(`Comment must be at least ${MIN_COMMENT_LENGTH} characters long.`);
      return;
    }

    const now = Date.now();
    if (now - lastCommentTime < COMMENT_COOLDOWN) {
      alert(`Please wait for ${(60000 - (now - lastCommentTime))/1000} seconds before posting another comment.`);
      return;
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name, wallet_address')
      .eq('wallet_address', publicKey?.toString())
      .single();

    if (userError || !user) return;

    const { data, error: commentError } = await supabase
      .from('comments')
      .insert([{
        novel_id: novelId,
        user_id: user.id,
        username: user.name,
        content: newComment,
        parent_id: replyingTo || null,
      }])
      .single();

    if (commentError) return;

    if (replyingTo) {
      const { data: parentComment, error: parentError } = await supabase
        .from("comments")
        .select("user_id")
        .eq("id", replyingTo)
        .single();

      if (!parentError && parentComment) {
        await supabase
          .from("notifications")
          .insert([
            {
              user_id: parentComment.user_id,
              novel_id: novelId,
              comment_id: replyingTo,
              type: "reply",
              is_read: false,
            },
          ]);
      }
    }

    setNewComment('');
    setReplyingTo(null);
    setLastCommentTime(now);
  };

  return (
    <div className="comment-section">
      <h4 className="title">Comments</h4>
      <textarea className="textarea" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder={replyingTo ? 'Replying...' : 'Write a comment'} />
      <button className="btn-post" onClick={handleCommentSubmit}>{replyingTo ? 'Post Reply' : 'Post Comment'}</button>

      <div className="notifications">
        <h4>Notifications</h4>
        {notifications.map(n => <p key={n.id}>You got a reply!</p>)}
      </div>

      <div className="comments-container">
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
          />
        ))}
      </div>
    </div>
  );
}
