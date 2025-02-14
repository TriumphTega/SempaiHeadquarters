"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/services/supabase/supabaseClient";
import { useWallet } from "@solana/wallet-adapter-react"; // Assuming you're using Solana wallets

export default function WeeklyRewardPage() {
  const { publicKey } = useWallet(); // Get connected wallet address
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [message, setMessage] = useState("");
  const [amount, setAmount] = useState(""); // New: Amount input

  useEffect(() => {
    async function fetchUser() {
      if (!publicKey) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const walletAddress = publicKey.toString(); // Convert wallet address to string

      // ✅ Fetch the user based on their wallet address
      const { data: userData, error } = await supabase
        .from("users")
        .select("id, name, isSuperuser")
        .eq("wallet_address", walletAddress) // Ensure wallet matches
        .single();

      if (error || !userData || !userData.isSuperuser) {
        setUser(null);
      } else {
        setUser(userData);
      }
      setLoading(false);
    }

    fetchUser();
  }, [publicKey]); // Runs whenever wallet changes

  const handleDistributeRewards = async () => {
    setTriggering(true);
    setMessage("");

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      setMessage("⚠️ Enter a valid amount!");
      setTriggering(false);
      return;
    }

    try {
      const response = await fetch("/api/weekly-reward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseFloat(amount) }),
      });

      const result = await response.json();
      console.log(result);

      if (result.success) {
        setMessage("✅ Rewards distributed successfully!");
      } else {
        setMessage(`⚠️ Failed: ${result.message || "Unknown error"}`);
      }
    } catch (error) {
      setMessage("❌ Error connecting to the server.");
    }

    setTriggering(false);
  };

  if (loading) return <p>Loading...</p>;
  if (!publicKey) return <p>🔴 Connect your wallet to continue.</p>;
  if (!user) return <p>❌ Access Denied. Only superusers can view this page.</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h1>Weekly Reward Distribution</h1>
      <p>Welcome, {user.name}!</p>

      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Enter amount to distribute"
        style={{ padding: "10px", marginRight: "10px" }}
      />

      <button
        onClick={handleDistributeRewards}
        disabled={triggering}
        style={{
          padding: "10px 20px",
          backgroundColor: triggering ? "#ccc" : "#007bff",
          color: "white",
          border: "none",
          cursor: triggering ? "not-allowed" : "pointer",
        }}
      >
        {triggering ? "Processing..." : "Distribute Rewards"}
      </button>

      {message && <p style={{ marginTop: "10px" }}>{message}</p>}
    </div>
  );
}
