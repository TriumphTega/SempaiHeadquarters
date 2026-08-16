"use client";

import { useState, useEffect, useContext, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaUsers, FaUser, FaSearch } from "react-icons/fa";
import { supabase } from "@/services/supabase/supabaseClient";
import { EmbeddedWalletContext } from "@/components/EmbeddedWalletProvider";
import Navbar from "@/components/Navbar";
import styles from "./RoomSelection.module.css";

const truncateName = (name) => {
  if (!name || name.length <= 12) return name;
  return `${name.slice(0, 3)}**${name.slice(-3)}`;
};

const resolveImage = (image) => {
  if (!image) return null;
  if (image.startsWith("data:image/") || image.startsWith("http")) return image;
  return `data:image/jpeg;base64,${image}`;
};

// Strip characters that would otherwise be interpreted as PostgREST filter
// syntax when interpolated into an `.or()` string.
const sanitizeForFilter = (term) => term.replace(/[,()%*]/g, "").trim();

export default function RoomSelectionPage() {
  const { wallet: embeddedWallet } = useContext(EmbeddedWalletContext);
  const router = useRouter();
  const [walletAddress, setWalletAddress] = useState("");
  const [recentChats, setRecentChats] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recentLoading, setRecentLoading] = useState(false);
  const [error, setError] = useState(null);
  const searchInputRef = useRef(null);

  const fetchRecentChats = useCallback(async (wallet) => {
    setRecentLoading(true);
    try {
      const { data, error } = await supabase
        .from("private_messages")
        .select("sender_wallet, recipient_wallet, created_at")
        .or(`sender_wallet.eq.${wallet},recipient_wallet.eq.${wallet}`)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const contactWallets = [];
      const seen = new Set();
      for (const msg of data) {
        const contactWallet = msg.sender_wallet === wallet ? msg.recipient_wallet : msg.sender_wallet;
        if (!seen.has(contactWallet)) {
          seen.add(contactWallet);
          contactWallets.push(contactWallet);
        }
      }

      const top = contactWallets.slice(0, 10);
      if (top.length === 0) {
        setRecentChats([]);
        return;
      }

      // Single batched lookup instead of one query per contact.
      const { data: profiles, error: profileError } = await supabase
        .from("users")
        .select("id, name, wallet_address, image, isWriter, isArtist, isSuperuser")
        .in("wallet_address", top);
      if (profileError) throw profileError;

      const profileMap = new Map((profiles || []).map((p) => [p.wallet_address, p]));
      setRecentChats(
        top.map((wallet_address) => {
          const p = profileMap.get(wallet_address);
          return {
            id: p?.id || null,
            name: p?.name || wallet_address,
            wallet_address,
            image: resolveImage(p?.image),
            isWriter: p?.isWriter || false,
            isArtist: p?.isArtist || false,
            isSuperuser: p?.isSuperuser || false,
          };
        })
      );
    } catch (error) {
      console.error("Error fetching recent chats:", error.message);
      setError("Failed to load recent chats");
    } finally {
      setRecentLoading(false);
    }
  }, []);

  useEffect(() => {
    const wallet = embeddedWallet?.publicKey || localStorage.getItem("walletAddress") || "";
    setWalletAddress(wallet);
    if (embeddedWallet?.publicKey) localStorage.setItem("walletAddress", wallet);
    if (!wallet) setError("Please connect your wallet to access chat.");
    else fetchRecentChats(wallet);
  }, [embeddedWallet?.publicKey, fetchRecentChats]);

  const searchUsers = useCallback(async () => {
    const safeTerm = sanitizeForFilter(searchTerm);
    if (!safeTerm || !walletAddress) {
      setUsers([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, wallet_address, image, isWriter, isArtist, isSuperuser")
        .or(`name.ilike.%${safeTerm}%,wallet_address.ilike.%${safeTerm}%`)
        .neq("wallet_address", walletAddress)
        .limit(10);
      if (error) throw error;
      setUsers(
        (data || []).map((user) => ({
          id: user.id,
          name: user.name || user.wallet_address,
          wallet_address: user.wallet_address,
          image: resolveImage(user.image),
          isWriter: user.isWriter || false,
          isArtist: user.isArtist || false,
          isSuperuser: user.isSuperuser || false,
        }))
      );
    } catch (error) {
      console.error("Error searching users:", error.message);
      setError("Failed to search users");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, walletAddress]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (searchTerm.trim()) searchUsers();
      else setUsers([]);
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, searchUsers]);

  const handleSelectRoom = (room) => {
    router.push(room === "group" ? "/chat?room=group" : `/chat?room=${room}`);
  };

  const focusSearch = () => {
    searchInputRef.current?.focus();
    searchInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const getBadge = (user) => {
    if (user.isSuperuser) return <span className={styles.superBadge} title="Superuser">★</span>;
    if (user.isWriter && user.isArtist) return <span className={styles.superBadge} title="Superuser">★</span>;
    if (user.isWriter) return <span className={styles.writerBadge} title="Writer">W</span>;
    if (user.isArtist) return <span className={styles.artistBadge} title="Artist">A</span>;
    return null;
  };

  return (
    <div className={styles.container}>
      <Navbar />

      <main className={styles.main}>
        {!walletAddress ? (
          <div className={styles.connectPrompt}>
            <p>{error || "Please connect your wallet to access chat rooms"}</p>
          </div>
        ) : (
          <>
            <div className={styles.roomGrid}>
              <div
                className={styles.roomCard}
                onClick={() => handleSelectRoom("group")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && handleSelectRoom("group")}
              >
                <div className={styles.roomIcon}>
                  <FaUsers />
                </div>
                <h2 className={styles.roomTitle}>Group Chat</h2>
                <p className={styles.roomDescription}>Chat with everyone in the community</p>
                <div className={styles.roomMeta}>
                  <span className={styles.roomTag}>Public</span>
                  <span className={styles.roomTag}>Live</span>
                </div>
              </div>

              <div
                className={styles.roomCard}
                onClick={focusSearch}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && focusSearch()}
              >
                <div className={styles.roomIcon}>
                  <FaUser />
                </div>
                <h2 className={styles.roomTitle}>Private Chat</h2>
                <p className={styles.roomDescription}>Start a private conversation</p>
                <div className={styles.roomMeta}>
                  <span className={styles.roomTag}>Private</span>
                  <span className={styles.roomTag}>Direct</span>
                </div>
              </div>
            </div>

            <div className={styles.userSection}>
              <div className={styles.searchBar}>
                <FaSearch className={styles.searchIcon} />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search users to chat privately…"
                  className={styles.searchInput}
                  aria-label="Search users"
                />
              </div>

              {searchTerm.trim() ? (
                <div className={styles.userList}>
                  <h3 className={styles.sectionTitle}>Search Results</h3>
                  {loading ? (
                    <div className={styles.skeletonList}>
                      <div className={styles.skeletonRow} />
                      <div className={styles.skeletonRow} />
                    </div>
                  ) : users.length > 0 ? (
                    users.map((user) => (
                      <div
                        key={user.wallet_address}
                        className={styles.userCard}
                        onClick={() => handleSelectRoom(user.wallet_address)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && handleSelectRoom(user.wallet_address)}
                      >
                        {user.image ? (
                          <img src={user.image} alt="" className={styles.userImage} />
                        ) : (
                          <div className={styles.userPlaceholder} />
                        )}
                        <div className={styles.userInfo}>
                          <div className={styles.userNameRow}>
                            <span className={styles.userName}>{truncateName(user.name)}</span>
                            {getBadge(user)}
                          </div>
                          <span className={styles.userWallet}>{user.wallet_address.slice(0, 8)}…</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={styles.emptyState}>
                      <p>No users match "{searchTerm.trim()}".</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.userList}>
                  <h3 className={styles.sectionTitle}>Recent Chats</h3>
                  {recentLoading ? (
                    <div className={styles.skeletonList}>
                      <div className={styles.skeletonRow} />
                      <div className={styles.skeletonRow} />
                    </div>
                  ) : recentChats.length > 0 ? (
                    recentChats.map((chat) => (
                      <div
                        key={chat.wallet_address}
                        className={styles.userCard}
                        onClick={() => handleSelectRoom(chat.wallet_address)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && handleSelectRoom(chat.wallet_address)}
                      >
                        {chat.image ? (
                          <img src={chat.image} alt="" className={styles.userImage} />
                        ) : (
                          <div className={styles.userPlaceholder} />
                        )}
                        <div className={styles.userInfo}>
                          <div className={styles.userNameRow}>
                            <span className={styles.userName}>{truncateName(chat.name)}</span>
                            {getBadge(chat)}
                          </div>
                          <span className={styles.userWallet}>{chat.wallet_address.slice(0, 8)}…</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={styles.emptyState}>
                      <p>No recent chats yet. Search above to start a private conversation.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}