"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../../../services/supabase/supabaseClient";
import { useWallet } from '@solana/wallet-adapter-react';
import LoadingPage from '../../../components/LoadingPage';
import NovelCommentSection from '../../../components/Comments/NovelCommentSection';





export default function NovelPage() {
  const { id } = useParams(); // Get the novel ID from the URL
  const [novel, setNovel] = useState(null); // State to hold novel data
  const [loading, setLoading] = useState(true); // Loading state
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState(null); // Track which comment is being replied to
  const [showMoreReplies, setShowMoreReplies] = useState({}); // Object to track 'show more' state per comment
  const { connected, publicKey } = useWallet(); // Get wallet publicKey
  


  

  // Fetch novel data on mount
  useEffect(() => {
    const fetchNovel = async () => {
      try {
        const { data, error } = await supabase
          .from("novels")
          .select("*")
          .eq("id", id)
          .single();

        if (error) {
          console.error("Error fetching novel:", error);
        } else {
          setNovel(data);
        }
      } catch (error) {
        console.error("Unexpected error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNovel();
  }, [id]);

  
  
   

 
  
  
  

if (loading) {
  return <LoadingPage />;
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
        <div className="text-center">
          <h1 className="text-white display-4 fw-bold">{novel.title}</h1>
          <img
            src={novel.image}
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
            <Link href={`/novel/${id}/summary`} className="text-decoration-none text-white">
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
                    <h5 className="card-title text-uppercase fw-bold">{title}</h5>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <NovelCommentSection novelId={id} />
      </div>

      {/* Footer */}
      <footer className="bg-dark text-white text-center py-4 mt-5">
        <p className="mb-0">&copy; 2025 Sempai HQ. All rights reserved.</p>
      </footer>
    </div>
  );
}
