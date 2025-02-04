'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase/supabaseClient';
import { useWallet } from '@solana/wallet-adapter-react';
import './CommentSection.css'; // Import CSS styles

const Comment = ({ comment, addReply }) => {
  const [showReplies, setShowReplies] = useState(false);

  return (
    <div className="comment">
      <div className="comment-content">
        <p>{comment.content}</p>
        <div className="comment-actions">
          <button onClick={() => addReply(comment.id)} className="btn-reply">Reply</button>
          {comment.replies && comment.replies.length > 0 && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="btn-toggle"
            >
              {showReplies ? 'Hide Replies' : `Show ${comment.replies.length} Replies`}
            </button>
          )}
        </div>
      </div>

      {showReplies && (
        <div className="replies">
          {comment.replies.map((reply) => (
            <Comment key={reply.id} comment={reply} addReply={addReply} />
          ))}
        </div>
      )}
    </div>
  );
};

export default function CommentSection({ novelId, chapter }) {
  const { publicKey } = useWallet();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('novel_id', novelId)
      .eq('chapter', chapter)
      .order('created_at', { ascending: false }); // Latest at the top

    if (!error) setComments(data);
  };

  useEffect(() => {
    fetchComments();
    const intervalId = setInterval(fetchComments, 5000);
    return () => clearInterval(intervalId);
  }, [novelId, chapter]);

  const handleCommentSubmit = async () => {
    if (!newComment) return;

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', publicKey.toString())
      .single();

    if (userError || !user) {
      console.error('Error fetching user:', userError || 'No user found');
      return;
    }

    const { data, error } = await supabase
      .from('comments')
      .insert([
        {
          novel_id: novelId,
          chapter,
          user_id: user.id,
          content: newComment,
          parent_id: replyingTo || null,
        },
      ])
      .single();

    if (error) {
      console.error('Error inserting comment:', error);
    } else {
      setNewComment('');
      setReplyingTo(null);
      fetchComments();
    }
  };

  const addReply = (parentId) => {
    setReplyingTo(parentId);
  };
  
  const countReplies = (comment) => {
    if (!comment.replies || comment.replies.length === 0) return 0;
    return comment.replies.length + comment.replies.reduce((acc, reply) => acc + countReplies(reply), 0);
  };
  
  const buildThread = (comments) => {
    const map = {};
    comments.forEach((c) => {
      if (c) {
        map[c.id] = { ...c, replies: [] };
      }
    });
    const roots = [];
    comments.forEach((c) => {
      if (c) {
        if (c.parent_id) {
          map[c.parent_id]?.replies.push(map[c.id]);
        } else {
          roots.push(map[c.id]);
        }
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
        Post
      </button>

      <div className="comments-container">
        {buildThread(comments).map((comment) => (
          <Comment key={comment.id} comment={comment} addReply={addReply} />
        ))}
      </div>
    </div>
  );
}
