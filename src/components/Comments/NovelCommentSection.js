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

export default function NovelCommentSection({ novelId, novelTitle }) {
  const { publicKey } = useWallet();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [areRepliesVisible, setAreRepliesVisible] = useState({});
  const [lastCommentTime, setLastCommentTime] = useState(0);
  const [rewardedCountToday, setRewardedCountToday] = useState(0);
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

    if (publicKey) {
      fetchComments();
      fetchRewardedCommentsToday();
    }

    const intervalId = setInterval(fetchComments, 5000);
    return () => clearInterval(intervalId);
  }, [novelId, publicKey]);

  const sendNotification = async (receiverId, message) => {
    if (!receiverId) return;

    await supabase.from('notifications').insert([
      {
        user_id: receiverId,
        message,
        is_read: false,
        created_at: new Date().toISOString(),
      },
    ]);
  };

  const handleCommentSubmit = async () => {
    if (!newComment || newComment.length < MIN_COMMENT_LENGTH) {
      alert(`Comment must be at least ${MIN_COMMENT_LENGTH} characters long.`);
      return;
    }

    const now = Date.now();
    if (now - lastCommentTime < COMMENT_COOLDOWN) {
      alert(`Please wait for ${(60000 - (now - lastCommentTime)) / 1000} seconds before posting another comment.`);
      return;
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name, weekly_points, wallet_address')
      .eq('wallet_address', publicKey?.toString())
      .single();

    if (userError || !user) {
      console.error('Error fetching user:', userError);
      return;
    }

    try {
      const isRewardEligible = rewardedCountToday < DAILY_REWARD_LIMIT;

      const { data: insertedComment, error: commentError } = await supabase
        .from('comments')
        .insert([
          {
            novel_id: novelId,
            user_id: user.id,
            username: user.name,
            content: newComment,
            parent_id: replyingTo || null,
            is_rewarded: isRewardEligible,
          },
        ])
        .select()
        .single();

      if (commentError) {
        console.error('Error inserting comment:', commentError.message);
        return;
      }

      if (replyingTo) {
        const { data: parentComment } = await supabase
          .from('comments')
          .select('user_id')
          .eq('id', replyingTo)
          .single();

        if (parentComment) {
          await sendNotification(
            parentComment.user_id,
            `${user.name} replied to your comment on "${novelTitle}".`
          );
        }
      }

      await sendNotification(user.id, `Your comment on "${novelTitle}" was posted successfully.`);

      setNewComment('');
      setReplyingTo(null);
      setLastCommentTime(now);
    } catch (error) {
      console.error('Error processing comment:', error.message);
    }
  };

  const addReply = (parentId) => {
    setReplyingTo(replyingTo === parentId ? null : parentId);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const toggleRepliesVisibility = (parentId) => {
    setAreRepliesVisible((prevState) => ({
      ...prevState,
      [parentId]: !prevState[parentId],
    }));
  };

  const buildThread = (comments) => {
    const map = {};
    comments.forEach((c) => (map[c.id] = { ...c, replies: [] }));
    const roots = [];

    comments.forEach((c) => {
      if (c.parent_id) {
        map[c.parent_id]?.replies.push(map[c.id]);
      } else {
        roots.push(map[c.id]);
      }
    });

    roots.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return roots;
  };

  return (
    <div className="comment-section">
      <h4 className="title">Comments</h4>
      <textarea className="textarea" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder={replyingTo ? 'Replying...' : 'Write a comment'} />
      <button className="btn-post" onClick={handleCommentSubmit}>
        {replyingTo ? 'Post Reply' : 'Post Comment'}
      </button>
      <div className="comments-container">
        {buildThread(comments).map((comment) => (
          <Comment key={comment.id} comment={comment} replies={comment.replies} addReply={addReply} replyingTo={replyingTo} cancelReply={cancelReply} toggleRepliesVisibility={toggleRepliesVisibility} areRepliesVisible={areRepliesVisible} />
        ))}
      </div>
    </div>
  );
}
