"use client";

import { useState, useEffect } from "react";
import { 
  FaSearch, 
  FaUser, 
  FaTimes, 
  FaGoogle, 
  FaGem, 
  FaBook, 
  FaPlus, 
  FaTrophy, 
  FaUpload, 
  FaArrowLeft, 
  FaTag ,
  FaShoppingCart
} from "react-icons/fa";

import styles from "../Marketplace.module.css";
import kaitoStyles from "../../../styles/MarketplaceKaito.module.css";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";

export default function HoardPage() {
  const router = useRouter();
  const { user, session, signInWithGoogle } = useAuth();

  const [hoardedBooks, setHoardedBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [embers, setEmbers] = useState([]);
  const [isTop50, setIsTop50] = useState(false);
  const [userRank, setUserRank] = useState(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [selectedListingItem, setSelectedListingItem] = useState(null);

  // Upload modal states
  const [availableNovels, setAvailableNovels] = useState([]);
  const [availableManga, setAvailableManga] = useState([]);
  const [contentType, setContentType] = useState("manga");
  const [selectedUploadItem, setSelectedUploadItem] = useState(null);
  const [uploadNotes, setUploadNotes] = useState("");
  const [loadingNovels, setLoadingNovels] = useState(false);

  // Listing form
  const [listingPrice, setListingPrice] = useState("");
  const [listingCurrency, setListingCurrency] = useState("SMP");
  const [listingDescription, setListingDescription] = useState("");

  // Build ember particles
  useEffect(() => {
    const buildEmbers = (count = 18) =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 6}s`,
        duration: `${7 + Math.random() * 6}s`,
        size: 2 + Math.floor(Math.random() * 3),
        opacity: 0.3 + Math.random() * 0.6,
      }));
    setEmbers(buildEmbers(18));
  }, []);

  // Check if user is in top 50 leaderboard
  const checkLeaderboardRank = async () => {
    if (!user) return;

    try {
      const token = session?.access_token;
      const res = await fetch("/api/leaderboard/check-rank", {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const data = await res.json();
      if (res.ok && data.rank) {
        setUserRank(data.rank);
        setIsTop50(data.rank <= 50);
      }
    } catch (err) {
      console.error("Error checking leaderboard rank:", err);
    }
  };

  useEffect(() => {
    if (user) {
      checkLeaderboardRank();
    }
  }, [user]);

  // Fetch Hoard
  const fetchHoard = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const token = session?.access_token;
      const res = await fetch("/api/hoard", {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch hoard");

      setHoardedBooks(data.hoard || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchHoard();
  }, [user]);

  // Fetch available content for upload
  useEffect(() => {
    if (showUploadModal && user) {
      fetchAvailableContent();
    }
  }, [showUploadModal, user]);

  const fetchAvailableContent = async () => {
    setLoadingNovels(true);
    try {
      const [novelsRes, mangaRes] = await Promise.all([
        fetch("/api/novels", { credentials: "include" }),
        fetch("/api/manga", { credentials: "include" })
      ]);

      const novelsData = novelsRes.ok ? await novelsRes.json() : [];
      const mangaData = mangaRes.ok ? await mangaRes.json() : [];

      setAvailableNovels(novelsData);
      setAvailableManga(mangaData);
    } catch (err) {
      console.error("Error fetching content:", err);
    } finally {
      setLoadingNovels(false);
    }
  };

  // Add to Hoard
  const handleAddToHoard = async () => {
    if (!selectedUploadItem) return;

    try {
      const token = session?.access_token;
      const body = {
        content_type: contentType,
        notes: uploadNotes.trim(),
        ...(contentType === "novel" 
          ? { novel_id: selectedUploadItem.id }
          : { manga_id: selectedUploadItem.id })
      };

      const res = await fetch("/api/hoard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add to hoard");

      alert("Successfully added to Hoard!");
      setShowUploadModal(false);
      resetUploadForm();
      fetchHoard();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const resetUploadForm = () => {
    setSelectedUploadItem(null);
    setUploadNotes("");
    setContentType("manga");
  };

  // List for Sale
  const handleListForSale = async () => {
    if (!selectedListingItem || !listingPrice) return;

    // Check if user is in top 50
    if (!isTop50) {
      alert(`Listing on Bazaar is currently restricted to the Top 50 leaderboard users. Your current rank: ${userRank || 'Not ranked'}. Keep reading to climb the leaderboard!`);
      return;
    }

    try {
      const token = session?.access_token;

      const res = await fetch("/api/marketplace/listings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          hoard_item_id: selectedListingItem.id,
          price: parseFloat(listingPrice),
          currency: listingCurrency,
          description: listingDescription.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to list item");

      alert("Successfully listed on marketplace!");
      setShowListModal(false);
      resetListingForm();
      fetchHoard();
    } catch (err) {
      alert(err.message);
    }
  };

  const resetListingForm = () => {
    setListingPrice("");
    setListingDescription("");
    setSelectedListingItem(null);
  };

  // Filter
  const filteredBooks = hoardedBooks.filter((item) => {
    const content = item.content_type === "novel" ? item.novels : item.manga;
    const query = searchQuery.toLowerCase();
    return (
      content?.title?.toLowerCase().includes(query) ||
      content?.summary?.toLowerCase().includes(query) ||
      (item.content_type === "manga" && content?.author?.toLowerCase().includes(query))
    );
  });

  if (!user) {
    return (
      <div className={styles.marketplace}>
        {/* Ember Particles */}
        <div className={kaitoStyles.emberContainer}>
          {embers.map((ember) => (
            <div
              key={ember.id}
              className={kaitoStyles.ember}
              style={{
                left: ember.left,
                animationDelay: ember.delay,
                animationDuration: ember.duration,
                width: ember.size,
                height: ember.size,
                opacity: ember.opacity,
              }}
            />
          ))}
        </div>

        <Navbar />

        {/* Landing Content */}
        <div className={`${styles.landingPage} ${kaitoStyles.heroSection}`}>
          <div className={`${styles.landingContent} ${kaitoStyles.mainContent}`}>
            <FaTrophy className={`${styles.landingIcon} ${kaitoStyles.emptyIcon}`} />
            <h1 className={`${styles.landingTitle} ${kaitoStyles.heroTitle}`}>My Hoard</h1>
            <p className={`${styles.landingSubtitle} ${kaitoStyles.heroSubtitle}`}>
              Sign in to access your personal collection of completed stories
            </p>
            <button 
              className={`${styles.landingButton} ${kaitoStyles.navButtonPrimary}`}
              onClick={signInWithGoogle}
            >
              <FaGoogle /> Sign in with Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.marketplace} ${kaitoStyles.marketplaceContainer}`}>
      {/* Ember Particles */}
      <div className={kaitoStyles.emberContainer}>
        {embers.map((ember) => (
          <div
            key={ember.id}
            className={kaitoStyles.ember}
            style={{
              left: ember.left,
              animationDelay: ember.delay,
              animationDuration: ember.duration,
              width: ember.size,
              height: ember.size,
              opacity: ember.opacity,
            }}
          />
        ))}
      </div>

      <Navbar />

      {/* Header */}
      <section className={`${styles.hoardHeader} ${kaitoStyles.heroSection}`}>
        <button 
          className={`${styles.backButton} ${kaitoStyles.navButton}`} 
          onClick={() => router.push("/marketplace")}
        >
          <FaArrowLeft /> Back to Bazaar
        </button>

        <div className={`${styles.hoardHeaderContent} ${kaitoStyles.mainContent}`}>
          <h1 className={`${styles.hoardTitle} ${kaitoStyles.heroTitle}`}>
            <FaTrophy /> My Hoard
          </h1>
          <p className={`${styles.hoardSubtitle} ${kaitoStyles.heroSubtitle}`}>
            私の宝物 — My Treasured Collection
          </p>
          {userRank && (
            <div style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              background: isTop50 ? 'rgba(255, 215, 0, 0.1)' : 'rgba(255, 255, 255, 0.05)',
              border: isTop50 ? '1px solid rgba(255, 215, 0, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              display: 'inline-block',
            }}>
              <span style={{
                fontSize: '0.9rem',
                color: isTop50 ? '#ffd700' : '#9ca3af',
                fontWeight: isTop50 ? 600 : 400,
              }}>
                {isTop50 ? `🏆 Top 50 Leaderboard (Rank #${userRank}) - Can List on Bazaar` : `Leaderboard Rank #${userRank} - Need Top 50 to List on Bazaar`}
              </span>
            </div>
          )}
          <button 
            className={`${styles.uploadButton} ${kaitoStyles.navButtonPrimary}`} 
            onClick={() => setShowUploadModal(true)}
            style={{ marginTop: '1rem' }}
          >
            <FaUpload /> Upload Completed Book
          </button>
        </div>
      </section>

      {/* Main Content */}
      <section className={`${styles.hoardContent} ${kaitoStyles.mainContent}`}>
        {loading ? (
          <div className={kaitoStyles.loadingState}>
            <div className={kaitoStyles.loadingSpinner}></div>
            <p className={kaitoStyles.loadingText}>Loading your hoard...</p>
          </div>
        ) : error ? (
          <div className={kaitoStyles.errorState}>
            <FaBook className={kaitoStyles.errorIcon} />
            <p className={kaitoStyles.errorText}>Error: {error}</p>
            <button 
              className={kaitoStyles.navButton}
              onClick={fetchHoard}
            >
              Try Again
            </button>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className={`${styles.hoardEmptyState} ${kaitoStyles.emptyState}`}>
            <FaBook className={`${styles.hoardEmptyIcon} ${kaitoStyles.emptyIcon}`} />
            <h2 className={kaitoStyles.emptyTitle}>
              {searchQuery ? "No matching books found" : "Your Hoard is Empty"}
            </h2>
            <p className={kaitoStyles.emptyMessage}>
              {searchQuery 
                ? "Try a different search term" 
                : "Begin your collection by uploading completed digital stories"}
            </p>
            {!searchQuery && (
              <button 
                className={`${styles.hoardEmptyButton} ${kaitoStyles.emptyButton}`} 
                onClick={() => setShowUploadModal(true)}
              >
                <FaPlus /> Add Your First Book
              </button>
            )}
          </div>
        ) : (
          <div className={`${styles.hoardGrid} ${kaitoStyles.hoardGrid}`}>
            {filteredBooks.map((item) => {
              const content = item.content_type === "novel" ? item.novels : item.manga;
              const imageUrl = item.content_type === "novel" 
                ? content?.image 
                : content?.cover_image;

              return (
                <div key={item.id} className={`${styles.hoardCard} ${kaitoStyles.hoardCard}`}>
                  <div className={kaitoStyles.hoardCardCornerTL}></div>
                  <div className={kaitoStyles.hoardCardCornerTR}></div>
                  <div className={kaitoStyles.hoardCardCornerBL}></div>
                  <div className={kaitoStyles.hoardCardCornerBR}></div>

                  <div className={`${styles.hoardCardCover} ${kaitoStyles.hoardCardCover}`}>
                    <img 
                      src={imageUrl || "/placeholder.jpg"} 
                      alt={content?.title} 
                      className={`${styles.hoardCoverImage} ${kaitoStyles.hoardCoverImage}`}
                    />
                    <div className={`${styles.hoardCardOverlay} ${kaitoStyles.hoardCardOverlay}`}>
                      <button 
                        className={`${styles.listForSaleButton} ${kaitoStyles.actionButtonPrimary}`}
                        onClick={() => {
                          setSelectedListingItem(item);
                          setShowListModal(true);
                        }}
                      >
                        <FaTag /> List for Sale
                      </button>
                    </div>
                  </div>
                  <div className={`${styles.hoardCardInfo} ${kaitoStyles.hoardCardInfo}`}>
                    <h3>{content?.title}</h3>
                    <p className={`${styles.hoardCardAuthor} ${kaitoStyles.hoardCardAuthor}`}>
                      {item.content_type === "novel" ? "Novel" : `Manga by ${content?.author || "Unknown"}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className={`${styles.uploadModalOverlay} ${kaitoStyles.modalOverlay}`} onClick={() => setShowUploadModal(false)}>
          <div className={`${styles.uploadModal} ${kaitoStyles.modalContent}`} onClick={(e) => e.stopPropagation()}>
            <div className={kaitoStyles.modalHeader}>
              <h2 className={kaitoStyles.modalTitle}>Add Completed Book to Hoard</h2>
              <button className={kaitoStyles.modalClose} onClick={() => setShowUploadModal(false)}>
                <FaTimes />
              </button>
            </div>

            <div className={kaitoStyles.modalBody}>
              {loadingNovels ? (
                <div className={kaitoStyles.loadingState}>
                  <div className={kaitoStyles.loadingSpinner}></div>
                  <p className={kaitoStyles.loadingText}>Loading available content...</p>
                </div>
              ) : (
                <>
                  <div className={kaitoStyles.formGroup}>
                    <label className={kaitoStyles.formLabel}>Content Type:</label>
                    <div className={kaitoStyles.contentTypeToggle}>
                      <button
                        type="button"
                        className={`${kaitoStyles.toggleButton} ${contentType === "manga" ? kaitoStyles.toggleButtonActive : ""}`}
                        onClick={() => { setContentType("manga"); setSelectedUploadItem(null); }}
                      >
                        Manga
                      </button>
                      <button
                        type="button"
                        className={`${kaitoStyles.toggleButton} ${contentType === "novel" ? kaitoStyles.toggleButtonActive : ""}`}
                        onClick={() => { setContentType("novel"); setSelectedUploadItem(null); }}
                      >
                        Novel
                      </button>
                    </div>
                  </div>

                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ display: "block", marginBottom: "10px" }}>
                      Select {contentType === "novel" ? "a novel" : "manga"}:
                    </label>
                    <select 
                      value={selectedUploadItem?.id || ""}
                      onChange={(e) => {
                        const items = contentType === "novel" ? availableNovels : availableManga;
                        const item = items.find(n => n.id === e.target.value);
                        setSelectedUploadItem(item || null);
                      }}
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ddd" }}
                    >
                      <option value="">-- Choose {contentType === "novel" ? "a novel" : "manga"} --</option>
                      {(contentType === "novel" ? availableNovels : availableManga).map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedUploadItem && (
                    <div style={{ marginBottom: "20px", padding: "15px", background: "#f5f5f5", borderRadius: "8px" }}>
                      <img 
                        src={contentType === "novel" ? selectedUploadItem.image : selectedUploadItem.cover_image || "/placeholder.jpg"} 
                        alt={selectedUploadItem.title}
                        style={{ width: "100px", height: "150px", objectFit: "cover", borderRadius: "4px" }}
                      />
                      <h3 style={{ marginTop: "10px" }}>{selectedUploadItem.title}</h3>
                      <p style={{ fontSize: "14px", color: "#666" }}>{selectedUploadItem.summary?.substring(0, 100)}...</p>
                    </div>
                  )}

                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ display: "block", marginBottom: "10px" }}>Notes (optional):</label>
                    <textarea 
                      value={uploadNotes}
                      onChange={(e) => setUploadNotes(e.target.value)}
                      rows={3}
                      placeholder="Add any notes about this book..."
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ddd" }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: "10px" }}>
                    <button 
                      onClick={handleAddToHoard}
                      disabled={!selectedUploadItem}
                      style={{
                        flex: 1,
                        padding: "12px",
                        background: selectedUploadItem ? "#4CAF50" : "#ccc",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: selectedUploadItem ? "pointer" : "not-allowed"
                      }}
                    >
                      Add to Hoard
                    </button>
                    <button 
                      onClick={() => { setShowUploadModal(false); resetUploadForm(); }}
                      style={{
                        padding: "12px 24px",
                        background: "#f44336",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer"
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* List for Sale Modal */}
      {showListModal && selectedListingItem && (
        <div className={`${styles.listForSaleModalOverlay} ${kaitoStyles.modalOverlay}`} onClick={() => setShowListModal(false)}>
          <div className={`${styles.listForSaleModal} ${kaitoStyles.modalContent}`} onClick={(e) => e.stopPropagation()}>
            <div className={kaitoStyles.modalHeader}>
              <h2 className={kaitoStyles.modalTitle}>List Item for Sale</h2>
              <button className={kaitoStyles.modalClose} onClick={() => setShowListModal(false)}>
                <FaTimes />
              </button>
            </div>

            <div className={kaitoStyles.modalBody}>
              <div className={styles.bookPreview}>
                {(() => {
                  const content = selectedListingItem.content_type === "novel" 
                    ? selectedListingItem.novels 
                    : selectedListingItem.manga;
                  const imageUrl = selectedListingItem.content_type === "novel" 
                    ? content?.image 
                    : content?.cover_image;

                  return (
                    <>
                      <img src={imageUrl || "/placeholder.jpg"} alt="" />
                      <h3>{content?.title}</h3>
                      <p style={{ fontSize: "12px", color: "#666" }}>
                        {selectedListingItem.content_type === "novel" ? "Novel" : "Manga"}
                      </p>
                    </>
                  );
                })()}
              </div>

              <div className={kaitoStyles.formGroup}>
                <label className={kaitoStyles.formLabel}>Price</label>
                <div style={{ display: "flex", gap: "10px" }}>
                  <select 
                    className={kaitoStyles.formSelect}
                    value={listingCurrency} 
                    onChange={(e) => setListingCurrency(e.target.value)}
                  >
                    <option value="SMP">SMP</option>
                    <option value="USD">USD</option>
                  </select>
                  <input 
                    className={kaitoStyles.formInput}
                    type="number" 
                    placeholder="0.00" 
                    value={listingPrice}
                    onChange={(e) => setListingPrice(e.target.value)}
                  />
                </div>
              </div>

              <div className={kaitoStyles.formGroup}>
                <label className={kaitoStyles.formLabel}>Description</label>
                <textarea 
                  className={kaitoStyles.formTextarea}
                  value={listingDescription}
                  onChange={(e) => setListingDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe your item..."
                />
              </div>
            </div>

            <div className={kaitoStyles.modalFooter}>
              <button 
                className={kaitoStyles.navButton}
                onClick={() => setShowListModal(false)}
              >
                Cancel
              </button>
              <button 
                className={kaitoStyles.navButtonPrimary}
                onClick={handleListForSale}
              >
                List on Bazaar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}