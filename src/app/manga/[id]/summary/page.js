"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import { supabase } from "../../../../services/supabase/supabaseClient";
import LoadingPage from "../../../../components/LoadingPage";
import styles from "../../../../styles/MangaSummary.module.css";

export default function MangaSummary({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const { id } = params;
  const [manga, setManga] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    const { data } = await supabase
      .from("manga")
      .select("title, summary")
      .eq("id", id)
      .single();
    setManga(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSummary();
  }, [id]);

  if (loading) return <LoadingPage />;
  if (!manga) return <div className={styles.cosmicContainer}>Manga not found.</div>;

  return (
    <div className={styles.cosmicContainer}>
      <header className={styles.summaryHeader}>
        <h1 className={styles.summaryTitle}>{manga.title} - Summary</h1>
        <p className={styles.summaryText}>{manga.summary}</p>
      </header>
    </div>
  );
}