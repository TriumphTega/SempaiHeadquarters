"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../services/supabase/supabaseClient";
import Link from "next/link";
import { FaBookOpen, FaSearch } from "react-icons/fa";
import LoadingPage from "../../components/LoadingPage";
import Navbar from "../../components/Navbar";
import styles from "../../styles/SummaryPage.module.css";

export default function SummaryPage() {
  const router = useRouter();
  const [novels, setNovels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch all novels with summaries
  useEffect(() => {
    const fetchNovels = async () => {
      try {
        const { data, error } = await supabase
          .from("novels")
          .select("id, title, summary, created_at")
          .not("summary", "is", "null")
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        setNovels(data || []);
      } catch (error) {
        console.error("Error fetching novels:", error);
        setError("Failed to load summaries.");
      } finally {
        setLoading(false);
      }
    };

    fetchNovels();
  }, []);

  // Filter novels based on search term
  const filteredNovels = novels.filter(novel => 
    novel.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <LoadingPage />;

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <h2 className={styles.errorText}>Error Loading Summaries</h2>
        <p className={styles.errorMessage}>{error}</p>
        <Link href="/" className={styles.backHomeButton}>
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Navbar />

      {/* Search Bar */}
      <div className={styles.searchSection}>
        <div className={styles.searchContainer}>
          <FaSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search novels..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      {/* Novels Grid */}
      <main className={styles.main}>
        {filteredNovels.length === 0 ? (
          <div className={styles.noResults}>
            <FaBookOpen className={styles.noResultsIcon} />
            <h3>No novels found</h3>
            <p>Try adjusting your search terms.</p>
          </div>
        ) : (
          <div className={styles.novelsGrid}>
            {filteredNovels.map((novel) => (
              <Link 
                key={novel.id} 
                href={`/novel/${novel.id}/summary`} 
                className={styles.novelCard}
              >
                <div className={styles.cardContent}>
                  <h3 className={styles.novelTitle}>{novel.title}</h3>
                  <p className={styles.summaryPreview}>
                    {novel.summary 
                      ? `${novel.summary.substring(0, 150)}${novel.summary.length > 150 ? '...' : ''}`
                      : 'No summary available'
                    }
                  </p>
                  <div className={styles.readMore}>
                    <span>Read Full Summary</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>© 2025 Sempai HQ. All rights reserved.</p>
      </footer>
    </div>
  );
}
