"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../services/supabase/supabaseClient";
import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FaHome, FaBars, FaTimes, FaPlus, FaEdit, FaTrash, FaUpload, FaUserShield, FaGem, FaSun, FaMoon, FaBullhorn, FaPaintBrush, FaLayerGroup, FaCamera } from "react-icons/fa";
import LoadingPage from "../../components/LoadingPage";
import ConnectButton from "../../components/ConnectButton";
import styles from "../../styles/MangaDashboard.module.css"; // Assuming this is the correct path now
import imageCompression from "browser-image-compression";

export default function MangaDashboard() {
  const { connected, publicKey } = useWallet();
  const [title, setTitle] = useState("");
  const [coverImage, setCoverImage] = useState(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [summary, setSummary] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterPages, setChapterPages] = useState([]);
  const [isPremium, setIsPremium] = useState(false);
  const [mangaCollection, setMangaCollection] = useState([]);
  const [activeManga, setActiveManga] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [userId, setUserId] = useState(null);
  const [isArtist, setIsArtist] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [artistList, setArtistList] = useState([]);
  const [editingChapterIdx, setEditingChapterIdx] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeText, setNoticeText] = useState("");
  const [noticeDate, setNoticeDate] = useState(null);
  const chapterInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const router = useRouter();

  // Check user access and roles
  const verifyUserAccess = async () => {
    if (!connected || !publicKey) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const wallet = publicKey.toString();
      const { data, error } = await supabase
        .from("users")
        .select("id, isArtist, isSuperuser")
        .eq("wallet_address", wallet)
        .single();

      if (error || !data) throw new Error("User verification failed");

      if (!data.isArtist && !data.isSuperuser) {
        router.push("/error");
        return;
      }

      setUserId(data.id);
      setIsArtist(data.isArtist);
      setIsAdmin(data.isSuperuser);
    } catch (err) {
      console.error("Access verification error:", err.message);
      router.push("/error");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch user's manga
  const loadManga = async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const query = isAdmin ? supabase.from("manga").select("*") : supabase.from("manga").select("*").eq("user_id", userId);
      const { data, error } = await query;
      if (error) throw new Error("Failed to fetch manga");

      setMangaCollection(data || []);
    } catch (err) {
      console.error("Manga fetch error:", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch artists (for admin)
  const loadArtists = async () => {
    if (!isAdmin) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, isArtist")
        .eq("isArtist", true);
      if (error) throw new Error("Failed to fetch artists");

      setArtistList(data || []);
    } catch (err) {
      console.error("Artists fetch error:", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    verifyUserAccess();
  }, [connected, publicKey]);

  useEffect(() => {
    if (userId && (isArtist || isAdmin)) {
      loadManga();
      if (isAdmin) loadArtists();
    }
  }, [userId, isArtist, isAdmin]);

  // Handle cover image upload
  const uploadCoverImage = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      setCoverImage(file);
      setCoverPreview(URL.createObjectURL(file));
    } else {
      alert("Please select a valid image.");
    }
  };

  // Handle chapter pages upload with compression
  const uploadChapterPages = async (e) => {
    const files = Array.from(e.target.files);
    const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true, initialQuality: 0.85 };

    try {
      const compressed = await Promise.all(
        files.map(async (file) => {
          if (file.type.startsWith("image/")) {
            const compressedFile = await imageCompression(file, options);
            return { file: compressedFile, url: URL.createObjectURL(compressedFile) };
          }
          return { file, url: URL.createObjectURL(file) };
        })
      );
      setChapterPages((prev) => [...prev, ...compressed]);
    } catch (err) {
      console.error("Compression error:", err);
      alert("Compression failed, using original files.");
      setChapterPages((prev) => [...prev, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
    }
  };

  // Add or update a chapter
  const manageChapter = () => {
    if (!chapterTitle.trim() || chapterPages.length === 0) {
      alert("Chapter title and at least one page are required.");
      return;
    }

    const chapterData = { title: chapterTitle, pages: chapterPages, isPremium };
    if (editingChapterIdx !== null) {
      setChapters((prev) => prev.map((ch, idx) => (idx === editingChapterIdx ? chapterData : ch)));
      setEditingChapterIdx(null);
    } else {
      setChapters((prev) => [...prev, chapterData]);
    }
    clearChapterForm();
  };

  // Edit an existing chapter
  const editChapter = (e, idx) => {
    e.preventDefault();
    const chapter = chapters[idx];
    setChapterTitle(chapter.title || ""); // Ensure chapterTitle is never undefined
    setChapterPages(chapter.pages || []);
    setIsPremium(chapter.isPremium || false);
    setEditingChapterIdx(idx);
    chapterInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    chapterInputRef.current?.focus();
  };

  // Remove a chapter
  const deleteChapter = (idx) => {
    setChapters((prev) => prev.filter((_, i) => i !== idx));
    if (editingChapterIdx === idx) setEditingChapterIdx(null);
  };

  // Load manga for editing
  const loadMangaForEdit = async (manga) => {
    setActiveManga(manga);
    setTitle(manga.title || ""); // Ensure title is never undefined
    setCoverPreview(manga.cover_image || "");
    setSummary(manga.summary || ""); // Ensure summary is never undefined
    await fetchChapters(manga.id);
  };

  // Fetch chapters for a manga
  const fetchChapters = async (mangaId) => {
    try {
      const { data: chapterData, error } = await supabase
        .from("manga_chapters")
        .select("id, title, is_premium")
        .eq("manga_id", mangaId)
        .order("chapter_number", { ascending: true });
      if (error) throw new Error("Chapter fetch error");

      const chaptersWithPages = await Promise.all(
        chapterData.map(async (chapter) => {
          const { data: pages, error: pageError } = await supabase
            .from("manga_pages")
            .select("image_url")
            .eq("chapter_id", chapter.id)
            .order("page_number", { ascending: true });
          if (pageError) throw new Error("Page fetch error");
          return { ...chapter, pages: pages.map((p) => ({ url: p.image_url })) };
        })
      );
      setChapters(chaptersWithPages);
    } catch (err) {
      console.error("Error fetching chapters:", err.message);
    }
  };

  // Submit manga
  const submitManga = async (e) => {
    e.preventDefault();
    if (!title.trim() || (!coverImage && !coverPreview) || !summary.trim()) {
      alert("All manga details are required.");
      return;
    }

    setIsLoading(true);
    try {
      let coverUrl = coverPreview;
      if (coverImage) {
        const path = `manga/${userId}/${Date.now()}-${coverImage.name}`;
        const { data, error } = await supabase.storage.from("covers").upload(path, coverImage, { upsert: true });
        if (error) throw new Error("Cover upload failed");
        coverUrl = supabase.storage.from("covers").getPublicUrl(data.path).data.publicUrl;
      }

      const mangaPayload = {
        user_id: userId,
        title,
        cover_image: coverUrl,
        summary,
        author: (await supabase.from("users").select("name").eq("id", userId).single()).data?.name || "Unknown",
        status: "ongoing",
      };

      let mangaId;
      if (activeManga) {
        const { error } = await supabase.from("manga").update(mangaPayload).eq("id", activeManga.id);
        if (error) throw new Error("Manga update failed");
        mangaId = activeManga.id;
      } else {
        const { data, error } = await supabase.from("manga").insert([mangaPayload]).select("id").single();
        if (error) throw new Error("Manga creation failed");
        mangaId = data.id;
      }

      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        let chapterId;

        const existing = activeManga ? (await supabase.from("manga_chapters").select("id").eq("manga_id", mangaId).eq("chapter_number", i + 1).single()).data : null;
        if (existing) {
          const { error } = await supabase.from("manga_chapters").update({ title: chapter.title, is_premium: chapter.isPremium }).eq("id", existing.id);
          if (error) throw new Error("Chapter update failed");
          chapterId = existing.id;
          await supabase.from("manga_pages").delete().eq("chapter_id", chapterId);
        } else {
          const { data, error } = await supabase.from("manga_chapters").insert([{ manga_id: mangaId, chapter_number: i + 1, title: chapter.title, is_premium: chapter.isPremium }]).select("id").single();
          if (error) throw new Error("Chapter creation failed");
          chapterId = data.id;
        }

        for (let j = 0; j < chapter.pages.length; j++) {
          const page = chapter.pages[j];
          let pageUrl = page.url;
          if (page.file) {
            const pagePath = `${mangaId}/${chapterId}/${j + 1}-${Date.now()}.jpg`;
            const { data, error } = await supabase.storage.from("manga-pages").upload(pagePath, page.file, { upsert: true });
            if (error) throw new Error("Page upload failed");
            pageUrl = supabase.storage.from("manga-pages").getPublicUrl(data.path).data.publicUrl;
          }
          const { error } = await supabase.from("manga_pages").insert([{ chapter_id: chapterId, page_number: j + 1, image_url: pageUrl }]);
          if (error) throw new Error("Page save failed");
        }
      }

      alert("Manga saved successfully!");
      clearForm();
      loadManga();
    } catch (err) {
      console.error("Submission error:", err.message);
      alert(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Send announcement
  const sendNotice = async (e) => {
    e.preventDefault();
    if (!activeManga) {
      alert("Select a manga to announce.");
      return;
    }
    if (!noticeTitle.trim() || !noticeText.trim()) {
      alert("Announcement title and message are required.");
      return;
    }

    setIsLoading(true);
    try {
      const { data: readers, error } = await supabase.from("manga").select("user_id").eq("id", activeManga.id);
      if (error) throw new Error("Failed to fetch readers");

      const noticePayload = {
        writer_id: userId,
        manga_id: activeManga.id,
        title: noticeTitle,
        message: noticeText,
        release_date: noticeDate ? noticeDate.toISOString() : null,
      };
      const { error: noticeError } = await supabase.from("writer_announcements").insert([noticePayload]);
      if (noticeError) throw new Error("Announcement save failed");

      if (readers.length > 0) {
        const notifications = readers.map((reader) => ({
          user_id: reader.user_id,
          manga_id: activeManga.id,
          type: "announcement",
          message: `${noticeTitle}: ${noticeText}`,
          manga_title: activeManga.title,
        }));
        const { error } = await supabase.from("notifications").insert(notifications);
        if (error) throw new Error("Notification send failed");
      }

      alert("Announcement sent!");
      setNoticeTitle("");
      setNoticeText("");
      setNoticeDate(null);
    } catch (err) {
      console.error("Announcement error:", err.message);
      alert(`Failed to send: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear form
  const clearForm = () => {
    setTitle("");
    setCoverImage(null);
    setCoverPreview("");
    setSummary("");
    clearChapterForm();
    setChapters([]);
    setActiveManga(null);
  };

  const clearChapterForm = () => {
    setChapterTitle("");
    setChapterPages([]);
    setIsPremium(false);
    setEditingChapterIdx(null);
  };

  // Toggle UI elements
  const toggleMenu = () => setIsMenuOpen((prev) => !prev);
  const toggleTheme = () => setIsDarkTheme((prev) => !prev);

  // Trigger file input click
  const triggerFileInput = (type) => {
    fileInputRef.current.dataset.type = type;
    fileInputRef.current.click();
  };

  if (isLoading) return <LoadingPage />;

  return (
    <div className={styles.container}>
      <nav className={`${styles.navbar} ${isMenuOpen ? styles.navOpen : ""}`}>
        <Link href="/" className={styles.logo}>
          <span>SempaiHQ</span>
        </Link>
        <button className={styles.navToggle} onClick={toggleMenu}>
          {isMenuOpen ? <FaTimes /> : <FaBars />}
        </button>
        <ul className={`${styles.navLinks} ${isMenuOpen ? styles.navLinksOpen : ""}`}>
          <li><Link href="/" className={styles.navLink}><FaHome /> Home</Link></li>
          <li><button onClick={toggleTheme} className={styles.themeToggle}>{isDarkTheme ? <FaSun /> : <FaMoon />}</button></li>
          <li><ConnectButton /></li>
        </ul>
      </nav>

      <main className={styles.main}>
        {!connected ? (
          <div className={styles.unauthorized}>
            <FaGem />
            <p>Connect your wallet to access the Artist’s Studio.</p>
            <ConnectButton />
          </div>
        ) : !isArtist && !isAdmin ? (
          <div className={styles.unauthorized}>
            <FaTimes />
            <p>Access restricted to artists and admins.</p>
            <Link href="/" className={styles.navLink}><FaHome /> Return Home</Link>
          </div>
        ) : (
          <>
            <section className={styles.editor}>
              <h1 className={styles.title}>{activeManga ? "Edit Manga" : "Create Manga"}</h1>
              <form onSubmit={submitManga} className={styles.form}>
                <div className={styles.field}>
                  <label>Title</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Manga title" required />
                </div>
                <div className={styles.field}>
                  <label>Cover Image</label>
                  {coverPreview && <img src={coverPreview} alt="Cover" className={styles.coverPreview} />}
                  <FaCamera className={styles.camera} onClick={() => triggerFileInput("cover")} />
                </div>
                <div className={styles.field}>
                  <label>Summary</label>
                  <textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Brief summary" required />
                </div>
                <div className={styles.chapterEditor}>
                  <h2><FaPlus /> Chapters</h2>
                  <div className={styles.field}>
                    <label>Chapter Title</label>
                    <input
                      type="text"
                      ref={chapterInputRef}
                      value={chapterTitle}
                      onChange={(e) => setChapterTitle(e.target.value)}
                      placeholder="Chapter title"
                    />
                  </div>
                  <div className={styles.field}>
                    <label>Pages</label>
                    <FaCamera className={styles.camera} onClick={() => triggerFileInput("pages")} />
                    <div className={styles.imageGrid}>
                      {chapterPages.map((page, idx) => (
                        <img key={idx} src={page.url} alt={`Page ${idx + 1}`} />
                      ))}
                    </div>
                  </div>
                  <label className={styles.checkbox}>
                    <input type="checkbox" checked={isPremium} onChange={(e) => setIsPremium(e.target.checked)} />
                    Premium Chapter
                  </label>
                  <button type="button" onClick={manageChapter} className={styles.addButton}>
                    <FaPlus /> {editingChapterIdx !== null ? "Update" : "Add"}
                  </button>
                </div>
                {chapters.length > 0 && (
                  <ul className={styles.chapterList}>
                    {chapters.map((chapter, idx) => (
                      <li key={idx} className={styles.chapterItem}>
                        <span>{chapter.title} ({chapter.pages.length} pages) {chapter.isPremium && "[Premium]"}</span>
                        <div>
                          <FaEdit className={styles.icon} onClick={(e) => editChapter(e, idx)} />
                          <FaTrash className={styles.icon} onClick={() => deleteChapter(idx)} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <button type="submit" className={styles.saveButton}><FaUpload /> {activeManga ? "Update" : "Publish"}</button>
              </form>
              <input
                type="file"
                ref={fileInputRef}
                className={styles.hiddenInput}
                onChange={(e) => (fileInputRef.current.dataset.type === "cover" ? uploadCoverImage(e) : uploadChapterPages(e))}
                multiple={fileInputRef.current?.dataset.type === "pages"}
              />
              {activeManga && (
                <div className={styles.announcementSection}>
                  <h2><FaBullhorn /> Announce</h2>
                  <form onSubmit={sendNotice} className={styles.form}>
                    <div className={styles.field}>
                      <label>Title</label>
                      <input value={noticeTitle} onChange={(e) => setNoticeTitle(e.target.value)} placeholder="Announcement title" required />
                    </div>
                    <div className={styles.field}>
                      <label>Message</label>
                      <textarea value={noticeText} onChange={(e) => setNoticeText(e.target.value)} placeholder="Your message" required />
                    </div>
                    <div className={styles.field}>
                      <label>Release Date (Optional)</label>
                      <DatePicker
                        selected={noticeDate}
                        onChange={(date) => setNoticeDate(date)}
                        showTimeSelect
                        dateFormat="Pp"
                        minDate={new Date()}
                        placeholderText="Pick a date"
                        className={styles.datePicker}
                      />
                    </div>
                    <button type="submit" className={styles.saveButton}><FaBullhorn /> Send</button>
                  </form>
                </div>
              )}
            </section>

            <section className={styles.gallery}>
              <h1 className={styles.title}>Your Works</h1>
              {mangaCollection.length === 0 ? (
                <p className={styles.empty}>No manga yet. Start creating!</p>
              ) : (
                <div className={styles.mangaGrid}>
                  {mangaCollection.map((manga) => (
                    <div key={manga.id} className={styles.mangaCard}>
                      <img src={manga.cover_image} alt={manga.title} />
                      <div className={styles.cardInfo}>
                        <h3>{manga.title}</h3>
                        <p>{manga.summary.slice(0, 50)}...</p>
                        <FaEdit className={styles.icon} onClick={() => loadMangaForEdit(manga)} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {isAdmin && (
              <section className={styles.artists}>
                <h1 className={styles.title}>Artists</h1>
                {artistList.length === 0 ? (
                  <p className={styles.empty}>No artists found.</p>
                ) : (
                  <ul className={styles.artistList}>
                    {artistList.map((artist) => (
                      <li key={artist.id} className={styles.artistItem}>
                        <FaUserShield /> {artist.name} ({artist.email}) - ID: {artist.id}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </>
        )}
      </main>

      <footer className={styles.footer}>
        <p>© 2025 SempaiHQ. All rights reserved.</p>
      </footer>
    </div>
  );
}