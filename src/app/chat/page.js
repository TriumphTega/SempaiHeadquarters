"use client";

import { useState, useEffect, useRef, useCallback, useContext } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/services/supabase/supabaseClient";
import { EmbeddedWalletContext } from "@/components/EmbeddedWalletProvider";
import styles from "./Chat.module.css";

function Message({ msg, walletAddress, onReply, isPrivate }) {
  const isOwnMessage = isPrivate
    ? msg.sender_wallet === walletAddress
    : msg.wallet_address === walletAddress;

  return (
    <div
      className={`${styles.message} ${isOwnMessage ? styles.ownMessage : styles.otherMessage}`}
    >
      <div className={styles.messageHeader}>
        {msg.profile_image ? (
          <img src={msg.profile_image} alt="Profile" className={styles.profileImage} />
        ) : (
          <div className={styles.profilePlaceholder} />
        )}
        <span className={styles.userName}>
          {msg.is_writer ? (
            <Link href={`/writers-profile/${msg.user_id}`} className={styles.writerNameLink}>
              {msg.name}
            </Link>
          ) : (
            msg.name
          )}
          {msg.is_writer && (
            <span className={styles.writerBadge}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#F28C38">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
              </svg>
            </span>
          )}
        </span>
        {isPrivate && (
          <span className={styles.messageStatus}>
            {msg.status === "sending" ? "..." : msg.status === "read" ? "✓✓" : msg.status === "delivered" ? "✓" : ""}
          </span>
        )}
      </div>
      <div className={styles.messageBody}>
        {msg.content && <p className={styles.messageContent}>{msg.content}</p>}
        {msg.media_url && (
          <img src={msg.media_url} alt="Media" className={styles.mediaImage} />
        )}
        {msg.parent_id && (
          <p className={styles.replyInfo}>
            Replied to {msg.parent_name || "unknown"}{" "}
            {msg.parent_content && (
              <span className={styles.parentContent}>
                <i>
                  {msg.parent_content.slice(0, 30)}
                  {msg.parent_content.length > 30 ? "..." : ""}
                </i>
              </span>
            )}
          </p>
        )}
        <button onClick={() => onReply(msg.id)} className={styles.replyButton}>
          <svg className={styles.replyIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function GifPicker({ onSelect, onClose }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchGifs = useCallback(async (query) => {
    if (!query.trim()) {
      setGifs([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("gifs")
        .select("id, title, url")
        .ilike("title", `%${query}%`)
        .limit(20);
      if (error) throw error;
      setGifs(data || []);
    } catch (error) {
      console.error("Error fetching GIFs:", error);
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
    <div className={styles.gifPicker}>
      <div className={styles.gifPickerHeader}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search GIFs..."
          className={styles.gifSearchInput}
          autoFocus
        />
        <button onClick={onClose} className={styles.closeButton}>
          <svg className={styles.closeIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>
      <div className={styles.gifGrid}>
        {loading ? (
          <p className={styles.loadingText}>Loading...</p>
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
        ) : (
          <p className={styles.noResults}>No GIFs found</p>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { wallet: embeddedWallet } = useContext(EmbeddedWalletContext);
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [file, setFile] = useState(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([]);
  const [activeChat, setActiveChat] = useState("group");
  const [privateMessages, setPrivateMessages] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [typingChannel, setTypingChannel] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const wallet = embeddedWallet?.publicKey || localStorage.getItem("walletAddress") || "";
    setWalletAddress(wallet);
    if (embeddedWallet?.publicKey) localStorage.setItem("walletAddress", wallet);
    if (!wallet) setError("Please connect your wallet to chat.");

    const messageId = searchParams.get("messageId");
    const recipient = searchParams.get("recipient");
    if (recipient) {
      setActiveChat(recipient);
    }
    if (messageId) {
      setTimeout(() => {
        const element = document.getElementById(`message-${messageId}`);
        if (element) element.scrollIntoView({ behavior: "smooth" });
      }, 1000); // Delay to ensure messages load
    }
  }, [embeddedWallet?.publicKey, searchParams]);

  const fetchUsers = useCallback(async () => {
    if (!searchTerm.trim() || !walletAddress) {
      setUsers([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, wallet_address, image, isWriter")
        .ilike("name", `%${searchTerm}%`)
        .neq("wallet_address", walletAddress)
        .limit(10);
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      setError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, walletAddress]);

  useEffect(() => {
    const debounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, fetchUsers]);

  const fetchGroupMessages = useCallback(async () => {
    if (!walletAddress) return;
    setLoading(true);
    try {
      const res = await fetch("/api/chat", { method: "GET" });
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages);
      } else {
        setError(data.message || "Failed to load group messages.");
      }
    } catch (error) {
      console.error("Error fetching group messages:", error);
      setError("Failed to load group messages.");
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  const fetchPrivateMessages = useCallback(
    async (recipientWallet) => {
      if (!walletAddress || !recipientWallet) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("private_messages")
          .select("*")
          .or(
            `and(sender_wallet.eq.${walletAddress},recipient_wallet.eq.${recipientWallet}),and(sender_wallet.eq.${recipientWallet},recipient_wallet.eq.${walletAddress})`
          )
          .order("created_at", { ascending: true });
        if (error) throw error;
        const enrichedMessages = await Promise.all(
          data.map(async (msg) => {
            const { data: userData } = await supabase
              .from("users")
              .select("id, name, image, isWriter")
              .eq("wallet_address", msg.sender_wallet)
              .single();
            return {
              ...msg,
              user_id: userData?.id || null,
              name: userData?.name || msg.sender_wallet,
              profile_image: userData?.image
                ? userData.image.startsWith("data:image/")
                  ? userData.image
                  : `data:image/jpeg;base64,${userData.image}`
                : null,
              is_writer: userData?.isWriter || false,
              status: msg.status || "sent",
            };
          })
        );
        setPrivateMessages((prev) => ({
          ...prev,
          [recipientWallet]: enrichedMessages,
        }));
        await supabase
          .from("private_messages")
          .update({ status: "read" })
          .eq("recipient_wallet", walletAddress)
          .eq("sender_wallet", recipientWallet)
          .in("status", ["sent", "delivered"]);
      } catch (error) {
        console.error("Error fetching private messages:", error);
        setError("Failed to load private messages.");
      } finally {
        setLoading(false);
      }
    },
    [walletAddress]
  );

  useEffect(() => {
    if (activeChat === "group") fetchGroupMessages();
    else if (activeChat !== "group") fetchPrivateMessages(activeChat);
  }, [activeChat, fetchGroupMessages, fetchPrivateMessages]);

  useEffect(() => {
    if (!walletAddress) return;

    const groupChannel = supabase
      .channel("group_chat_updates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          try {
            const { data: userData } = await supabase
              .from("users")
              .select("id, name, image, isWriter")
              .eq("wallet_address", payload.new.wallet_address)
              .single();
            const newMessage = {
              ...payload.new,
              user_id: userData?.id || null,
              name: userData?.name || payload.new.wallet_address,
              profile_image: userData?.image
                ? userData.image.startsWith("data:image/")
                  ? userData.image
                  : `data:image/jpeg;base64,${userData.image}`
                : null,
              is_writer: userData?.isWriter || false,
            };
            if (activeChat === "group") {
              setMessages((prev) => [...prev, newMessage]);
            }
          } catch (error) {
            console.error("Error processing group message:", error);
          }
        }
      )
      .subscribe();

    const privateChannel = supabase
      .channel("private_chat_updates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "private_messages" },
        async (payload) => {
          try {
            const { sender_wallet, recipient_wallet } = payload.new;
            const chatKey =
              sender_wallet === walletAddress ? recipient_wallet : sender_wallet;
            const { data: userData } = await supabase
              .from("users")
              .select("id, name, image, isWriter")
              .eq("wallet_address", sender_wallet)
              .single();
            const newMessage = {
              ...payload.new,
              user_id: userData?.id || null,
              name: userData?.name || sender_wallet,
              profile_image: userData?.image
                ? userData.image.startsWith("data:image/")
                  ? userData.image
                  : `data:image/jpeg;base64,${userData.image}`
                : null,
              is_writer: userData?.isWriter || false,
              status: "delivered",
            };
            setPrivateMessages((prev) => ({
              ...prev,
              [chatKey]: [...(prev[chatKey] || []), newMessage],
            }));
            if (activeChat === chatKey && recipient_wallet === walletAddress) {
              await supabase
                .from("private_messages")
                .update({ status: "read" })
                .eq("id", payload.new.id);
              setPrivateMessages((prev) => ({
                ...prev,
                [chatKey]: prev[chatKey].map((msg) =>
                  msg.id === payload.new.id ? { ...msg, status: "read" } : msg
                ),
              }));
            }
          } catch (error) {
            console.error("Error processing private message:", error);
          }
        }
      )
      .subscribe();

    const presenceChannel = supabase.channel("user_presence").on(
      "presence",
      { event: "sync" },
      () => {
        const state = presenceChannel.presenceState();
        const online = new Set();
        Object.keys(state).forEach((key) => online.add(key));
        setOnlineUsers(online);
      }
    ).subscribe();

    if (walletAddress) presenceChannel.track({ online_at: new Date().toISOString() });

    return () => {
      groupChannel.unsubscribe();
      privateChannel.unsubscribe();
      presenceChannel.unsubscribe();
    };
  }, [walletAddress, activeChat]);

  useEffect(() => {
    if (!walletAddress || activeChat === "group") {
      if (typingChannel) {
        typingChannel.unsubscribe();
        setTypingChannel(null);
      }
      return;
    }

    const channel = supabase.channel(`typing:${activeChat}`);
    channel.on(
      "presence",
      { event: "typing" },
      (payload) => {
        if (payload.user !== walletAddress) {
          setTypingUsers((prev) => ({
            ...prev,
            [activeChat]: payload.typing ? payload.user : null,
          }));
        }
      }
    ).subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setTypingChannel(channel);
      }
    });

    return () => {
      if (channel) channel.unsubscribe();
      setTypingChannel(null);
    };
  }, [walletAddress, activeChat]);

  const handleTyping = useCallback(() => {
    if (!typingChannel || activeChat === "group") return;

    typingChannel.track({ typing: true, user: walletAddress });
    clearTimeout(window.typingTimeout);
    window.typingTimeout = setTimeout(() => {
      typingChannel.track({ typing: false, user: walletAddress });
    }, 2000);
  }, [typingChannel, activeChat, walletAddress]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, privateMessages, activeChat]);

  const handleSend = useCallback(
    async (gifUrl = null) => {
      if ((!input.trim() && !file && !gifUrl) || !walletAddress || uploading) return;

      setUploading(true);
      setSending(true);
      let mediaUrl = gifUrl;

      if (file && !gifUrl) {
        const fileName = `${Date.now()}.${file.name.split(".").pop()}`;
        const { error } = await supabase.storage.from("chat-media").upload(fileName, file);
        if (!error) {
          const { data } = supabase.storage.from("chat-media").getPublicUrl(fileName);
          mediaUrl = data.publicUrl;
        } else {
          console.error("File upload failed:", error.message);
          setError("Failed to upload file.");
          setUploading(false);
          setSending(false);
          return;
        }
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, name")
        .eq("wallet_address", walletAddress)
        .single();

      if (userError || !userData) {
        console.error("User fetch failed:", userError?.message);
        setError("User not found.");
        setUploading(false);
        setSending(false);
        return;
      }

      if (activeChat === "group") {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet_address: walletAddress,
            user_id: userData.id,
            content: input.trim() || null,
            media_url: mediaUrl,
            parent_id: replyingTo,
          }),
        });
        const result = await res.json();
        if (!result.success) {
          console.error("Failed to send group message:", result.message);
          setError(result.message || "Failed to send group message.");
        }
      } else {
        const newMessage = {
          sender_wallet: walletAddress,
          recipient_wallet: activeChat,
          content: input.trim() || null,
          media_url: mediaUrl,
          parent_id: replyingTo,
          status: "sending",
          created_at: new Date().toISOString(),
          name: userData.name || walletAddress,
          user_id: userData.id,
          profile_image: null,
          is_writer: false,
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
            content: input.trim() || null,
            media_url: mediaUrl,
            parent_id: replyingTo,
            status: "sent",
          })
          .select()
          .single();

        if (error) {
          console.error("Failed to send private message:", error.message);
          setError("Failed to send private message: " + error.message);
          setUploading(false);
          setSending(false);
          return;
        }

        setPrivateMessages((prev) => ({
          ...prev,
          [activeChat]: prev[activeChat].map((msg) =>
            msg.status === "sending" && msg.created_at === newMessage.created_at
              ? { ...msg, id: data.id, status: "sent" }
              : msg
          ),
        }));

        // Insert notification for private message
        const { data: recipientData, error: recipientError } = await supabase
          .from("users")
          .select("id")
          .eq("wallet_address", activeChat)
          .single();

        if (recipientError || !recipientData) {
          console.error("Recipient fetch failed:", recipientError?.message);
          setError("Recipient not found.");
        } else {
          const notificationMessage = `${userData.name || walletAddress} sent you a message: "${input.trim() || "Media"}"`;
          const { error: notificationError } = await supabase
            .from("notifications")
            .insert({
              user_id: recipientData.id,
              recipient_wallet_address: activeChat,
              message: notificationMessage,
              type: "private_message",
              chat_id: data.id, // Ensure this matches private_messages(id)
              is_read: false,
              created_at: new Date().toISOString(),
            });

          if (notificationError) {
            console.error("Failed to insert private message notification:", notificationError.message);
            setError("Failed to save notification: " + notificationError.message);
          }
        }
      }

      setInput("");
      setFile(null);
      setReplyingTo(null);
      setShowGifPicker(false);
      setUploading(false);
      setSending(false);
    },
    [input, file, walletAddress, uploading, replyingTo, activeChat]
  );

  const handleFileChange = (e) => setFile(e.target.files?.[0] || null);
  const handleReply = (id) => setReplyingTo(id);
  const handleGifSelect = (url) => handleSend(url);
  const switchChat = (chatId) => {
    setActiveChat(chatId);
    if (chatId !== "group" && !privateMessages[chatId]) {
      fetchPrivateMessages(chatId);
    }
    setReplyingTo(null);
    setSidebarOpen(false);
  };

  return (
    <div className={styles.chatContainer}>
      <header className={styles.header}>
        <button
          className={styles.sidebarToggle}
          onClick={() => setSidebarOpen((prev) => !prev)}
        >
          ☰
        </button>
        {activeChat === "group"
          ? "Live Group Chat"
          : `Chat with ${users.find((u) => u.wallet_address === activeChat)?.name || activeChat}`}
      </header>

      {error && <div className={styles.error}>{error}</div>}
      {loading && <div className={styles.loading}>Loading messages...</div>}

      <div className={styles.chatLayout}>
        <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}>
          <div className={styles.sidebarContent}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users..."
              className={styles.searchInput}
              disabled={!walletAddress}
            />
            <div className={styles.chatList}>
              <div
                className={`${styles.chatItem} ${activeChat === "group" ? styles.activeChat : ""}`}
                onClick={() => switchChat("group")}
              >
                <span>Group Chat</span>
              </div>
              {users.map((user) => (
                <div
                  key={user.wallet_address}
                  className={`${styles.chatItem} ${activeChat === user.wallet_address ? styles.activeChat : ""}`}
                  onClick={() => switchChat(user.wallet_address)}
                >
                  <div className={styles.userInfo}>
                    {user.image ? (
                      <img
                        src={user.image}
                        alt="Profile"
                        className={styles.sidebarProfileImage}
                      />
                    ) : (
                      <div className={styles.sidebarProfilePlaceholder} />
                    )}
                    <span>{user.name}</span>
                    <span
                      className={
                        onlineUsers.has(user.wallet_address)
                          ? styles.onlineDot
                          : styles.offlineDot
                      }
                    ></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className={styles.messages}>
          {(activeChat === "group" ? messages : privateMessages[activeChat] || []).map((msg) => (
            <div key={msg.id} id={`message-${msg.id}`}>
              <Message
                msg={msg}
                walletAddress={walletAddress}
                onReply={handleReply}
                isPrivate={activeChat !== "group"}
              />
            </div>
          ))}
          {activeChat !== "group" && typingUsers[activeChat] && (
            <div className={styles.typingIndicator}>Typing...</div>
          )}
          <div ref={messagesEndRef} />
        </main>
      </div>

      {replyingTo && (
        <div className={styles.replyIndicator}>
          {(() => {
            const parentMsg = (activeChat === "group"
              ? messages
              : privateMessages[activeChat] || []
            ).find((m) => m.id === replyingTo);
            return (
              <span className={styles.replyingTo}>
                Replying to <strong>{parentMsg?.name || "Unknown"}</strong>
                {parentMsg?.content
                  ? `: ${parentMsg.content.slice(0, 30)}${parentMsg.content.length > 30 ? "..." : ""}`
                  : ""}
              </span>
            );
          })()}
          <button onClick={() => setReplyingTo(null)} className={styles.cancelButton}>
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
          placeholder="Type a message..."
          className={styles.input}
          disabled={uploading || !walletAddress}
        />
        <label htmlFor="file-upload" className={styles.iconButton}>
          <svg className={styles.icon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 16a6 6 0 1 1 6-6 6 6 0 0 1-6 6z" />
          </svg>
        </label>
        <input
          id="file-upload"
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
        >
          <svg className={styles.icon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M19 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm-2 10h-3v3h-2v-3H9v-2h3V9h2v3h3v2z" />
          </svg>
        </button>
        <button onClick={() => handleSend()} className={styles.sendButton} disabled={uploading || sending}>
          <svg className={styles.icon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M2 21L23 12 2 3v7l15 2-15 2z" />
          </svg>
        </button>
      </footer>

      {showGifPicker && (
        <GifPicker onSelect={handleGifSelect} onClose={() => setShowGifPicker(false)} />
      )}
    </div>
  );
}