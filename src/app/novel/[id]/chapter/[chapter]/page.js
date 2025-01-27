'use client';

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../../../../services/firebase/firebase"; // Adjust the relative path
import DOMPurify from "dompurify";
import { useWallet } from '@solana/wallet-adapter-react';
import Head from "next/head";

const createDOMPurify = typeof window !== "undefined" ? DOMPurify : null;

export default function ChapterPage() {
  const { id, chapter } = useParams();
  const [novel, setNovel] = useState(null);
  const [loading, setLoading] = useState(true);
  const { publicKey } = useWallet();  // Solana wallet public key
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(""); // State for success notification

  const readText = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1; // Adjust the speaking rate
      utterance.pitch = 1; // Adjust the pitch
      utterance.lang = 'en-US'; // Set the language
  
      window.speechSynthesis.speak(utterance);
    } else {
      alert('Your browser does not support text-to-speech.');
    }
  };
  


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

  useEffect(() => {
    const updateTokenBalance = async () => {
      if (!publicKey) return; // Exit if no wallet is connected
  
      try {
        const readerRef = doc(db, "readers", publicKey.toString());
  
        // Get the current reader data (if any)
        const readerSnapshot = await getDoc(readerRef);
        const currentBalance = readerSnapshot.exists() ? readerSnapshot.data().tokenBalance : 0;
  
        // Check if the user has already read this chapter
        const ledgerQuery = query(
          collection(db, "ledger"),
          where("walletAddress", "==", publicKey.toString()),
          where("description", "==", `Read Chapter ${parseInt(chapter) + 1} of Novel ${novel.title}`),
          where("type", "==", "credit")
        );
        
        const ledgerSnapshot = await getDocs(ledgerQuery);
  
        if (!ledgerSnapshot.empty) {
          console.log("User has already read this chapter. No credit will be given.");
          return; // Exit if the chapter has already been read
        }
  
        // Update the token balance (add 5 tokens)
        await updateDoc(readerRef, {
          tokenBalance: currentBalance + 5,
        });
  
        // Create a ledger entry
        const transactionId = publicKey.toString() + Date.now();
        const transactionData = {
          walletAddress: publicKey.toString(),
          type: "credit", // Type of transaction
          amount: 5, // Amount added
          description: `Read Chapter ${parseInt(chapter) + 1} of Novel ${novel.title}`,
          timestamp: new Date().toISOString(),
        };
  
        // Create ledger document
        const ledgerRef = doc(db, "ledger", transactionId);
        await setDoc(ledgerRef, transactionData);
  
        // Show success notification
        setSuccessMessage("Transaction successfully added to ledger!");
  
        // Optionally, hide the notification after 5 seconds
        setTimeout(() => {
          setSuccessMessage("");
        }, 5000);
  
      } catch (error) {
        setError("Error updating token balance and creating ledger entry.");
        console.error("Error creating ledger transaction:", error);
      }
    };
  
    if (!loading) {
      updateTokenBalance();
    }
  }, [publicKey, chapter, novel, loading]);
  

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
        <div className="text-center my-3">
          <button className="btn btn-secondary mx-2" onClick={() => window.speechSynthesis.pause()}>
            Pause
          </button>
          <button className="btn btn-secondary mx-2" onClick={() => window.speechSynthesis.resume()}>
            Resume
          </button>
          <button className="btn btn-danger mx-2" onClick={() => window.speechSynthesis.cancel()}>
            Stop
          </button>
          </div>

              {/* Success Notification */}
          {successMessage && (
            <div className="alert alert-success alert-dismissible fade show" role="alert">
              {successMessage}
              <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
          )}

          <div className="p-4 rounded shadow-lg chapter-content">
            <h1 className="text-warning text-center fs-4 fs-md-2">{chapterData.title}</h1>
            
            {/* Read Aloud Button */}
            <div className="text-center my-3">
              <button
                className="btn btn-warning px-3 py-2"
                onClick={() => readText(chapterData.content)}
              >
                Read Aloud
              </button>
            </div>

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
          background-color: rgb(255,255,255);
          font-weight: bold;
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
