"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "../../../../services/supabase/supabaseClient";
import DOMPurify from "dompurify";
import Head from "next/head";
import Link from "next/link";
import { FaHome, FaBookOpen, FaVolumeUp, FaPause, FaPlay, FaStop } from "react-icons/fa";
import LoadingPage from "../../../../components/LoadingPage";
import NovelCommentSection from "../../../../components/Comments/NovelCommentSection";
import Navbar from "../../../../components/Navbar";
import styles from "../../../../styles/NovelSummaryPage.module.css";

const createDOMPurify = typeof window !== "undefined" ? DOMPurify : null;

export default function NovelSummaryPage() {
  const { id } = useParams();
  const router = useRouter();
  const [novel, setNovel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch novel data (no authentication required)
  const fetchNovel = async () => {
    try {
      const { data, error } = await supabase
        .from("novels")
        .select("title, summary")
        .eq("id", id)
        .single();
      if (error) throw error;
      setNovel(data);
    } catch (error) {
      console.error("Error fetching novel:", error);
      setError("Failed to load summary.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch novel data on component mount
  useEffect(() => {
    fetchNovel();
  }, [id, fetchNovel]);

  // Text-to-speech controls
  const readText = (text) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    } else {
      setError("Your browser does not support text-to-speech.");
    }
  };

  const pauseText = () => window.speechSynthesis.pause();
  const resumeText = () => window.speechSynthesis.resume();
  const stopText = () => window.speechSynthesis.cancel();

  if (loading) return <LoadingPage />;

  if (error || !novel) {
    return (
      <div className={styles.errorContainer}>
        <h2 className={styles.errorText}>Summary Not Found</h2>
        <Link href="/" onClick={() => router.push("/")} className={styles.backHomeButton}>
          <FaHome /> Back to Home
        </Link>
      </div>
    );
  }

  const sanitizedContent = createDOMPurify ? createDOMPurify.sanitize(novel.summary) : novel.summary;

  return (
    <div className={styles.page}>
      <Head>
        <title>{`${novel.title} - Summary`}</title>
      </Head>

      <Navbar />

      {/* Main Content */}
      <div className={styles.summaryContainer}>
        <div className={styles.headerSection}>
          <h1 className={styles.summaryTitle}>{novel.title} - Summary</h1>
          <div className={styles.audioControls}>
            <button onClick={() => readText(novel.summary)} className={styles.audioButton}>
              <FaVolumeUp /> Read Aloud
            </button>
            <button onClick={pauseText} className={styles.audioButton}>
              <FaPause /> Pause
            </button>
            <button onClick={resumeText} className={styles.audioButton}>
              <FaPlay /> Resume
            </button>
            <button onClick={stopText} className={styles.audioButton}>
              <FaStop /> Stop
            </button>
          </div>
                    {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}
        </div>

        <div className={styles.summaryContent}>
          <div dangerouslySetInnerHTML={{ __html: sanitizedContent }} className={styles.contentText}></div>
        </div>

        <div className={styles.navigation}>
          <Link href={`/novel/${id}`} onClick={() => router.push(`/novel/${id}`)} className={styles.navButton}>
            <FaBookOpen /> Back to Novel
          </Link>
        </div>

        <NovelCommentSection novelId={id} />
      </div>

      <footer className={styles.footer}>
        <p className={styles.footerText}>© 2025 Sempai HQ. All rights reserved.</p>
      </footer>
    </div>
  );
}