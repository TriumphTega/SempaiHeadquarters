"use client";

import { useState, useEffect, useContext } from "react";
import { supabase } from "../services/supabase/supabaseClient";
import { EmbeddedWalletContext } from "./EmbeddedWalletProvider";
import { FaGem, FaTrophy, FaStar, FaSync } from "react-icons/fa";
import styles from "../styles/PointsDisplay.module.css";

export default function PointsDisplay() {
  const { wallet: embeddedWallet } = useContext(EmbeddedWalletContext);
  const [pointsData, setPointsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const activePublicKey = embeddedWallet?.publicKey;
  const isWalletConnected = !!activePublicKey;

  // Fetch user points data
  const fetchPointsData = async () => {
    if (!isWalletConnected) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get user data
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error("User not authenticated");
      }

      // Get user points and Amethyst
      const { data: pointsData, error: pointsError } = await supabase
        .from("users")
        .select("weekly_points, total_points_read, amethyst_count")
        .eq("id", userData.user.id)
        .single();

      if (pointsError) throw pointsError;

      // Calculate effective points
      const weeklyPoints = pointsData.weekly_points || 0;
      const amethystCount = pointsData.amethyst_count || 0;
      const multiplierBonus = amethystCount * 2;
      const effectivePoints = weeklyPoints + multiplierBonus;

      setPointsData({
        weeklyPoints,
        totalPointsRead: pointsData.total_points_read || 0,
        amethystCount,
        multiplierBonus,
        effectivePoints
      });

    } catch (error) {
      console.error("[PointsDisplay] Error fetching points:", error);
      setError(error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh points data
  const refreshPoints = () => {
    setRefreshing(true);
    fetchPointsData();
  };

  // Fetch data on component mount and when wallet connects
  useEffect(() => {
    if (isWalletConnected) {
      fetchPointsData();
    } else {
      setPointsData(null);
      setLoading(false);
    }
  }, [isWalletConnected]);

  // Set up real-time subscription for points updates
  useEffect(() => {
    if (!isWalletConnected || !pointsData) return;

    const subscription = supabase
      .channel('points-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${embeddedWallet?.userId}`
        },
        (payload) => {
          console.log("[PointsDisplay] Points updated:", payload);
          fetchPointsData();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [isWalletConnected, embeddedWallet?.userId]);

  if (!isWalletConnected) {
    return null;
  }

  if (loading) {
    return (
      <div className={styles.pointsDisplay}>
        <div className={styles.loading}>
          <FaSync className={styles.loadingIcon} />
          <span>Loading points...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.pointsDisplay}>
        <div className={styles.error}>
          <span>Error loading points</span>
          <button onClick={refreshPoints} className={styles.retryButton}>
            <FaSync /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!pointsData) {
    return null;
  }

  return (
    <div className={styles.pointsDisplay}>
      <div className={styles.pointsHeader}>
        <h3 className={styles.title}>
          <FaTrophy className={styles.titleIcon} /> Your Points
        </h3>
        <button 
          onClick={refreshPoints} 
          className={`${styles.refreshButton} ${refreshing ? styles.refreshing : ''}`}
          disabled={refreshing}
        >
          <FaSync className={refreshing ? styles.spinning : ''} />
        </button>
      </div>

      <div className={styles.pointsGrid}>
        {/* Weekly Points */}
        <div className={styles.pointsCard}>
          <div className={styles.cardHeader}>
            <FaStar className={styles.cardIcon} />
            <span className={styles.cardTitle}>Weekly Points</span>
          </div>
          <div className={styles.cardValue}>
            {pointsData.weeklyPoints.toLocaleString()}
          </div>
          <div className={styles.cardSubtitle}>Earned this week</div>
        </div>

        {/* Total Points */}
        <div className={styles.pointsCard}>
          <div className={styles.cardHeader}>
            <FaTrophy className={styles.cardIcon} />
            <span className={styles.cardTitle}>Total Points</span>
          </div>
          <div className={styles.cardValue}>
            {pointsData.totalPointsRead.toLocaleString()}
          </div>
          <div className={styles.cardSubtitle}>All-time reading</div>
        </div>

        {/* Amethyst */}
        <div className={styles.pointsCard}>
          <div className={styles.cardHeader}>
            <FaGem className={styles.cardIcon} />
            <span className={styles.cardTitle}>Amethyst</span>
          </div>
          <div className={styles.cardValue}>
            {pointsData.amethystCount.toLocaleString()}
          </div>
          <div className={styles.cardSubtitle}>×2 multiplier</div>
        </div>

        {/* Effective Points */}
        <div className={`${styles.pointsCard} ${styles.effectiveCard}`}>
          <div className={styles.cardHeader}>
            <FaTrophy className={styles.cardIcon} />
            <span className={styles.cardTitle}>Effective Points</span>
          </div>
          <div className={styles.cardValue}>
            {pointsData.effectivePoints.toLocaleString()}
          </div>
          <div className={styles.cardSubtitle}>
            {pointsData.weeklyPoints} + {pointsData.multiplierBonus} bonus
          </div>
        </div>
      </div>

      <div className={styles.pointsBreakdown}>
        <h4 className={styles.breakdownTitle}>Points Breakdown</h4>
        <div className={styles.breakdownItem}>
          <span className={styles.breakdownLabel}>Base Points:</span>
          <span className={styles.breakdownValue}>+{pointsData.weeklyPoints.toLocaleString()}</span>
        </div>
        <div className={styles.breakdownItem}>
          <span className={styles.breakdownLabel}>Amethyst Bonus:</span>
          <span className={`${styles.breakdownValue} ${styles.bonus}`}>+{pointsData.multiplierBonus.toLocaleString()}</span>
        </div>
        <div className={`${styles.breakdownItem} ${styles.totalBreakdown}`}>
          <span className={styles.breakdownLabel}>Total Effective:</span>
          <span className={styles.breakdownValue}>{pointsData.effectivePoints.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
