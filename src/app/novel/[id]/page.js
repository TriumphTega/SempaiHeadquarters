"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { novels } from "../../../novelsData"; // Import the novels data from the novelsData.js file

export default function NovelPage() {
  const { id } = useParams();
  const novel = novels[id];

  if (!novel) {
    return <div>Novel not found</div>;
  }

  return (
    <div>
      <nav className="navbar navbar-dark bg-dark">
        <div className="container">
          <Link href="/" className="navbar-brand">
            Sempai HQ
          </Link>
        </div>
      </nav>

      <div className="container my-5">
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
