"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../../../services/firebase/firebase"; // Adjust the relative path
import DOMPurify from "dompurify";
import Head from "next/head";

const createDOMPurify = typeof window !== "undefined" ? DOMPurify : null;

export default function ChapterPage() {
  const { id, chapter } = useParams();
  const [novel, setNovel] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNovel = async () => {
      try {
        const novelRef = doc(db, "novels", id);
        const novelSnapshot = await getDoc(novelRef);

        if (novelSnapshot.exists()) {
          setNovel(novelSnapshot.data());
        } else {
          console.error("Novel not found");
        }
      } catch (error) {
        console.error("Error fetching novel:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNovel();
  }, [id]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 bg-dark text-light">
        <div>
          <div className="spinner-grow text-warning" role="status"></div>
          <p className="mt-3 text-center">Loading...</p>
        </div>
      </div>
    );
  }

  const chapterData = novel?.chapters?.[chapter];

  if (!novel || !chapterData) {
    return (
      <div className="d-flex flex-column align-items-center vh-100 bg-dark text-light">
        <h2 className="text-warning">Chapter Not Found</h2>
        <Link href="/" className="btn btn-outline-warning mt-3">
          Back to Home
        </Link>
      </div>
    );
  }

  const sanitizedContent = createDOMPurify
    ? createDOMPurify.sanitize(chapterData.content)
    : chapterData.content;

  const prevChapter = parseInt(chapter) - 1;
  const nextChapter = parseInt(chapter) + 1;
  const prevChapterData = novel.chapters[prevChapter];
  const nextChapterData = novel.chapters[nextChapter];

  return (
    <div className="bg-dark text-light">
      <Head>
        <title>{`${chapterData.title} - Sempai HQ`}</title>
        <meta name="description" content={`Read ${chapterData.title} on Sempai HQ`} />
      </Head>

      {/* Navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm">
        <div className="container">
          <a className="navbar-brand fw-bold text-warning" href="/">
            Sempai HQ
          </a>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container my-4 px-3">
        <div className="p-4 bg-secondary rounded shadow-lg">
          <h1 className="text-warning text-center fs-4 fs-md-2">{chapterData.title}</h1>
          <div
            className="chapter-content mt-4 fs-6 fs-md-5"
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          ></div>
        </div>

        {/* Navigation Buttons */}
        <div className="d-flex justify-content-between align-items-center mt-4">
          {prevChapterData ? (
            <Link
              href={`/novel/${id}/chapter/${prevChapter}`}
              className="btn btn-outline-warning px-3 py-2"
            >
              Previous
            </Link>
          ) : (
            <div />
          )}

          <Link href={`/novel/${id}`} className="btn btn-warning px-3 py-2">
            Back to Novel
          </Link>

          {nextChapterData ? (
            <Link
              href={`/novel/${id}/chapter/${nextChapter}`}
              className="btn btn-outline-warning px-3 py-2"
            >
              Next
            </Link>
          ) : (
            <div />
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-dark text-center py-3 mt-5">
        <p className="mb-0 text-light fs-6">
          &copy; 2025 <span className="text-warning fw-bold">Sempai HQ</span>. All rights reserved.
        </p>
      </footer>

      {/* Additional Styling */}
      <style jsx>{`
        .chapter-content {
          line-height: 1.6;
          word-spacing: 0.05em;
          font-size: 0.9rem;
        }

        @media (min-width: 768px) {
          .chapter-content {
            font-size: 1.1rem;
          }
        }

        .navbar-brand {
          font-size: 1.2rem;
        }

        .btn-outline-warning:hover {
          background-color: rgba(243, 99, 22, 0.9);
          color: #fff;
        }

        .btn-warning {
          background-color: rgba(243, 99, 22, 1);
          border: none;
        }

        .btn-warning:hover {
          background-color: rgba(243, 99, 22, 0.9);
          color: #fff;
        }

        .spinner-grow {
          width: 2rem;
          height: 2rem;
        }

        @media (min-width: 768px) {
          .spinner-grow {
            width: 3rem;
            height: 3rem;
          }
        }
      `}</style>
    </div>
  );
}
