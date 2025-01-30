'use client';

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useWallet } from '@solana/wallet-adapter-react';
import DOMPurify from "dompurify";
import Head from "next/head";
import { supabase } from '../../../../../services/supabase/supabaseClient';

const createDOMPurify = typeof window !== "undefined" ? DOMPurify : null;

export default function ChapterPage() {
  const { id, chapter } = useParams();
  const [novel, setNovel] = useState(null);
  const [loading, setLoading] = useState(true);
  const { publicKey } = useWallet();
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [warningMessage, setWarningMessage] = useState("");  // Add this line


  useEffect(() => {
    const updateTokenBalance = async () => {
      if (!publicKey || !novel || !chapter) return;

      try {
        console.log("Fetching user details...");
        const { data: user, error: userError } = await supabase
          .from("users")
          .select("id, wallet_address, balance")
          .eq("wallet_address", publicKey.toString())
          .single();

        if (userError || !user) {
          console.error("Error fetching user:", userError);
          return;
        }

        console.log("User found:", user);

        const eventDetails = `${publicKey}${novel.title}${parseInt(chapter) + 1}`;
        console.log(eventDetails);

        // Step 1: Check if the event already exists
        const { data: existingEvent, error: eventError } = await supabase
          .from("wallet_events")
          .select("id") // Only select the ID to check existence
          .eq("event_details", eventDetails) // Match event details
          .eq("wallet_address", publicKey) // Ensure the same user
          .maybeSingle(); // Returns null if no rows exist

        if (eventError && eventError.code !== "PGRST116") {
          console.error("Error checking wallet_events:", eventError);
          return;
        }

        if (existingEvent) {
          console.log("⚠️ You've been credited before.");
          setWarningMessage("⚠️ You've been credited for this chapter before.");
          setTimeout(() => setWarningMessage(""), 5000);
          return; // Exit if event exists
        }

        console.log("Event does not exist. Creating new event...");

        // Step 2: Calculate new balance
        const newBalance = (user.balance || 0) + 5;

        // Step 3: Update user balance
        const { error: balanceError } = await supabase
          .from("users")
          .update({ balance: newBalance })
          .eq("id", user.id);

        if (balanceError) {
          console.error("Error updating user balance:", balanceError);
          return;
        }

        console.log("Balance updated successfully!");

        // Step 4: Update wallet_balances
        const { data: walletBalanceData, error: walletBalanceError } = await supabase
          .from("wallet_balances")
          .upsert([
            {
              user_id: user.id,
              chain: "SOL",
              currency: "Token",
              amount: newBalance,
              decimals: 0,
              wallet_address: publicKey.toString(),
            },
          ])
          .select();

        if (walletBalanceError) {
          console.error("Error updating wallet_balances:", walletBalanceError);
          return;
        }

        console.log("wallet_balances updated successfully!", walletBalanceData);

        // Step 5: Insert into wallet_events
        const { data: walletEventData, error: walletEventError } = await supabase
          .from("wallet_events")
          .insert([
            {
              destination_user_id: user.id,
              event_type: "deposit",
              event_details: eventDetails,
              source_chain: "SOL",
              source_currency: "Token",
              amount_change: 5,
              wallet_address: publicKey.toString(),
              source_user_id: "6f859ff9-3557-473c-b8ca-f23fd9f7af27",
              destination_chain: "SOL",
            },
            
          ]);
          

        if (walletEventError) {
          console.error("Error inserting into wallet_events:", walletEventError);
          return;
        }

        console.log("wallet_events updated successfully!", walletEventData);

        console.log("wallet_events updated successfully!");
        setSuccessMessage("Tokens credited for reading this chapter!");
        setTimeout(() => setSuccessMessage(""), 5000);

      } catch (error) {
        setError("Error updating token balance.");
        console.error("Unexpected error:", error);
      }
    };

    if (!loading) updateTokenBalance();
  }, [publicKey, chapter, novel, loading]);
  
  
  
  
  

  const readText = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    } else {
      alert('Your browser does not support text-to-speech.');
    }
  };

  useEffect(() => {
    const fetchNovel = async () => {
      try {
        const { data, error } = await supabase
          .from("novels")
          .select("*")
          .eq("id", id)
          .single();
        
        if (error) throw error;
        setNovel(data);
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

  const chapterData = novel?.chaptercontents?.[chapter];
  const chapterTitle = novel?.chaptertitles?.[chapter]; // Accessing the chapter title from the chaptertitles map

  const chapterKeys = Object.keys(novel?.chaptercontents || {});
  const currentChapterIndex = chapterKeys.indexOf(chapter);

  const prevChapter = currentChapterIndex > 0 ? chapterKeys[currentChapterIndex - 1] : null;
  const nextChapter = currentChapterIndex < chapterKeys.length - 1 ? chapterKeys[currentChapterIndex + 1] : null;

  const prevChapterData = prevChapter ? novel?.chaptercontents?.[prevChapter] : null;
  const nextChapterData = nextChapter ? novel?.chaptercontents?.[nextChapter] : null;

  if (!novel || !chapterData) {
    return (
      <div className="d-flex flex-column align-items-center vh-100 bg-dark text-light">
        <h2 className="text-warning">Chapter Not Found</h2>
        <Link href="/" className="btn btn-outline-warning mt-3">Back to Home</Link>
      </div>
    );
  }

  const sanitizedContent = createDOMPurify ? createDOMPurify.sanitize(chapterData) : chapterData;
  
  return (
    <div className="bg-dark text-light">
      <Head>
        <title>{`${novel.title} - ${chapterTitle}`}</title>
      </Head>
      <nav className="navbar navbar-dark bg-dark shadow-sm">
        <div className="container">
          <a className="navbar-brand fw-bold text-warning" href="/">Sempai HQ</a>
        </div>
      </nav>
      <div className="container my-4 px-3 ">
        <div className="text-center my-3">
          <button className="btn btn-secondary mx-2" onClick={() => window.speechSynthesis.pause()}>Pause</button>
          <button className="btn btn-secondary mx-2" onClick={() => window.speechSynthesis.resume()}>Resume</button>
          <button className="btn btn-danger mx-2" onClick={() => window.speechSynthesis.cancel()}>Stop</button>
        </div>
        {successMessage && (
            <div className="alert alert-success alert-dismissible fade show" role="alert">
              {successMessage}
              <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
          )}     
          {error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              {error}
              <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
          )}     
           {warningMessage && (
            <div className="alert alert-warning alert-dismissible fade show" role="alert">
              {warningMessage}
              <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
          )}        
          <div className="p-4 rounded shadow-lg chapter-content">
          <h1 className="text-warning text-center fs-4">{chapterTitle}</h1>
          <div className="text-center my-3 ">
            <button className="btn btn-warning px-3 py-2" onClick={() => readText(chapterData)}>Read Aloud</button>
          </div>
          <div className="mt-4 fs-6" dangerouslySetInnerHTML={{ __html: sanitizedContent }}></div>
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
      <footer className="bg-dark text-center py-3 mt-5">
        <p className="mb-0 text-light">&copy; 2025 Sempai HQ. All rights reserved.</p>
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
