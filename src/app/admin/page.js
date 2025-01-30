"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../services/supabase/supabaseClient";
import { Modal, Button } from "react-bootstrap";
import { useWallet } from "@solana/wallet-adapter-react"; // Import Solana wallet hook

export default function AdminPage() {
  const [tables, setTables] = useState({
    novels: [],
    users: [],
    wallet_balances: [],
    wallet_events: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedRow, setSelectedRow] = useState(null);
  const { publicKey } = useWallet(); // Get connected wallet address

  // **Fetch Data from Supabase Tables**
  const fetchTableData = async (tableName) => {
    try {
      const { data, error } = await supabase.from(tableName).select("*");
      if (error) throw error;
      setTables((prev) => ({ ...prev, [tableName]: data || [] }));
    } catch (err) {
      setError(`Error fetching ${tableName}: ${err.message}`);
    }
  };

  useEffect(() => {
    const checkSuperuser = async () => {
      try {
        console.log("🔍 Checking superuser status...");

        if (!publicKey) {
          throw new Error("Wallet not connected. Please connect your wallet.");
        }

        const walletAddress = publicKey.toBase58(); // Convert wallet public key to string
        console.log("📝 Connected Wallet Address:", walletAddress);

        // Query Supabase users table using wallet address
        const { data, error } = await supabase
          .from("users")
          .select("isSuperuser")
          .eq("wallet_address", walletAddress) // Ensure your `users` table has this field
          .single();

        console.log("👤 User Data from Supabase:", data);

        if (error) {
          console.error("❌ Error fetching user:", error.message);
          throw new Error("Error fetching user data.");
        }

        if (!data?.isSuperuser) {
          throw new Error("Access denied. Superuser only.");
        }

        console.log("✅ User is a superuser. Fetching tables...");

        // Fetch all necessary tables
        await Promise.all(["novels", "users", "wallet_balances", "wallet_events"].map(fetchTableData));

        console.log("📊 All tables fetched successfully.");
      } catch (err) {
        console.error("🚨 Superuser check failed:", err.message);
        setError(err.message);
      } finally {
        setLoading(false);
        console.log("🔄 Finished Superuser Check.");
      }
    };

    if (publicKey) {
      checkSuperuser();
    }
  }, [publicKey]); // Runs when wallet connects

  // **Handle Loading and Errors**
  if (loading) return <p>Loading...</p>;
  if (error) return <p className="text-danger">{error}</p>;

  return (
    <div className="admin-container">
      <h1 className="text-center">Admin Dashboard</h1>
      {successMessage && <div className="alert alert-success">{successMessage}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {Object.entries(tables).map(([name, data]) => (
        <div key={name} className="collection-section">
          <h2 className="collection-title">{name}</h2>
          {data.length > 0 ? (
            data.map((row) => (
              <div key={row.id} className="card">
                <div className="card-header">
                  {row.id}
                </div>
                <div className="card-body">
                  <p className="card-text">{JSON.stringify(row).slice(0, 50)}...</p>
                </div>
              </div>
            ))
          ) : (
            <p>No records available</p>
          )}
        </div>
      ))}
    </div>
  );
}
