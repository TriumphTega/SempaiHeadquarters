"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import LoadingPage from "@/components/LoadingPage";
import { FaHome, FaBars, FaTimes, FaFeather } from "react-icons/fa";
import Link from "next/link";
import styles from "@/styles/FeedPage.module.css";
import PostCreator from "@/components/Feed/PostCreator";
import FeedPost from "@/components/Feed/FeedPost";

export default function CrazyCornerPage() {
  const { user, session } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const fetchPosts = async () => {
    try {
      const token = session?.access_token;
      const userId = user?.id;
      
      if (!userId) {
        // Fallback to regular feed if no user
        const res = await fetch("/api/feed/posts", {
          method: "GET",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch posts");
        setPosts(data.posts || []);
      } else {
        // Use personalized feed with X's algorithm
        const res = await fetch(`/api/feed/personalized?userId=${userId}`, {
          method: "GET",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch personalized feed");
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleNewPost = (newPost) => {
    setPosts([newPost, ...posts]);
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
          <h1 className={styles.feedTitle}>
            <FaFeather /> Crazy Corner
          </h1>
          <p className={styles.feedSubtitle}>
            Share your thoughts with the community
          </p>

          {user && (
            <div className={styles.postCreatorContainer}>
              <PostCreator userId={user.id} onNewPost={handleNewPost} />
            </div>
          )}

          <div className={styles.postsContainer}>
            {posts.length > 0 ? (
              posts.map((post) => (
                <FeedPost key={post.id} post={post} currentUserId={user?.id} />
              ))
            ) : (
              <div className={styles.noPosts}>
                <p>No posts yet. Be the first to share!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
