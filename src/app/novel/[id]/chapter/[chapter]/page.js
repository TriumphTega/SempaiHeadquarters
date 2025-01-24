"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { db } from "../../../../../services/firebase/firebase"; // Adjust the relative path
import DOMPurify from "dompurify";

// Ensure DOMPurify works in SSR by creating a sanitized instance
const createDOMPurify = (typeof window !== "undefined" ? DOMPurify : null);

export default function ChapterPage() {
  const { id, chapter } = useParams(); // Get the novel ID and chapter ID from the URL
  const [novel, setNovel] = useState(null); // State for novel data
  const [loading, setLoading] = useState(true); // Loading state

  useEffect(() => {
    const fetchNovel = async () => {
      try {
        const novelRef = doc(db, "novels", id); // Reference to the novel document in Firestore
        const novelSnapshot = await getDoc(novelRef);

        if (novelSnapshot.exists()) {
          setNovel(novelSnapshot.data()); // Set the novel data
        } else {
          console.error("Novel not found");
        }
      } catch (error) {
        console.error("Error fetching novel:", error);
      } finally {
        setLoading(false); // Stop loading
      }
    };

    fetchNovel();
  }, [id]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <h2 className="text-white">Loading...</h2>
      </div>
    );
  }

  const chapterData = novel?.chapters?.[chapter];

  if (!novel || !chapterData) {
    return <div>Chapter not found</div>;
  }

  // Sanitize content only on the client side
  const sanitizedContent = createDOMPurify
    ? createDOMPurify.sanitize(chapterData.content)
    : chapterData.content;

  // Find the next and previous chapters
  const prevChapter = parseInt(chapter) - 1;
  const nextChapter = parseInt(chapter) + 1;
  const prevChapterData = novel.chapters[prevChapter];
  const nextChapterData = novel.chapters[nextChapter];

  return (
    <div>
      <nav className="navbar navbar-dark bg-dark">
        <div className="container">
          <a className="navbar-brand" href="/">Sempai HQ</a>
        </div>
      </nav>

      <div className="container my-5">
        <h1 className="text-orange">{chapterData.title}</h1>
        <div
          className="chapter-content"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        ></div>

        {/* Buttons Row */}
        <div className="d-flex justify-content-between mt-3">
          {/* Previous Button */}
          {prevChapterData && (
            <Link href={`/novel/${id}/chapter/${prevChapter}`} className="btn btn-dark">
              Previous Chapter
            </Link>
          )}

          {/* Back to Novel Button */}
          <Link href={`/novel/${id}`} className="btn btn-dark">
            Back to Novel
          </Link>

          {/* Next Button */}
          {nextChapterData && (
            <Link href={`/novel/${id}/chapter/${nextChapter}`} className="btn btn-dark">
              Next Chapter
            </Link>
          )}
        </div>
      </div>

      <footer className="bg-dark text-white text-center py-4">
        <p>&copy; 2025 Sempai HQ. All rights reserved.</p>
      </footer>
    </div>
  );
}
