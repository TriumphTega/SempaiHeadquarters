"use client";

import { useState, useEffect, useRef, useContext } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../services/supabase/supabaseClient";
import { useWallet } from "@solana/wallet-adapter-react";
import { EmbeddedWalletContext } from "../../components/EmbeddedWalletProvider";
import Link from "next/link";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Select from "react-select";
import {
  FaHome, FaBars, FaTimes, FaBookOpen, FaPlus, FaEdit, FaTrash, FaUpload,
  FaUserShield, FaGem, FaSun, FaMoon, FaImage, FaBullhorn
} from "react-icons/fa";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import ConnectButton from "../../components/ConnectButton";
import styles from "../../styles/CreatorsDashboard.module.css";

// Predefined tag options
const TAG_OPTIONS = [
  { value: "Action", label: "Action" },
  { value: "Adult(18+)", label: "Adult(18+)" },
  { value: "Adventure", label: "Adventure" },
  { value: "Comedy", label: "Comedy" },
  { value: "Drama", label: "Drama" },
  { value: "Fantasy", label: "Fantasy" },
  { value: "Horror", label: "Horror" },
  { value: "Mystery", label: "Mystery" },
  { value: "Romance", label: "Romance" },
  { value: "Sci-Fi", label: "Sci-Fi" },
  { value: "Slice of Life", label: "Slice of Life" },
  { value: "Supernatural", label: "Supernatural" },
  { value: "Thriller", label: "Thriller" },
  { value: "Historical", label: "Historical" },
  { value: "Sports", label: "Sports" },
  { value: "Psychological", label: "Psychological" },
  { value: "Shonen", label: "Shonen" },
  { value: "Shojo", label: "Shojo" },
  { value: "Seinen", label: "Seinen" },
  { value: "Josei", label: "Josei" },
];

