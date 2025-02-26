"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../services/supabase/supabaseClient";
import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import {
  FaHome,
  FaBars,
  FaTimes,
  FaBookOpen,
  FaPlus,
  FaEdit,
  FaTrash,
  FaUpload,
  FaUserShield,
  FaGem,
  FaSun,
  FaMoon,
  FaImage,
} from "react-icons/fa";
import LoadingPage from "../../components/LoadingPage";
import ConnectButton from "../../components/ConnectButton";
import styles from "../../styles/CreatorsDashboard.module.css";

export default function CreatorsDashboard() {
  const { connected, publicKey } = useWallet();
  const [novelTitle, setNovelTitle] = useState("");
  const [novelImage, setNovelImage] = useState("");
  const [novelSummary, setNovelSummary] = useState("");
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [newChapterContent, setNewChapterContent] = useState("");
  const [novelsList, setNovelsList] = useState([]);
  const [selectedNovel, setSelectedNovel] = useState(null);
  const [chapterTitles, setChapterTitles] = useState([]);
  const [chapterContents, setChapterContents] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isWriter, setIsWriter] = useState(false);
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [writers, setWriters] = useState([]);
  const [editChapterIndex, setEditChapterIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode
  const chapterTitleRef = useRef(null);
  const router = useRouter();

  // Check creator access and fetch user details
  const handleCreatorAccess = async () => {
    if (!connected || !publicKey) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const walletAddress = publicKey.toString();
      const { data, error } = await supabase
        .from("users")
        .select("id, isWriter, isSuperuser")
        .eq("wallet_address", walletAddress)
        .single();

      if (error || !data) throw new Error(error?.message || "No user data");

      if (!data.isWriter && !data.isSuperuser) {
        router.push("/error");
        return;
      }

      setCurrentUserId(data.id);
      setIsWriter(data.isWriter);
      setIsSuperuser(data.isSuperuser);
    } catch (err) {
      console.error("Error in creator access:", err.message);
      router.push("/error");
    } finally {
      setLoading(false);
    }
  };

  // Fetch novels based on user role
  const fetchNovels = async () => {
    if (!currentUserId) return;

    setLoading(true);
    try {
      let query = supabase.from("novels").select("*");
      if (!isSuperuser) query = query.eq("user_id", currentUserId);

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      setNovelsList(data || []);
    } catch (err) {
      console.error("Error fetching novels:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch writers (for superusers)
  const fetchWriters = async () => {
    if (!isSuperuser) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, isWriter")
        .eq("isWriter", true);

      if (error) throw new Error(error.message);
      setWriters(data || []);
    } catch (err) {
      console.error("Error fetching writers:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleCreatorAccess();
  }, [connected, publicKey]);

  useEffect(() => {
    if (currentUserId && (isWriter || isSuperuser)) {
      fetchNovels();
      if (isSuperuser) fetchWriters();
    }
  }, [currentUserId, isWriter, isSuperuser]);

  // Handle image upload
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => setNovelImage(reader.result);
      reader.readAsDataURL(file);
    } else {
      alert("Please upload a valid image file.");
    }
  };

  // Add or update chapter
  const handleAddChapter = () => {
    if (!newChapterTitle.trim() || !newChapterContent.trim()) {
      alert("Please provide both a chapter title and content.");
      return;
    }

    if (editChapterIndex !== null) {
      setChapterTitles((prev) => {
        const updated = [...prev];
        updated[editChapterIndex] = newChapterTitle;
        return updated;
      });
      setChapterContents((prev) => {
        const updated = [...prev];
        updated[editChapterIndex] = newChapterContent;
        return updated;
      });
      setEditChapterIndex(null);
    } else {
      setChapterTitles((prev) => [...prev, newChapterTitle]);
      setChapterContents((prev) => [...prev, newChapterContent]);
    }

    setNewChapterTitle("");
    setNewChapterContent("");
  };

  // Edit chapter
  const handleEditChapter = (index) => {
    setNewChapterTitle(chapterTitles[index]);
    setNewChapterContent(chapterContents[index]);
    setEditChapterIndex(index);
    if (chapterTitleRef.current) {
      chapterTitleRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      chapterTitleRef.current.focus();
    }
  };

  // Remove chapter
  const handleRemoveChapter = (index) => {
    setChapterTitles((prev) => prev.filter((_, i) => i !== index));
    setChapterContents((prev) => prev.filter((_, i) => i !== index));
    if (editChapterIndex === index) setEditChapterIndex(null);
  };

  // Edit existing novel
  const handleEditNovel = (novel) => {
    setSelectedNovel(novel);
    setNovelTitle(novel.title);
    setNovelImage(novel.image);
    setNovelSummary(novel.summary);
    setChapterTitles(novel.chaptertitles || []);
    setChapterContents(novel.chaptercontents || []);
  };

  // Submit novel
  const handleNovelSubmit = async (e) => {
    e.preventDefault();

    if (!novelTitle.trim() || !novelImage || !novelSummary.trim()) {
      alert("Please fill in all novel details.");
      return;
    }

    const novelData = {
      user_id: currentUserId,
      title: novelTitle,
      image: novelImage,
      summary: novelSummary,
      chaptertitles: chapterTitles,
      chaptercontents: chapterContents,
    };

    setLoading(true);
    try {
      let novelId, chapterNumber, message;

      if (selectedNovel) {
        const { error } = await supabase.from("novels").update(novelData).eq("id", selectedNovel.id);
        if (error) throw new Error(error.message);

        novelId = selectedNovel.id;
        chapterNumber = chapterTitles.length;
        message = `A new chapter (${chapterNumber}) has been added to "${novelTitle}"!`;
      } else {
        const { data, error } = await supabase.from("novels").insert([novelData]).select("id").single();
        if (error) throw new Error(error.message);

        novelId = data.id;
        message = `A new novel "${novelTitle}" has been published!`;
      }

      const { data: users, error: usersError } = await supabase.from("users").select("id");
      if (usersError) throw new Error(usersError.message);

      if (users.length > 0) {
        const notifications = users.map((user) => ({
          user_id: user.id,
          novel_id: novelId,
          type: selectedNovel ? "new_chapter" : "new_novel",
          message,
          chapter: selectedNovel ? chapterNumber : null,
        }));

        const { error: notifError } = await supabase.from("notifications").insert(notifications);
        if (notifError) throw new Error(notifError.message);
      }

      alert("Novel submitted successfully! Users notified.");
      resetForm();
      fetchNovels();
    } catch (err) {
      console.error("Error submitting novel:", err.message);
      alert("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setNovelTitle("");
    setNovelImage("");
    setNovelSummary("");
    setNewChapterTitle("");
    setNewChapterContent("");
    setChapterTitles([]);
    setChapterContents([]);
    setSelectedNovel(null);
    setEditChapterIndex(null);
  };

  // Toggle mobile menu
  const toggleMenu = () => setMenuOpen((prev) => !prev);

  // Toggle light/dark mode
  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  if (loading) return <LoadingPage />;

  return (
    <div className={`${styles.page} ${isDarkMode ? styles.darkMode : styles.lightMode}`}>
      {/* Navbar */}
      <nav className={`${styles.navbar} ${menuOpen ? styles.navbarOpen : ""}`}>
        <div className={styles.navContainer}>
          <Link href="/" className={styles.logoLink}>
            <img src="/images/logo.jpg" alt="Sempai HQ" className={styles.logo} />
            <span className={styles.logoText}>Sempai HQ</span>
          </Link>
          <button className={styles.menuToggle} onClick={toggleMenu}>
            {menuOpen ? <FaTimes /> : <FaBars />}
          </button>
          <div className={`${styles.navLinks} ${menuOpen ? styles.navLinksOpen : ""}`}>
            <Link href="/" className={styles.navLink}>
              <FaHome /> Home
            </Link>
            <button onClick={toggleTheme} className={styles.themeToggle}>
              {isDarkMode ? <FaSun /> : <FaMoon />}
            </button>
            <ConnectButton className={styles.connectButton} />
          </div>
        </div>
      </nav>

      {/* Overlay for mobile menu blur */}
      {menuOpen && <div className={styles.blurOverlay}></div>}

      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>
          <FaUserShield /> Creator’s Vault
        </h1>
        <p className={styles.headerSubtitle}>Craft and curate your literary masterpieces.</p>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        {!connected ? (
          <div className={styles.connectPrompt}>
            <FaGem className={styles.connectIcon} />
            <p>Connect your wallet to access the Creator’s Vault.</p>
            <ConnectButton className={styles.connectButtonPrompt} />
          </div>
        ) : !isWriter && !isSuperuser ? (
          <div className={styles.accessDenied}>
            <FaTimes className={styles.deniedIcon} />
            <p>Access Denied. Only creators and superusers may enter.</p>
            <Link href="/" className={styles.backLink}>
              <FaHome /> Return Home
            </Link>
          </div>
        ) : (
          <div className={styles.dashboard}>
            {/* Novel Form */}
            <section className={styles.formSection}>
              <h2 className={styles.sectionTitle}>
                <FaBookOpen /> {selectedNovel ? "Edit Manuscript" : "New Manuscript"}
              </h2>
              <form onSubmit={handleNovelSubmit} className={styles.novelForm}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Title</label>
                  <input
                    type="text"
                    value={novelTitle}
                    onChange={(e) => setNovelTitle(e.target.value)}
                    placeholder="Enter novel title"
                    className={styles.input}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>
                    <FaImage /> Cover Image
                  </label>
                  {novelImage && (
                    <img src={novelImage} alt="Preview" className={styles.imagePreview} />
                  )}
                  <input
                    type="file"
                    onChange={handleImageChange}
                    className={styles.fileInput}
                    required={!selectedNovel}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Summary</label>
                  <textarea
                    value={novelSummary}
                    onChange={(e) => setNovelSummary(e.target.value)}
                    placeholder="Write a brief summary"
                    className={styles.textarea}
                    rows="3"
                    required
                  />
                </div>

                <div className={styles.chapterSection}>
                  <h3 className={styles.chapterTitle}>
                    <FaPlus /> Chapters
                  </h3>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Chapter Title</label>
                    <input
                      type="text"
                      ref={chapterTitleRef}
                      value={newChapterTitle}
                      onChange={(e) => setNewChapterTitle(e.target.value)}
                      placeholder="Enter chapter title"
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Chapter Content</label>
                    <textarea
                      value={newChapterContent}
                      onChange={(e) => setNewChapterContent(e.target.value)}
                      placeholder="Write chapter content"
                      className={styles.textarea}
                      rows="4"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddChapter}
                    className={styles.addChapterButton}
                  >
                    <FaPlus /> {editChapterIndex !== null ? "Update" : "Add"}
                  </button>
                </div>

                {chapterTitles.length > 0 && (
                  <ul className={styles.chapterList}>
                    {chapterTitles.map((title, index) => (
                      <li key={index} className={styles.chapterItem}>
                        <span className={styles.chapterText}>
                          <strong>{title}</strong>
                          <p>{chapterContents[index].slice(0, 50)}...</p>
                        </span>
                        <div className={styles.chapterActions}>
                          <button
                            onClick={() => handleEditChapter(index)}
                            className={styles.editButton}
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleRemoveChapter(index)}
                            className={styles.deleteButton}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <button type="submit" className={styles.submitButton}>
                  <FaUpload /> {selectedNovel ? "Update" : "Publish"}
                </button>
              </form>
            </section>

            {/* Novels List */}
            <section className={styles.novelsSection}>
              <h2 className={styles.sectionTitle}>
                <FaBookOpen /> Your Manuscripts
              </h2>
              {novelsList.length === 0 ? (
                <p className={styles.noNovels}>No manuscripts yet. Start creating!</p>
              ) : (
                <div className={styles.novelsGrid}>
                  {novelsList.map((novel) => (
                    <div key={novel.id} className={styles.novelCard}>
                      <img src={novel.image} alt={novel.title} className={styles.novelImage} />
                      <div className={styles.novelInfo}>
                        <h3 className={styles.novelTitle}>{novel.title}</h3>
                        <p className={styles.novelSummary}>
                          {novel.summary.slice(0, 50)}...
                        </p>
                        <button
                          onClick={() => handleEditNovel(novel)}
                          className={styles.editNovelButton}
                        >
                          <FaEdit /> Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Writers List (Superuser Only) */}
            {isSuperuser && (
              <section className={styles.writersSection}>
                <h2 className={styles.sectionTitle}>
                  <FaUserShield /> Writers
                </h2>
                {writers.length === 0 ? (
                  <p className={styles.noWriters}>No writers found.</p>
                ) : (
                  <ul className={styles.writersList}>
                    {writers.map((writer) => (
                      <li key={writer.id} className={styles.writerItem}>
                        <span>{writer.name} ({writer.email})</span>
                        <span className={styles.writerId}>ID: {writer.id}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <p className={styles.footerText}>© 2025 Sempai HQ. All rights reserved.</p>
      </footer>
    </div>
  );
}