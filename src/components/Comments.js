'use client';
import { useState } from 'react';

const Comment = ({ comment, replies, handleReply }) => {
    const [showReply, setShowReply] = useState(false);
    const [replyContent, setReplyContent] = useState('');

    const submitReply = async () => {
        await handleReply(replyContent, comment.id);
        setReplyContent('');
        setShowReply(false);
    };

    return (
        <div style={{ marginLeft: comment.parent_id ? '20px' : '0' }}>
            <p><strong>{comment.user_id}</strong>: {comment.content}</p>
            <button onClick={() => setShowReply(!showReply)}>
                {showReply ? 'Cancel' : 'Reply'}
            </button>

            {showReply && (
                <div>
                    <textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Write a reply..."
                    />
                    <button onClick={submitReply}>Post Reply</button>
                </div>
            )}

            {replies.map(reply => (
                <Comment key={reply.id} comment={reply} replies={[]} handleReply={handleReply} />
            ))}
        </div>
    );
};

export default Comment;
