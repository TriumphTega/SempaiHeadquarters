'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase/supabaseClient';
import { useWallet } from '@solana/wallet-adapter-react';
import './CommentSection.css';
import UseAmethystBalance from '../../components/UseAmethystBalance';

const Comment = ({ comment, replies, addReply, replyingTo, cancelReply, toggleReplies, showReplies }) => (
  <div className="comment">
    <div className="comment-header">
      <strong className="comment-username">
        <span className="username-text">{formatUsername(comment.username)}</span>
      </strong>
    </div>
    <div className="comment-content">
      <p>{comment.content}</p>
    </div>
    <div className="comment-actions">
      <button className="btn-reply" onClick={() => addReply(comment.id)}>
        {replyingTo === comment.id ? 'Replying...' : 'Reply'}
      </button>
      {replyingTo === comment.id && (
        <button className="btn-cancel" onClick={cancelReply}>
          Cancel
        </button>
      )}
      <button className="btn-toggle-replies" onClick={() => toggleReplies(comment.id)}>
        {showReplies[comment.id] ? 'Hide Replies' : 'Show Replies'}
      </button>
    </div>

    {showReplies[comment.id] && replies.length > 0 && (
      <div className="replies">
        {replies.map((reply) => (
          <Comment
            key={reply.id}
            comment={reply}
            replies={reply.replies}
            addReply={addReply}
            replyingTo={replyingTo}
            cancelReply={cancelReply}
            toggleReplies={toggleReplies}
            showReplies={showReplies}
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

export default function CommentSection({ novelId, chapter }) {
  const { publicKey } = useWallet();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [showReplies, setShowReplies] = useState({});
  const { balance } = UseAmethystBalance();
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    if (publicKey) {
      supabase
        .from('users')
        .select('id')
        .eq('wallet_address', publicKey.toString())
        .single()
        .then(({ data, error }) => {
          if (error) console.error(error);
          else setUserId(data?.id);
        });
    }
  }, [publicKey]);

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('novel_id', novelId)
      .eq('chapter', chapter)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching comments:', error);
      return;
    }
    setComments(data);
  };

  useEffect(() => {
    fetchComments();
    const subscription = supabase
      .channel('comments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, fetchComments)
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [novelId, chapter]);

  const handleCommentSubmit = async () => {
    if (!newComment.trim()) return;

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
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000).toISOString();
      const today = new Date(now.setHours(0, 0, 0, 0)).toISOString();

      const { data: recentComments } = await supabase
        .from('comments')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', oneMinuteAgo);

      if (recentComments.length > 0) {
        alert('You can only post one comment per minute.');
        return;
      }

      const { data: rewardedToday } = await supabase
        .from('comments')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_rewarded', true)
        .gte('created_at', today);

      const hasReachedDailyLimit = rewardedToday.length >= 10;

      const { data: comment, error: commentError } = await supabase
        .from('comments')
        .insert([{
          novel_id: novelId,
          chapter,
          user_id: user.id,
          username: user.name,
          content: newComment,
          parent_id: replyingTo || null,
          is_rewarded: !hasReachedDailyLimit
        }])
        .select()
        .single();

      if (commentError) throw commentError;

      if (!hasReachedDailyLimit) {
        let rewardAmount = balance >= 5000000 ? 25 :
                           balance >= 1000000 ? 20 :
                           balance >= 500000 ? 17 :
                           balance >= 250000 ? 15 :
                           balance >= 100000 ? 12 : 10;

        await supabase
          .from('users')
          .update({ weekly_points: user.weekly_points + rewardAmount })
          .eq('id', user.id);

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
      }

      if (replyingTo) {
        const { data: parentComment } = await supabase
          .from('comments')
          .select('user_id')
          .eq('id', replyingTo)
          .single();

        if (parentComment && parentComment.user_id !== user.id) {
          await supabase
            .from('notifications')
            .insert([{
              user_id: parentComment.user_id,
              novel_id: novelId,
              chapter,
              message: `${user.name} replied to your comment.`,
              type: 'reply'
            }]);
        }
      }

      setNewComment('');
      setReplyingTo(null);
      setComments((prev) => [comment, ...prev]);

    } catch (error) {
      console.error('Error submitting comment:', error.message);
    }
  };

  return (
    <div className="comment-section">
      <h4 className="title">Comments</h4>
      <textarea className="textarea" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Write a comment" />
      <button className="btn-post" onClick={handleCommentSubmit}>Post Comment</button>
      <div className="comments-container">
        {buildThread(comments).map((comment) => (
          <Comment key={comment.id} comment={comment} replies={comment.replies || []} addReply={addReply} replyingTo={replyingTo} cancelReply={cancelReply} toggleReplies={toggleReplies} showReplies={showReplies} />
        ))}
      </div>
    </div>
  );
}
