"use client";

import { useState, useEffect } from "react";
import { 
  FaSearch, 
  FaUser, 
  FaShoppingCart, 
  FaGoogle,
  FaFilter,
  FaGem,
  FaBars, FaTimes
} from "react-icons/fa";
import styles from "./Marketplace.module.css";
import kaitoStyles from "../../styles/MarketplaceKaito.module.css";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function MarketplacePage() {
  const router = useRouter();
  const { user, signInWithGoogle } = useAuth();

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [embers, setEmbers] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Handle window resize for mobile responsiveness
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // Fetch marketplace listings
  const fetchListings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch("/api/marketplace/listings", {
        method: "GET",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `HTTP Error ${res.status}`);
      }

      setListings(data.listings || []);
    } catch (err) {
      console.error("fetchListings error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  // Filter listings based on search query
  const filteredListings = listings.filter((listing) => {
    const hoardItem = listing.hoard_items;
    const content = hoardItem?.content_type === 'novel' ? hoardItem.novels : hoardItem.manga;
    const query = searchQuery.toLowerCase();
    return (
      content?.title?.toLowerCase().includes(query) ||
      content?.summary?.toLowerCase().includes(query) ||
      listing.description?.toLowerCase().includes(query) ||
      (hoardItem?.content_type === 'manga' && content?.author?.toLowerCase().includes(query))
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

        {/* Navbar */}
        <nav style={{
          position: "sticky",
          top: 0,
          background: "linear-gradient(180deg, #0c0c0c 0%, #141210 100%)",
          borderBottom: "1px solid #2d2418",
          boxShadow: "0 4px 24px rgba(0,0,0,0.5), 0 0 40px rgba(204,85,0,0.04)",
          padding: "0",
          zIndex: 1000,
        }}>
          <div style={{ maxWidth: "960px", margin: "0 auto", padding: "0 16px", position: "relative" }}>
            {/* Top amber accent line */}
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "2px",
              background: "linear-gradient(90deg, transparent, #cc5500, #c9a84c, #cc5500, transparent)",
              opacity: 0.5,
            }} />

            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 0",
            }}>
              {/* Brand */}
              <div 
                onClick={() => router.push("/")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  color: "#f5e6d3",
                  fontWeight: 700,
                  fontSize: "1rem",
                  letterSpacing: "2px",
                  fontFamily: "'Noto Serif JP', Georgia, serif",
                  textDecoration: "none",
                  cursor: "pointer",
                }}
              >
                <img 
                  src="/images/logo.jpeg" 
                  alt="Sempai HQ" 
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    filter: "drop-shadow(0 0 8px rgba(204,85,0,0.4))",
                  }}
                />
                <span>Sempai HQ</span>
              </div>

              {/* Sign In Button */}
              <button
                onClick={signInWithGoogle}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "#ff6b35",
                  fontSize: "0.85rem",
                  letterSpacing: "1px",
                  padding: "6px 12px",
                  borderRadius: "2px",
                  border: "1px solid rgba(204,85,0,0.3)",
                  background: "rgba(204,85,0,0.08)",
                  transition: "all 0.2s",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <FaGoogle size={14} />
                Sign In
              </button>
            </div>
          </div>
        </nav>

        {/* Landing Content */}
        <div className={`${styles.landingPage} ${kaitoStyles.heroSection}`}>
          <div className={`${styles.landingContent} ${kaitoStyles.mainContent}`}>
            <FaShoppingCart className={`${styles.landingIcon} ${kaitoStyles.emptyIcon}`} />
            <h1 className={`${styles.landingTitle} ${kaitoStyles.heroTitle}`}>Sempai Marketplace</h1>
            <p className={`${styles.landingSubtitle} ${kaitoStyles.heroSubtitle}`}>
              Sign in with Google to browse and purchase digital treasures
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

      {/* Navbar */}
      <nav style={{
        position: "sticky",
        top: 0,
        background: "linear-gradient(180deg, #0c0c0c 0%, #141210 100%)",
        borderBottom: "1px solid #2d2418",
        boxShadow: "0 4px 24px rgba(0,0,0,0.5), 0 0 40px rgba(204,85,0,0.04)",
        padding: "0",
        zIndex: 1000,
      }}>
        <div style={{ maxWidth: "960px", margin: "0 auto", padding: "0 16px", position: "relative" }}>
          {/* Top amber accent line */}
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "2px",
            background: "linear-gradient(90deg, transparent, #cc5500, #c9a84c, #cc5500, transparent)",
            opacity: 0.5,
          }} />

          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 0",
          }}>
            {/* Brand */}
            <div 
              onClick={() => router.push("/")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                color: "#f5e6d3",
                fontWeight: 700,
                fontSize: "1rem",
                letterSpacing: "2px",
                fontFamily: "'Noto Serif JP', Georgia, serif",
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              <img 
                src="/images/logo.jpeg" 
                alt="Sempai HQ" 
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  filter: "drop-shadow(0 0 8px rgba(204,85,0,0.4))",
                }}
              />
              <span>Sempai HQ</span>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                display: isMobile ? "block" : "none",
                background: "transparent",
                border: "none",
                color: "#a09080",
                padding: "8px",
                cursor: "pointer",
              }}
            >
              {menuOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
            </button>

            {/* Nav Links */}
            <div style={{ 
              display: isMobile ? (menuOpen ? "flex" : "none") : "flex",
              flexDirection: isMobile ? "column" : "row",
              gap: "8px", 
              alignItems: "center",
              position: isMobile ? "absolute" : "static",
              top: isMobile ? "100%" : "auto",
              left: isMobile ? "0" : "auto",
              right: isMobile ? "0" : "auto",
              background: isMobile ? "linear-gradient(180deg, #0c0c0c 0%, #141210 100%)" : "transparent",
              padding: isMobile ? "16px" : "0",
              borderBottom: isMobile ? "1px solid #2d2418" : "none",
            }}>
              <button
                onClick={() => router.push("/marketplace")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "#ff6b35",
                  fontSize: "0.85rem",
                  letterSpacing: "1px",
                  padding: "6px 12px",
                  borderRadius: "2px",
                  border: "1px solid rgba(204,85,0,0.3)",
                  background: "rgba(204,85,0,0.08)",
                  transition: "all 0.2s",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  width: isMobile ? "100%" : "auto",
                  justifyContent: isMobile ? "center" : "flex-start",
                }}
              >
                <FaSearch size={14} />
                Marketplace
              </button>
              <button
                onClick={() => router.push("/marketplace/hoard")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "#a09080",
                  fontSize: "0.85rem",
                  letterSpacing: "1px",
                  padding: "6px 12px",
                  borderRadius: "2px",
                  border: "1px solid transparent",
                  background: "transparent",
                  transition: "all 0.2s",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  width: isMobile ? "100%" : "auto",
                  justifyContent: isMobile ? "center" : "flex-start",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#f5e6d3";
                  e.currentTarget.style.borderColor = "rgba(204,85,0,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#a09080";
                  e.currentTarget.style.borderColor = "transparent";
                }}
              >
                <FaShoppingCart size={14} />
                Hoard
              </button>
              <button
                onClick={() => router.push(`/profile/${user.id}`)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "#a09080",
                  fontSize: "0.85rem",
                  letterSpacing: "1px",
                  padding: "6px 12px",
                  borderRadius: "2px",
                  border: "1px solid transparent",
                  background: "transparent",
                  transition: "all 0.2s",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  width: isMobile ? "100%" : "auto",
                  justifyContent: isMobile ? "center" : "flex-start",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#f5e6d3";
                  e.currentTarget.style.borderColor = "rgba(204,85,0,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#a09080";
                  e.currentTarget.style.borderColor = "transparent";
                }}
              >
                <FaUser size={14} />
                Profile
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className={`${styles.hoardHeader} ${kaitoStyles.heroSection}`}>
        <div className={`${styles.hoardHeaderContent} ${kaitoStyles.mainContent}`}>
          <h1 className={`${styles.hoardTitle} ${kaitoStyles.heroTitle}`}>
            <FaShoppingCart /> Marketplace
          </h1>
          <p className={`${styles.hoardSubtitle} ${kaitoStyles.heroSubtitle}`}>
            Discover and collect digital treasures from the community
          </p>
        </div>
      </section>

      {/* Content */}
      <section className={`${styles.hoardContent} ${kaitoStyles.mainContent}`}>
        {loading ? (
          <div className={kaitoStyles.loadingState}>
            <div className={kaitoStyles.loadingSpinner}></div>
            <p className={kaitoStyles.loadingText}>Loading marketplace...</p>
          </div>
        ) : error ? (
          <div className={kaitoStyles.errorState}>
            <FaShoppingCart className={kaitoStyles.errorIcon} />
            <p className={kaitoStyles.errorText}>Error: {error}</p>
            <button 
              className={kaitoStyles.navButton}
              onClick={fetchListings}
              style={{ marginTop: "1rem" }}
            >
              Try Again
            </button>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className={`${styles.hoardEmptyState} ${kaitoStyles.emptyState}`}>
            <FaShoppingCart className={`${styles.hoardEmptyIcon} ${kaitoStyles.emptyIcon}`} />
            <h2 className={kaitoStyles.emptyTitle}>{searchQuery ? "No items found" : "Marketplace is Empty"}</h2>
            <p className={kaitoStyles.emptyMessage}>{searchQuery ? "Try a different search term" : "Be the first to list an item for sale"}</p>
            {!searchQuery && (
              <button 
                className={`${styles.hoardEmptyButton} ${kaitoStyles.emptyButton}`}
                onClick={() => router.push("/marketplace/hoard")}
              >
                Visit Your Hoard
              </button>
            )}
          </div>
        ) : (
          <div className={`${styles.hoardGrid} ${kaitoStyles.hoardGrid}`}>
            {filteredListings.map((listing) => {
              const hoardItem = listing.hoard_items;
              const content = hoardItem?.content_type === 'novel' ? hoardItem.novels : hoardItem.manga;
              const imageUrl = hoardItem?.content_type === 'novel' ? content?.image : content?.cover_image;
              return (
                <div key={listing.id} className={`${styles.hoardCard} ${kaitoStyles.hoardCard}`}>
                  {/* Corner ornaments */}
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
                      <div className={`${styles.priceTag} ${kaitoStyles.priceTag}`}>
                        {listing.price} {listing.currency}
                      </div>
                    </div>
                  </div>
                  <div className={`${styles.hoardCardInfo} ${kaitoStyles.hoardCardInfo}`}>
                    <h3>{content?.title || "Untitled"}</h3>
                    <p className={`${styles.hoardCardAuthor} ${kaitoStyles.hoardCardAuthor}`}>
                      {hoardItem?.content_type === 'novel' ? 'Novel' : `Manga by ${content?.author || 'Unknown'}`}
                    </p>
                    {listing.description && (
                      <p style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
                        {listing.description.substring(0, 80)}...
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}