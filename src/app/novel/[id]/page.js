"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../../../services/supabase/supabaseClient";

export default function NovelPage() {
  const { id } = useParams(); // Get the novel ID from the URL
  const [novel, setNovel] = useState(null); // State to hold novel data
  const [loading, setLoading] = useState(true); // Loading state
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState(null); // Track which comment is being replied to
  const [showMoreReplies, setShowMoreReplies] = useState({}); // Object to track 'show more' state per comment

  // Toggle the show-more state for replies of a given comment (identified by its parentId)
  const toggleShowMoreReplies = (groupKey) => {
    setShowMoreReplies((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };
  

  // Helper to format username
  const formatUsername = (username) => {
    if (username.length > 15) {
      const firstThree = username.slice(0, 3);
      const lastThree = username.slice(-3);
      return `${firstThree}****${lastThree}`;
    }
    return username;
  };

  // Fetch novel data on mount
  useEffect(() => {
    const fetchNovel = async () => {
      try {
        const { data, error } = await supabase
          .from("novels")
          .select("*")
          .eq("id", id)
          .single();

        if (error) {
          console.error("Error fetching novel:", error);
        } else {
          setNovel(data);
        }
      } catch (error) {
        console.error("Unexpected error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNovel();
  }, [id]);

  // Fetch comments once the novel is loaded
  useEffect(() => {
    if (!novel) return;
    const fetchComments = async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("novel_id", id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching comments:", error);
      } else {
        setComments(data);
      }
    };

    fetchComments();
  }, [novel, id]);

  // Handle comment or reply submission
  const handleCommentSubmit = async () => {
    if (!newComment.trim()) return;

    // Get the wallet address and ensure it's connected
    const walletAddress = window.solana?.publicKey?.toString();
    if (!walletAddress) {
      console.error("Wallet not connected.");
      return;
    }

    try {
      // Fetch user data by wallet address
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, name") // Assuming 'name' holds the username
        .eq("wallet_address", walletAddress)
        .single();

      if (userError) {
        console.error("Error fetching user data:", userError.message);
        return;
      }

      if (!userData) {
        console.error("User not found for the provided wallet address.");
        return;
      }

      const user_id = userData.id;
      const username = userData.name;

      // Insert the comment into Supabase
      const { data, error } = await supabase
        .from("comments")
        .insert([
          {
            user_id,
            username, // Store username if needed
            novel_id: id,
            chapter_key: null,
            content: newComment,
            parent_id: replyingTo, // Set parent_id for replies; null for top-level comments
          },
        ])
        .select();

      if (error) {
        console.error("Error posting comment:", error.message);
      } else {
        setComments((prevComments) => [...prevComments, data[0]]);
        setNewComment("");
        setReplyingTo(null);
      }
    } catch (error) {
      console.error("Unexpected error:", error.message);
    }
  };

  // Recursive function to render comments and their replies
  // Recursive function to render comments and their replies
const renderComments = (parentId = null) => {
  const key = parentId === null ? "root" : String(parentId);

  const filteredComments = comments.filter((comment) => comment.parent_id === parentId);

  return (
    <>
      {filteredComments.map((comment) => (
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

          {/* Show/Hide Replies */}
          <div className="mt-2">
            <button
              className="btn btn-sm btn-outline-light"
              onClick={() => toggleShowMoreReplies(comment.id)}
            >
              {showMoreReplies[comment.id] ? "Hide Replies" : "Show Replies"}
            </button>
          </div>

          {/* Render Replies if the showMoreReplies is true for this comment */}
          {showMoreReplies[comment.id] && (
            <div className="ms-3">{renderComments(comment.id)}</div>
          )}
        </div>
      ))}
    </>
  );
};

  
  
  

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <h2 className="text-white">Loading...</h2>
      </div>
    );
  }

  if (!novel) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <h2 className="text-danger">Novel not found</h2>
      </div>
    );
  }

  return (
    <div className="bg-black">
      {/* Navbar */}
      <nav className="navbar navbar-dark bg-dark shadow">
        <div className="container">
          <Link href="/" className="navbar-brand fw-bold">
            Sempai HQ
          </Link>
        </div>
      </nav>

      {/* Novel Content */}
      <div className="container my-5">
        <div className="text-center">
          <h1 className="text-white display-4 fw-bold">{novel.title}</h1>
          <img
            src={novel.image}
            alt={novel.title}
            className="img-fluid rounded shadow-lg my-4"
            style={{ maxHeight: "500px", objectFit: "cover" }}
          />
          <p className="fs-5 text-white">
            Explore the exciting chapters of <strong>{novel.title}</strong> below:
          </p>
        </div>
        <div className="d-flex justify-content-center w-100 mb-4">
          <div className="w-100">
            <Link href={`/novel/${id}/summary`} className="text-decoration-none text-white">
              <div className="col">
                <div className="card h-100 shadow border-0 rounded-3 hover-card">
                  <div className="card-body d-flex flex-column justify-content-between">
                    <h5 className="card-title text-uppercase fw-bold d-flex justify-content-center">
                      Summary
                    </h5>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
        <div className="row row-cols-1 row-cols-md-3 g-4">
          {Object.entries(novel.chaptertitles || {}).map(([chapterId, title]) => (
            <Link
              href={`/novel/${id}/chapter/${chapterId}`}
              className="text-decoration-none text-white"
              key={chapterId}
            >
              <div className="col">
                <div className="card h-100 shadow border-0 rounded-3 hover-card">
                  <div className="card-body d-flex flex-column justify-content-between">
                    <h5 className="card-title text-uppercase fw-bold">{title}</h5>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Comments Section */}
        <div className="mt-5">
          <h3 className="text-white">Comments</h3>
          <div className="comments-container">{renderComments()}</div>
          {/* New Comment Form (only for top-level comments) */}
          {!replyingTo && (
            <div className="mt-3">
              <textarea
                className="form-control"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
              />
              <button className="btn btn-primary mt-2" onClick={handleCommentSubmit}>
                Submit Comment
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Footer */}
      <footer className="bg-dark text-white text-center py-4 mt-5">
        <p className="mb-0">&copy; 2025 Sempai HQ. All rights reserved.</p>
      </footer>
    </div>
  );
}
