"use client";

import { useState, useEffect, useCallback, useRef, useContext } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../services/supabase/supabaseClient";
import { EmbeddedWalletContext } from "../components/EmbeddedWalletProvider";
import {
  FaBookOpen,
  FaChevronLeft,
  FaChevronRight,
  FaBullhorn,
  FaFeatherAlt,
  FaEye,
  FaStar,
  FaTimes,
  FaRss,
} from "react-icons/fa";
import Link from "next/link";
import LoadingPage from "../components/LoadingPage";
import ConnectButton from "../components/ConnectButton";
import Navbar from "../components/Navbar";
import ZenCarousel from "../components/ZenCarousel/ZenCarousel";
import styles from "./page.module.css";

const PrevArrow = (props) => {
  const { className, style, onClick } = props;
  return (
    <button className={`${styles.carouselArrow} ${className}`} style={{ ...style, left: "10px" }} onClick={onClick}>
      <FaChevronLeft />
    </button>
  );
};

const NextArrow = (props) => {
  const { className, style, onClick } = props;
  return (
    <button className={`${styles.carouselArrow} ${className}`} style={{ ...style, right: "10px" }} onClick={onClick}>
      <FaChevronRight />
    </button>
  );
};

const LoadingSpinner = () => (
  <div className={styles.loadingSpinner}>
    <svg width="50" height="50" viewBox="0 0 50 50">
      <circle
        cx="25"
        cy="25"
        r="20"
        stroke="#00ccff"
        strokeWidth="4"
        fill="none"
        strokeDasharray="31.4"
        strokeDashoffset="0"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 25 25"
          to="360 25 25"
          dur="1s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  </div>
);

