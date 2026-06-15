"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import LoadingPage from "@/components/LoadingPage";
import { FaHome, FaBars, FaTimes, FaFeather, FaComment, FaRetweet, FaHeart, FaShare, FaEllipsisH, FaUser, FaPaperPlane, FaImage, FaGift } from "react-icons/fa";
import Link from "next/link";
import styles from "@/styles/FeedPage.module.css";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function CrazyCornerPage() {
  const { user, session } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [editingPost, setEditingPost] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [expandedComments, setExpandedComments] = useState({});
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [likedPosts, setLikedPosts] = useState({});
  const [resharedPosts, setResharedPosts] = useState({});

  const fetchPosts = async () => {
    try {
      const token = session?.access_token;
      const userId = user?.id;
      
      if (!userId) {
        const res = await fetch("/api/feed/posts", {
          method: "GET",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch posts");
        setPosts(data.posts || []);
      } else {
        const res = await fetch(`/api/feed/personalized?userId=${userId}`, {
          method: "GET",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch personalized feed");
        setPosts(data.posts || []);
        
        // Load user's existing likes and reshares
        loadUserInteractions(data.posts || []);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserInteractions = async (posts) => {
    if (!user || !posts.length) return;

    try {
      // Load user's likes
      const { data: likes } = await supabase
        .from('feed_post_likes')
        .select('post_id')
        .eq('user_id', user.id);

      const likedPostIds = (likes || []).map(like => like.post_id);
      const likedPostsMap = {};
      likedPostIds.forEach(postId => {
        likedPostsMap[postId] = true;
      });
      setLikedPosts(likedPostsMap);

      // Load user's reshares
      const { data: shares } = await supabase
        .from('feed_shares')
        .select('post_id')
        .eq('user_id', user.id);

      const resharedPostIds = (shares || []).map(share => share.post_id);
      const resharedPostsMap = {};
      resharedPostIds.forEach(postId => {
        resharedPostsMap[postId] = true;
      });
      setResharedPosts(resharedPostsMap);
    } catch (error) {
      console.error("Error loading user interactions:", error);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [user]);

  const handleCreatePost = async () => {
    if (!user || !postContent.trim()) return;

    try {
      const formData = new FormData();
      formData.append('userId', user.id);
      formData.append('content', postContent.trim());

      const res = await fetch("/api/feed/posts", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to create post");

      setPostContent('');
      fetchPosts();
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Failed to create post");
    }
  };

  const handleEditPost = async () => {
    if (!editingPost || !editContent.trim()) return;

    try {
      const { error } = await supabase
        .from('feed_posts')
        .update({ content: editContent.trim() })
        .eq('id', editingPost);

      if (error) throw error;

      setEditingPost(null);
      setEditContent('');
      fetchPosts();
    } catch (error) {
      console.error("Error editing post:", error);
      alert("Failed to edit post");
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      const { error } = await supabase
        .from('feed_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      setShowDeleteModal(null);
      fetchPosts();
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("Failed to delete post");
    }
  };

  const handleLikePost = async (postId) => {
    if (!user) return;

    try {
      const isLiked = likedPosts[postId];
      
      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('feed_post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        if (error) throw error;

        setLikedPosts(prev => ({ ...prev, [postId]: false }));
        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { ...post, likes_count: Math.max(0, (post.likes_count || 0) - 1) }
            : post
        ));
      } else {
        // Like - check if already exists first
        const { data: existingLike } = await supabase
          .from('feed_post_likes')
          .select('*')
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .single();

        if (existingLike) {
          // Already liked, just update state
          setLikedPosts(prev => ({ ...prev, [postId]: true }));
          return;
        }

        const { error } = await supabase
          .from('feed_post_likes')
          .insert({
            post_id: postId,
            user_id: user.id,
          });

        if (error) throw error;

        setLikedPosts(prev => ({ ...prev, [postId]: true }));
        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { ...post, likes_count: (post.likes_count || 0) + 1 }
            : post
        ));
      }
    } catch (error) {
      console.error("Error liking post:", error);
      alert("Failed to like post");
    }
  };

  const handleResharePost = async (postId) => {
    if (!user) return;

    try {
      const isReshared = resharedPosts[postId];
      
      if (isReshared) {
        // Unshare
        const { error } = await supabase
          .from('feed_shares')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        if (error) throw error;

        setResharedPosts(prev => ({ ...prev, [postId]: false }));
        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { ...post, shares_count: Math.max(0, (post.shares_count || 0) - 1) }
            : post
        ));
      } else {
        // Share - check if already exists first
        const { data: existingShare } = await supabase
          .from('feed_shares')
          .select('*')
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .single();

        if (existingShare) {
          // Already reshared, just update state
          setResharedPosts(prev => ({ ...prev, [postId]: true }));
          return;
        }

        const { error } = await supabase
          .from('feed_shares')
          .insert({
            post_id: postId,
            user_id: user.id,
          });

        if (error) throw error;

        setResharedPosts(prev => ({ ...prev, [postId]: true }));
        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { ...post, shares_count: (post.shares_count || 0) + 1 }
            : post
        ));
      }
    } catch (error) {
      console.error("Error resharing post:", error);
      alert("Failed to reshare post");
    }
  };

  const loadComments = async (postId) => {
    try {
      const { data } = await supabase
        .from('feed_comments')
        .select('*, users(*)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      
      setComments(prev => ({ ...prev, [postId]: data || [] }));
    } catch (error) {
      console.error("Error loading comments:", error);
    }
  };

  const handleCreateComment = async (postId) => {
    if (!user || !newComment[postId]?.trim()) return;

    try {
      const { error } = await supabase
        .from('feed_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: newComment[postId].trim(),
        });

      if (error) throw error;

      setNewComment(prev => ({ ...prev, [postId]: '' }));
      loadComments(postId);
      
      // Update comment count in posts
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, comments_count: (post.comments_count || 0) + 1 }
          : post
      ));
    } catch (error) {
      console.error("Error creating comment:", error);
      alert("Failed to create comment");
    }
  };

  const toggleComments = (postId) => {
    setExpandedComments(prev => {
      const newState = { ...prev, [postId]: !prev[postId] };
      if (newState[postId] && !comments[postId]) {
        loadComments(postId);
      }
      return newState;
    });
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
    return date.toLocaleDateString();
  };

  if (loading) return <LoadingPage />;

  return (
    <div className={styles.feedContainer}>
      <nav className={styles.feedNavbar}>
        <div className={styles.navbarContent}>
          <Link href="/" className={styles.logoLink}>
            <img src="/images/logo.jpeg" alt="SempaiHQ" className={styles.logo} />
            <span className={styles.logoText}>SempaiHQ Feed</span>
          </Link>
          <button className={styles.menuButton} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <FaTimes /> : <FaBars />}
          </button>
          <div className={`${styles.navItems} ${menuOpen ? styles.navItemsOpen : ""}`}>
            <Link href="/" className={styles.navItem}><FaHome /> Home</Link>
          </div>
        </div>
      </nav>

      <div className={styles.feedContent}>
        <div className={styles.feedMain}>
          <div className={styles.header}>
            <h1 className={styles.headerTitle}>Home</h1>
            <button className={styles.headerButton}>
              <FaFeather />
            </button>
          </div>

          {user && (
            <div className={styles.composer}>
              <div className={styles.composerAvatar}>
                <FaUser />
              </div>
              <div className={styles.composerBody}>
                <textarea
                  className={styles.composerInput}
                  placeholder="What's happening?"
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  maxLength={280}
                />
                <div className={styles.composerActions}>
                  <button className={styles.composerActionButton}>
                    <FaImage />
                  </button>
                  <button className={styles.composerActionButton}>
                    <FaGift />
                  </button>
                  <button
                    className={`${styles.postButton} ${!postContent.trim() ? styles.postButtonDisabled : ''}`}
                    onClick={handleCreatePost}
                    disabled={!postContent.trim()}
                  >
                    Post
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className={styles.postsContainer}>
            {posts.length > 0 ? (
              posts.map((post) => {
                const isOwnPost = post.user_id === user?.id;
                const isExpanded = expandedComments[post.id];
                const postComments = comments[post.id] || [];

                return (
                  <div key={post.id} className={styles.postCard}>
                    <div className={styles.postContent}>
                      <div className={styles.avatar}>
                        <FaUser />
                      </div>
                      <div className={styles.postBody}>
                        <div className={styles.postHeader}>
                          <div className={styles.userInfo}>
                            <span className={styles.userName}>
                              {post.user?.name || post.users?.name || 'Anonymous'}
                            </span>
                            <span className={styles.userHandle}>
                              @{(post.user?.name || post.users?.name || 'user').toLowerCase().replace(/\s/g, '')}
                            </span>
                            <span className={styles.postTime}>· {formatTimeAgo(post.created_at)}</span>
                          </div>
                          {isOwnPost && (
                            <button 
                              className={styles.moreButton}
                              onClick={() => setShowDeleteModal(post.id)}
                            >
                              <FaEllipsisH />
                            </button>
                          )}
                        </div>

                        {editingPost === post.id ? (
                          <div className={styles.editContainer}>
                            <textarea
                              className={styles.editInput}
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              autoFocus
                            />
                            <div className={styles.editActions}>
                              <button
                                className={styles.cancelButton}
                                onClick={() => {
                                  setEditingPost(null);
                                  setEditContent('');
                                }}
                              >
                                Cancel
                              </button>
                              <button
                                className={styles.saveButton}
                                onClick={handleEditPost}
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className={styles.postText}>{post.content}</p>
                        )}

                        {post.image_url && (
                          <img src={post.image_url} alt="Post image" className={styles.postImage} />
                        )}

                        <div className={styles.postActions}>
                          <button 
                            className={styles.actionButton}
                            onClick={() => toggleComments(post.id)}
                          >
                            <FaComment className={isExpanded ? styles.iconActive : ''} />
                            <span className={`${styles.actionText} ${isExpanded ? styles.actionTextActive : ''}`}>
                              {post.comments_count || 0}
                            </span>
                          </button>
                          <button 
                            className={styles.actionButton}
                            onClick={() => handleResharePost(post.id)}
                          >
                            <FaRetweet className={resharedPosts[post.id] ? styles.iconActive : ''} />
                            <span className={`${styles.actionText} ${resharedPosts[post.id] ? styles.actionTextActive : ''}`}>
                              {post.shares_count || 0}
                            </span>
                          </button>
                          <button 
                            className={styles.actionButton}
                            onClick={() => handleLikePost(post.id)}
                          >
                            <FaHeart className={likedPosts[post.id] ? styles.iconActive : ''} />
                            <span className={`${styles.actionText} ${likedPosts[post.id] ? styles.actionTextActive : ''}`}>
                              {post.likes_count || 0}
                            </span>
                          </button>
                          <button className={styles.actionButton}>
                            <FaShare />
                          </button>
                        </div>

                        {isExpanded && (
                          <div className={styles.commentsSection}>
                            {postComments.length > 0 ? (
                              postComments.map(comment => (
                                <div key={comment.id} className={styles.comment}>
                                  <div className={styles.commentAvatar}>
                                    <FaUser />
                                  </div>
                                  <div className={styles.commentBody}>
                                    <div className={styles.commentHeader}>
                                      <span className={styles.commentUserName}>
                                        {comment.users?.name || 'Anonymous'}
                                      </span>
                                      <span className={styles.commentTime}>
                                        · {formatTimeAgo(comment.created_at)}
                                      </span>
                                    </div>
                                    <p className={styles.commentText}>{comment.content}</p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className={styles.noComments}>No comments yet</p>
                            )}

                            <div className={styles.addComment}>
                              <div className={styles.commentInputAvatar}>
                                <FaUser />
                              </div>
                              <input
                                type="text"
                                className={styles.commentInput}
                                placeholder="Write a comment..."
                                value={newComment[post.id] || ''}
                                onChange={(e) => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                              />
                              <button
                                className={styles.commentButton}
                                onClick={() => handleCreateComment(post.id)}
                                disabled={!newComment[post.id]?.trim()}
                              >
                                <FaPaperPlane />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className={styles.noPosts}>
                <FaNewspaper className={styles.noPostsIcon} />
                <p>No posts yet. Be the first to share!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Delete Post?</h3>
            <p className={styles.modalText}>This action cannot be undone.</p>
            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelButton}
                onClick={() => setShowDeleteModal(null)}
              >
                Cancel
              </button>
              <button
                className={styles.modalDeleteButton}
                onClick={() => handleDeletePost(showDeleteModal)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