export default function NovelDashboard() {
  const { connected, publicKey } = useWallet();
  const { wallet: embeddedWallet } = useContext(EmbeddedWalletContext);
  const [novelTitle, setNovelTitle] = useState("");
  const [novelImage, setNovelImage] = useState(null);
  const [novelImageUrl, setNovelImageUrl] = useState("");
  const [novelSummary, setNovelSummary] = useState("");
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [newChapterContent, setNewChapterContent] = useState("");
  const [newChapterIsAdvance, setNewChapterIsAdvance] = useState(false);
  const [newChapterReleaseDate, setNewChapterReleaseDate] = useState(null);
  const [novelsList, setNovelsList] = useState([]);
  const [selectedNovel, setSelectedNovel] = useState(null);
  const [chapterTitles, setChapterTitles] = useState([]);
  const [chapterContents, setChapterContents] = useState([]);
  const [advanceChapters, setAdvanceChapters] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isWriter, setIsWriter] = useState(false);
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [writers, setWriters] = useState([]);
  const [editChapterIndex, setEditChapterIndex] = useState(null);
  const [loading, setLoading] = useState(false); // Changed to false by default
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementReleaseDate, setAnnouncementReleaseDate] = useState(null);
  const [tags, setTags] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [chapterToDelete, setChapterToDelete] = useState(null);
  const chapterTitleRef = useRef(null);
  const router = useRouter();

  const activePublicKey = publicKey || (embeddedWallet ? embeddedWallet.publicKey : null);
  const isWalletConnected = connected || !!embeddedWallet;

  const handleCreatorAccess = async () => {
    if (!isWalletConnected || !activePublicKey) return;

    setLoading(true);
    try {
      const walletAddress = activePublicKey.toString();
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

  const fetchNovels = async () => {
    if (!currentUserId) return;

    setLoading(true);
    try {
      let query = supabase.from("novels").select("*, viewers_count, tags");
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
  }, [connected, publicKey, embeddedWallet]);

  useEffect(() => {
    if (currentUserId && (isWriter || isSuperuser)) {
      fetchNovels();
      if (isSuperuser) fetchWriters();
    }
  }, [currentUserId, isWriter, isSuperuser]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      setNovelImage(file);
      setNovelImageUrl(URL.createObjectURL(file));
    } else {
      alert("Please upload a valid image file.");
    }
  };

  const handleAddChapter = () => {
    if (!newChapterTitle.trim() || !newChapterContent.trim()) {
      alert("Please provide both a chapter title and content.");
      return;
    }

    const index = editChapterIndex !== null ? editChapterIndex : chapterTitles.length;

    if (editChapterIndex !== null) {
      setChapterTitles((prev) => {
        const updated = [...prev];
        updated[index] = newChapterTitle;
        return updated;
      });
      setChapterContents((prev) => {
        const updated = [...prev];
        updated[index] = newChapterContent;
        return updated;
      });
      setAdvanceChapters((prev) => {
        const updated = [...prev.filter((c) => c.index !== index)];
        updated.push({
          index,
          is_advance: newChapterIsAdvance,
          free_release_date: newChapterIsAdvance ? (newChapterReleaseDate ? newChapterReleaseDate.toISOString() : null) : null,
        });
        return updated;
      });
      setEditChapterIndex(null);
    } else {
      setChapterTitles((prev) => [...prev, newChapterTitle]);
      setChapterContents((prev) => [...prev, newChapterContent]);
      setAdvanceChapters((prev) => [
        ...prev,
        { index, is_advance: newChapterIsAdvance, free_release_date: newChapterIsAdvance ? (newChapterReleaseDate ? newChapterReleaseDate.toISOString() : null) : null },
      ]);
    }

    setNewChapterTitle("");
    setNewChapterContent("");
    setNewChapterIsAdvance(false);
    setNewChapterReleaseDate(null);
  };

  const handleEditChapter = (e, index) => {
    e.preventDefault();
    setNewChapterTitle(chapterTitles[index] || "");
    setNewChapterContent(chapterContents[index] || "");
    const advanceInfo = advanceChapters.find((c) => c.index === index) || { is_advance: false, free_release_date: null };
    setNewChapterIsAdvance(advanceInfo.is_advance);
    setNewChapterReleaseDate(advanceInfo.free_release_date ? new Date(advanceInfo.free_release_date) : null);
    setEditChapterIndex(index);
    if (chapterTitleRef.current) {
      chapterTitleRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      chapterTitleRef.current.focus();
    }
  };

  const handleRemoveChapter = (index) => {
    setChapterToDelete(index);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteChapter = () => {
    const index = chapterToDelete;
    setChapterTitles((prev) => prev.filter((_, i) => i !== index));
    setChapterContents((prev) => prev.filter((_, i) => i !== index));
    setAdvanceChapters((prev) => prev.filter((c) => c.index !== index).map((c) => ({
      ...c,
      index: c.index > index ? c.index - 1 : c.index,
    })));
    if (editChapterIndex === index) setEditChapterIndex(null);
    setShowDeleteConfirm(false);
    setChapterToDelete(null);
  };

  const cancelDeleteChapter = () => {
    setShowDeleteConfirm(false);
    setChapterToDelete(null);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;

    if (sourceIndex === destIndex) return;

    setChapterTitles((prev) => {
      const updated = [...prev];
      const [movedTitle] = updated.splice(sourceIndex, 1);
      updated.splice(destIndex, 0, movedTitle);
      return updated;
    });

    setChapterContents((prev) => {
      const updated = [...prev];
      const [movedContent] = updated.splice(sourceIndex, 1);
      updated.splice(destIndex, 0, movedContent);
      return updated;
    });

    setAdvanceChapters((prev) => {
      const updated = prev.map((chapter) => ({
        ...chapter,
        index: chapter.index === sourceIndex
          ? destIndex
          : chapter.index >= Math.min(sourceIndex, destIndex) && chapter.index <= Math.max(sourceIndex, destIndex)
          ? chapter.index + (sourceIndex > destIndex ? 1 : -1)
          : chapter.index,
      }));
      return updated;
    });
  };

  const handleMoveChapterToIndex = (chapterIndex, newIndex) => {
    if (newIndex < 0 || newIndex >= chapterTitles.length || chapterIndex === newIndex) return;

    setChapterTitles((prev) => {
      const updated = [...prev];
      const [movedTitle] = updated.splice(chapterIndex, 1);
      updated.splice(newIndex, 0, movedTitle);
      return updated;
    });

    setChapterContents((prev) => {
      const updated = [...prev];
      const [movedContent] = updated.splice(chapterIndex, 1);
      updated.splice(newIndex, 0, movedContent);
      return updated;
    });

    setAdvanceChapters((prev) => {
      const updated = prev.map((chapter) => ({
        ...chapter,
        index: chapter.index === chapterIndex
          ? newIndex
          : chapter.index >= Math.min(chapterIndex, newIndex) && chapter.index <= Math.max(chapterIndex, newIndex)
          ? chapter.index + (chapterIndex > newIndex ? 1 : -1)
          : chapter.index,
      }));
      return updated;
    });
  };

  const handleEditNovel = (novel) => {
    if (novel.user_id !== currentUserId && !isSuperuser) {
      alert("You can only edit your own novels unless you are a superuser.");
      return;
    }
    setSelectedNovel(novel);
    setNovelTitle(novel.title || "");
    setNovelImage(null);
    setNovelImageUrl(novel.image || "");
    setNovelSummary(novel.summary || "");
    setChapterTitles(novel.chaptertitles || []);
    setChapterContents(novel.chaptercontents || []);
    setAdvanceChapters(novel.advance_chapters || []);
    setTags(novel.tags ? novel.tags.map(tag => ({ value: tag, label: tag })) : []);
  };

  const handleNovelSubmit = async (e) => {
    e.preventDefault();

    if (!novelTitle.trim() || (!novelImage && !selectedNovel?.image) || !novelSummary.trim()) {
      alert("Please fill in all novel details.");
      return;
    }

    setLoading(true);
    try {
      let imageUrl = selectedNovel ? selectedNovel.image : "";
      if (novelImage) {
        const fileName = `${currentUserId}/${Date.now()}-${novelImage.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("covers")
          .upload(fileName, novelImage, { upsert: true });
        if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);
        imageUrl = supabase.storage.from("covers").getPublicUrl(fileName).data.publicUrl;
      }

      const novelData = {
        user_id: currentUserId,
        title: novelTitle,
        image: imageUrl,
        summary: novelSummary,
        chaptertitles: chapterTitles,
        chaptercontents: chapterContents,
        advance_chapters: advanceChapters,
        tags: tags.map(tag => tag.value),
        viewers_count: selectedNovel ? selectedNovel.viewers_count : 0
      };

      let novelId, chapterNumber, message;
      if (selectedNovel) {
        if (selectedNovel.user_id !== currentUserId && !isSuperuser) {
          throw new Error("You can only update your own novels unless you are a superuser.");
        }
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
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAnnouncementSubmit = async (e) => {
    e.preventDefault();

    if (!selectedNovel) {
      alert("Please select a novel to announce.");
      return;
    }
    if (!announcementTitle.trim() || !announcementMessage.trim()) {
      alert("Please provide both an announcement title and message.");
      return;
    }

    setLoading(true);
    try {
      const { data: readers, error: readersError } = await supabase
        .from("novel_interactions")
        .select("user_id")
        .eq("novel_id", selectedNovel.id);

      if (readersError) throw new Error(readersError.message);

      const announcementData = {
        writer_id: currentUserId,
        novel_id: selectedNovel.id,
        title: announcementTitle,
        message: announcementMessage,
        release_date: announcementReleaseDate ? announcementReleaseDate.toISOString() : null,
      };

      const { error: announcementError } = await supabase
        .from("writer_announcements")
        .insert([announcementData]);

      if (announcementError) throw new Error(announcementError.message);

      if (readers.length > 0) {
        const notifications = readers.map((reader) => ({
          user_id: reader.user_id,
          novel_id: selectedNovel.id,
          type: "announcement",
          message: `${announcementTitle}: ${announcementMessage}`,
          novel_title: selectedNovel.title,
        }));

        const { error: notifError } = await supabase
          .from("notifications")
          .insert(notifications);

        if (notifError) throw new Error(notifError.message);
      }

      alert("Announcement sent successfully to readers!");
      setAnnouncementTitle("");
      setAnnouncementMessage("");
      setAnnouncementReleaseDate(null);
    } catch (err) {
      console.error("Error sending announcement:", err.message);
      alert(`Failed to send announcement: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNovelTitle("");
    setNovelImage(null);
    setNovelImageUrl("");
    setNovelSummary("");
    setNewChapterTitle("");
    setNewChapterContent("");
    setNewChapterIsAdvance(false);
    setNewChapterReleaseDate(null);
    setChapterTitles([]);
    setChapterContents([]);
    setAdvanceChapters([]);
    setSelectedNovel(null);
    setEditChapterIndex(null);
    setTags([]);
  };

  const toggleMenu = () => setMenuOpen((prev) => !prev);
  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  const selectStyles = {
    control: (base) => ({
      ...base,
      backgroundColor: isDarkMode ? "#2a2a2a" : "#fff",
      borderColor: isDarkMode ? "#444" : "#ccc",
      color: isDarkMode ? "#fff" : "#000",
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: isDarkMode ? "#2a2a2a" : "#fff",
    }),
    option: (base, { isFocused, isSelected }) => ({
      ...base,
      backgroundColor: isSelected
        ? isDarkMode ? "#555" : "#ddd"
        : isFocused
        ? isDarkMode ? "#444" : "#eee"
        : isDarkMode ? "#2a2a2a" : "#fff",
      color: isDarkMode ? "#fff" : "#000",
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: isDarkMode ? "#555" : "#ddd",
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: isDarkMode ? "#fff" : "#000",
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: isDarkMode ? "#fff" : "#000",
      ":hover": {
        backgroundColor: "#ff4444",
        color: "#fff",
      },
    }),
    input: (base) => ({
      ...base,
      color: isDarkMode ? "#fff" : "#000",
    }),
  };

  return (
    <div className={`${styles.page} ${isDarkMode ? styles.darkMode : styles.lightMode}`}>
      <nav className={`${styles.navbar} ${menuOpen ? styles.navbarOpen : ""}`}>
        <div className={styles.navContainer}>
          <Link href="/" className={styles.logoLink}>
            <img src="/images/logo.jpeg" alt="Sempai HQ" className={styles.logo} />
            <span className={styles.logoText}>Sempai HQ</span>
          </Link>
          <button className={styles.menuToggle} onClick={toggleMenu}>
            {menuOpen ? <FaTimes /> : <FaBars />}
          </button>
          <div className={`${styles.navLinks} ${menuOpen ? styles.navLinksOpen : ""}`}>
            <Link href="/" className={styles.navLink}><FaHome /> Home</Link>
            <button onClick={toggleTheme} className={styles.themeToggle}>{isDarkMode ? <FaSun /> : <FaMoon />}</button>
            <ConnectButton className={styles.connectButton} />
          </div>
        </div>
      </nav>

      {menuOpen && <div className={styles.blurOverlay}></div>}

      <header className={styles.header}>
        <h1 className={styles.headerTitle}><FaUserShield /> Writer’s Vault</h1>
        <p className={styles.headerSubtitle}>Craft and curate your literary masterpieces.</p>
      </header>

      <main className={styles.main}>
        {!isWalletConnected ? (
          <div className={styles.connectPrompt}>
            <FaGem className={styles.connectIcon} />
            <p>Connect your wallet to access the Writer’s Vault.</p>
            <ConnectButton className={styles.connectButtonPrompt} />
          </div>
        ) : !isWriter && !isSuperuser ? (
          <div className={styles.accessDenied}>
            <FaTimes className={styles.deniedIcon} />
            <p>Access Denied. Only writers and superusers may enter.</p>
            <Link href="/" className={styles.backLink}><FaHome /> Return Home</Link>
          </div>
        ) : (
          <div className={styles.dashboard}>
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
                  <label className={styles.label}><FaImage /> Cover Image</label>
                  {novelImageUrl && <img src={novelImageUrl} alt="Preview" className={styles.imagePreview} />}
                  <input type="file" onChange={handleImageChange} className={styles.fileInput} required={!selectedNovel} />
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
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Tags</label>
                  <Select
                    isMulti
                    options={TAG_OPTIONS}
                    value={tags}
                    onChange={(selected) => setTags(selected || [])}
                    placeholder="Select tags..."
                    isClearable
                    styles={selectStyles}
                    className={styles.tagSelect}
                  />
                </div>
                <div className={styles.chapterSection}>
                  <h3 className={styles.chapterTitle}><FaPlus /> Chapters</h3>
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
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>
                      <input type="checkbox" checked={newChapterIsAdvance} onChange={(e) => setNewChapterIsAdvance(e.target.checked)} />
                      Mark as Advance Chapter
                    </label>
                    {newChapterIsAdvance && (
                      <DatePicker
                        selected={newChapterReleaseDate}
                        onChange={(date) => setNewChapterReleaseDate(date)}
                        showTimeSelect
                        dateFormat="Pp"
                        minDate={new Date()}
                        placeholderText="Select release date"
                        className={styles.input}
                      />
                    )}
                  </div>
                  <button type="button" onClick={handleAddChapter} className={styles.addChapterButton}>
                    <FaPlus /> {editChapterIndex !== null ? "Update" : "Add"}
                  </button>
                </div>
                {chapterTitles.length > 0 && (
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="chapters">
                      {(provided) => (
                        <ul className={styles.chapterList} {...provided.droppableProps} ref={provided.innerRef}>
                          {chapterTitles.map((title, index) => {
                            const advanceInfo = advanceChapters.find((c) => c.index === index) || { is_advance: false };
                            return (
                              <Draggable key={index} draggableId={`chapter-${index}`} index={index}>
                                {(provided) => (
                                  <li
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={styles.chapterItem}
                                  >
                                    <span className={styles.chapterText}>
                                      <strong>{title}</strong>
                                      <p>{chapterContents[index].slice(0, 50)}...</p>
                                      {advanceInfo.is_advance && <small>Advance (Free on: {advanceInfo.free_release_date || "TBD"})</small>}
                                    </span>
                                    <div className={styles.chapterActions}>
                                      <button type="button" onClick={(e) => handleEditChapter(e, index)} className={styles.editButton}><FaEdit /></button>
                                      <button type="button" onClick={() => handleRemoveChapter(index)} className={styles.deleteButton}><FaTrash /></button>
                                      <select
                                        value={index}
                                        onChange={(e) => handleMoveChapterToIndex(index, parseInt(e.target.value))}
                                        className={styles.moveSelect}
                                      >
                                        {chapterTitles.map((_, i) => (
                                          <option key={i} value={i}>
                                            Move to Position {i + 1}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </li>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                        </ul>
                      )}
                    </Droppable>
                  </DragDropContext>
                )}
                <button type="submit" className={styles.submitButton} disabled={loading}>
                  {loading ? (
                    <span className={styles.spinner}></span>
                  ) : (
                    <>
                      <FaUpload /> {selectedNovel ? "Update" : "Publish"}
                    </>
                  )}
                </button>
              </form>

              {selectedNovel && (
                <div className={styles.announcementSection}>
                  <h3 className={styles.sectionTitle}><FaBullhorn /> Announce to Readers</h3>
                  <form onSubmit={handleAnnouncementSubmit} className={styles.announcementForm}>
                    <div className={styles.inputGroup}>
                      <label className={styles.label}>Announcement Title</label>
                      <input
                        type="text"
                        value={announcementTitle}
                        onChange={(e) => setAnnouncementTitle(e.target.value)}
                        placeholder="e.g., New Chapter Coming Soon!"
                        className={styles.input}
                        required
                      />
                    </div>
                    <div className={styles.inputGroup}>
                      <label className={styles.label}>Message</label>
                      <textarea
                        value={announcementMessage}
                        onChange={(e) => setAnnouncementMessage(e.target.value)}
                        placeholder="Write your announcement here"
                        className={styles.textarea}
                        rows="3"
                        required
                      />
                    </div>
                    <div className={styles.inputGroup}>
                      <label className={styles.label}>Release Date (Optional)</label>
                      <DatePicker
                        selected={announcementReleaseDate}
                        onChange={(date) => setAnnouncementReleaseDate(date)}
                        showTimeSelect
                        dateFormat="Pp"
                        minDate={new Date()}
                        placeholderText="Select release date"
                        className={styles.input}
                      />
                    </div>
                    <button type="submit" className={styles.announcementButton} disabled={loading}>
                      {loading ? (
                        <span className={styles.spinner}></span>
                      ) : (
                        <>
                          <FaBullhorn /> Send Announcement
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </section>

            <section className={styles.novelsSection}>
              <h2 className={styles.sectionTitle}><FaBookOpen /> Your Manuscripts</h2>
              {novelsList.length === 0 ? (
                <p className={styles.noNovels}>No manuscripts yet. Start creating!</p>
              ) : (
                <div className={styles.novelsGrid}>
                  {novelsList.map((novel) => (
                    <div key={novel.id} className={styles.novelCard}>
                      <img src={novel.image} alt={novel.title} className={styles.novelImage} />
                      <div className={styles.novelInfo}>
                        <h3 className={styles.novelTitle}>{novel.title}</h3>
                        <p className={styles.novelSummary}>{novel.summary.slice(0, 50)}...</p>
                        <p className={styles.novelTags}>Tags: {novel.tags?.join(", ") || "None"}</p>
                        <p className={styles.novelViewers}>Viewers: {novel.viewers_count || 0}</p>
                        {(novel.user_id === currentUserId || isSuperuser) && (
                          <button type="button" onClick={() => handleEditNovel(novel)} className={styles.editNovelButton}><FaEdit /> Edit</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {isSuperuser && (
              <section className={styles.writersSection}>
                <h2 className={styles.sectionTitle}><FaUserShield /> Writers</h2>
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

      {showDeleteConfirm && (
        <div className={styles.deleteConfirmOverlay}>
          <div className={styles.deleteConfirmPopup}>
            <h3>Confirm Deletion</h3>
            <p>Are you sure you want to delete "<strong>{chapterTitles[chapterToDelete]}</strong>"? This action cannot be undone.</p>
            <div className={styles.deleteConfirmButtons}>
              <button type="button" onClick={confirmDeleteChapter} className={styles.confirmButton}>Yes, Delete</button>
              <button type="button" onClick={cancelDeleteChapter} className={styles.cancelButton}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <footer className={styles.footer}>
        <p className={styles.footerText}>© 2025 Sempai HQ. All rights reserved.</p>
      </footer>
    </div>
  );
}