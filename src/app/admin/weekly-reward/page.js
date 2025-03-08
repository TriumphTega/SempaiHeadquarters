"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/services/supabase/supabaseClient";
import { useWallet } from "@solana/wallet-adapter-react";

export default function WeeklyRewardPage() {
  const { publicKey } = useWallet();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [message, setMessage] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    async function fetchUser() {
      if (!publicKey) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const walletAddress = publicKey.toString();

      const { data: userData, error } = await supabase
        .from("users")
        .select("id, name, isSuperuser")
        .eq("wallet_address", walletAddress)
        .single();

      if (error || !userData || !userData.isSuperuser) {
        setUser(null);
      } else {
        setUser(userData);
      }
      setLoading(false);
    }

    fetchUser();
  }, [publicKey]);

  const handleDistributeRewards = async () => {
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setMessage("⚠️ Please enter a valid positive amount!");
      return;
    }

    setTriggering(true);
    setMessage("");

    try {
      const response = await fetch("/api/weekly-reward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parsedAmount }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage("✅ Rewards distributed successfully!");
        setAmount("");
      } else {
        setMessage(`⚠️ Failed: ${result.message || "Unknown error"}`);
      }
    } catch (error) {
      setMessage("❌ Error connecting to the server.");
      console.error("Frontend error:", error);
    }

    setTriggering(false);
  };

  const isAmountValid = amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0;

  if (loading) return <p>Loading...</p>;
  if (!publicKey) return <p>🔴 Please connect your wallet to continue.</p>;
  if (!user)
    return (
      <p>❌ Access Denied. You must be a superuser to distribute rewards.</p>
    );

  return (
    <div style={{ padding: "20px", maxWidth: "500px", margin: "0 auto" }}>
      <h1>Weekly Reward Distribution</h1>
      <p>Welcome, {user.name}!</p>

      <div style={{ marginBottom: "20px" }}>
        <input
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount to distribute (SMP)"
          style={{
            padding: "10px",
            width: "100%",
            marginBottom: "10px",
            borderRadius: "5px",
            border: "1px solid #ccc",
          }}
        />
        <button
          onClick={handleDistributeRewards}
          disabled={triggering || !isAmountValid}
          style={{
            padding: "10px 20px",
            backgroundColor:
              triggering || !isAmountValid ? "#ccc" : "#ff6200",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: triggering || !isAmountValid ? "not-allowed" : "pointer",
            width: "100%",
          }}
        >
          {triggering ? "Processing..." : "Distribute Rewards"}
        </button>
      </div>

      {message && (
        <p
          style={{
            marginTop: "10px",
            color: message.includes("✅") ? "green" : "red",
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}