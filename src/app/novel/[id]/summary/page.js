'use client';

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "../../../../services/supabase/supabaseClient";
import { useWallet } from '@solana/wallet-adapter-react';
import Head from "next/head";
import Link from "next/link";
import DOMPurify from "dompurify";

const createDOMPurify = typeof window !== "undefined" ? DOMPurify : null;

export default function NovelSummaryPage() {
  const { id } = useParams();
  const [novel, setNovel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [warningMessage, setWarningMessage] = useState("");

  const { publicKey } = useWallet();

  useEffect(() => {
    const fetchNovel = async () => {
      try {
        const { data, error } = await supabase
          .from("novels")
          .select("title, summary")
          .eq("id", id)
          .single();

        if (error) throw error;
        setNovel(data);
      } catch (error) {
        console.error("Error fetching novel:", error);
        setError("Failed to load novel.");
      } finally {
        setLoading(false);
      }
    };

    fetchNovel();
  }, [id]);

  useEffect(() => {
    const updateTokenBalance = async () => {
      if (!publicKey || !novel) return;

      try {
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

        const eventDetails = `${publicKey}${novel.title}Summary`;
        console.log(eventDetails);

        // Step 1: Check if the event already exists
        const { data: existingEvent, error: eventError } = await supabase
          .from("wallet_events")
          .select("id")
          .eq("event_details", eventDetails)
          .eq("wallet_address", publicKey)
          .maybeSingle();

        if (eventError && eventError.code !== "PGRST116") {
          console.error("Error checking wallet_events:", eventError);
          return;
        }

        if (existingEvent) {
          console.log("⚠️ Event already exists for this user. Skipping updates.");
          setWarningMessage("⚠️ You've been credited for this Summary before.");
          setTimeout(() => setWarningMessage(""), 5000);
          return;
        }

        console.log("Event does not exist. Creating new event...");

        // Step 2: Calculate new balance
        const newBalance = (user.balance || 0) + 50;

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
        const { error: walletBalanceError } = await supabase
          .from("wallet_balances")
          .upsert([{
            user_id: user.id,
            chain: "SOL",
            currency: "Token",
            amount: newBalance,
            decimals: 0,
            wallet_address: publicKey.toString(),
          }]);

        if (walletBalanceError) {
          console.error("Error updating wallet_balances:", walletBalanceError);
          return;
        }

        console.log("wallet_balances updated successfully!");

        // Step 5: Insert into wallet_events
        const { error: walletEventError } = await supabase
          .from("wallet_events")
          .insert([{
            destination_user_id: user.id,
            event_type: "deposit",
            event_details: eventDetails,
            source_chain: "SOL",
            source_currency: "Token",
            amount_change: 5,
            wallet_address: publicKey.toString(),
            source_user_id: "6f859ff9-3557-473c-b8ca-f23fd9f7af27",
            destination_chain: "SOL",
          }]);

        if (walletEventError) {
          console.error("Error inserting into wallet_events:", walletEventError);
          return;
        }

        console.log("wallet_events updated successfully!");
        setSuccessMessage("Tokens credited for reading this summary!");
        setTimeout(() => setSuccessMessage(""), 5000);
      } catch (error) {
        setError("Error updating token balance.");
        console.error("Unexpected error:", error);
      }
    };

    if (!loading) updateTokenBalance();
  }, [publicKey, loading]);

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

  if (error || !novel) {
    return (
      <div className="d-flex flex-column align-items-center vh-100 bg-dark text-light">
        <h2 className="text-warning">Novel Not Found</h2>
        <Link href="/" className="btn btn-outline-warning mt-3">Back to Home</Link>
      </div>
    );
  }

  const sanitizedContent = createDOMPurify ? createDOMPurify.sanitize(novel.summary) : novel.summary;

  return (
    <div className="bg-dark text-light">
      <Head>
        <title>{novel.title} - Summary</title>
      </Head>
      <nav className="navbar navbar-dark bg-dark shadow-sm">
        <div className="container">
          <Link className="navbar-brand fw-bold text-warning" href="/">Sempai HQ</Link>
        </div>
      </nav>
      <div className="container my-4 px-3">
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
          <h1 className="text-warning text-center fs-4">{novel.title}</h1>
          <div className="text-center my-3">
            <button className="btn btn-warning px-3 py-2" onClick={() => readText(novel.summary)}>Read Aloud</button>
          </div>
          <div className="mt-4 fs-6" dangerouslySetInnerHTML={{ __html: sanitizedContent }}></div>
        </div>
        <div className="d-flex justify-content-center mt-4">
        <Link href={`/novel/${id}`} className="btn btn-warning px-3 py-2">
            Back to Novel
          </Link>        </div>
      </div>
      <footer className="bg-dark text-center py-3 mt-5">
        <p className="mb-0 text-light">&copy; 2025 Sempai HQ. All rights reserved.</p>
      </footer>
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
