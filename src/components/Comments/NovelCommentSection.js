'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase/supabaseClient';
import { useWallet } from '@solana/wallet-adapter-react';
import './CommentSection.css'; // Import CSS styles

const Comment = ({ comment, replies, addReply, replyingTo, cancelReply }) => (
  <div className="comment">
    <div className="comment-header">
    <span className="username-text">{formatUsername(comment.username)}</span>
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
    </div>

    {replies.length > 0 && (
      <div className="replies">
        {replies.map((reply) => (
          <Comment
            key={reply.id}
            comment={reply}
            replies={reply.replies}
            addReply={addReply}
            replyingTo={replyingTo}
            cancelReply={cancelReply}
          />
        ))}
      </div>
    )}
  </div>
);
const formatUsername = (username) => {
    if (username.length > 15) {
      // Get the first two and last two characters, with '**' in between
      return `${username.slice(0, 2)}**${username.slice(-2)}`;
    }
    return username;
  };
  
export default function NovelCommentSection({ novelId }) {
  const { publicKey } = useWallet();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);

  useEffect(() => {
    const fetchComments = async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('novel_id', novelId)
        .order('created_at', { ascending: false });

      if (!error) setComments(data);
    };

    fetchComments();
    const intervalId = setInterval(fetchComments, 1000);
    return () => clearInterval(intervalId);
  }, [novelId]);

  const handleCommentSubmit = async () => {
    if (!newComment) return;

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name')  // Fetch user id and name
      .eq('wallet_address', publicKey.toString())
      .single();

    if (userError || !user) {
      console.error('Error fetching user:', userError);
      return;
    }

    const { error } = await supabase
      .from('comments')
      .insert([{
        novel_id: novelId,
        user_id: user.id,
        username: user.name,  // Use the fetched user name here
        content: newComment,
        parent_id: replyingTo || null,
      }])
      .single();

    if (error) {
      console.error('Error inserting comment:', error);
    } else {
      setNewComment('');
      setReplyingTo(null); // Reset reply state after posting
    }
  };

  const addReply = (parentId) => {
    setReplyingTo(replyingTo === parentId ? null : parentId);
  };

  const cancelReply = () => {
    setReplyingTo(null);
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

    const sortComments = (a, b) => {
      return new Date(b.created_at) - new Date(a.created_at); // Newest first
    };

    const sortNestedReplies = (comment) => {
      comment.replies.sort(sortComments);
      comment.replies.forEach(sortNestedReplies); // Recursively sort nested replies
    };

    roots.sort(sortComments);
    roots.forEach(sortNestedReplies);

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
          />
        ))}
      </div>
    </div>
  );
}
