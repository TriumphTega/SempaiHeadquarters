"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/services/supabase/supabaseClient";

export default function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rewardDistributed, setRewardDistributed] = useState(false);

  useEffect(() => {
    async function fetchCountdown() {
      setLoading(true);

      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "weekly_reward_timer")
        .single();

      if (error || !data) {
        setTimeLeft(null);
      } else {
        const startTime = new Date(data.value);
        const endTime = new Date(startTime.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from start
        updateCountdown(endTime);
      }
      setLoading(false);
    }

    function updateCountdown(endTime) {
      const interval = setInterval(() => {
        const now = new Date();
        const timeDiff = endTime - now;

        if (timeDiff <= 0) {
          clearInterval(interval);
          setRewardDistributed(true);
          setTimeLeft("⏳ Distributing rewards...");
          distributeRewards();
        } else {
          const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((timeDiff / (1000 * 60 * 60)) % 24);
          const minutes = Math.floor((timeDiff / (1000 * 60)) % 60);
          const seconds = Math.floor((timeDiff / 1000) % 60);
          setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        }
      }, 1000);
    }

    async function distributeRewards() {
      await fetch("/api/weekly-reward", { method: "POST" });
      setTimeLeft("✅ Rewards distributed!");
    }

    fetchCountdown();
  }, []);

  return (
    <div
  style={{
    background: "rgba(0, 0, 0, 0.8)",
    padding: "15px 25px",
    borderRadius: "12px",
    display: "inline-block",
    textAlign: "center",
    marginTop: "20px",
    color: "#fff",
    fontSize: "1.3rem",
    fontWeight: "bold",
    fontFamily: "Open Sans, sans-serif",
    border: "2px solid #f36316",
    boxShadow: "0 0 12px rgba(243, 99, 22, 0.7)",
    transition: "transform 0.3s ease",
    animation: rewardDistributed ? "pulse 1.5s infinite" : "none",
    position: "relative",
  }}
  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
>
  {loading ? (
    <span style={{ color: "#feb47b" }}>⏳ Loading countdown...</span>
  ) : rewardDistributed ? (
    <span style={{ color: "#0f0" }}>✅ Rewards Distributed!</span>
  ) : (
    <span style={{ color: "#ffb347" }}>⏳ Next Reward: {timeLeft || "Unknown"}</span>
  )}
  
  {/* Reward Pool Display */}
  {!rewardDistributed && (
    <div
      style={{
        marginTop: "10px",
        fontSize: "1.1rem",
        color: "#ffcc00",
        textShadow: "0 0 8px rgba(255, 204, 0, 0.8)",
      }}
    >
      🏆 Total Reward Pool: <span style={{ color: "#FFD700" }}>2,000,000 SMP</span>
    </div>
  )}
</div>

  );
}
