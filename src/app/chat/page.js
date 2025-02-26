// ChatPage.jsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/services/supabase/supabaseClient";
import styles from "./Chat.module.css";
import Link from "next/link";

import {
  FaHome,
  FaBars,
  FaTimes,
  FaPaperPlane,
  FaImage,
  FaGift,
  FaSun,
  FaMoon,
  FaReply,
  FaUserCircle,
} from "react-icons/fa";

function Message({ msg, walletAddress, onReply }) {
  const isOwnMessage = msg.wallet_address === walletAddress;

  return (
    <div
      className={`${styles.message} ${isOwnMessage ? styles.ownMessage : styles.otherMessage}`}
    >
      <div className={styles.messageHeader}>
        {msg.profile_image ? (
          <img src={msg.profile_image} alt="Profile" className={styles.profileImage} />
        ) : (
          <FaUserCircle className={styles.profilePlaceholder} />
        )}
        <span className={styles.userName}>{msg.name}</span>
      </div>
      <div className={styles.messageBody}>
        {msg.content && <p className={styles.messageContent}>{msg.content}</p>}
        {msg.media_url && <img src={msg.media_url} alt="Media" className={styles.mediaImage} />}
        {msg.parent_id && (
          <p className={styles.replyInfo}>
            Replied to {msg.parent_name || msg.parent_wallet_address || "unknown"}
          </p>
        )}
        <button onClick={() => onReply(msg.id)} className={styles.replyButton}>
          <FaReply className={styles.replyIcon} />
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
          <FaTimes className={styles.closeIcon} />
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
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const storedWallet = localStorage.getItem("walletAddress") || "";
    setWalletAddress(storedWallet);
  }, []);

  const fetchMessages = useCallback(async () => {
    const res = await fetch("/api/chat", { method: "GET" });
    const data = await res.json();
    if (data.success) setMessages(data.messages);
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    const channel = supabase
      .channel("chat_updates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const { data: userData, error } = await supabase
            .from("users")
            .select("name, image")
            .eq("wallet_address", payload.new.wallet_address)
            .single();

          if (!error) {
            const newMessage = {
              ...payload.new,
              name: userData?.name || payload.new.wallet_address,
              profile_image: userData?.image
                ? userData.image.startsWith("data:image/")
                  ? userData.image
                  : `data:image/jpeg;base64,${userData.image}`
                : null,
              parent_name: payload.new.parent_id
                ? await supabase
                    .from("messages")
                    .select("wallet_address")
                    .eq("id", payload.new.parent_id)
                    .single()
                    .then(async ({ data }) => {
                      const { data: parentUser } = await supabase
                        .from("users")
                        .select("name")
                        .eq("wallet_address", data.wallet_address)
                        .single();
                      return parentUser?.name || data.wallet_address;
                    })
                : null,
            };
            setMessages((prev) => [...prev, newMessage]);
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(
    async (gifUrl = null) => {
      if ((!input.trim() && !file && !gifUrl) || !walletAddress || uploading) return;

      setUploading(true);
      let mediaUrl = gifUrl;

      if (file && !gifUrl) {
        const fileName = `${Date.now()}.${file.name.split(".").pop()}`;
        const { error } = await supabase.storage.from("chat-media").upload(fileName, file);
        if (!error) {
          const { data } = supabase.storage.from("chat-media").getPublicUrl(fileName);
          mediaUrl = data.publicUrl;
        } else {
          console.error("File upload failed:", error);
          setUploading(false);
          return;
        }
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("wallet_address", walletAddress)
        .single();

      if (userError || !userData) {
        console.error("User not found", userError);
        setUploading(false);
        return;
      }

      const user_id = userData.id;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: walletAddress,
          user_id,
          content: input.trim() || null,
          media_url: mediaUrl,
          parent_id: replyingTo,
        }),
      });

      if (res.ok) {
        setInput("");
        setFile(null);
        setReplyingTo(null);
        setShowGifPicker(false);
      } else {
        console.error("Failed to send message:", await res.text());
      }
      setUploading(false);
    },
    [input, file, walletAddress, uploading, replyingTo]
  );

  const handleFileChange = (e) => setFile(e.target.files?.[0] || null);
  const handleReply = (id) => setReplyingTo(id);
  const handleGifSelect = (url) => handleSend(url);
  const toggleMenu = () => setMenuOpen((prev) => !prev);
  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  return (
    <div className={`${styles.page} ${isDarkMode ? styles.darkMode : styles.lightMode}`}>
      {/* Navbar */}
      <nav className={`${styles.navbar} ${menuOpen ? styles.navbarOpen : ""}`}>
        <div className={styles.navContainer}>
          <Link href="/" className={styles.logoLink}>
            <img src="/images/logo.jpg" alt="Sempai HQ" className={styles.logo} />
            <span className={styles.logoText}>Sempai HQ</span>
          </Link>
          <button className={styles.menuToggle} onClick={toggleMenu}>
            {menuOpen ? <FaTimes /> : <FaBars />}
          </button>
          <div className={`${styles.navLinks} ${menuOpen ? styles.navLinksOpen : ""}`}>
            <Link href="/" className={styles.navLink}>
              <FaHome /> Home
            </Link>
            <button onClick={toggleTheme} className={styles.themeToggle}>
              {isDarkMode ? <FaSun /> : <FaMoon />}
            </button>
          </div>
        </div>
      </nav>

      {/* Overlay for mobile menu blur */}
      {menuOpen && <div className={styles.blurOverlay}></div>}

      {/* Messages */}
      <main className={styles.messages}>
        {messages.map((msg) => (
          <Message key={msg.id} msg={msg} walletAddress={walletAddress} onReply={handleReply} />
        ))}
        <div ref={messagesEndRef} />
      </main>

      {/* Reply Indicator */}
      {replyingTo && (
        <div className={styles.replyIndicator}>
          {(() => {
            const parentMsg = messages.find((m) => m.id === replyingTo);
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
            <FaTimes className={styles.cancelIcon} />
          </button>
        </div>
      )}

      {/* Input Area */}
      <footer className={styles.inputArea}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className={styles.input}
          disabled={uploading}
        />
        <label htmlFor="file-upload" className={styles.iconButton}>
          <FaImage />
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
          <FaGift />
        </button>
        <button onClick={() => handleSend()} className={styles.sendButton} disabled={uploading}>
          <FaPaperPlane />
        </button>
      </footer>

      {showGifPicker && <GifPicker onSelect={handleGifSelect} onClose={() => setShowGifPicker(false)} />}
    </div>
  );
}