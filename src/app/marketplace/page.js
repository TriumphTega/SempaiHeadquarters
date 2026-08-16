"use client";

import { useState, useEffect } from "react";
import { 
  FaSearch, 
  FaUser, 
  FaShoppingCart, 
  FaGoogle,
  FaFilter,
  FaGem,
  FaTimes
} from "react-icons/fa";
import styles from "./Marketplace.module.css";
import kaitoStyles from "../../styles/MarketplaceKaito.module.css";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";

export default function MarketplacePage() {
  const router = useRouter();
  const { user, signInWithGoogle } = useAuth();

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [embers, setEmbers] = useState([]);

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

        <Navbar />

        {/* Landing Content */}
        <div className={`${styles.landingPage} ${kaitoStyles.heroSection}`}>
          <div className={`${styles.landingContent} ${kaitoStyles.mainContent}`}>
            <FaShoppingCart className={`${styles.landingIcon} ${kaitoStyles.emptyIcon}`} />
            <h1 className={`${styles.landingTitle} ${kaitoStyles.heroTitle}`}>Sempai Bazaar</h1>
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

      <Navbar />

      {/* Header */}
      <section className={`${styles.marketplaceHeader} ${kaitoStyles.heroSection}`}>
        <div className={`${styles.hoardHeaderContent} ${kaitoStyles.mainContent}`}>
          <h1 className={`${styles.hoardTitle} ${kaitoStyles.heroTitle}`}>
            <FaShoppingCart /> Bazaar
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
            <h2 className={kaitoStyles.emptyTitle}>{searchQuery ? "No items found" : "Bazaar is Empty"}</h2>
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