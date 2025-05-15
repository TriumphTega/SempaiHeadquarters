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
import { FaHome, FaBars, FaTimes, FaPlus, FaEdit, FaTrash, FaUpload, FaUserShield, FaGem, FaSun, FaMoon, FaBullhorn, FaPaintBrush, FaLayerGroup, FaCamera } from "react-icons/fa";
import LoadingPage from "../../components/LoadingPage";
import ConnectButton from "../../components/ConnectButton";
import styles from "../../styles/MangaDashboard.module.css";
import imageCompression from "browser-image-compression";

// Predefined tag options for production
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

export default function MangaDashboard() {
  const { connected, publicKey } = useWallet();
  const { wallet: embeddedWallet } = useContext(EmbeddedWalletContext);
  const [title, setTitle] = useState("");
  const [coverImage, setCoverImage] = useState(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [summary, setSummary] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterPages, setChapterPages] = useState([]);
  const [isPremium, setIsPremium] = useState(false);
  const [chapterPrice, setChapterPrice] = useState("2.5"); // New state for chapter price
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
  const [tags, setTags] = useState([]);
  const chapterInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const router = useRouter();

  // Determine the active wallet address (external or embedded)
  const activePublicKey = publicKey || (embeddedWallet ? embeddedWallet.publicKey : null);
  const isWalletConnected = connected || !!embeddedWallet;

  const verifyUserAccess = async () => {
    if (!isWalletConnected || !activePublicKey) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const wallet = activePublicKey.toString();
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

  const loadManga = async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const query = isAdmin 
        ? supabase.from("manga").select("*, viewers_count, tags")
        : supabase.from("manga").select("*, viewers_count, tags").eq("user_id", userId);
      const { data, error } = await query;
      if (error) throw new Error("Failed to fetch manga");

      setMangaCollection(data || []);
    } catch (err) {
      console.error("Manga fetch error:", err.message);
    } finally {
      setIsLoading(false);
    }
  };

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
  }, [connected, publicKey, embeddedWallet]);

  useEffect(() => {
    if (userId && (isArtist || isAdmin)) {
      loadManga();
      if (isAdmin) loadArtists();
    }
  }, [userId, isArtist, isAdmin]);

  const uploadCoverImage = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      setCoverImage(file);
      setCoverPreview(URL.createObjectURL(file));
    } else {
      alert("Please select a valid image.");
    }
  };

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

  const manageChapter = () => {
    if (!chapterTitle.trim() || chapterPages.length === 0) {
      alert("Chapter title and at least one page are required.");
      return;
    }
    if (isPremium && (!chapterPrice || parseFloat(chapterPrice) <= 0)) {
      alert("Please set a valid price for the premium chapter.");
      return;
    }

    const chapterData = {
      title: chapterTitle,
      pages: chapterPages,
      isPremium,
      price: isPremium ? parseFloat(chapterPrice) : null,
    };
    if (editingChapterIdx !== null) {
      setChapters((prev) => prev.map((ch, idx) => (idx === editingChapterIdx ? chapterData : ch)));
      setEditingChapterIdx(null);
    } else {
      setChapters((prev) => [...prev, chapterData]);
    }
    clearChapterForm();
  };

  const editChapter = (e, idx) => {
    e.preventDefault();
    const chapter = chapters[idx];
    setChapterTitle(chapter.title || "");
    setChapterPages(chapter.pages || []);
    setIsPremium(chapter.isPremium || false);
    setChapterPrice(chapter.price ? chapter.price.toString() : "2.5");
    setEditingChapterIdx(idx);
    chapterInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    chapterInputRef.current?.focus();
  };

  const deleteChapter = (idx) => {
    setChapters((prev) => prev.filter((_, i) => i !== idx));
    if (editingChapterIdx === idx) setEditingChapterIdx(null);
  };

  const loadMangaForEdit = async (manga) => {
    setActiveManga(manga);
    setTitle(manga.title || "");
    setCoverPreview(manga.cover_image || "");
    setSummary(manga.summary || "");
    setTags(manga.tags ? manga.tags.map(tag => ({ value: tag, label: tag })) : []);
    await fetchChapters(manga.id);
  };

  const fetchChapters = async (mangaId) => {
    try {
      const { data: chapterData, error } = await supabase
        .from("manga_chapters")
        .select("id, title, is_premium, price")
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
          return {
            ...chapter,
            pages: pages.map((p) => ({ url: p.image_url })),
            price: chapter.price,
          };
        })
      );
      setChapters(chaptersWithPages);
    } catch (err) {
      console.error("Error fetching chapters:", err.message);
    }
  };

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
        tags: tags.map(tag => tag.value),
        viewers_count: activeManga ? activeManga.viewers_count : 0
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
          const { error } = await supabase
            .from("manga_chapters")
            .update({
              title: chapter.title,
              is_premium: chapter.isPremium,
              price: chapter.isPremium ? chapter.price : null,
            })
            .eq("id", existing.id);
          if (error) throw new Error("Chapter update failed");
          chapterId = existing.id;
          await supabase.from("manga_pages").delete().eq("chapter_id", chapterId);
        } else {
          const { data, error } = await supabase
            .from("manga_chapters")
            .insert([{
              manga_id: mangaId,
              chapter_number: i + 1,
              title: chapter.title,
              is_premium: chapter.isPremium,
              price: chapter.isPremium ? chapter.price : null,
            }])
            .select("id")
            .single();
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

  const clearForm = () => {
    setTitle("");
    setCoverImage(null);
    setCoverPreview("");
    setSummary("");
    clearChapterForm();
    setChapters([]);
    setActiveManga(null);
    setTags([]);
  };

  const clearChapterForm = () => {
    setChapterTitle("");
    setChapterPages([]);
    setIsPremium(false);
    setChapterPrice("2.5");
    setEditingChapterIdx(null);
  };

  const toggleMenu = () => setIsMenuOpen((prev) => !prev);
  const toggleTheme = () => setIsDarkTheme((prev) => !prev);

  const triggerFileInput = (type) => {
    fileInputRef.current.dataset.type = type;
    fileInputRef.current.click();
  };

  // Custom styles for react-select to match your theme
  const selectStyles = {
    control: (base) => ({
      ...base,
      backgroundColor: isDarkTheme ? "#2a2a2a" : "#fff",
      borderColor: isDarkTheme ? "#444" : "#ccc",
      color: isDarkTheme ? "#fff" : "#000",
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: isDarkTheme ? "#2a2a2a" : "#fff",
    }),
    option: (base, { isFocused, isSelected }) => ({
      ...base,
      backgroundColor: isSelected
        ? isDarkTheme ? "#555" : "#ddd"
        : isFocused
        ? isDarkTheme ? "#444" : "#eee"
        : isDarkTheme ? "#2a2a2a" : "#fff",
      color: isDarkTheme ? "#fff" : "#000",
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: isDarkTheme ? "#555" : "#ddd",
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: isDarkTheme ? "#fff" : "#000",
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: isDarkTheme ? "#fff" : "#000",
      ":hover": {
        backgroundColor: "#ff4444",
        color: "#fff",
      },
    }),
    input: (base) => ({
      ...base,
      color: isDarkTheme ? "#fff" : "#000",
    }),
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
        {!isWalletConnected ? (
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
                <div className={styles.field}>
                  <label>Tags</label>
                  <Select
                    isMulti
                    options={TAG_OPTIONS}
                    value={tags}
                    onChange={(selected) => setTags(selected || [])}
                    placeholder="Select or type tags..."
                    isClearable
                    styles={selectStyles}
                    className={styles.tagSelect}
                    isSearchable
                    createOptionPosition="first"
                    allowCreateWhileLoading={false}
                    formatCreateLabel={(inputValue) => `Add "${inputValue}"`}
                    onCreateOption={(inputValue) => {
                      const newTag = { value: inputValue, label: inputValue };
                      setTags((prev) => [...prev, newTag]);
                    }}
                  />
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
                  {isPremium && (
                    <div className={styles.field}>
                      <label>Chapter Price (USDC)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={chapterPrice}
                        onChange={(e) => setChapterPrice(e.target.value)}
                        placeholder="Enter price (e.g., 2.5)"
                      />
                    </div>
                  )}
                  <button type="button" onClick={manageChapter} className={styles.addButton}>
                    <FaPlus /> {editingChapterIdx !== null ? "Update" : "Add"}
                  </button>
                </div>
                {chapters.length > 0 && (
                  <ul className={styles.chapterList}>
                    {chapters.map((chapter, idx) => (
                      <li key={idx} className={styles.chapterItem}>
                        <span>
                          {chapter.title} ({chapter.pages.length} pages) 
                          {chapter.isPremium && ` [Premium: $${chapter.price}]`}
                        </span>
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
                        <p>Tags: {manga.tags?.join(", ") || "None"}</p>
                        <p>Viewers: {manga.viewers_count || 0}</p>
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