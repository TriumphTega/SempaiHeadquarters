"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../services/supabase/supabaseClient";
import UseAmethystBalance from "../../components/UseAmethystBalance";
import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import {
  FaPoll,
  FaFire,
  FaVoteYea,
  FaPlus,
  FaRocket,
  FaBars,
  FaTimes,
  FaHome,
  FaExchangeAlt,
  FaWallet,
} from "react-icons/fa";
import styles from "../../styles/PollsPage.module.css";

export default function PollsPage() {
  const { publicKey } = useWallet();
  const { balance } = UseAmethystBalance();
  const [polls, setPolls] = useState([]);
  const [trendingPolls, setTrendingPolls] = useState([]);
  const [userVotes, setUserVotes] = useState(new Set()); // Track polls user has voted on
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [expiresAt, setExpiresAt] = useState("");
  const [totalVotes, setTotalVotes] = useState(0);
  const [showPolls, setShowPolls] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (publicKey) {
      fetchPolls();
      fetchUserVotes();
    }
  }, [publicKey]);

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  async function fetchPolls() {
    try {
      setLoading(true);
      setError("");

      const { data: pollsData, error: pollsError } = await supabase
        .from("polls")
        .select("*")
        .order("created_at", { ascending: false });

      if (pollsError) throw new Error(`Failed to fetch polls: ${pollsError.message}`);

      const { data: votesData, error: votesError } = await supabase
        .from("votes")
        .select("*");

      if (votesError) throw new Error(`Failed to fetch votes: ${votesError.message}`);

      const { data: trendingData, error: trendingError } = await supabase
        .rpc("get_trending_polls")
        .limit(3);

      if (trendingError) {
        console.error("Trending Polls Error:", trendingError);
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("polls")
          .select("*, votes(count)")
          .order("votes_count", { ascending: false, referencedTable: "votes" })
          .limit(3);

        if (fallbackError) throw new Error(`Fallback failed: ${fallbackError.message}`);
        setTrendingPolls(
          fallbackData.map((poll) => ({
            ...poll,
            votes_count: poll.votes?.count || 0,
          })) || []
        );
      } else {
        setTrendingPolls(trendingData || []);
      }

      setPolls(pollsData || []);
      setTotalVotes(votesData?.length || 0);
    } catch (err) {
      setError(err.message);
      console.error("Fetch Polls Error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUserVotes() {
    if (!publicKey) return;

    try {
      const userId = await getUserId();
      if (!userId) return;

      const { data: votesData, error: votesError } = await supabase
        .from("votes")
        .select("poll_id")
        .eq("user_id", userId);

      if (votesError) throw new Error(`Failed to fetch user votes: ${votesError.message}`);

      const votedPollIds = new Set(votesData.map((vote) => vote.poll_id));
      setUserVotes(votedPollIds);
    } catch (err) {
      setError(err.message);
      console.error("Fetch User Votes Error:", err);
    }
  }

  async function getUserId() {
    if (!publicKey) return null;
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("wallet_address", publicKey.toString())
      .single();
    if (error) {
      console.error("Error fetching user ID:", error);
      return null;
    }
    return data?.id || null;
  }

  async function createPoll() {
    const userId = await getUserId();
    if (!userId) {
      setError("Please connect your wallet!");
      return;
    }

    if (question.trim() === "" || options.some((opt) => opt.trim() === "")) {
      setError("Question and all options are required!");
      return;
    }

    try {
      setError("");
      const newPoll = {
        user_id: userId,
        question,
        options,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      };

      const { error } = await supabase.from("polls").insert(newPoll);
      if (error) throw new Error(`Failed to create poll: ${error.message}`);

      fetchPolls();
      setQuestion("");
      setOptions(["", ""]);
      setExpiresAt("");
    } catch (err) {
      setError(err.message);
      console.error(err);
    }
  }

  async function vote(pollId, choice) {
    const userId = await getUserId();
    if (!userId) {
      setError("Please connect your wallet to vote!");
      return;
    }

    if (userVotes.has(pollId)) {
      setError("You’ve already voted on this poll!");
      return;
    }

    try {
      setError("");
      const { data, error } = await supabase.from("votes").insert({
        poll_id: pollId,
        user_id: userId,
        choice,
      });

      if (error) throw new Error(`Voting failed: ${error.message}`);

      setUserVotes((prev) => new Set([...prev, pollId])); // Update client-side state
      fetchPolls(); // Refresh poll data
    } catch (err) {
      setError(err.message);
      console.error(err);
    }
  }

  return (
    <div className={styles.pollsContainer}>
      {/* Floating Navbar */}
      <nav className={styles.pollsNavbar}>
        <div className={styles.navbarContent}>
          <Link href="/" className={styles.nexusLogo}>
            <img src="/images/logo.jpeg" alt="Sempai HQ" className={styles.logoImage} />
            <span className={styles.logoText}>Sempai HQ</span>
          </Link>
          <button className={styles.menuButton} onClick={toggleMenu}>
            {menuOpen ? <FaTimes /> : <FaBars />}
          </button>
          <div className={`${styles.navItems} ${menuOpen ? styles.navItemsOpen : ""}`}>
            <Link href="/" className={styles.navItem}>
              <FaHome /> Home
            </Link>
            <Link href="/swap" className={styles.navItem}>
              <FaExchangeAlt /> Swap
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <header className={styles.pollsHeader}>
        <h1 className={styles.headerTitle}>
          <FaPoll className={styles.headerIcon} /> Polls Nexus
        </h1>
        <p className={styles.headerTagline}>Your Voice Shapes the Cosmos</p>
        {publicKey && (
          <p className={styles.balanceInfo}>
            <FaWallet /> Balance: {balance} AME
          </p>
        )}
      </header>

      {/* Main Content */}
      <main className={styles.pollsMain}>
        {error && (
          <div className={styles.errorMessage}>
            <span>{error}</span>
            <button onClick={() => setError("")} className={styles.closeError}>
              ×
            </button>
          </div>
        )}

        <div className={styles.pollsGrid}>
          {/* Left: Poll Creation */}
          {balance > 0 && (
            <section className={styles.createSection}>
              <div className={styles.holoCard}>
                <h2 className={styles.sectionTitle}>
                  <FaRocket className={styles.sectionIcon} /> Create Poll
                </h2>
                <input
                  type="text"
                  className={styles.holoInput}
                  placeholder="Pose Your Question"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                />
                {options.map((opt, index) => (
                  <input
                    key={index}
                    type="text"
                    className={styles.holoInput}
                    placeholder={`Option ${index + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const newOptions = [...options];
                      newOptions[index] = e.target.value;
                      setOptions(newOptions);
                    }}
                  />
                ))}
                <button
                  className={styles.actionBtn}
                  onClick={() => setOptions([...options, ""])}
                >
                  <FaPlus /> Add Option
                </button>
                <label className={styles.expiryLabel}>Set Expiration (Optional)</label>
                <input
                  type="datetime-local"
                  className={styles.holoInput}
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
                <button className={styles.launchBtn} onClick={createPoll}>
                  <FaRocket /> Launch
                </button>
              </div>
            </section>
          )}

          {/* Right: Overview */}
          <section className={styles.overviewSection}>
            <div
              className={styles.holoCard}
              onClick={() => setShowPolls(!showPolls)}
            >
              <h3 className={styles.overviewTitle}>
                <FaPoll /> All Polls ({polls.length})
              </h3>
            </div>
            <div className={styles.holoCard}>
              <h3 className={styles.overviewTitle}>
                <FaVoteYea /> Votes Cast: {totalVotes}
              </h3>
            </div>
            <div className={styles.holoCard}>
              <h3 className={styles.overviewTitle}>
                <FaFire /> Trending
              </h3>
              {trendingPolls.length === 0 ? (
                <p className={styles.noContent}>No trending polls yet.</p>
              ) : (
                trendingPolls.map((poll) => (
                  <div key={poll.id} className={styles.trendingPoll}>
                    <span>{poll.question}</span>
                    <span className={styles.voteCount}>{poll.votes_count}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* All Polls */}
        {showPolls && (
          <section className={styles.allPollsSection}>
            {loading ? (
              <div className={styles.loader}>
                <FaPoll className={styles.loaderIcon} />
                <span>Loading Nexus...</span>
              </div>
            ) : polls.length === 0 ? (
              <p className={styles.noContent}>No polls in the cosmos yet.</p>
            ) : (
              <div className={styles.pollsList}>
                {polls.map((poll) => {
                  const isExpired = poll.expires_at && new Date(poll.expires_at) < new Date();
                  const hasVoted = userVotes.has(poll.id);
                  return (
                    <div key={poll.id} className={styles.pollCard}>
                      <h3 className={styles.pollTitle}>{poll.question}</h3>
                      <div className={styles.optionsList}>
                        {poll.options.map((opt, index) => (
                          <button
                            key={index}
                            className={`${styles.voteBtn} ${hasVoted ? styles.votedBtn : ""}`}
                            onClick={() => vote(poll.id, opt)}
                            disabled={balance === 0 || isExpired || hasVoted}
                          >
                            <FaVoteYea className={styles.voteIcon} /> {opt}
                            {hasVoted && <span className={styles.votedText}> (Voted)</span>}
                          </button>
                        ))}
                      </div>
                      {poll.expires_at && (
                        <p className={styles.expiryText}>
                          {isExpired ? "Expired" : "Expires"}: {new Date(poll.expires_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}