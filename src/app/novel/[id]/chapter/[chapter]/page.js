'use client';

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useWallet } from '@solana/wallet-adapter-react';
import DOMPurify from "dompurify";
import Head from "next/head";
import { supabase } from '../../../../../services/supabase/supabaseClient';
import CommentSection from '../../../../../components/Comments/CommentSection';
import UseAmethystBalance from '../../../../../components/UseAmethystBalance';
import { useRouter } from "next/navigation";



const createDOMPurify = typeof window !== "undefined" ? DOMPurify : null;

export default function ChapterPage() {
  const { id, chapter } = useParams();
  const [novel, setNovel] = useState(null);
  const [loading, setLoading] = useState(true);
  const { publicKey } = useWallet();
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [warningMessage, setWarningMessage] = useState("");  // Add this line
  const { balance } = UseAmethystBalance();
  const router = useRouter();


  const updateTokenBalance = async () => {
    try {
      console.log("Fetching novel with ID:", id);
  
      if (!publicKey || !novel || !chapter) return;
  
      console.log("Fetching user, novel owner, and team details...");
  
      // Step 1: Fetch the user based on the connected wallet
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, wallet_address, weekly_points")
        .eq("wallet_address", publicKey.toString())
        .single();  // We expect a single result
  
      if (userError || !userData) {
        console.error("Error fetching user:", userError);
        return;
      }
  
      const user = userData;
      console.log("User found:", user);
  
      // Step 2: Fetch the novel owner using the novel's user_id
      const { data: novelOwnerData, error: novelOwnerError } = await supabase
        .from("novels")
        .select("user_id")
        .eq("id", novel.id)
        .single();  // We expect a single result
  
      if (novelOwnerError || !novelOwnerData) {
        console.error("Error fetching novel owner:", novelOwnerError);
        return;
      }
  
      const novelOwnerId = novelOwnerData.user_id;
      const { data: novelOwner, error: novelOwnerBalanceError } = await supabase
        .from("users")
        .select("id, wallet_address, balance")
        .eq("id", novelOwnerId)
        .single();
  
      if (novelOwnerBalanceError || !novelOwner) {
        console.error("Error fetching novel owner balance:", novelOwnerBalanceError);
        return;
      }
  
      console.log("Novel owner found:", novelOwner);
  
      // Step 3: Use the predefined team ID (no need to fetch)
      const teamId = "33e4387d-5964-4418-98e2-225630a4fcef";
      const { data: team, error: teamError } = await supabase
        .from("users")
        .select("id, wallet_address, balance")
        .eq("id", teamId)
        .single();
  
      if (teamError || !team) {
        console.error("Error fetching team:", teamError);
        return;
      }
  
      console.log("Team found:", team);
  
      const eventDetails = `${publicKey}${novel.title}${chapter}`.replace(/\s+/g, '');
      console.log("Generated event details:", eventDetails);
  
      // Step 4: Check if the event already exists in wallet_events
      const { data: existingEvent, error: eventError } = await supabase
      .from("wallet_events")
      .select("id")  // Selecting "id" just to verify the existence of the event
      .eq("event_details", eventDetails)  // Check for matching event_details
      .eq("wallet_address", publicKey.toString())  // Check for matching wallet_address
      .maybeSingle();  // We expect at most one result

      if (eventError) {
      console.error("Error checking wallet_events:", eventError);
      return;
      }

      if (existingEvent) {
      console.log("⚠️ You've been credited before.");
      setWarningMessage("⚠️ You've been credited for this chapter before.");
      setTimeout(() => setWarningMessage(""), 5000);
      return;  // Don't credit to anyone if the event already exists
      }

  
      console.log("No existing event. Proceeding with transaction...");
  
      // Define rewards
      let readerReward = 0;
      const authorReward = 50;
      const teamReward = 50;
  
      if (Number(balance) >= 100_000 && Number(balance) < 250_000) {
        readerReward = 120;  // Reward for 100k - 250k
      } else if (Number(balance) >= 250_000 && Number(balance) < 500_000) {
        readerReward = 150;  // Reward for 250k - 500k
      } else if (Number(balance) >= 500_000 && Number(balance) < 1_000_000) {
        readerReward = 170;  // Reward for 500k - 1M
      } else if (Number(balance) >= 1_000_000 && Number(balance) <= 5_000_000) {
        readerReward = 200; // Reward for 1M - 5M
      }
      else if (Number(balance) >= 5_000_000) {
        readerReward = 250; // Reward for 5M and above
      } else {
        readerReward = 100;   // No reward if balance doesn't fit any range
      }
      // Update balances
      const newReaderBalance = (user.weekly_points || 0) + readerReward;
      const newAuthorBalance = (novelOwner.balance || 0) + authorReward;
      const newTeamBalance = (team.balance || 0) + teamReward;
      console.log(newAuthorBalance)
  
      // Update user balances in a single batch update
      const { error: updateError } = await supabase
        .from("users")
        .upsert([
          { id: user.id, weekly_points: newReaderBalance },
          { id: novelOwner.id, balance: newAuthorBalance },
          { id: team.id, balance: newTeamBalance },
        ]);
  
      if (updateError) {
        console.error("Error updating user balances:", updateError);
        return;
      }
  
      console.log("✅ User balances updated successfully!");
  
      // Upsert wallet balances
      const walletBalancesData = [
        
        {
          user_id: novelOwner.id,
          chain: "SOL",
          currency: "Token",
          amount: newAuthorBalance,
          decimals: 0,
          wallet_address: novelOwner.wallet_address,
        },
        {
          user_id: team.id,
          chain: "SOL",
          currency: "Token",
          amount: newTeamBalance,
          decimals: 0,
          wallet_address: "9JA3f2Nwx9wpgh2wAg8KQv2bSQGRvYwvyQbgTyPmB8nc",
        },
      ];
  
      console.log("Upserting wallet balances with:", walletBalancesData);
  
      const { error: walletError } = await supabase.from("wallet_balances").upsert(walletBalancesData);
  
      if (walletError) {
        console.error("❌ Error upserting wallet balances:", walletError);
        return;
      }
  
      console.log("✅ Wallet balances updated successfully!");
  
      // Insert transactions into wallet_events
      const { error: eventInsertError } = await supabase.from("wallet_events").insert([
        {
          destination_user_id: user.id,
          event_type: "deposit",
          event_details: eventDetails,
          source_chain: "SOL",
          source_currency: "Token",
          amount_change: readerReward,
          wallet_address: publicKey.toString(),
          source_user_id: "6f859ff9-3557-473c-b8ca-f23fd9f7af27",
          destination_chain: "SOL",
        },
        {
          destination_user_id: novelOwner.id,
          event_type: "deposit",
          event_details: eventDetails,
          source_chain: "SOL",
          source_currency: "Token",
          amount_change: authorReward,
          wallet_address: novelOwner.wallet_address,
          source_user_id: "6f859ff9-3557-473c-b8ca-f23fd9f7af27",
          destination_chain: "SOL",
        },
        {
          destination_user_id: team.id,
          event_type: "deposit",
          event_details: eventDetails,
          source_chain: "SOL",
          source_currency: "Token",
          amount_change: teamReward,
          wallet_address: "9JA3f2Nwx9wpgh2wAg8KQv2bSQGRvYwvyQbgTyPmB8nc",
          source_user_id: "6f859ff9-3557-473c-b8ca-f23fd9f7af27",
          destination_chain: "SOL",
        },
      ]);
  
      if (eventInsertError) {
        console.error("❌ Error inserting into wallet_events:", eventInsertError);
        setError("Failed to log transaction.");
        return;
      }
  
      console.log("✅ Wallet events inserted successfully!");
  
      setSuccessMessage("Tokens credited successfully!");
      setTimeout(() => setSuccessMessage(""), 5000);
  
    } catch (error) {
      setError("Error updating token balance.");
      console.error("🔥 Unexpected error:", error);
    }
  };
  
  useEffect(() => {
    let executed = false; // Prevent multiple executions
  
    const fetchData = async () => {
      if (!loading && !executed) {
        executed = true;
        await updateTokenBalance();
      }
    };
  
    fetchData();
  }, [publicKey, novel, chapter, loading]);
  
  
  
  
 
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
          <div className="my-3 text-center">
      <label className="text-warning me-2">Jump to Chapter:</label>
      <select
        className="form-select d-inline-block w-auto bg-dark text-warning border-warning"
        value={chapter}
        onChange={(e) => {
          const selectedChapter = e.target.value;
          router.push(`/novel/${id}/chapter/${selectedChapter}`);
        }}
      >
        {chapterKeys.map((ch, index) => (
          <option key={ch} value={ch}>
            {novel?.chaptertitles?.[ch] || `Chapter ${index + 1}`}
          </option>
        ))}
      </select>
    </div>

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
        
        <CommentSection novelId={novel.id} chapter={chapterTitle} />

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
