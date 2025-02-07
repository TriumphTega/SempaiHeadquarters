"use client";
import { useEffect, useState } from "react";

export default function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNextDistribution() {
      try {
        const response = await fetch("/api/weekly-reward-scheduler");
        const result = await response.json();
        if (result.success && result.nextDistribution) {
          setTimeLeft(new Date(result.nextDistribution) - new Date());
        }
      } catch (error) {
        console.error("Failed to fetch countdown:", error);
      }
      setLoading(false);
    }

    fetchNextDistribution();
    const interval = setInterval(fetchNextDistribution, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  function formatTime(ms) {
    if (ms <= 0) return "00:00:00:00";
    let totalSeconds = Math.floor(ms / 1000);
    let days = Math.floor(totalSeconds / 86400);
    let hours = Math.floor((totalSeconds % 86400) / 3600);
    let minutes = Math.floor((totalSeconds % 3600) / 60);
    let seconds = totalSeconds % 60;
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }

  if (loading) return <p>Loading timer...</p>;

  return (
    <div style={{ padding: "20px", textAlign: "center", fontSize: "1.5em" }}>
      <h2>Next Reward Distribution</h2>
      <p>{formatTime(timeLeft)}</p>
    </div>
  );
}
