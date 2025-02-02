import { useState, useEffect } from "react";

const NovelPage = () => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [showMoreReplies, setShowMoreReplies] = useState({}); // Object to track 'show more' state per comment

  // Function to handle 'Show More' logic for each comment's replies
  const toggleShowMoreReplies = (parentId) => {
    setShowMoreReplies((prev) => ({
      ...prev,
      [parentId]: !prev[parentId],
    }));
  };

  const formatUsername = (username) => {
    if (username.length > 15) {
      const firstThree = username.slice(0, 3);
      const lastThree = username.slice(-3);
      return `${firstThree}****${lastThree}`;
    }
    return username;
  };

  const renderComments = (parentId = null) => {
    const filteredComments = comments.filter((comment) => comment.parent_id === parentId);

    return (
      <>
        {filteredComments.slice(0, showMoreReplies[parentId] ? undefined : 3).map((comment) => (
          <div
            key={comment.id}
            className="bg-dark text-white p-2 rounded mb-2"
            style={{ marginLeft: parentId ? 15 : 0 }}
          >
            <p className="mb-1">
              <strong>{formatUsername(comment.username)}</strong>: {comment.content}
            </p>
            <button
              className="btn btn-sm btn-outline-light"
              onClick={() => setReplyingTo(comment.id)}
            >
              Reply
            </button>

            {/* Reply Form */}
            {replyingTo === comment.id && (
              <div className="mt-2">
                <textarea
                  className="form-control reply-box"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write your reply..."
                />
                <button className="btn btn-primary mt-2" onClick={handleCommentSubmit}>
                  Submit Reply
                </button>
              </div>
            )}

            {/* Render Replies */}
            <div className="ms-3">{renderComments(comment.id)}</div>
          </div>
        ))}

        {/* Show More Button */}
        {filteredComments.length > 3 && !showMoreReplies[parentId] && (
          <button
            className="btn btn-sm btn-outline-light mt-2"
            onClick={() => toggleShowMoreReplies(parentId)}
          >
            Show More Replies
          </button>
        )}
        
        {/* Show Less Button */}
        {showMoreReplies[parentId] && (
          <button
            className="btn btn-sm btn-outline-light mt-2"
            onClick={() => toggleShowMoreReplies(parentId)}
          >
            Show Less Replies
          </button>
        )}
      </>
    );
  };

  return (
    <div className="comments-container">
      {renderComments()} {/* Render top-level comments */}
    </div>
  );
};

export default NovelPage;
