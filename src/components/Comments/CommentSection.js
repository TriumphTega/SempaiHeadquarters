'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase/supabaseClient';
import { useWallet } from '@solana/wallet-adapter-react';
import './CommentSection.css'; // Import CSS styles


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
        <button className="btn-toggle" onClick={cancelReply}>
          Cancel
        </button>
      )}
      {/* Button to toggle replies visibility */}
      <button className="btn-toggle-replies" onClick={() => toggleReplies(comment.id)}>
        {showReplies[comment.id] ? 'Hide Replies' : 'Show Replies'}
      </button>
    </div>

    {/* Show replies if showReplies for this comment is true */}
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
    // Get the first two and last two characters, with '**' in between
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

  const fetchComments = async () => {
    const { data: comments, error: commentError } = await supabase
      .from('comments')
      .select('*')
      .eq('novel_id', novelId)
      .eq('chapter', chapter)
      .order('created_at', { ascending: false });

    if (commentError) {
      console.error('Error fetching comments:', commentError);
      return;
    }

    // Merge the comments with usernames, if not already included in the comments
    const mergedComments = comments.map((comment) => {
      return {
        ...comment,
        username: comment.username || 'Unknown User',  // Fallback if no username is present
      };
    });

    setComments(mergedComments);
  };

  useEffect(() => {
    fetchComments();
    const intervalId = setInterval(fetchComments, 1000);
    return () => clearInterval(intervalId);
  }, [novelId, chapter]);

  const handleCommentSubmit = async () => {
    if (!newComment) return;

    // Fetch the user details based on the wallet address
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name')
      .eq('wallet_address', publicKey.toString())
      .single();

    if (userError || !user) {
      console.error('Error fetching user:', userError);
      return;
    }

    const { error } = await supabase
      .from('comments')
      .insert([
        {
          novel_id: novelId,
          chapter,
          user_id: user.id,
          username: user.name,  // Save the username with the comment
          content: newComment,
          parent_id: replyingTo || null,
        },
      ])
      .single();

    if (error) {
      console.error('Error inserting comment:', error);
    } else {
      setNewComment('');
      setReplyingTo(null); // Reset reply state after posting
    }
  };

  const addReply = (parentId) => {
    if (replyingTo === parentId) {
      setReplyingTo(null); // Toggle off if clicking the same reply button
    } else {
      setReplyingTo(parentId);
    }
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const toggleReplies = (commentId) => {
    setShowReplies((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const countReplies = (comment) => {
    if (!comment.replies || comment.replies.length === 0) return 0;
    return comment.replies.length + comment.replies.reduce((acc, reply) => acc + countReplies(reply), 0);
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

    // Sort by number of replies (descending) and then by created_at (newest first)
    const sortComments = (a, b) => {
      const repliesA = countReplies(a);
      const repliesB = countReplies(b);

      if (repliesA !== repliesB) {
        return repliesB - repliesA; // More replies come first
      }
      return new Date(b.created_at) - new Date(a.created_at); // Newer comments come first if replies are equal
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
            toggleReplies={toggleReplies}
            showReplies={showReplies}
          />
        ))}
      </div>
    </div>
  );
}
