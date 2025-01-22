"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { novels } from "../../../novelsData"; // Import the novels data from the novelsData.js file

export default function NovelPage() {
  const { id } = useParams();
  const novel = novels[id];

  if (!novel) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <h2 className="text-danger">Novel not found</h2>
      </div>
    );
  }

  return (
    <div className="bg-black">
      {/* Navbar */}
      <nav className="navbar navbar-dark bg-dark shadow">
        <div className="container">
          <Link href="/" className="navbar-brand fw-bold">
            Sempai HQ
          </Link>
        </div>
      </nav>

      {/* Novel Content */}
      <div className="container my-5">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-white display-4 fw-bold">{novel.title}</h1>
          <img
            src={novel.image}
            alt={novel.title}
            className="img-fluid rounded shadow-lg my-4"
            style={{ maxHeight: "500px", objectFit: "cover" }}
          />
          <p className=" fs-5 text-white">
            Explore the exciting chapters of <strong>{novel.title}</strong> below:
          </p>
        </div>

        {/* Chapters */}
        <div className="row row-cols-1 row-cols-md-3 g-4">

          {Object.entries(novel.chapters).map(([chapterId, chapter]) => (
            <Link
            href={`/novel/${id}/chapter/${chapterId}`}
            className="text-decoration-none text-white"
          >
            <div key={chapterId} className="col">
              <div className="card h-100 shadow border-0 rounded-3 hover-card">
                <div className="card-body d-flex flex-column justify-content-between">
                  <h5 className="card-title  text-uppercase fw-bold">
                    
                      {chapter.title}
                   
                  </h5>
                  
                </div>
              </div>
            </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-dark text-white text-center py-4 mt-5">
        <p className="mb-0">&copy; 2025 Sempai HQ. All rights reserved.</p>
      </footer>
    </div>
  );
}
