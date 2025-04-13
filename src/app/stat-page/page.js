"use client";

import { useState, useEffect, useContext } from "react";
import { supabase } from "../../services/supabase/supabaseClient"; // Adjust path
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";
import { useWallet } from "@solana/wallet-adapter-react";
import { EmbeddedWalletContext } from "../../components/EmbeddedWalletProvider"; // Adjust path
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend } from "chart.js";
import { Line, Bar, Pie } from "react-chartjs-2";
import styles from "../../styles/StatPage.module.css";
import { SMP_MINT_ADDRESS, TREASURY_PUBLIC_KEY, RPC_URL } from "@/constants";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

const SMP_DECIMALS = 6; // Adjust if SMP has different decimals

export default function StatsPage() {
  const { connected, publicKey } = useWallet();
  const { wallet: embeddedWallet } = useContext(EmbeddedWalletContext);
  const activePublicKey = embeddedWallet?.publicKey ? new PublicKey(embeddedWallet.publicKey) : publicKey;
  const activeWalletAddress = activePublicKey?.toString();

  const [totalUsers, setTotalUsers] = useState(0);
  const [mintTreasuryBalance, setMintTreasuryBalance] = useState(null);
  const [rewardsWalletBalance, setRewardsWalletBalance] = useState(null);
  const [userSmpBalance, setUserSmpBalance] = useState({ onChain: null, offChain: null }); // Store both balances
  const [usersOverTime, setUsersOverTime] = useState([]);
  const [activeUsers, setActiveUsers] = useState({ last7: 0, last30: 0 });
  const [smpDistribution, setSmpDistribution] = useState({});
  const [activityTypes, setActivityTypes] = useState({});
  const [totalNovelsRead, setTotalNovelsRead] = useState(0);
  const [avgWeeklyPoints, setAvgWeeklyPoints] = useState(0);
  const [commentActivity, setCommentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    fetchStats();
  }, [activeWalletAddress]);

  const fetchStats = async () => {
    try {
      const connection = new Connection(RPC_URL, "confirmed");

      // Total User Count
      const { data: users, error: userError } = await supabase
        .from("users")
        .select("id")
        .not("wallet_address", "is", null);
      if (userError) throw new Error(`User fetch error: ${userError.message}`);
      setTotalUsers(users?.length || 0);

      // Mint Treasury SMP Balance (from treasury wallet's ATA)
      const treasuryATA = await getAssociatedTokenAddress(SMP_MINT_ADDRESS, new PublicKey(TREASURY_PUBLIC_KEY));
      const treasuryAccountInfo = await connection.getAccountInfo(treasuryATA);
      if (treasuryAccountInfo) {
        const treasuryAccount = await getAccount(connection, treasuryATA);
        const treasuryBalance = Number(treasuryAccount.amount) / 10 ** SMP_DECIMALS;
        setMintTreasuryBalance(treasuryBalance);
      } else {
        setMintTreasuryBalance(0); // No ATA exists
      }

      // Total Rewards SMP Balance
      const { data: rewardsBalances, error: rewardsError } = await supabase
        .from("wallet_balances")
        .select("amount")
        .eq("currency", "SMP");
      if (rewardsError) throw new Error(`Rewards balance fetch error: ${rewardsError.message}`);
      const totalRewardsBalance = (rewardsBalances || []).reduce((sum, { amount }) => sum + (Number(amount) || 0), 0);
      setRewardsWalletBalance(totalRewardsBalance);

      // Current User's SMP Balance (on-chain and off-chain)
      if (activeWalletAddress) {
        // On-chain balance from ATA
        const userATA = await getAssociatedTokenAddress(SMP_MINT_ADDRESS, activePublicKey);
        const userAccountInfo = await connection.getAccountInfo(userATA);
        const onChainBalance = userAccountInfo
          ? Number((await getAccount(connection, userATA)).amount) / 10 ** SMP_DECIMALS
          : 0;

        // Off-chain balance from wallet_balances
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("id")
          .eq("wallet_address", activeWalletAddress)
          .single();
        if (userError) throw new Error(`User fetch error: ${userError.message}`);
        if (!userData) throw new Error("User not found");

        const { data: userBalance, error: balanceError } = await supabase
          .from("wallet_balances")
          .select("amount")
          .eq("user_id", userData.id)
          .eq("currency", "SMP")
          .single();
        const offChainBalance = userBalance ? Number(userBalance.amount) || 0 : 0;

        setUserSmpBalance({ onChain: onChainBalance, offChain: offChainBalance });
      } else {
        setUserSmpBalance({ onChain: null, offChain: null });
      }

      // Users Over Time
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: walletEventsTime, error: walletTimeError } = await supabase
        .from("wallet_events")
        .select("timestamp, source_user_id")
        .gte("timestamp", thirtyDaysAgo);
      if (walletTimeError) throw new Error(`Wallet events over time fetch error: ${walletTimeError.message}`);
      const uniqueUsersByDay = groupByDate(walletEventsTime || [], "timestamp", "source_user_id");
      setUsersOverTime(uniqueUsersByDay);

      // Active Users
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: events7, error: events7Error } = await supabase
        .from("wallet_events")
        .select("source_user_id")
        .gte("timestamp", sevenDaysAgo);
      if (events7Error) throw new Error(`7-day events fetch error: ${events7Error.message}`);
      setActiveUsers(prev => ({
        ...prev,
        last7: events7 ? new Set(events7.map(e => e.source_user_id)).size : 0,
      }));

      const { data: events30, error: events30Error } = await supabase
        .from("wallet_events")
        .select("source_user_id")
        .gte("timestamp", thirtyDaysAgo);
      if (events30Error) throw new Error(`30-day events fetch error: ${events30Error.message}`);
      setActiveUsers(prev => ({
        ...prev,
        last30: events30 ? new Set(events30.map(e => e.source_user_id)).size : 0,
      }));

      // SMP Balance Distribution
      const { data: balances, error: balanceError } = await supabase
        .from("wallet_balances")
        .select("amount")
        .eq("currency", "SMP");
      if (balanceError) throw new Error(`Balance fetch error: ${balanceError.message}`);
      const dist = calculateSmpDistribution(balances || []);
      setSmpDistribution(dist);

      // Top Activity Types
      const { data: events, error: eventsError } = await supabase
        .from("wallet_events")
        .select("event_type");
      if (eventsError) throw new Error(`Activity types fetch error: ${eventsError.message}`);
      const activityCount = (events || []).reduce((acc, { event_type }) => {
        acc[event_type] = (acc[event_type] || 0) + 1;
        return acc;
      }, {});
      setActivityTypes(activityCount);

      // Total Novels Read
      const { data: novelInteractions, error: novelError } = await supabase
        .from("novel_interactions")
        .select("read_count");
      if (novelError) throw new Error(`Novel interactions fetch error: ${novelError.message}`);
      const totalRead = (novelInteractions || []).reduce((sum, { read_count }) => sum + (read_count || 0), 0);
      setTotalNovelsRead(totalRead);

      // Average Weekly Points
      const { data: userPoints, error: pointsError } = await supabase
        .from("users")
        .select("weekly_points")
        .not("weekly_points", "is", null);
      if (pointsError) throw new Error(`Weekly points fetch error: ${pointsError.message}`);
      const avgPoints = userPoints && userPoints.length
        ? userPoints.reduce((sum, { weekly_points }) => sum + (weekly_points || 0), 0) / userPoints.length
        : 0;
      setAvgWeeklyPoints(avgPoints);

      // Comment Activity
      const { data: comments, error: commentsError } = await supabase
        .from("comments")
        .select("created_at")
        .gte("created_at", thirtyDaysAgo);
      if (commentsError) throw new Error(`Comments fetch error: ${commentsError.message}`);
      const commentByDay = groupByDate(comments || [], "created_at");
      setCommentActivity(commentByDay);
    } catch (error) {
      console.error("Detailed error fetching stats:", error);
      setErrorMessage(error.message || "An unexpected error occurred while fetching stats");
    } finally {
      setLoading(false);
    }
  };

  const groupByDate = (data, key, uniqueKey = null) => {
    const result = {};
    if (uniqueKey) {
      const uniqueEntries = new Set();
      data.forEach(item => {
        const date = new Date(item[key]).toLocaleDateString();
        uniqueEntries.add(`${date}-${item[uniqueKey]}`);
        result[date] = result[date] || new Set();
        result[date].add(item[uniqueKey]);
      });
      return Object.entries(result).map(([date, set]) => ({ date, count: set.size }));
    }
    data.forEach(item => {
      const date = new Date(item[key]).toLocaleDateString();
      result[date] = (result[date] || 0) + 1;
    });
    return Object.entries(result).map(([date, count]) => ({ date, count }));
  };

  const calculateSmpDistribution = (balances) => {
    const buckets = { "<1K": 0, "1K-10K": 0, ">10K": 0 };
    balances.forEach(({ amount }) => {
      if (amount < 1000) buckets["<1K"]++;
      else if (amount <= 10000) buckets["1K-10K"]++;
      else buckets[">10K"]++;
    });
    return buckets;
  };

  const usersOverTimeData = {
    labels: usersOverTime.map(d => d.date),
    datasets: [{ label: "Unique Active Users", data: usersOverTime.map(d => d.count), borderColor: "#00ffcc", backgroundColor: "rgba(0, 255, 204, 0.2)", fill: true, tension: 0.4 }],
  };

  const activeUsersData = {
    labels: ["Last 7 Days", "Last 30 Days"],
    datasets: [{ label: "Active Users", data: [activeUsers.last7, activeUsers.last30], backgroundColor: ["#ff6384", "#36a2eb"] }],
  };

  const smpDistributionData = {
    labels: Object.keys(smpDistribution),
    datasets: [{ data: Object.values(smpDistribution), backgroundColor: ["#ff6384", "#36a2eb", "#ffce56"] }],
  };

  const activityTypesData = {
    labels: Object.keys(activityTypes),
    datasets: [{ label: "Activity Count", data: Object.values(activityTypes), backgroundColor: "#ffce56" }],
  };

  const commentActivityData = {
    labels: Array.isArray(commentActivity) ? commentActivity.map(d => d.date) : [],
    datasets: [{ label: "Comments", data: Array.isArray(commentActivity) ? commentActivity.map(d => d.count) : [], borderColor: "#ff6384", backgroundColor: "rgba(255, 99, 132, 0.2)", fill: true, tension: 0.4 }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "top", labels: { color: "#fff" } }, title: { display: true, color: "#fff", font: { size: 18 } } },
    scales: { x: { ticks: { color: "#fff" } }, y: { ticks: { color: "#fff" } } },
  };

  if (loading) return <div className={styles.loading}>Loading Stats...</div>;

  return (
    <div className={styles.statsPage}>
      <h1 className={styles.title}>Platform Statistics</h1>
      {errorMessage && <div className={styles.error}><p>Error: {errorMessage}</p></div>}
      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <h2>Total Users</h2>
          <p className={styles.bigNumber}>{totalUsers.toLocaleString()}</p>
        </div>
        <div className={styles.statCard}>
          <h2>Mint Treasury SMP</h2>
          <p className={styles.bigNumber}>{mintTreasuryBalance !== null ? mintTreasuryBalance.toLocaleString() : "Loading..."}</p>
        </div>
        <div className={styles.statCard}>
          <h2>Total Rewards SMP</h2>
          <p className={styles.bigNumber}>{rewardsWalletBalance !== null ? rewardsWalletBalance.toLocaleString() : "Loading..."}</p>
        </div>
        <div className={styles.statCard}>
          <h2>Your SMP Balance</h2>
          <p className={styles.bigNumber}>
            {activeWalletAddress
              ? (userSmpBalance.onChain !== null && userSmpBalance.offChain !== null
                  ? `${userSmpBalance.onChain.toLocaleString()} (${userSmpBalance.offChain.toLocaleString()})`
                  : "Loading...")
              : "Connect Wallet"}
          </p>
        </div>
      </div>
      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <h2>Total Novels Read</h2>
          <p className={styles.bigNumber}>{totalNovelsRead.toLocaleString()}</p>
        </div>
        <div className={styles.statCard}>
          <h2>Avg Weekly Points</h2>
          <p className={styles.bigNumber}>{avgWeeklyPoints.toFixed(2)}</p>
        </div>
      </div>
      <div className={styles.chartGrid}>
        <div className={styles.chartCard}>
          <h3>Users Over Time (Last 30 Days)</h3>
          <div className={styles.chartWrapper}>
            <Line data={usersOverTimeData} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, title: { text: "User Activity Growth" } } }} />
          </div>
        </div>
        <div className={styles.chartCard}>
          <h3>Active Users</h3>
          <div className={styles.chartWrapper}>
            <Bar data={activeUsersData} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, title: { text: "Active Users" } } }} />
          </div>
        </div>
        <div className={styles.chartCard}>
          <h3>SMP Balance Distribution</h3>
          <div className={styles.chartWrapper}>
            <Pie data={smpDistributionData} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, title: { text: "SMP Distribution" } } }} />
          </div>
        </div>
        <div className={styles.chartCard}>
          <h3>Top Activity Types</h3>
          <div className={styles.chartWrapper}>
            <Bar data={activityTypesData} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, title: { text: "Activity Types" } } }} />
          </div>
        </div>
        <div className={styles.chartCard}>
          <h3>Comment Activity (Last 30 Days)</h3>
          <div className={styles.chartWrapper}>
            <Line data={commentActivityData} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, title: { text: "Comment Trends" } } }} />
          </div>
        </div>
      </div>
    </div>
  );
}