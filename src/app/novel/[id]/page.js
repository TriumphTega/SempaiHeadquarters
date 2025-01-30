"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from '../../../services/supabase/supabaseClient';

export default function NovelPage() {
  const { id } = useParams(); // Get the novel ID from the URL
  const [novel, setNovel] = useState(null); // State to hold novel data
  const [loading, setLoading] = useState(true); // Loading state

  useEffect(() => {
    const fetchNovel = async () => {
      try {
        const { data, error } = await supabase
          .from("novels")
          .select("*")
          .eq("id", id)
          .single(); // Fetch the novel by ID

        if (error) {
          console.error("Error fetching novel:", error);
        } else {
          setNovel(data); // Set novel data
        }
      } catch (error) {
        console.error("Unexpected error:", error);
      } finally {
        setLoading(false); // Set loading to false
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
            src={novel.image} // Use the image from Supabase
            alt={novel.title}
            className="img-fluid rounded shadow-lg my-4"
            style={{ maxHeight: "500px", objectFit: "cover" }}
          />
          <p className="fs-5 text-white">
            Explore the exciting chapters of <strong>{novel.title}</strong> below:
          </p>
          
        </div>
        <div className="d-flex justify-content-center w-100 mb-4">
          <div className="w-100">
            <Link
              href={`/novel/${id}/summary`}
              className="text-decoration-none text-white"
            >
              <div className="col">
                <div className="card h-100 shadow border-0 rounded-3 hover-card">
                  <div className="card-body d-flex flex-column justify-content-between">
                    <h5 className="card-title text-uppercase fw-bold d-flex justify-content-center">
                      Summary
                    </h5>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>



        {/* Chapters */}
        <div className="row row-cols-1 row-cols-md-3 g-4">
          {Object.entries(novel.chaptertitles || {}).map(([chapterId, title]) => (
            <Link
              href={`/novel/${id}/chapter/${chapterId}`}
              className="text-decoration-none text-white"
              key={chapterId}
            >
              <div className="col">
                <div className="card h-100 shadow border-0 rounded-3 hover-card">
                  <div className="card-body d-flex flex-column justify-content-between">
                    <h5 className="card-title text-uppercase fw-bold">
                      {title}
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
