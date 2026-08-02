"use client";

import { useState, useEffect, useRef, useCallback, useContext, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/services/supabase/supabaseClient";
import { EmbeddedWalletContext } from "@/components/EmbeddedWalletProvider";
import styles from "./Chat.module.css";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const truncateName = (name) => {
  if (!name || name.length <= 12) return name;
  return `${name.slice(0, 3)}**${name.slice(-3)}`;
};

const resolveImage = (image) => {
  if (!image) return null;
  if (image.startsWith("data:image/") || image.startsWith("http")) return image;
  return `data:image/jpeg;base64,${image}`;
};

// PostgREST's `.or()` filter string is built from raw text. Anything typed
// into the search box (commas, parens, wildcards) would otherwise be
// interpreted as filter syntax instead of literal text. Strip it down to
// characters that are safe inside an `ilike` pattern.
const sanitizeForFilter = (term) => term.replace(/[,()%*]/g, "").trim();

const BENEFACTOR_BADGES = {
  gold: "/plan-image/Gold.svg",
  silver: "/plan-image/Silver.svg",
  blue: "/plan-image/Blue.svg",
  iron: "/plan-image/Black.svg",
};

// ---------------------------------------------------------------------------
// Presence hook — tracks which wallet addresses are currently online.
// This previously existed as dead state (onlineUsers was declared but never
// populated). It now runs a single shared presence channel for the page.
// ---------------------------------------------------------------------------

function useOnlinePresence(walletAddress) {
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
    if (!walletAddress) return;

    const channel = supabase.channel("presence:online-users", {
      config: { presence: { key: walletAddress } },
    });

    const syncState = () => {
      const state = channel.presenceState();
      setOnlineUsers(new Set(Object.keys(state)));
    };

    channel
      .on("presence", { event: "sync" }, syncState)
      .on("presence", { event: "join" }, syncState)
      .on("presence", { event: "leave" }, syncState)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [walletAddress]);

  return onlineUsers;
}

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------

