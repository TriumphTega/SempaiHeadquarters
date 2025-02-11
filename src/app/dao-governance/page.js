'use client';

import { useState, useEffect } from "react";
import { supabase } from "../../services/supabase/supabaseClient";
import UseAmethystBalance from "../../components/UseAmethystBalance";
import { useWallet } from "@solana/wallet-adapter-react";
import Link from 'next/link';


export default function Polls() {
  const [polls, setPolls] = useState([]);
  const [trendingPolls, setTrendingPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [expiresAt, setExpiresAt] = useState("");
  const [totalVotes, setTotalVotes] = useState(0);
  const [showPolls, setShowPolls] = useState(false);
  const { balance } = UseAmethystBalance();
  const { publicKey } = useWallet();

  useEffect(() => {
    fetchPolls();
  }, []);

  async function fetchPolls() {
    setLoading(true);

    // Fetch all polls
    const { data: pollsData, error: pollsError } = await supabase
      .from("polls")
      .select("*")
      .order("created_at", { ascending: false });

    if (pollsError) console.error(pollsError);
    else setPolls(pollsData);

    // Fetch votes count
    const { data: votesData, error: votesError } = await supabase
      .from("votes")
      .select("*");

    if (votesError) console.error(votesError);
    else setTotalVotes(votesData.length);

    // Fetch trending polls (most voted)
    const { data: trendingData, error: trendingError } = await supabase
      .from("polls")
      .select("*, votes(count)")
      .order("votes.count", { ascending: false })
      .limit(3);

    if (trendingError) console.error(trendingError);
    else setTrendingPolls(trendingData);

    setLoading(false);
  }

  async function getUserId() {
    if (!publicKey) return null;
    const { data } = await supabase
      .from("users")
      .select("id")
      .eq("wallet_address", publicKey.toString())
      .single();
    return data ? data.id : null;
  }

  async function createPoll() {
    const userId = await getUserId();
    if (!userId) {
      alert("You must connect your wallet first!");
      return;
    }

    if (question.trim() === "" || options.some((opt) => opt.trim() === "")) {
      alert("Please fill in the question and all options.");
      return;
    }

    const newPoll = {
      user_id: userId,
      question,
      options,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    };

    const { error } = await supabase.from("polls").insert(newPoll);
    if (error) alert("Error creating poll!");
    else {
      alert("Poll created successfully!");
      fetchPolls();
      setQuestion("");
      setOptions(["", ""]);
      setExpiresAt("");
    }
  }

  async function vote(pollId, choice) {
    const userId = await getUserId();
    if (!userId) {
      alert("You must connect your wallet first!");
      return;
    }

    const { error } = await supabase.from("votes").insert({
      poll_id: pollId,
      user_id: userId,
      choice,
    });

    if (error) alert("You can only vote once per poll!");
    else fetchPolls();
  }

  return (
    <div>
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark py-3 shadow">
  <div className="container">
    {/* Brand Logo & Name */}
    <Link href="/" className="navbar-brand d-flex align-items-center">
      <img
        src="/images/logo.jpg" // Ensure the image is in the public folder
        alt="Sempai HQ"
        className="navbar-logo me-2"
        style={{ width: "45px", height: "45px", borderRadius: "50%", objectFit: "cover" }}
      />
      <span className="fs-5 fw-bold text-white">Sempai HQ</span>
    </Link>

    {/* Navbar Toggle Button for Mobile */}
    <button
      className="navbar-toggler"
      type="button"
      data-bs-toggle="collapse"
      data-bs-target="#navbarNav"
      aria-controls="navbarNav"
      aria-expanded="false"
      aria-label="Toggle navigation"
    >
      <span className="navbar-toggler-icon"></span>
    </button>

    {/* Navbar Links */}
    <div className="collapse navbar-collapse" id="navbarNav">
      <ul className="navbar-nav ms-auto">
        <li className="nav-item">
          <Link href="/" className="nav-link text-light fw-semibold hover-effect">
            Home
          </Link>
        </li>
        <li className="nav-item">
          <Link href="/swap" className="nav-link text-light fw-semibold hover-effect">
            Swap
          </Link>
        </li>
      </ul>

    
    </div>
  </div>
</nav>

<div className="poll-container">
      

      <h2 className="title">🔥 Community Polls 🔥</h2>
    
      <div className="row">
        {/* Poll Creation Section - Takes up 5/8 of the width */}
        {balance > 0 && (
          <div className="col-lg-7 mb-4">
            <div className="poll-card">
              <h4>Create a Poll</h4>
              <input
                type="text"
                className="poll-input"
                placeholder="Enter your question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
              {options.map((opt, index) => (
                <input
                  key={index}
                  type="text"
                  className="poll-input"
                  placeholder={`Option ${index + 1}`}
                  value={opt}
                  onChange={(e) => {
                    const newOptions = [...options];
                    newOptions[index] = e.target.value;
                    setOptions(newOptions);
                  }}
                />
              ))}
              <button className="poll-button mb-2" onClick={() => setOptions([...options, ""])}>
                ➕ Add Option
              </button>
              <p>Expiration Date(Optional)</p>
              <input
                type="datetime-local"
                className="poll-input"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
              <button className="poll-submit" onClick={createPoll}>
                🚀 Create Poll
              </button>
            </div>
          </div>
        )}
    
        {/* Poll Display Section - Takes up 3/8 of the width */}
        <div className="col-lg-5">
          {/* Show All Polls Button */}
          <div className="poll-card" onClick={() => setShowPolls(!showPolls)} style={{ cursor: "pointer" }}>
            <h5>📜 Community Polls Created</h5>
          </div>
    
          {/* Total Votes Cast */}
          <div className="poll-card">
            <h5>🗳️ Total Votes Cast: {totalVotes}</h5>
          </div>
    
          {/* Trending Polls */}
          <div className="poll-card">
            <h5>🔥 Trending Polls 🔥</h5>
            {trendingPolls.length === 0 ? (
              <p>No trending polls yet.</p>
            ) : (
              trendingPolls.map((poll) => <p key={poll.id} className="mb-1">{poll.question}</p>)
            )}
          </div>
        </div>
      </div>
    
      {/* Community Polls */}
      {showPolls &&
        (loading ? (
          <p className="loading-text">⏳ Loading polls...</p>
        ) : (
          polls.map((poll) => (
            <div key={poll.id} className="poll-card">
              <h5>{poll.question}</h5>
              {poll.options.map((opt, index) => (
                <button
                  key={index}
                  className="poll-option"
                  onClick={() => vote(poll.id, opt)}
                  disabled={balance === 0}
                >
                  {opt}
                </button>
              ))}
            </div>
          ))
        ))}
    </div>
    </div>
   

  );
}
