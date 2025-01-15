"use client";

<<<<<<< HEAD
import { useParams } from "next/navigation";
import Link from "next/link";
import { novels } from "../../../novelsData"; // Import the novels data from the novelsData.js file

export default function NovelPage() {
  const { id } = useParams();
  const novel = novels[id];

  if (!novel) {
    return <div>Novel not found</div>;
  }
=======
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function NovelPage() {
  const { id } = useParams();

  // Mock chapter data (replace this with API data or dynamic content)
  const chapters = [
    { chapter: 1, title: "Chapter 1: The Beginning" },
    { chapter: 2, title: "Chapter 2: The Journey" },
    { chapter: 3, title: "Chapter 3: The Conflict" },
  ];
>>>>>>> origin/master

  return (
    <div>
      <nav className="navbar navbar-dark bg-dark">
        <div className="container">
<<<<<<< HEAD
          <Link href="/" className="navbar-brand">
            Sempai HQ
          </Link>
=======
          <Link href="/" className="navbar-brand">Sempai HQ</Link>
>>>>>>> origin/master
        </div>
      </nav>

      <div className="container my-5">
<<<<<<< HEAD
        <h1 className="text-orange">{novel.title}</h1>
        <img
          src={novel.image}
          alt={novel.title}
          className="img-fluid rounded mb-4"
        />
        <p>Below are the available chapters for this novel:</p>

        <div className="row row-cols-1 row-cols-md-3 g-4">
          {Object.entries(novel.chapters).map(([chapterId, chapter]) => (
            <div key={chapterId} className="col">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <h5 className="card-title text-orange text-uppercase fw-bold">
                    <Link
                      href={`/novel/${id}/chapter/${chapterId}`}
                      className="text-decoration-none"
                    >
=======
        <h1 className="text-orange">Novel {id}</h1>
        <p>Below are the available chapters for this novel:</p>

        {/* Novel Image */}
        <div className="mb-4">
          <img
            src={`/images/novel-${id}.jpg`}  // Replace with the correct image path for the novel
            alt={`Novel ${id}`}
            className="img-fluid rounded"
          />
        </div>

        {/* Card Section for Chapters */}
        <div className="row row-cols-1 row-cols-md-3 g-4">
          {chapters.map((chapter) => (
            <div key={chapter.chapter} className="col">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  {/* Card Title */}
                  <h5 className="card-title text-orange text-uppercase fw-bold">
                    <Link href={`/novel/${id}/chapter/${chapter.chapter}`} className="text-decoration-none">
>>>>>>> origin/master
                      {chapter.title}
                    </Link>
                  </h5>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer className="bg-dark text-white text-center py-4">
        <p>&copy; 2025 Sempai HQ. All rights reserved.</p>
      </footer>
    </div>
  );
}
