"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/services/supabase/supabaseClient";

export default function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCountdown() {
      setLoading(true);

      // Fetch the last stored reward time
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "weekly_reward_timer")
        .single();

      if (error || !data) {
        setTimeLeft(null);
      } else {
        const lastResetTime = new Date(data.value);
        const nextResetTime = getNextSundayMidnight(lastResetTime);
        updateCountdown(nextResetTime);
      }
      setLoading(false);
    }

    function getNextSundayMidnight(lastResetTime) {
      const nextSunday = new Date(lastResetTime);
      nextSunday.setDate(lastResetTime.getDate() + ((7 - lastResetTime.getDay()) % 7 || 7)); // Move to next Sunday
      nextSunday.setHours(0, 0, 0, 0); // Set to midnight
      return nextSunday;
    }

    function updateCountdown(endTime) {
      const interval = setInterval(() => {
        const now = new Date();
        const timeDiff = endTime - now;

        if (timeDiff <= 0) {
          clearInterval(interval);
          setTimeLeft("🔄 Resetting timer...");
          resetTimer(); // Reset countdown when it reaches 0
        } else {
          const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((timeDiff / (1000 * 60 * 60)) % 24);
          const minutes = Math.floor((timeDiff / (1000 * 60)) % 60);
          const seconds = Math.floor((timeDiff / 1000) % 60);
          setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        }
      }, 1000);
    }

    async function resetTimer() {
      console.log("🔄 Resetting countdown...");
      const newTime = new Date().toISOString(); // Now
      const { error } = await supabase
        .from("settings")
        .update({ value: newTime }) // ✅ Reset stored time
        .eq("key", "weekly_reward_timer");

      if (error) {
        console.error("❌ Timer reset failed:", error.message);
      } else {
        console.log("✅ Timer reset successfully!");
        fetchCountdown(); // Restart countdown
      }
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
        position: "relative",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {loading ? (
        <span style={{ color: "#feb47b" }}>⏳ Loading countdown...</span>
      ) : (
        <span style={{ color: "#ffb347" }}>⏳ Next Reset: {timeLeft || "Unknown"}</span>
      )}

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
    </div>
  );
}