function Message({ msg, walletAddress, onReply, isPrivate, onScrollToParent, isOnline }) {
  const isOwnMessage = isPrivate
    ? msg.sender_wallet === walletAddress
    : msg.wallet_address === walletAddress;

  const isSuper = msg.is_superuser || (msg.is_writer && msg.is_artist);
  const showWriterBadge = msg.is_writer && !msg.is_artist && !msg.is_superuser;
  const showArtistBadge = msg.is_artist && !msg.is_writer && !msg.is_superuser;
  const showBenefactorBadge = msg.is_benefactor;

  const benefactorLevel = msg.current_writer_subscription?.toLowerCase();
  const benefactorImage = BENEFACTOR_BADGES[benefactorLevel] || BENEFACTOR_BADGES.iron;
  const haloClass = benefactorLevel ? styles[`halo-${benefactorLevel}`] || styles["halo-iron"] : "";

  return (
    <div
      className={`${styles.message} ${isOwnMessage ? styles.ownMessage : styles.otherMessage}`}
    >
      <div className={styles.messageHeader}>
        <span className={`${styles.avatarWrap} ${showBenefactorBadge ? haloClass : ""}`}>
          {msg.profile_image ? (
            <img src={msg.profile_image} alt="" className={styles.profileImage} />
          ) : (
            <div className={styles.profilePlaceholder} aria-hidden="true" />
          )}
          {isOnline && <span className={styles.onlinePip} aria-label="Online" />}
        </span>
        <span className={styles.userName}>
          {msg.is_writer ? (
            <Link href={`/profile/${msg.user_id}`} className={styles.writerNameLink}>
              {truncateName(msg.name)}
            </Link>
          ) : (
            truncateName(msg.name)
          )}
          {isSuper && (
            <span className={styles.writerBadge} title="Superuser">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#F28C38">
                <path d="M10.007 2.104a3 3 0 0 0-3.595 1.49L5.606 5.17a1 1 0 0 1-.436.436l-1.577.806a3 3 0 0 0-1.49 3.595l.546 1.685a1 1 0 0 1 0 .616l-.545 1.685a3 3 0 0 0 1.49 3.595l1.576.806a1 1 0 0 1 .436.436l.806 1.577a3 3 0 0 0 3.595 1.49l1.685-.546a1 1 0 0 1 .616 0l1.685.545a3 3 0 0 0 3.595-1.489l.806-1.577a1 1 0 0 1 .436-.436l1.577-.805a3 3 0 0 0 1.49-3.596l-.546-1.685a1 1 0 0 1 0-.616l.545-1.685a3 3 0 0 0-1.489-3.595l-1.577-.806a1 1 0 0 1-.436-.436l-.805-1.577a3 3 0 0 0-3.596-1.49l-1.685.546a1 1 0 0 1-.616 0l-1.685-.545ZM6.76 11.757l1.414-1.414l2.828 2.829l5.657-5.657l1.415 1.414l-7.072 7.07l-4.242-4.242Z" />
              </svg>
            </span>
          )}
          {showWriterBadge && (
            <span className={styles.writerBadge} title="Writer">
              <img src="/animations/writer-badge.png" alt="" width="16" height="16" />
            </span>
          )}
          {showArtistBadge && (
            <span className={styles.writerBadge} title="Artist">
              <img src="/animations/artist-badge.png" alt="" width="16" height="16" />
            </span>
          )}
          {showBenefactorBadge && (
            <span className={styles.writerBadge} title={`${benefactorLevel || "iron"} supporter`}>
              <img src={benefactorImage} alt="" width="16" height="16" />
            </span>
          )}
        </span>
        {isPrivate && (
          <span className={styles.messageStatus}>
            {msg.status === "sending" ? (
              <span className={styles.sendingDot} aria-label="Sending" />
            ) : msg.status === "read" ? (
              "✓✓"
            ) : msg.status === "delivered" ? (
              "✓"
            ) : (
              ""
            )}
          </span>
        )}
      </div>
      <div className={styles.messageBody}>
        {msg.parent_id && (
          <button
            type="button"
            className={styles.replyPreview}
            onClick={() => onScrollToParent(msg.parent_id)}
          >
            <div className={styles.replyName}>{truncateName(msg.parent_name) || "Unknown"}</div>
            <div className={styles.replyContent}>
              {msg.parent_content ? (
                `${msg.parent_content.slice(0, 50)}${msg.parent_content.length > 50 ? "…" : ""}`
              ) : (
                <i>No content</i>
              )}
            </div>
          </button>
        )}
        {msg.content && <p className={styles.messageContent}>{msg.content}</p>}
        {msg.media_url && <img src={msg.media_url} alt="Attachment" className={styles.mediaImage} loading="lazy" />}
        <button
          onClick={() => onReply(msg.id)}
          className={styles.replyButton}
          aria-label="Reply to this message"
        >
          <svg className={styles.replyIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GIF picker
// ---------------------------------------------------------------------------

function GifPicker({ onSelect, onClose }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchGifs = useCallback(async (query) => {
    const safe = sanitizeForFilter(query);
    if (!safe) {
      setGifs([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("gifs")
        .select("id, title, url")
        .ilike("title", `%${safe}%`)
        .limit(20);
      if (error) throw error;
      setGifs(data || []);
    } catch (error) {
      console.error("Error fetching GIFs:", error.message);
      setGifs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => fetchGifs(searchTerm), 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, fetchGifs]);

  return (
    <div className={styles.gifPicker} role="dialog" aria-label="GIF picker">
      <div className={styles.gifPickerHeader}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search GIFs…"
          className={styles.gifSearchInput}
          autoFocus
        />
        <button onClick={onClose} className={styles.closeButton} aria-label="Close GIF picker">
          <svg className={styles.closeIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>
      <div className={styles.gifGrid}>
        {loading ? (
          <p className={styles.loadingText}>Loading…</p>
        ) : gifs.length > 0 ? (
          gifs.map((gif) => (
            <img
              key={gif.id}
              src={gif.url}
              alt={gif.title}
              className={styles.gifImage}
              onClick={() => onSelect(gif.url)}
            />
          ))
        ) : searchTerm.trim() ? (
          <p className={styles.noResults}>No GIFs found</p>
        ) : (
          <p className={styles.noResults}>Start typing to search</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main chat page
// ---------------------------------------------------------------------------

export default function ChatPage() {
  const { wallet: embeddedWallet } = useContext(EmbeddedWalletContext);
  const searchParams = useSearchParams();
  const initialRoom = searchParams.get("room") || "group";

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([]);
  const [recentChats, setRecentChats] = useState([]);
  const [activeChat, setActiveChat] = useState(initialRoom);
  const [privateMessages, setPrivateMessages] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingChannelRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const userCacheRef = useRef(new Map()); // wallet_address -> enriched profile fields

  const onlineUsers = useOnlinePresence(walletAddress);

  // -- wallet -----------------------------------------------------------
  useEffect(() => {
    const wallet = embeddedWallet?.publicKey || localStorage.getItem("walletAddress") || "";
    setWalletAddress(wallet);
    if (embeddedWallet?.publicKey) localStorage.setItem("walletAddress", wallet);
    if (!wallet) setError("Please connect your wallet to chat.");
  }, [embeddedWallet?.publicKey]);

  // -- batched user profile lookup --------------------------------------
  // Replaces the old N+1 pattern (one query per message) with a single
  // `.in()` query per batch, filling a cache so repeat lookups are free.
  const getUserProfiles = useCallback(async (wallets) => {
    const uncached = [...new Set(wallets.filter(Boolean))].filter(
      (w) => !userCacheRef.current.has(w)
    );
    if (uncached.length > 0) {
      const { data, error } = await supabase
        .from("users")
        .select(
          "id, name, wallet_address, image, isWriter, isArtist, isSuperuser, is_benefactor, benefactor_level, current_writer_subscription"
        )
        .in("wallet_address", uncached);
      if (error) {
        console.error("Error batch-fetching profiles:", error.message);
      } else {
        for (const u of data || []) {
          userCacheRef.current.set(u.wallet_address, u);
        }
      }
      // Cache misses too, so we don't re-query wallets with no user row.
      for (const w of uncached) {
        if (!userCacheRef.current.has(w)) userCacheRef.current.set(w, null);
      }
    }
    const map = new Map();
    for (const w of wallets) map.set(w, userCacheRef.current.get(w) || null);
    return map;
  }, []);

  const buildEnrichedFields = (profile, fallbackWallet) => ({
    user_id: profile?.id || null,
    name: profile?.name || fallbackWallet,
    profile_image: resolveImage(profile?.image),
    is_writer: profile?.isWriter || false,
    is_artist: profile?.isArtist || false,
    is_superuser: profile?.isSuperuser || false,
    is_benefactor: profile?.is_benefactor || false,
    benefactor_level: profile?.benefactor_level || null,
    current_writer_subscription: profile?.current_writer_subscription || null,
  });

  // -- recent chats / user search ----------------------------------------
  const fetchRecentChats = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const { data, error } = await supabase
        .from("private_messages")
        .select("sender_wallet, recipient_wallet, created_at")
        .or(`sender_wallet.eq.${walletAddress},recipient_wallet.eq.${walletAddress}`)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const contactWallets = [];
      const seen = new Set();
      for (const msg of data) {
        const contactWallet = msg.sender_wallet === walletAddress ? msg.recipient_wallet : msg.sender_wallet;
        if (!seen.has(contactWallet)) {
          seen.add(contactWallet);
          contactWallets.push(contactWallet);
        }
      }

      const top = contactWallets.slice(0, 10);
      const profileMap = await getUserProfiles(top);
      const contacts = top.map((wallet) => {
        const p = profileMap.get(wallet);
        return {
          id: p?.id || null,
          name: p?.name || wallet,
          wallet_address: wallet,
          image: resolveImage(p?.image),
          isWriter: p?.isWriter || false,
          isArtist: p?.isArtist || false,
          isSuperuser: p?.isSuperuser || false,
        };
      });
      setRecentChats(contacts);
    } catch (error) {
      console.error("Error in fetchRecentChats:", error.message);
      setError("Failed to load recent chats: " + error.message);
    }
  }, [walletAddress, getUserProfiles]);

  const fetchUsers = useCallback(async () => {
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
      console.error("Error in fetchUsers:", error.message);
      setError("Failed to load users: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, walletAddress]);

  useEffect(() => {
    fetchRecentChats();
  }, [fetchRecentChats]);

  useEffect(() => {
    const debounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounce);
  }, [fetchUsers]);

  // -- group messages ------------------------------------------------------
  const fetchGroupMessages = useCallback(async () => {
    if (!walletAddress) return;
    setLoading(true);
    try {
      const { data: messagesData, error } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;

      if (!messagesData || messagesData.length === 0) {
        setMessages([]);
        return;
      }

      // One batched profile fetch for every sender in the thread.
      const profileMap = await getUserProfiles(messagesData.map((m) => m.wallet_address));

      // One batched fetch for every parent message being replied to.
      const parentIds = [...new Set(messagesData.filter((m) => m.parent_id).map((m) => m.parent_id))];
      let parentMap = new Map();
      if (parentIds.length > 0) {
        const { data: parents, error: parentsError } = await supabase
          .from("messages")
          .select("id, wallet_address, content")
          .in("id", parentIds);
        if (parentsError) console.error("Error fetching parent messages:", parentsError.message);
        const parentProfileMap = await getUserProfiles((parents || []).map((p) => p.wallet_address));
        parentMap = new Map(
          (parents || []).map((p) => [
            p.id,
            {
              name: parentProfileMap.get(p.wallet_address)?.name || p.wallet_address || "Unknown",
              content: p.content || null,
            },
          ])
        );
      }

      const enriched = messagesData.map((msg) => ({
        ...msg,
        ...buildEnrichedFields(profileMap.get(msg.wallet_address), msg.wallet_address),
        parent_name: parentMap.get(msg.parent_id)?.name || null,
        parent_content: parentMap.get(msg.parent_id)?.content || null,
      }));

      setMessages(enriched);
    } catch (error) {
      console.error("Error in fetchGroupMessages:", error.message);
      setError("Failed to load group messages: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, getUserProfiles]);

  // Append a single new message instead of refetching the entire thread.
  const appendGroupMessage = useCallback(
    async (msg) => {
      const profileMap = await getUserProfiles([msg.wallet_address]);
      let parent_name = null;
      let parent_content = null;
      if (msg.parent_id) {
        const { data: parentMsg } = await supabase
          .from("messages")
          .select("wallet_address, content")
          .eq("id", msg.parent_id)
          .maybeSingle();
        if (parentMsg) {
          const parentProfileMap = await getUserProfiles([parentMsg.wallet_address]);
          parent_name = parentProfileMap.get(parentMsg.wallet_address)?.name || parentMsg.wallet_address;
          parent_content = parentMsg.content || null;
        }
      }
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev; // avoid dupes with optimistic insert
        return [
          ...prev,
          {
            ...msg,
            ...buildEnrichedFields(profileMap.get(msg.wallet_address), msg.wallet_address),
            parent_name,
            parent_content,
          },
        ];
      });
    },
    [getUserProfiles]
  );

  // -- private messages ------------------------------------------------------
  const fetchPrivateMessages = useCallback(
    async (recipientWallet) => {
      if (!walletAddress || !recipientWallet) return;
      setLoading(true);
      try {
        const { data: messagesData, error } = await supabase
          .from("private_messages")
          .select("*")
          .or(
            `and(sender_wallet.eq.${walletAddress},recipient_wallet.eq.${recipientWallet}),and(sender_wallet.eq.${recipientWallet},recipient_wallet.eq.${walletAddress})`
          )
          .order("created_at", { ascending: true });
        if (error) throw error;

        if (!messagesData || messagesData.length === 0) {
          setPrivateMessages((prev) => ({ ...prev, [recipientWallet]: [] }));
          return;
        }

        const profileMap = await getUserProfiles(messagesData.map((m) => m.sender_wallet));
        const parentIds = [...new Set(messagesData.filter((m) => m.parent_id).map((m) => m.parent_id))];
        let parentMap = new Map();
        if (parentIds.length > 0) {
          const { data: parents, error: parentsError } = await supabase
            .from("private_messages")
            .select("id, sender_wallet, content")
            .in("id", parentIds);
          if (parentsError) console.error("Error fetching parent private messages:", parentsError.message);
          const parentProfileMap = await getUserProfiles((parents || []).map((p) => p.sender_wallet));
          parentMap = new Map(
            (parents || []).map((p) => [
              p.id,
              {
                name: parentProfileMap.get(p.sender_wallet)?.name || p.sender_wallet || "Unknown",
                content: p.content || null,
              },
            ])
          );
        }

        const enriched = messagesData.map((msg) => ({
          ...msg,
          ...buildEnrichedFields(profileMap.get(msg.sender_wallet), msg.sender_wallet),
          status: msg.status || "sent",
          parent_name: parentMap.get(msg.parent_id)?.name || null,
          parent_content: parentMap.get(msg.parent_id)?.content || null,
        }));

        setPrivateMessages((prev) => ({ ...prev, [recipientWallet]: enriched }));

        await supabase
          .from("private_messages")
          .update({ status: "read" })
          .eq("recipient_wallet", walletAddress)
          .eq("sender_wallet", recipientWallet)
          .in("status", ["sent", "delivered"]);
      } catch (error) {
        console.error("Error in fetchPrivateMessages:", error.message);
        setError("Failed to load private messages: " + error.message);
      } finally {
        setLoading(false);
      }
    },
    [walletAddress, getUserProfiles]
  );

  const appendPrivateMessage = useCallback(
    async (msg, recipientWallet) => {
      const profileMap = await getUserProfiles([msg.sender_wallet]);
      let parent_name = null;
      let parent_content = null;
      if (msg.parent_id) {
        const { data: parentMsg } = await supabase
          .from("private_messages")
          .select("sender_wallet, content")
          .eq("id", msg.parent_id)
          .maybeSingle();
        if (parentMsg) {
          const parentProfileMap = await getUserProfiles([parentMsg.sender_wallet]);
          parent_name = parentProfileMap.get(parentMsg.sender_wallet)?.name || parentMsg.sender_wallet;
          parent_content = parentMsg.content || null;
        }
      }
      setPrivateMessages((prev) => {
        const existing = prev[recipientWallet] || [];
        if (existing.some((m) => m.id === msg.id)) return prev;
        return {
          ...prev,
          [recipientWallet]: [
            ...existing,
            {
              ...msg,
              ...buildEnrichedFields(profileMap.get(msg.sender_wallet), msg.sender_wallet),
              status: msg.status || "sent",
              parent_name,
              parent_content,
            },
          ],
        };
      });
    },
    [getUserProfiles]
  );

  // -- realtime subscriptions ------------------------------------------------
  useEffect(() => {
    if (!walletAddress) return;

    if (activeChat === "group") {
      fetchGroupMessages();
      const groupChannel = supabase
        .channel("group-messages")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          (payload) => appendGroupMessage(payload.new)
        )
        .subscribe();
      return () => supabase.removeChannel(groupChannel);
    }

    fetchPrivateMessages(activeChat);
    const privateChannel = supabase
      .channel(`private-messages-${activeChat}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "private_messages",
          filter: `or(sender_wallet.eq.${walletAddress},recipient_wallet.eq.${walletAddress})`,
        },
        (payload) => {
          const msg = payload.new;
          const isRelevant =
            (msg.sender_wallet === walletAddress && msg.recipient_wallet === activeChat) ||
            (msg.sender_wallet === activeChat && msg.recipient_wallet === walletAddress);
          if (isRelevant) appendPrivateMessage(msg, activeChat);
        }
      )
      .subscribe();
    return () => supabase.removeChannel(privateChannel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChat, walletAddress]);

  // -- typing indicator ------------------------------------------------------
  useEffect(() => {
    if (!walletAddress || activeChat === "group") {
      if (typingChannelRef.current) {
        typingChannelRef.current.unsubscribe();
        typingChannelRef.current = null;
      }
      return;
    }

    const channel = supabase.channel(`typing:${activeChat}`);
    channel
      .on("presence", { event: "typing" }, (payload) => {
        if (payload.user !== walletAddress) {
          setTypingUsers((prev) => ({ ...prev, [activeChat]: payload.typing ? payload.user : null }));
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") typingChannelRef.current = channel;
      });

    return () => {
      channel.unsubscribe();
      typingChannelRef.current = null;
      clearTimeout(typingTimeoutRef.current);
    };
  }, [walletAddress, activeChat]);

  const handleTyping = useCallback(() => {
    if (!typingChannelRef.current || activeChat === "group") return;
    typingChannelRef.current.track({ typing: true, user: walletAddress });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      typingChannelRef.current?.track({ typing: false, user: walletAddress });
    }, 2000);
  }, [activeChat, walletAddress]);

  // -- scrolling --------------------------------------------------------------
  // Only auto-scroll if the reader is already near the bottom, so scrolling
  // back through history doesn't get yanked away by an incoming message.
  const isNearBottom = () => {
    const el = messagesContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 200;
  };

  useEffect(() => {
    if (isNearBottom()) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, privateMessages, activeChat]);

  // -- attachments --------------------------------------------------------------
  const handleFileChange = (e) => {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    setFilePreview(selected ? URL.createObjectURL(selected) : null);
  };

  const clearAttachment = () => {
    setFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // -- sending --------------------------------------------------------------
  const handleSend = useCallback(
    async (gifUrl = null) => {
      const trimmed = input.trim();
      if ((!trimmed && !file && !gifUrl) || !walletAddress || uploading) return;

      setUploading(true);
      setSending(true);
      let mediaUrl = gifUrl;

      try {
        if (file && !gifUrl) {
          const fileName = `${crypto.randomUUID()}.${file.name.split(".").pop()}`;
          const { error: uploadError } = await supabase.storage.from("chat-media").upload(fileName, file);
          if (uploadError) throw new Error("Failed to upload file: " + uploadError.message);
          const { data } = supabase.storage.from("chat-media").getPublicUrl(fileName);
          mediaUrl = data.publicUrl;
        }

        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("id, name")
          .eq("wallet_address", walletAddress)
          .maybeSingle();
        if (userError || !userData) throw new Error("User not found: " + (userError?.message || "No data"));

        let parent_name = null;
        let parent_content = null;
        if (replyingTo) {
          const table = activeChat === "group" ? "messages" : "private_messages";
          const addressCol = activeChat === "group" ? "wallet_address" : "sender_wallet";
          const localList = activeChat === "group" ? messages : privateMessages[activeChat] || [];
          const localParent = localList.find((m) => m.id === replyingTo);
          if (localParent) {
            parent_name = localParent.name;
            parent_content = localParent.content;
          } else {
            const { data: parentMsg } = await supabase
              .from(table)
              .select(`${addressCol}, content`)
              .eq("id", replyingTo)
              .maybeSingle();
            if (parentMsg) {
              const profileMap = await getUserProfiles([parentMsg[addressCol]]);
              parent_name = profileMap.get(parentMsg[addressCol])?.name || parentMsg[addressCol];
              parent_content = parentMsg.content || null;
            }
          }
        }

        if (activeChat === "group") {
          const tempId = `temp-${crypto.randomUUID()}`;
          const optimistic = {
            id: tempId,
            wallet_address: walletAddress,
            user_id: userData.id,
            name: userData.name || walletAddress,
            content: trimmed || null,
            media_url: mediaUrl,
            parent_id: replyingTo,
            created_at: new Date().toISOString(),
            parent_name,
            parent_content,
            _optimistic: true,
          };
          setMessages((prev) => [...prev, optimistic]);

          const { data, error } = await supabase
            .from("messages")
            .insert({
              wallet_address: walletAddress,
              user_id: userData.id,
              content: trimmed || null,
              media_url: mediaUrl,
              parent_id: replyingTo,
            })
            .select()
            .maybeSingle();

          if (error) {
            setError("Failed to send group message: " + error.message);
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
          } else if (data) {
            setMessages((prev) =>
              prev.map((m) => (m.id === tempId ? { ...m, ...data, _optimistic: false } : m))
            );
          }
        } else {
          const tempId = `temp-${crypto.randomUUID()}`;
          const newMessage = {
            id: tempId,
            sender_wallet: walletAddress,
            recipient_wallet: activeChat,
            content: trimmed || null,
            media_url: mediaUrl,
            parent_id: replyingTo,
            status: "sending",
            created_at: new Date().toISOString(),
            name: userData.name || walletAddress,
            user_id: userData.id,
            parent_name,
            parent_content,
          };

          setPrivateMessages((prev) => ({
            ...prev,
            [activeChat]: [...(prev[activeChat] || []), newMessage],
          }));

          const { data, error } = await supabase
            .from("private_messages")
            .insert({
              sender_wallet: walletAddress,
              recipient_wallet: activeChat,
              content: trimmed || null,
              media_url: mediaUrl,
              parent_id: replyingTo,
              status: "sent",
            })
            .select()
            .maybeSingle();

          if (error) {
            setError("Failed to send private message: " + error.message);
            setPrivateMessages((prev) => ({
              ...prev,
              [activeChat]: (prev[activeChat] || []).filter((m) => m.id !== tempId),
            }));
          } else if (data) {
            setPrivateMessages((prev) => ({
              ...prev,
              [activeChat]: (prev[activeChat] || []).map((m) =>
                m.id === tempId ? { ...m, id: data.id, status: "sent" } : m
              ),
            }));

            const { data: recipientData } = await supabase
              .from("users")
              .select("id, wallet_address")
              .eq("wallet_address", activeChat)
              .maybeSingle();

            if (recipientData && recipientData.wallet_address !== walletAddress) {
              await supabase.from("notifications").insert({
                user_id: recipientData.id,
                recipient_wallet_address: activeChat,
                sender_wallet_address: walletAddress,
                message: `${userData.name || walletAddress} sent you a message: "${trimmed || "Media"}"`,
                type: "private_message",
                chat_id: data.id,
                is_read: false,
                created_at: new Date().toISOString(),
              });
            }
            fetchRecentChats();
          }
        }

        setInput("");
        clearAttachment();
        setReplyingTo(null);
        setShowGifPicker(false);
      } catch (err) {
        setError(err.message);
      } finally {
        setUploading(false);
        setSending(false);
      }
    },
    [input, file, walletAddress, uploading, replyingTo, activeChat, fetchRecentChats, messages, privateMessages, getUserProfiles]
  );

  const handleInputKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReply = (id) => setReplyingTo(id);
  const handleGifSelect = (url) => handleSend(url);
  const switchChat = (chatId) => {
    setActiveChat(chatId);
    if (chatId !== "group" && !privateMessages[chatId]) fetchPrivateMessages(chatId);
    setReplyingTo(null);
    setSidebarOpen(false);
  };
  const handleScrollToParent = (parentId) => {
    const element = document.getElementById(`message-${parentId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add(styles.highlightFlash);
      setTimeout(() => element.classList.remove(styles.highlightFlash), 1200);
    }
  };

  const activeChatName = useMemo(() => {
    if (activeChat === "group") return null;
    return truncateName(
      recentChats.find((u) => u.wallet_address === activeChat)?.name ||
        users.find((u) => u.wallet_address === activeChat)?.name ||
        activeChat
    );
  }, [activeChat, recentChats, users]);

  const currentThread = activeChat === "group" ? messages : privateMessages[activeChat] || [];

  return (
    <div className={styles.chatContainer}>
      <nav className={styles.navbar}>
        <Link href="/" className={styles.logoLink}>
          <img src="/images/logo.jpeg" alt="Home" className={styles.logo} />
        </Link>
        <button
          className={styles.sidebarToggle}
          onClick={() => setSidebarOpen((prev) => !prev)}
          aria-label="Toggle chat list"
        >
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
          </svg>
        </button>
        <div className={styles.chatTitle}>
          {activeChat === "group" ? (
            <>
              <span className={styles.liveDot} /> Group Chat
            </>
          ) : (
            `Chat with ${activeChatName}`
          )}
        </div>
      </nav>

      {error && (
        <div className={styles.error} role="alert">
          {error}
          <button className={styles.errorDismiss} onClick={() => setError(null)} aria-label="Dismiss">×</button>
        </div>
      )}

      <div className={styles.chatLayout}>
        {sidebarOpen && <div className={styles.sidebarScrim} onClick={() => setSidebarOpen(false)} />}
        <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}>
          <div className={styles.sidebarContent}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users…"
              className={styles.searchInput}
              disabled={!walletAddress}
              aria-label="Search users"
            />
            <div className={styles.chatList}>
              <div
                className={`${styles.chatItem} ${activeChat === "group" ? styles.activeChat : ""}`}
                onClick={() => switchChat("group")}
              >
                <span>Group Chat</span>
              </div>
              {recentChats.length > 0 && !searchTerm.trim() && (
                <>
                  <div className={styles.sectionHeader}>Recent Chats</div>
                  {recentChats.map((chat) => (
                    <div
                      key={chat.wallet_address}
                      className={`${styles.chatItem} ${activeChat === chat.wallet_address ? styles.activeChat : ""}`}
                      onClick={() => switchChat(chat.wallet_address)}
                    >
                      <div className={styles.userInfo}>
                        {chat.image ? (
                          <img src={chat.image} alt="" className={styles.sidebarProfileImage} />
                        ) : (
                          <div className={styles.sidebarProfilePlaceholder} />
                        )}
                        <span>{truncateName(chat.name)}</span>
                        <span className={onlineUsers.has(chat.wallet_address) ? styles.onlineDot : styles.offlineDot} />
                      </div>
                    </div>
                  ))}
                </>
              )}
              {searchTerm.trim() && (
                <>
                  <div className={styles.sectionHeader}>Search Results</div>
                  {loading && users.length === 0 ? (
                    <p className={styles.noResults}>Searching…</p>
                  ) : users.length === 0 ? (
                    <p className={styles.noResults}>No users found</p>
                  ) : (
                    users.map((user) => (
                      <div
                        key={user.wallet_address}
                        className={`${styles.chatItem} ${activeChat === user.wallet_address ? styles.activeChat : ""}`}
                        onClick={() => switchChat(user.wallet_address)}
                      >
                        <div className={styles.userInfo}>
                          {user.image ? (
                            <img src={user.image} alt="" className={styles.sidebarProfileImage} />
                          ) : (
                            <div className={styles.sidebarProfilePlaceholder} />
                          )}
                          <span>{truncateName(user.name)}</span>
                          <span className={onlineUsers.has(user.wallet_address) ? styles.onlineDot : styles.offlineDot} />
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          </div>
        </aside>

        <main className={styles.messages} ref={messagesContainerRef}>
          {loading && currentThread.length === 0 && (
            <div className={styles.skeletonWrap} aria-hidden="true">
              <div className={styles.skeletonBubble} />
              <div className={`${styles.skeletonBubble} ${styles.skeletonBubbleRight}`} />
              <div className={styles.skeletonBubble} />
            </div>
          )}
          {!loading && currentThread.length === 0 && (
            <div className={styles.emptyThread}>
              <p>No messages yet — say hello.</p>
            </div>
          )}
          {currentThread.map((msg, index) => (
            <div
              key={msg.id || `${msg.created_at}-${msg.sender_wallet || msg.wallet_address}-${index}`}
              id={`message-${msg.id || index}`}
              className={msg._optimistic ? styles.optimisticMessage : ""}
            >
              <Message
                msg={msg}
                walletAddress={walletAddress}
                onReply={handleReply}
                isPrivate={activeChat !== "group"}
                onScrollToParent={handleScrollToParent}
                isOnline={onlineUsers.has(msg.wallet_address || msg.sender_wallet)}
              />
            </div>
          ))}
          {activeChat !== "group" && typingUsers[activeChat] && (
            <div className={styles.typingIndicator}>
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
            </div>
          )}
          <div ref={messagesEndRef} />
        </main>
      </div>

      {replyingTo && (
        <div className={styles.replyIndicator}>
          {(() => {
            const parentMsg = currentThread.find((m) => m.id === replyingTo);
            return (
              <span className={styles.replyingTo}>
                Replying to <strong>{truncateName(parentMsg?.name) || "Unknown"}</strong>
                {parentMsg?.content ? `: ${parentMsg.content.slice(0, 50)}${parentMsg.content.length > 50 ? "…" : ""}` : ""}
              </span>
            );
          })()}
          <button onClick={() => setReplyingTo(null)} className={styles.cancelButton} aria-label="Cancel reply">
            <svg className={styles.cancelIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>
      )}

      {filePreview && (
        <div className={styles.attachmentPreview}>
          <img src={filePreview} alt="Attachment preview" />
          <button onClick={clearAttachment} aria-label="Remove attachment" className={styles.cancelButton}>
            <svg className={styles.cancelIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>
      )}

      <footer className={styles.inputArea}>
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            handleTyping();
          }}
          onKeyDown={handleInputKeyDown}
          placeholder="Type a message…"
          className={styles.input}
          disabled={uploading || !walletAddress}
          aria-label="Message"
        />
        <label htmlFor="file-upload" className={styles.iconButton} aria-label="Attach an image">
          <svg className={styles.icon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M16.5 6v11.5a4 4 0 0 1-8 0V5a2.5 2.5 0 0 1 5 0v11.5a1 1 0 0 1-2 0V6" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          </svg>
        </label>
        <input
          id="file-upload"
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className={styles.hiddenInput}
          disabled={uploading}
        />
        <button
          onClick={() => setShowGifPicker((prev) => !prev)}
          className={styles.iconButton}
          disabled={uploading}
          aria-label="Choose a GIF"
        >
          <svg className={styles.icon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M19 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm-2 10h-3v3h-2v-3H9v-2h3V9h2v3h3v2z" />
          </svg>
        </button>
        <button
          onClick={() => handleSend()}
          className={styles.sendButton}
          disabled={uploading || sending || (!input.trim() && !file)}
          aria-label="Send message"
        >
          <svg className={styles.icon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M2 21L23 12 2 3v7l15 2-15 2z" />
          </svg>
        </button>
      </footer>

      {showGifPicker && <GifPicker onSelect={handleGifSelect} onClose={() => setShowGifPicker(false)} />}
    </div>
  );
}