export default function Home() {
  const { wallet: embeddedWallet } = useContext(EmbeddedWalletContext);
  const router = useRouter();
  const [isWriter, setIsWriter] = useState(false);
  const [isArtist, setIsArtist] = useState(false);
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [novels, setNovels] = useState([]);
  const [manga, setManga] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true); // Initial full page load
  const [pageLoading, setPageLoading] = useState(false); // Navigation load
  const [contentLoading, setContentLoading] = useState(true); // Novels/Manga spinner
  const [error, setError] = useState("");
  const [showConnectPopup, setShowConnectPopup] = useState(false);
  const [announcementsOpen, setAnnouncementsOpen] = useState(false);
  const [petalsCount, setPetalsCount] = useState(30);

  const hasLoadedInitialData = useRef(false); // Prevent reload on wallet change

  const isWalletConnected = !!embeddedWallet;
  const walletPublicKey = embeddedWallet?.publicKey || null;

  // Adjust sakura density based on viewport width for better mobile performance
  useEffect(() => {
    const calcPetals = () => {
      const w = typeof window !== 'undefined' ? window.innerWidth : 1200;
      if (w < 380) return 8;
      if (w < 768) return 14;
      if (w < 1024) return 24;
      return 40;
    };
    const apply = () => setPetalsCount(calcPetals());
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, []);

  const toggleConnectPopup = () => setShowConnectPopup((prev) => !prev);

  const toggleAnnouncements = () => setAnnouncementsOpen((prev) => !prev);

  // Only used to gate the "Create Announcement" button in the dropdown
  // below. The navbar's own creator-role state (for the dashboard button,
  // profile link, etc.) lives entirely in <Navbar /> now.
  const fetchCreatorFlags = useCallback(async () => {
    if (!isWalletConnected || !walletPublicKey) return;
    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("isWriter, isArtist, isSuperuser")
        .eq("wallet_address", walletPublicKey)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      if (user) {
        setIsWriter(user.isWriter || false);
        setIsArtist(user.isArtist || false);
        setIsSuperuser(user.isSuperuser || false);
      }
    } catch (err) {
      // Non-critical — the button just stays hidden if this fails.
    }
  }, [isWalletConnected, walletPublicKey]);

  const fetchNovels = useCallback(async () => {
    setContentLoading(true);
    try {
      // Fetch featured novels for the carousel
      const { data: novelsData, error } = await supabase
        .from("novels")
        .select("id, title, image, summary, user_id, tags, viewers_count")
        .eq("is_visible", true)
        .eq("featured", true);

      if (error) throw new Error(`Failed to fetch novels: ${error.message}`);
      if (!novelsData || novelsData.length === 0) {
        setNovels([]);
        return;
      }

      const userIds = novelsData.map((novel) => novel.user_id).filter((id) => id);
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, name, isWriter")
        .in("id", userIds);

      if (usersError) throw new Error(`Failed to fetch users: ${usersError.message}`);

      const usersMap = usersData.reduce((acc, user) => {
        acc[user.id] = { name: user.name || "Unknown", isWriter: user.isWriter || false };
        return acc;
      }, {});

      const { data: ratingsData, error: ratingsError } = await supabase
        .from("chapter_ratings")
        .select("content_id, rating")
        .eq("content_type", "novel");

      if (ratingsError) throw new Error(`Failed to fetch novel ratings: ${ratingsError.message}`);

      const ratingsMap = ratingsData.reduce((acc, rating) => {
        if (!acc[rating.content_id]) acc[rating.content_id] = [];
        acc[rating.content_id].push(rating.rating);
        return acc;
      }, {});

      const enrichedNovels = novelsData.map((novel) => {
        const ratings = ratingsMap[novel.id] || [];
        const averageRating = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0;
        return {
          ...novel,
          writer: usersMap[novel.user_id] || { name: "Unknown", isWriter: false },
          viewers_count: novel.viewers_count || 0,
          averageRating: averageRating,
          isAdult: novel.tags && novel.tags.includes("Adult(18+)"),
        };
      });

      // Featured novels are manually curated, no sorting needed
      setNovels(enrichedNovels);
    } catch (err) {
      setError(err.message);
      setNovels([]); // Clear on error
    } finally {
      setContentLoading(false);
    }
  }, []);

  const fetchManga = useCallback(async () => {
    setContentLoading(true);
    try {
      // Fetch featured manga for the carousel
      const { data: mangaData, error } = await supabase
        .from("manga")
        .select("id, title, cover_image, summary, user_id, status, tags")
        .eq("is_visible", true)
        .eq("featured", true)
        .in("status", ["ongoing", "completed"]);

      if (error) throw new Error(`Failed to fetch manga: ${error.message}`);
      if (!mangaData || mangaData.length === 0) {
        setManga([]);
        return;
      }

      const userIds = mangaData.map((manga) => manga.user_id).filter((id) => id);
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, name, isArtist")
        .in("id", userIds);

      if (usersError) throw new Error(`Failed to fetch users: ${usersError.message}`);

      const usersMap = usersData.reduce((acc, user) => {
        acc[user.id] = { name: user.name || "Unknown", isArtist: user.isArtist || false };
        return acc;
      }, {});

      const { data: interactionsData, error: interactionsError } = await supabase
        .from("manga_interactions")
        .select("manga_id, user_id");

      if (interactionsError) throw new Error(`Failed to fetch manga interactions: ${interactionsError.message}`);

      const viewerCounts = interactionsData.reduce((acc, interaction) => {
        if (!acc[interaction.manga_id]) acc[interaction.manga_id] = new Set();
        acc[interaction.manga_id].add(interaction.user_id);
        return acc;
      }, {});

      const { data: ratingsData, error: ratingsError } = await supabase
        .from("chapter_ratings")
        .select("content_id, rating")
        .eq("content_type", "manga");

      if (ratingsError) throw new Error(`Failed to fetch manga ratings: ${ratingsError.message}`);

      const ratingsMap = ratingsData.reduce((acc, rating) => {
        if (!acc[rating.content_id]) acc[rating.content_id] = [];
        acc[rating.content_id].push(rating.rating);
        return acc;
      }, {});

      const enrichedManga = mangaData.map((manga) => {
        const ratings = ratingsMap[manga.id] || [];
        const averageRating = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0;
        const uniqueViewers = viewerCounts[manga.id] ? viewerCounts[manga.id].size : 0;
        return {
          ...manga,
          image: manga.cover_image,
          writer: usersMap[manga.user_id] || { name: "Unknown", isArtist: false },
          viewers: uniqueViewers,
          averageRating: averageRating.toFixed(1),
          isAdult: manga.tags && manga.tags.includes("Adult(18+)"),
        };
      });

      setManga(enrichedManga);
    } catch (err) {
      setError(err.message);
    } finally {
      setContentLoading(false);
    }
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    if (!isWalletConnected || !walletPublicKey) return;
    try {
      const response = await fetch(`/api/announcements${walletPublicKey ? `?publicKey=${walletPublicKey}` : ""}`);
      const { data } = await response.json();

      const recentAnnouncements = data
        .filter((announcement) => {
          const createdAt = new Date(announcement.created_at);
          const now = new Date();
          return (now - createdAt) / (1000 * 60 * 60 * 24) <= 7;
        })
        .slice(0, 3);

      const userIds = recentAnnouncements
        .map((a) => a.users?.id)
        .filter((id) => id && id !== undefined);
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, name")
        .in("id", userIds.length > 0 ? userIds : ["none"]);

      if (usersError) throw usersError;

      const userMap = usersData.reduce((acc, user) => {
        acc[user.id] = user.name || "Unknown";
        return acc;
      }, {});

      const enrichedAnnouncements = recentAnnouncements.map((announcement) => ({
        ...announcement,
        name: userMap[announcement.users?.id] || "Unknown",
        user_id: announcement.users?.id,
        novels: announcement.novels || { id: null, title: "General Announcement" },
      }));

      setAnnouncements(enrichedAnnouncements);
    } catch (err) {
      setError("");
    }
  }, [isWalletConnected, walletPublicKey]);

  const handleNavigation = (path) => {
    setPageLoading(true);
    setAnnouncementsOpen(false);
    setShowConnectPopup(false);
    router.push(path);
  };

  const handleNovelNavigation = (id) => handleNavigation(`/novel/${id}`);
  const handleMangaNavigation = (id) => handleNavigation(`/manga/${id}`);

  useEffect(() => {
    if (hasLoadedInitialData.current) return; // Skip if already loaded
    const loadInitialData = async () => {
      setLoading(true);
      try {
        setLoading(false); // Show UI with swirls
        await Promise.all([fetchNovels(), fetchManga()]); // Load content after UI
        hasLoadedInitialData.current = true;
      } catch (err) {
        setError("Failed to load initial data.");
        setLoading(false);
      }
    };
    loadInitialData();
  }, [fetchNovels, fetchManga]);

  useEffect(() => {
    if (!isWalletConnected) {
      setAnnouncements([]);
      setIsWriter(false);
      setIsArtist(false);
      setIsSuperuser(false);
      return;
    }
    if (walletPublicKey) {
      fetchCreatorFlags();
      fetchAnnouncements();
    }
  }, [isWalletConnected, walletPublicKey, fetchCreatorFlags, fetchAnnouncements]);

  const announcementCarouselSettings = {
    dots: true,
    infinite: true,
    speed: 600,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3500,
    arrows: true,
    prevArrow: <PrevArrow />,
    nextArrow: <NextArrow />,
    fade: true,
    pauseOnHover: true,
    adaptiveHeight: true,
    customPaging: (i) => <button className={styles.customDot}>{i + 1}</button>,
  };

  if (loading || pageLoading) return <LoadingPage />;

  return (
    <div className={styles.page}>
      <div className={styles.backgroundAnimation}></div>
      {/* Sakura petals overlay */}
      <div className={styles.sakura} aria-hidden>
        {Array.from({ length: petalsCount }).map((_, i) => (
          <span key={i} style={{ "--i": i }}></span>
        ))}
      </div>

      <div className={styles.announcementToggleWrapper}>
        {announcementsOpen && (
          <div className={styles.announcementDropdown}>
            <button onClick={toggleAnnouncements} className={styles.closeAnnouncementButton}>
              <FaTimes className={styles.closeIcon} />
            </button>
            {(isWriter || isArtist || isSuperuser) && (
              <button
                onClick={() => handleNavigation("/announcements")}
                className={styles.createAnnouncementButton}
              >
                <FaBullhorn className={styles.heroIcon} /> Create Announcement
              </button>
            )}
            {error && <div className={styles.errorAlert}>{error}</div>}
            {announcements.length > 0 ? (
              <Slider {...announcementCarouselSettings} className={styles.announcementCarousel}>
                {announcements.map((announcement) => (
                  <div key={announcement.id} className={styles.announcementSlide}>
                    <div className={styles.announcementCard}>
                      <div className={styles.announcementGlow}></div>
                      <h3 className={styles.announcementTitle}>{announcement.title}</h3>
                      <p className={styles.announcementMessage}>{announcement.message}</p>
                      <div className={styles.announcementDetails}>
                        <Link
                          href={`/profile/${announcement.user_id}`}
                          onClick={() => handleNavigation(`/profile/${announcement.user_id}`)}
                          className={styles.announcementAuthor}
                        >
                          <FaFeatherAlt className={styles.writerBadge} /> {announcement.name}
                        </Link>
                        {announcement.novels.id ? (
                          <Link
                            href={`/novel/${announcement.novels.id}`}
                            onClick={() => handleNovelNavigation(announcement.novels.id)}
                            className={styles.announcementLink}
                          >
                            {announcement.novels.title}
                          </Link>
                        ) : (
                          <span className={styles.announcementLink}>{announcement.novels.title}</span>
                        )}
                        <span className={styles.announcementDate}>
                          {new Date(announcement.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </Slider>
            ) : (
              <p className={styles.noAnnouncements}>No recent announcements.</p>
            )}
          </div>
        )}
      </div>

      <Navbar onNavigate={() => setPageLoading(true)} />

      <div className={styles.banner}>
        <p className={styles.bannerText}>And there's a hope burning in our chests, so we build.</p>
      </div>

      <header className={styles.hero}>
        <div className={styles.heroContent}>
          <button onClick={toggleAnnouncements} className={styles.announcementToggle}>
            <FaBullhorn className={styles.announcementIcon} />
            {announcements.length > 0 && (
              <span className={styles.announcementBadge}>{announcements.length}</span>
            )}
          </button>
          <h1 className={styles.heroTitle}>Embark on Epic Journeys</h1>
          <p className={styles.heroSubtitle}>Explore Novels & Manga, Earn Tokens, Unleash Your Imagination</p>
          <div className={styles.heroButtons}>
            <button onClick={() => handleNavigation("/novels")} className={styles.heroButton}>
              <FaBookOpen className={styles.heroIcon} /> Explore Novels
            </button>
            <button onClick={() => handleNavigation("/manga")} className={styles.heroButton}>
              <FaBookOpen className={styles.heroIcon} /> Explore Manga
            </button>
          </div>
        </div>
      </header>

      <main className={styles.mainContent}>
        <section className={styles.contentSection}>
          <h2 className={styles.sectionTitle}>Featured Novels</h2>
          {error && <div className={styles.errorAlert}>{error}</div>}
          {contentLoading ? (
            <LoadingSpinner />
          ) : novels.length > 0 ? (
            <ZenCarousel>
              {novels.map((novel) => (
                <div key={novel.id}>
                  <div className={styles.contentCard}>
                    <Link href={`/novel/${novel.id}`} onClick={(e) => { e.preventDefault(); handleNovelNavigation(novel.id); }}>
                      <img src={novel.image} alt={novel.title} className={styles.contentImage} />
                      <div className={styles.contentOverlay}>
                        <h3 className={styles.contentTitle}>{novel.title}</h3>
                        {novel.isAdult && <span className={styles.adultWarning}>Adult(18+)</span>}
                        <p className={styles.contentSummary}>{novel.summary}</p>
                        <div className={styles.contentStats}>
                          <span className={styles.viewers}>
                            <FaEye /> {novel.viewers_count.toLocaleString()} Views
                          </span>
                          <span className={styles.rating}>
                            <FaStar /> {novel.averageRating.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </Link>
                    {novel.writer.isWriter && (
                      <Link
                        href={`/profile/${novel.user_id}`}
                        onClick={() => handleNavigation(`/profile/${novel.user_id}`)}
                        className={styles.writerName}
                      >
                        <FaFeatherAlt className={styles.writerBadge} /> {novel.writer.name}
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </ZenCarousel>
          ) : (
            <p className={styles.noContent}>No novels available yet.</p>
          )}
        </section>

        <section className={styles.contentSection}>
          <h2 className={styles.sectionTitle}>Featured Manga</h2>
          {error && <div className={styles.errorAlert}>{error}</div>}
          {contentLoading ? (
            <LoadingSpinner />
          ) : manga.length > 0 ? (
            <ZenCarousel>
              {manga.map((mangaItem) => (
                <div key={mangaItem.id}>
                  <div className={styles.contentCard}>
                    <Link href={`/manga/${mangaItem.id}`} onClick={(e) => { e.preventDefault(); handleMangaNavigation(mangaItem.id); }}>
                      <img src={mangaItem.image} alt={mangaItem.title} className={styles.contentImage} />
                      <div className={styles.contentOverlay}>
                        <h3 className={styles.contentTitle}>{mangaItem.title}</h3>
                        {mangaItem.isAdult && <span className={styles.adultWarning}>Adult(18+)</span>}
                        <p className={styles.contentSummary}>{mangaItem.summary}</p>
                        <div className={styles.contentStats}>
                          <span className={styles.viewers}>
                            <FaEye /> {mangaItem.viewers} Views
                          </span>
                          <span className={styles.rating}>
                            <FaStar /> {mangaItem.averageRating}
                          </span>
                        </div>
                      </div>
                    </Link>
                    {mangaItem.writer.isArtist && (
                      <Link
                        href={`/profile/${mangaItem.user_id}`}
                        onClick={() => handleNavigation(`/profile/${mangaItem.user_id}`)}
                        className={styles.writerName}
                      >
                        <FaFeatherAlt className={styles.writerBadge} /> {mangaItem.writer.name}
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </ZenCarousel>
          ) : (
            <p className={styles.noContent}>No manga available yet.</p>
          )}
        </section>

        <section className={styles.featuresSection}>
          <h2 className={styles.sectionTitle}>Explore More</h2>
          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <Link href="/kaito-adventure" onClick={(e) => { e.preventDefault(); isWalletConnected ? handleNavigation("/kaito-adventure") : toggleConnectPopup(); }}>
                <img src="/background.jpg" alt="Kaito Adventure" className={styles.featureImage} />
                <div className={styles.featureOverlay}>
                  <h3 className={styles.featureTitle}>Kaito's Adventure</h3>
                </div>
              </Link>
            </div>
            <div className={styles.featureCard}>
              <Link href="/dao-governance" onClick={(e) => { e.preventDefault(); isWalletConnected ? handleNavigation("/dao-governance") : toggleConnectPopup(); }}>
                <img src="/images/dao.jpg" alt="DAO Governance" className={styles.featureImage} />
                <div className={styles.featureOverlay}>
                  <h3 className={styles.featureTitle}>DAO Governance</h3>
                </div>
              </Link>
            </div>
            <div className={styles.featureCard}>
              <Link href="/novels" onClick={(e) => { e.preventDefault(); handleNavigation("/novels"); }}>
                <img src="/images/novel-3.jpg" alt="Hoard" className={styles.featureImage} />
                <div className={styles.featureOverlay}>
                  <h3 className={styles.featureTitle}>Hoard</h3>
                </div>
              </Link>
            </div>
            <div className={styles.featureCard}>
              <Link href="/keep-it-simple" onClick={(e) => { e.preventDefault(); isWalletConnected ? handleNavigation("/keep-it-simple") : toggleConnectPopup(); }}>
                <img src="/images/novel-4.jpg" alt="KISS" className={styles.featureImage} />
                <div className={styles.featureOverlay}>
                  <h3 className={styles.featureTitle}>KISS</h3>
                </div>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {showConnectPopup && (
        <div className={styles.connectPopupOverlay}>
          <div className={styles.connectPopup}>
            <button onClick={toggleConnectPopup} className={styles.closePopupButton}>
              <FaTimes />
            </button>
            <h3 className={styles.popupTitle}>Connect Your Wallet</h3>
            <p className={styles.popupMessage}>Please connect your wallet to access this content.</p>
            <ConnectButton />
          </div>
        </div>
      )}

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerTop}>
            <p>© 2025 - 2026 Sempai HQ. All rights reserved.</p>
          </div>
          <div className={styles.footerLinks}>
            <Link href="/privacy-policy">Privacy Policy</Link>
            <span className={styles.divider}>|</span>
            <Link href="/terms">Terms & Conditions</Link>
          </div>
          <div className={styles.footerDisclaimer}>
            By continuing, you accept our Terms and Conditions of use and our Privacy Policy.
          </div>
        </div>
      </footer>
    </div>
  );
}