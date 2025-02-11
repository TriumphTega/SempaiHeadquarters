'use client';

import { useState, useEffect } from "react";
import { supabase } from '../../services/supabase/supabaseClient';
import UseAmethystBalance from '../../components/UseAmethystBalance';
import { useWallet } from "@solana/wallet-adapter-react";

export default function Polls() {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [expiresAt, setExpiresAt] = useState("");
  const { balance } = UseAmethystBalance();
  const { publicKey } = useWallet();

  useEffect(() => {
    fetchPolls();
  }, []);

  async function fetchPolls() {
    setLoading(true);
    const { data, error } = await supabase
      .from("polls")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) console.error(error);
    else setPolls(data);
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
    <div className="poll-container">
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

      {/* Wallet & Creator Dashboard Placeholder */}
      <div className="d-flex align-items-center ms-lg-3">
        <button className="btn btn-warning fw-semibold px-3 me-2">Connect Wallet</button>
        <Link href="/dashboard" className="btn btn-outline-light fw-semibold px-3">
          Creator Dashboard
        </Link>
      </div>
    </div>
  </div>
</nav>

      <h2 className="title">🔥 Community Polls 🔥</h2>

      {balance > 0 && (
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
          <button className="poll-button" onClick={() => setOptions([...options, ""])}>
            ➕ Add Option
          </button>
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
      )}

      {loading ? (
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
      )}
    </div>
  );
}
