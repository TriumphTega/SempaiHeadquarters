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
  const [lastCommentTime, setLastCommentTime] = useState(0); // For rate limiting
  const [rewardedCountToday, setRewardedCountToday] = useState(0); // Daily cap

  const COMMENT_COOLDOWN = 60 * 1000; // 60 seconds
  const DAILY_REWARD_LIMIT = 10; // Max 10 rewarded comments per day
  const MIN_COMMENT_LENGTH = 2; // Minimum characters for a valid comment
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
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const { data, error } = await supabase
        .from('comments')
        .select('*', { count: 'exact' })
        .eq('user_id', publicKey?.toString())
        .gte('created_at', `${today}T00:00:00Z`);

      if (!error) setRewardedCountToday(data.length);
    };

    fetchComments();
    fetchRewardedCommentsToday();

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
      .select('id, name, weekly_points, wallet_address')
      .eq('wallet_address', publicKey.toString())
      .single();

    if (userError || !user) {
      console.error('Error fetching user:', userError);
      return;
    }

    try {
      const isRewardEligible = rewardedCountToday < DAILY_REWARD_LIMIT;

      const { error: commentError } = await supabase
        .from('comments')
        .insert([{
          novel_id: novelId,
          user_id: user.id,
          username: user.name,
          content: newComment,
          parent_id: replyingTo || null,
          is_rewarded: isRewardEligible, // Track if this comment was rewarded
        }])
        .single();

      if (commentError) throw new Error(`Comment Error: ${commentError.message}`);

      if (isRewardEligible) {
        // Reward user

          let rewardAmount = 0; // Default value


            if (Number(balance) >= 100_000 && Number(balance) < 250_000) {
              rewardAmount = 1.2;  // Reward for 100k - 250k
            } else if (Number(balance) >= 250_000 && Number(balance) < 500_000) {
              rewardAmount = 1.5;  // Reward for 250k - 500k
            } else if (Number(balance) >= 500_000 && Number(balance) < 1_000_000) {
              rewardAmount = 1.7;  // Reward for 500k - 1M
            } else if (Number(balance) >= 1_000_000 && Number(balance) <= 5_000_000) {
              rewardAmount = 2; // Reward for 1M - 5M
            } else if (Number(balance) >= 5_000_000) {
              rewardAmount = 2.5; // Reward for 5M and above
            } else {
              rewardAmount = 1;   // No reward if balance doesn't fit any range
            }


        await supabase
          .from('wallet_balances')
          .update({ weekly_points: user.weekly_points + rewardAmount })
          .eq('user_id', user.id);

        await supabase
          .from('wallet_events')
          .insert([{
            destination_user_id: user.id,
            event_type: 'credit',
            amount_change: rewardAmount,
            source_user_id: "6f859ff9-3557-473c-b8ca-f23fd9f7af27",
            destination_chain: "SOL",
            source_currency: "Token",
            event_details: "comment_reward",
            wallet_address: user.wallet_address,
            source_chain: "SOL",
          }]);

        setRewardedCountToday((prev) => prev + 1); // Increment today's count
      }

      setNewComment('');
      setReplyingTo(null);
      setLastCommentTime(now); // Set cooldown timer

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
      <textarea
        className="textarea"
        value={newComment}
        onChange={(e) => setNewComment(e.target.value)}
        placeholder={replyingTo ? 'Replying...' : 'Write a comment'}
      />
      <button className="btn-post" onClick={handleCommentSubmit}>
        {replyingTo ? 'Post Reply' : 'Post Comment'}
      </button>
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
