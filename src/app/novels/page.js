"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase } from "../../services/supabase/supabaseClient";
import ConnectButton from "../../components/ConnectButton";
import { v4 as uuidv4 } from "uuid";
import LoadingPage from "../../components/LoadingPage";
import CountdownTimer from "../../components/CountdownTimer";
import { Transaction, Connection } from "@solana/web3.js";
import { RPC_URL } from "@/constants";

export default function NovelsPage() {
  const { connected, publicKey, sendTransaction } = useWallet();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [novels, setNovels] = useState([]);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [pendingWithdrawal, setPendingWithdrawal] = useState(0);
  const [weeklyPoints, setWeeklyPoints] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const connection = new Connection(RPC_URL);

  const checkBalance = async () => {
    if (!publicKey) return;

    try {
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id, weekly_points")
        .eq("wallet_address", publicKey.toString())
        .single();

      if (userError || !user) throw new Error("User not found");

      const userId = user.id;
      setWeeklyPoints(user.weekly_points || 0);

      const { data: walletBalance, error: balanceError } = await supabase
        .from("wallet_balances")
        .select("amount")
        .eq("user_id", userId)
        .single();

      if (balanceError) throw new Error("Error fetching balance");
      setBalance(walletBalance?.amount || 0);

      const { data: pendingData, error: pendingError } = await supabase
        .from("pending_withdrawals")
        .select("amount")
        .eq("user_id", userId)
        .eq("status", "pending");

      if (pendingError) throw new Error("Error fetching pending withdrawals");
      const totalPending = pendingData.reduce((sum, withdrawal) => sum + withdrawal.amount, 0);
      setPendingWithdrawal(totalPending);

      setLoading(false);
    } catch (error) {
      console.error("Error in checkBalance:", error);
      setErrorMessage(error.message);
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!connected || !publicKey) {
      setErrorMessage("Please connect your wallet first.");
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      setErrorMessage("Please enter a valid withdrawal amount.");
      return;
    }

    if (amount < 20) {
      setErrorMessage("Minimum withdrawal amount is 2500 SMP.");
      return;
    }

    if (amount > balance) {
      setErrorMessage("Insufficient balance for this withdrawal.");
      return;
    }

    setErrorMessage("");
    setLoading(true);

    try {
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("wallet_address", publicKey.toString())
        .single();

      if (userError || !user) throw new Error("User not found");

      const userId = user.id;

      // Insert pending withdrawal
      const withdrawalId = uuidv4();
      const { error: insertError } = await supabase
        .from("pending_withdrawals")
        .insert({
          id: withdrawalId,
          user_id: userId,
          amount,
          status: "pending",
          created_at: new Date().toISOString(),
        });

      if (insertError) throw new Error(`Insert failed: ${insertError.message}`);

      // Fetch withdrawal transaction
      const response = await fetch("/api/withdraw/tx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withdrawalId }),
      });

      const { transaction, blockhashInfo, error, message } = await response.json();
      if (error) throw new Error(message || "Failed to generate transaction");

      const tx = Transaction.from(Buffer.from(transaction, "base64"));
      const signature = await sendTransaction(tx, connection);

      // Confirm transaction on-chain
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash: blockhashInfo.blockhash,
        lastValidBlockHeight: blockhashInfo.lastValidBlockHeight,
      });

      if (confirmation.value.err) throw new Error("Transaction failed");

      // Update balance and status only after confirmation
      const { error: updateBalanceError } = await supabase
        .from("wallet_balances")
        .update({ amount: balance - amount })
        .eq("user_id", userId);

      if (updateBalanceError) throw new Error("Failed to update balance");

      const { error: updateWithdrawalError } = await supabase
        .from("pending_withdrawals")
        .update({ status: "completed" })
        .eq("id", withdrawalId);

      if (updateWithdrawalError) throw new Error("Failed to update withdrawal status");

      setErrorMessage("Withdrawal completed successfully!");
      setWithdrawAmount("");
      await checkBalance();
    } catch (error) {
      console.error("Withdrawal error:", error);
      setErrorMessage(`Withdrawal failed: ${error.message}`);

      // Rollback pending withdrawal if transaction fails
      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("wallet_address", publicKey.toString())
        .single();

      if (user) {
        await supabase
          .from("pending_withdrawals")
          .delete()
          .eq("id", withdrawalId)
          .eq("user_id", user.id);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchNovels = async () => {
    try {
      const { data, error } = await supabase.from("novels").select("*");
      if (error) throw new Error("Error fetching novels");
      setNovels(data);
    } catch (error) {
      console.error("Error fetching novels:", error);
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (connected && publicKey) {
      checkBalance();
      fetchNovels();
    }
  }, [connected, publicKey]);

  if (loading) return <LoadingPage />;

  return (
    <div className="bg-black">
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark py-3 shadow">
        <div className="container">
          <Link href="/" className="navbar-brand">
            <img
              src="/images/logo.jpg"
              alt="Sempai HQ"
              className="navbar-logo"
              style={{ width: "40px", height: "40px", borderRadius: "50%" }}
            />
          </Link>
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
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav me-auto text-center">
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

      <header
        className="bg-orange py-5 text-center text-white"
        style={{
          background: "linear-gradient(135deg, rgb(243, 99, 22), #feb47b)",
          padding: "60px 0",
        }}
      >
        <div className="container">
          <h1
            className="text-uppercase fw-bold"
            style={{
              color: "#fff",
              fontFamily: "Lora, serif",
              fontSize: "2.5rem",
              letterSpacing: "1.5px",
            }}
          >
            Explore Our Collection
          </h1>
          <p
            className="text-muted mb-4"
            style={{
              fontSize: "1.2rem",
              fontFamily: "Open Sans, sans-serif",
              color: "#f1f1f1",
              maxWidth: "600px",
              margin: "0 auto",
            }}
          >
            Dive into a collection of captivating stories and immersive worlds.
          </p>

          <CountdownTimer />

          {connected ? (
            <div
              style={{
                background: "#000",
                padding: "25px",
                borderRadius: "15px",
                boxShadow: "0 6px 18px rgba(243, 99, 22, 0.7)",
                color: "#fff",
                fontFamily: "Arial, sans-serif",
                maxWidth: "450px",
                margin: "30px auto",
                textAlign: "center",
                border: "3px solid rgb(243, 99, 22)",
                transition: "transform 0.3s ease, box-shadow 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.05)";
                e.currentTarget.style.boxShadow = "0 10px 24px rgba(243, 99, 22, 1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 6px 18px rgba(243, 99, 22, 0.7)";
              }}
            >
              <h5
                style={{
                  color: "rgb(0, 255, 127)",
                  fontSize: "1.6rem",
                  marginBottom: "20px",
                  fontWeight: "bold",
                }}
              >
                Balance: {loading ? "Loading..." : `${balance} SMP`}
              </h5>
              <h5
                style={{
                  color: "#00ff7f",
                  fontSize: "1.6rem",
                  marginBottom: "20px",
                  fontWeight: "bold",
                }}
              >
                Weekly Points: {loading ? "Loading..." : weeklyPoints}
              </h5>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "15px",
                  marginBottom: "20px",
                  padding: "20px",
                  backgroundColor: "#111",
                  borderRadius: "12px",
                  border: "2px solid rgba(243, 99, 22, 0.8)",
                  boxShadow: "0 6px 18px rgba(243, 99, 22, 0.5)",
                  width: "100%",
                  maxWidth: "450px",
                  margin: "0 auto",
                }}
              >
                <input
                  type="number"
                  min="2500"
                  max={balance}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Enter amount (Min: 2500)"
                  style={{
                    width: "100%",
                    padding: "14px",
                    borderRadius: "10px",
                    border: "1px solid #f36316",
                    backgroundColor: "#222",
                    color: "#fff",
                    outline: "none",
                    fontSize: "1rem",
                    transition: "all 0.3s ease",
                  }}
                  onFocus={(e) => (e.target.style.border = "1px solid #feb47b")}
                  onBlur={(e) => (e.target.style.border = "1px solid #f36316")}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                    width: "100%",
                  }}
                >
                  <button
                    onClick={handleWithdraw}
                    disabled={loading}
                    style={{
                      flex: 1,
                      backgroundColor: "transparent",
                      color: "#fff",
                      border: "2px solid red",
                      padding: "12px",
                      borderRadius: "8px",
                      cursor: loading ? "not-allowed" : "pointer",
                      transition: "all 0.3s ease",
                      fontWeight: "bold",
                      fontSize: "1rem",
                    }}
                    onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = "red")}
                    onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    {loading ? "Processing..." : "Withdraw"}
                  </button>

                  <button
                    onClick={checkBalance}
                    disabled={loading}
                    style={{
                      flex: 1,
                      backgroundColor: "transparent",
                      color: "#fff",
                      border: "2px solid rgb(243, 99, 22)",
                      padding: "12px",
                      borderRadius: "8px",
                      cursor: loading ? "not-allowed" : "pointer",
                      transition: "all 0.3s ease",
                      fontWeight: "bold",
                      fontSize: "1rem",
                    }}
                    onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = "rgb(243, 99, 22)")}
                    onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    Refresh
                  </button>
                </div>

                {pendingWithdrawal > 0 && (
                  <p
                    style={{
                      color: "rgb(243, 156, 18)",
                      fontWeight: "bold",
                      fontSize: "1.1rem",
                      marginTop: "15px",
                    }}
                  >
                    Pending Withdrawal: {pendingWithdrawal} SMP (Processing)
                  </p>
                )}
                {errorMessage && (
                  <p
                    style={{
                      color: "red",
                      fontWeight: "bold",
                      fontSize: "1.1rem",
                      marginTop: "15px",
                    }}
                  >
                    {errorMessage}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div
              style={{
                background: "#ff3b3b",
                color: "#fff",
                padding: "15px",
                borderRadius: "8px",
                fontSize: "1.1rem",
                fontWeight: "bold",
                display: "inline-block",
                marginTop: "20px",
              }}
            >
              Please connect your wallet to proceed.
              <div style={{ marginTop: "10px" }}>
                <ConnectButton />
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="container my-5">
        <div className="novels-grid row g-4 justify-content-center">
          {novels.length > 0 ? (
            novels.map((novel) => (
              <div key={novel.id} className="col-md-4 col-sm-6 col-12">
                <div className="image-container position-relative">
                  {connected ? (
                    <Link href={`/novel/${novel.id}`} className="text-decoration-none">
                      <img
                        src={novel.image}
                        className="img-fluid shadow rounded-3 hover-image"
                        alt={novel.title}
                      />
                      <div className="image-title position-absolute bottom-0 start-0 w-100 text-center p-3 bg-dark bg-opacity-50">
                        <h5 className="fw-bold text-uppercase text-white">{novel.title}</h5>
                      </div>
                    </Link>
                  ) : (
                    <div className="position-relative">
                      <img
                        src={novel.image}
                        className="img-fluid shadow rounded-3 hover-image"
                        alt={novel.title}
                      />
                      <div className="image-title position-absolute bottom-0 start-0 w-100 text-center p-3 bg-dark bg-opacity-50">
                        <h5 className="fw-bold text-uppercase text-white">{novel.title}</h5>
                      </div>
                      <div className="overlay d-flex align-items-center justify-content-center position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-50">
                        <ConnectButton />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-dark">No novels available.</p>
          )}
        </div>
      </div>
    </div>
  );
}