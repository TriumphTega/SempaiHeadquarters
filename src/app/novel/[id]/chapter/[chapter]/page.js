"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { novels } from "../../../../../novelsData";  // Adjust the relative path

export default function ChapterPage() {
  const { id, chapter } = useParams();
  const novel = novels[id];
  const chapterData = novel?.chapters?.[chapter];

  if (!novel || !chapterData) {
    return <div>Chapter not found</div>;
  }

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
        <p className="chapter-content">{chapterData.content}</p>

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
