'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase/supabaseClient';
import { useWallet } from '@solana/wallet-adapter-react';
import './CommentSection.css';
import UseAmethystBalance from '../../components/UseAmethystBalance';

const Comment = ({ comment, replies, addReply, replyingTo, cancelReply, toggleRepliesVisibility, areRepliesVisible, deleteComment, currentUserId }) => {
  const isOwner = comment.user_id === currentUserId; // Ensure ownership check is correct

  return (
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
    <button
      className={`btn-reply ${replyingTo === comment.id ? 'active' : ''}`}
      onClick={() => addReply(comment.id)}
    >
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
      {isOwner && (
          <button className="btn small-btn btn-danger" onClick={() => deleteComment(comment.id)}>
            Delete
          </button>
        )}
    </div>

    {areRepliesVisible[comment.id] && replies.length > 0 && (
      <div className="replies">
        {replies.map((reply) => (
        <Comment
        key={comment.id}
        comment={comment}
        replies={comment.replies}
        addReply={addReply}
        replyingTo={replyingTo}
        cancelReply={cancelReply}
        toggleRepliesVisibility={toggleRepliesVisibility}
        areRepliesVisible={areRepliesVisible}
        deleteComment={deleteComment} // ✅ Ensure this is passed
        currentUserId={currentUserId}
      />
      
        ))}
      </div>
    )}
  </div>
);

};
  
const formatUsername = (username) => {
  if (username.length > 15) {
    return `${username.slice(0, 2)}**${username.slice(-2)}`;
  }
  return username;
};

export default function NovelCommentSection({ novelId, novelTitle = "Unknown Novel" }) {
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
  const [currentUserId, setCurrentUserId] = useState(null); // Track logged-in user ID


  // ✅ Move fetchComments outside of useEffect
  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('novel_id', novelId)
      .order('created_at', { ascending: false });

    if (!error) setComments(data);
  };

  useEffect(() => {
    if (!publicKey) return;

    const fetchUserId = async () => {
      const { data: user, error } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', publicKey.toString())
        .single();

      if (error || !user) {
        console.error('Error fetching user ID:', error);
        return;
      }

      setCurrentUserId(user.id); // Save user ID
    };

    fetchUserId();
  }, [publicKey]); // Runs when wallet connects

  const deleteComment = async (commentId) => {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', currentUserId); // Ensure only the owner can delete
  
    if (error) {
      console.error('Error deleting comment:', error);
      return;
    }
  
    setComments((prev) => prev.filter((c) => c.id !== commentId)); // Remove from UI
  };

  useEffect(() => {
    if (!publicKey) return;
  
    fetchComments();
  
    const subscription = supabase
      .channel('comments')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, fetchComments)
      .subscribe();
  
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [novelId, publicKey]);
  
 
  const sendNotification = async (receiverId, message, type = 'comment') => {
    if (!receiverId) {
      console.log('No receiverId found for notification.');
      return;
    }
  
    const { error } = await supabase.from('notifications').insert([
      {
        user_id: receiverId,
        message,
        type,
        is_read: false,
        created_at: new Date().toISOString(),
      },
    ]);
  
    if (error) {
      console.error('Error inserting notification:', error.message);
    } else {
      console.log('Notification inserted successfully');
    }
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
      const hasReachedDailyLimit = rewardedCountToday >= DAILY_REWARD_LIMIT;
      let rewardAmount = 10;
  
      if (Number(balance) >= 100_000 && Number(balance) < 250_000) {
        rewardAmount = 12;
      } else if (Number(balance) >= 250_000 && Number(balance) < 500_000) {
        rewardAmount = 15;
      } else if (Number(balance) >= 500_000 && Number(balance) < 1_000_000) {
        rewardAmount = 17;
      } else if (Number(balance) >= 1_000_000 && Number(balance) < 5_000_000) {
        rewardAmount = 20;
      } else if (Number(balance) >= 5_000_000) {
        rewardAmount = 25;
      } else {
        rewardAmount = 10;
      }
  
      const { data: insertedComment, error: commentError } = await supabase
        .from('comments')
        .insert([{
          novel_id: novelId,
          user_id: user.id,
          username: user.name,
          content: newComment,
          parent_id: replyingTo || null,
          is_rewarded: !hasReachedDailyLimit
        }])
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
  
        if (parentComment?.user_id) {
          await sendNotification(
            parentComment.user_id,
            `${user.name} replied to your comment on "${novelTitle}".`
          );
        }
      }
  
      await sendNotification(user.id, `Your comment on "${novelTitle || 'a novel'}" was posted successfully.`);
  
      if (!hasReachedDailyLimit) {
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
  
      setNewComment('');
      setReplyingTo(null);
      setLastCommentTime(now);
      setRewardedCountToday(rewardedCountToday + 1);
      fetchComments();
  
    } catch (error) {
      console.error('Error submitting comment:', error.message);
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
          <Comment key={comment.id} comment={comment} replies={comment.replies} addReply={addReply} replyingTo={replyingTo} cancelReply={cancelReply} toggleRepliesVisibility={toggleRepliesVisibility} areRepliesVisible={areRepliesVisible} deleteComment={deleteComment}
          currentUserId={currentUserId}  />
        ))}
      </div>
    </div>
  );
}
