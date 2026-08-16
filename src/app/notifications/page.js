"use client";

import { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../services/supabase/supabaseClient";
import { EmbeddedWalletContext } from "../../components/EmbeddedWalletProvider";
import { FaBell, FaBook, FaImage, FaComment, FaCheck, FaTrash } from "react-icons/fa";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import styles from "./notifications.module.css";

export default function NotificationsPage() {
  const { wallet: embeddedWallet } = useContext(EmbeddedWalletContext);
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, unread, novels, manga, comments
  const walletPublicKey = embeddedWallet?.publicKey || null;
  const isWalletConnected = !!walletPublicKey;
  const [embers, setEmbers] = useState([]);

  // Build ember particles
  useEffect(() => {
    const buildEmbers = (count = 18) =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 6}s`,
        duration: `${7 + Math.random() * 6}s`,
        size: 2 + Math.floor(Math.random() * 3),
        opacity: 0.3 + Math.random() * 0.6,
      }));
    setEmbers(buildEmbers(18));
  }, []);

  useEffect(() => {
    if (!isWalletConnected || !walletPublicKey) {
      setLoading(false);
      return;
    }

    const fetchNotifications = async () => {
      try {
        const { data: user, error: userError } = await supabase
          .from("users")
          .select("id")
          .eq("wallet_address", walletPublicKey)
          .single();

        if (userError || !user) {
          setLoading(false);
          return;
        }

        let query = supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (filter === "unread") {
          query = query.eq("is_read", false);
        } else if (filter === "novels") {
          query = query.eq("type", "new_chapter");
        } else if (filter === "manga") {
          query = query.eq("type", "manga_update");
        } else if (filter === "comments") {
          query = query.eq("type", "comment");
        }

        const { data, error } = await query;

        if (error) throw error;
        setNotifications(data || []);
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    // Set up real-time subscription
    const channel = supabase
      .channel("notifications-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setNotifications((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setNotifications((prev) =>
              prev.map((notif) =>
                notif.id === payload.new.id ? payload.new : notif
              )
            );
          } else if (payload.eventType === "DELETE") {
            setNotifications((prev) =>
              prev.filter((notif) => notif.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isWalletConnected, walletPublicKey, filter]);

  const markAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const markAllAsRead = async () => {
    if (!isWalletConnected || !walletPublicKey) return;

    try {
      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("wallet_address", walletPublicKey)
        .single();

      if (!user) return;

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, is_read: true }))
      );
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw error;

      setNotifications((prev) =>
        prev.filter((notif) => notif.id !== notificationId)
      );
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);

    if (notification.type === "new_chapter" && notification.novel_id) {
      router.push(`/novel/${notification.novel_id}`);
    } else if (notification.type === "manga_update" && notification.manga_id) {
      router.push(`/manga/${notification.manga_id}`);
    } else if (notification.type === "comment" && notification.novel_id) {
      router.push(`/novel/${notification.novel_id}`);
    } else if (notification.type === "chat_reply" && notification.chat_id) {
      router.push(`/chat?messageId=${notification.chat_id}`);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "new_chapter":
        return <FaBook className={styles.iconNovel} />;
      case "manga_update":
        return <FaImage className={styles.iconManga} />;
      case "comment":
      case "chat_reply":
        return <FaComment className={styles.iconComment} />;
      default:
        return <FaBell className={styles.iconDefault} />;
    }
  };

  const getNotificationTitle = (notification) => {
    switch (notification.type) {
      case "new_chapter":
        return `New Chapter: ${notification.novel_title || "Novel"}`;
      case "manga_update":
        return `Manga Update: ${notification.novel_title || "Manga"}`;
      case "comment":
        return `New Comment on ${notification.novel_title || "Content"}`;
      case "chat_reply":
        return "New Message";
      default:
        return "Notification";
    }
  };

  if (!isWalletConnected) {
    return (
      <div className={styles.container}>
        {/* Ember Particles */}
        <div className={styles.emberContainer}>
          {embers.map((ember) => (
            <div
              key={ember.id}
              className={styles.ember}
              style={{
                left: ember.left,
                animationDelay: ember.delay,
                animationDuration: ember.duration,
                width: ember.size,
                height: ember.size,
                opacity: ember.opacity,
              }}
            />
          ))}
        </div>
        <div className={styles.connectPrompt}>
          <FaBell size={48} className={styles.bellIcon} />
          <h2>Connect Your Wallet</h2>
          <p>Please connect your wallet to view your notifications.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.container}>
        {/* Ember Particles */}
        <div className={styles.emberContainer}>
          {embers.map((ember) => (
            <div
              key={ember.id}
              className={styles.ember}
              style={{
                left: ember.left,
                animationDelay: ember.delay,
                animationDuration: ember.duration,
                width: ember.size,
                height: ember.size,
                opacity: ember.opacity,
              }}
            />
          ))}
        </div>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading notifications...</p>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className={styles.container}>
      <Navbar />

      {/* Ember Particles */}
      <div className={styles.emberContainer}>
        {embers.map((ember) => (
          <div
            key={ember.id}
            className={styles.ember}
            style={{
              left: ember.left,
              animationDelay: ember.delay,
              animationDuration: ember.duration,
              width: ember.size,
              height: ember.size,
              opacity: ember.opacity,
            }}
          />
        ))}
      </div>

      <div className={styles.header}>
        <h1 className={styles.title}>
          <FaBell /> Notifications
          {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
        </h1>
      </div>

      <div className={styles.filters}>
        <button
          className={`${styles.filterButton} ${filter === "all" ? styles.active : ""}`}
          onClick={() => setFilter("all")}
        >
          All
        </button>
        <button
          className={`${styles.filterButton} ${filter === "unread" ? styles.active : ""}`}
          onClick={() => setFilter("unread")}
        >
          Unread ({unreadCount})
        </button>
        <button
          className={`${styles.filterButton} ${filter === "novels" ? styles.active : ""}`}
          onClick={() => setFilter("novels")}
        >
          Novels
        </button>
        <button
          className={`${styles.filterButton} ${filter === "manga" ? styles.active : ""}`}
          onClick={() => setFilter("manga")}
        >
          Manga
        </button>
        <button
          className={`${styles.filterButton} ${filter === "comments" ? styles.active : ""}`}
          onClick={() => setFilter("comments")}
        >
          Comments
        </button>
      </div>

      {unreadCount > 0 && (
        <button className={styles.markAllRead} onClick={markAllAsRead}>
          <FaCheck /> Mark All as Read
        </button>
      )}

      <div className={styles.notificationsList}>
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`${styles.notificationItem} ${
                !notification.is_read ? styles.unread : ""
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className={styles.notificationCornerTL}></div>
              <div className={styles.notificationCornerTR}></div>
              <div className={styles.notificationCornerBL}></div>
              <div className={styles.notificationCornerBR}></div>
              <div className={styles.notificationIcon}>
                {getNotificationIcon(notification.type)}
              </div>
              <div className={styles.notificationContent}>
                <h3 className={styles.notificationTitle}>
                  {getNotificationTitle(notification)}
                </h3>
                <p className={styles.notificationMessage}>{notification.message}</p>
                <span className={styles.notificationTime}>
                  {new Date(notification.created_at).toLocaleString()}
                </span>
              </div>
              <div className={styles.notificationActions}>
                {!notification.is_read && (
                  <button
                    className={styles.actionButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(notification.id);
                    }}
                    title="Mark as read"
                  >
                    <FaCheck />
                  </button>
                )}
                <button
                  className={styles.actionButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notification.id);
                  }}
                  title="Delete"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className={styles.emptyState}>
            <FaBell size={48} className={styles.emptyIcon} />
            <h3>No notifications</h3>
            <p>You're all caught up!</p>
          </div>
        )}
      </div>
    </div>
  );
}
