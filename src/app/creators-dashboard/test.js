"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/services/supabase/supabaseClient";
import styles from "./Chat.module.css";

async function fetchUserDetails(walletAddress) {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("name, image")
      .eq("wallet_address", walletAddress)
      .single();
    if (error || !data) {
      console.error("Error fetching user details:", error);
      return { name: walletAddress, image: null };
    }
    let { name } = data;
    if (name.length > 15) {
      name = `${name.slice(0, 3)}***${name.slice(-3)}`;
    }
    let profile_image = data.image;
    if (profile_image && !profile_image.startsWith("data:image/")) {
      profile_image = `data:image/jpeg;base64,${profile_image}`;
    }
    return { name, profile_image };
  } catch (err) {
    console.error("Unexpected error fetching user details:", err);
    return { name: walletAddress, profile_image: null };
  }
}

async function uploadMedia(file) {
  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = fileName;
    const { error: uploadError } = await supabase.storage
      .from("chat-media")
      .upload(filePath, file);
    if (uploadError) throw uploadError;
    const result = supabase.storage.from("chat-media").getPublicUrl(filePath);
    const publicUrl = result.data?.publicUrl;
    if (!publicUrl) throw new Error("Public URL is undefined");
    return publicUrl;
  } catch (error) {
    console.error("Error uploading file:", error);
    return null;
  }
}

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearchTerm, setGifSearchTerm] = useState("");
  const [gifResults, setGifResults] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    try {
      const storedWallet = localStorage.getItem("walletAddress");
      if (storedWallet) setWalletAddress(storedWallet);
    } catch (err) {
      console.error("LocalStorage not available:", err);
    }
  }, []);

  useEffect(() => {
    async function fetchMessages() {
      try {
        const res = await fetch("/api/chat", { method: "GET" });
        const data = await res.json();
        if (data.success) {
          setMessages(data.messages);
        } else {
          console.error("Failed to fetch messages:", data.message);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    }
    fetchMessages();
  }, []);

  useEffect(() => {
    const subscription = supabase
      .channel("messages_channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          setMessages((prevMessages) => [...prevMessages, payload.new]);
        }
      )
      .subscribe();
    return () => supabase.removeChannel(subscription);
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      setInitialLoad(false);
    }
  }, [messages]);

  async function sendMessage({ gifUrl = null } = {}) {
    if (!message.trim() && !file && !gifUrl) return;
    if (!walletAddress) return;
    setUploading(true);
    let media_url = null;
    if (file) {
      media_url = await uploadMedia(file);
      if (!media_url) {
        alert("File upload failed");
        setUploading(false);
        return;
      }
    }
    if (gifUrl) {
      media_url = gifUrl;
    }
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: walletAddress,
          content: message.trim() || null,
          media_url,
          parent_id: replyingTo || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage("");
        setFile(null);
        if (replyingTo) setReplyingTo(null);
        setShowGifPicker(false);
      } else {
        console.error("Failed to send message:", data.message);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(e) {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  }

  async function searchGifs(query) {
    if (!query.trim()) {
      setGifResults([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("gifs")
        .select("id, title, url")
        .ilike("title", `%${query}%`);
      if (error) throw error;
      setGifResults(data || []);
    } catch (error) {
      console.error("Error fetching GIFs from Supabase:", error);
      setGifResults([]);
    }
  }

  function RenderMessage({ msg }) {
    const [userDetails, setUserDetails] = useState({
      name: msg.name,
      profile_image: null,
    });

    useEffect(() => {
      async function fetchUser() {
        const details = await fetchUserDetails(msg.wallet_address);
        setUserDetails(details);
      }
      fetchUser();
    }, [msg.wallet_address]);

    const parentMessage = msg.parent_id && messages.find((m) => m.id === msg.parent_id);
    const isOwnMessage = msg.wallet_address === walletAddress;

    return (
      <div
        className={`${styles.message} ${isOwnMessage ? styles.ownMessage : styles.otherMessage}`}
      >
        <div className={styles.messageHeader}>
          {userDetails.profile_image ? (
            <img
              src={userDetails.profile_image}
              alt="Profile"
              className={styles.profileImage}
            />
          ) : (
            <div className={styles.profilePlaceholder}></div>
          )}
          <span className={styles.userName}>{userDetails.name}</span>
        </div>
        <div>
          {msg.content && <p className={styles.messageContent}>{msg.content}</p>}
          {msg.media_url && (
            <img
              src={msg.media_url}
              alt="Attached Media"
              className={styles.mediaImage}
            />
          )}
          {parentMessage && (
            <p className={styles.replyInfo}>
              Replied to <strong>{parentMessage.wallet_address}</strong>: {parentMessage.content}
            </p>
          )}
          <button
            onClick={() => setReplyingTo(msg.id)}
            className={styles.replyButton}
          >
            Reply
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.chatContainer}>
      <div className={styles.header}>Live Chat</div>
      <div className={styles.messages}>
        {messages.map((msg) => (
          <RenderMessage key={msg.id} msg={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {replyingTo && (
        <div className={styles.replyIndicator}>
          {(() => {
            const parentMessage = messages.find((msg) => msg.id === replyingTo);
            return parentMessage ? (
              <p className={styles.replyingTo}>
                Replying to <strong>{parentMessage.wallet_address}</strong>:{" "}
                {parentMessage.content}
              </p>
            ) : (
              <p className={styles.replyingTo}>Replying to message id: {replyingTo}</p>
            );
          })()}
          <button
            onClick={() => setReplyingTo(null)}
            className={styles.cancelReplyButton}
          >
            Cancel
          </button>
        </div>
      )}

      <div className={styles.inputRow}>
        <input
          type="text"
          placeholder="Type your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={styles.input}
          disabled={uploading}
        />
        <label htmlFor="fileInput" className={styles.iconButton}>
          <svg className={styles.icon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm7 14a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
          </svg>
        </label>
        <input
          type="file"
          id="fileInput"
          accept="image/,video/,gif/*"
          onChange={handleFileChange}
          className={styles.hiddenFileInput}
          disabled={uploading}
        />
        <button
          onClick={() => setShowGifPicker((prev) => !prev)}
          className={styles.iconButton}
          disabled={uploading}
        >
          <svg className={styles.icon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M12 2a10 10 0 1 0 10 10A10.0114 10.0114 0 0 0 12 2Zm1 14.93V17h-2v-.07A8.0134 8.0134 0 0 1 4.07 13H5v-2H4.07A8.0134 8.0134 0 0 1 11 5.07V5h2v.07A8.0134 8.0134 0 0 1 19.93 11H19v2h.93A8.0134 8.0134 0 0 1 13 16.93Z" />
          </svg>
        </button>
        <button
          onClick={() => sendMessage()}
          disabled={uploading}
          className={`${styles.iconButton} ${styles.sendButton}`}
        >
          <svg className={styles.icon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M2,21L23,12L2,3V10L17,12L2,14V21Z" />
          </svg>
        </button>
      </div>

      {showGifPicker && (
        <div className={styles.gifPickerModal}>
          <div className={styles.gifPickerHeader}>
            <input
              type="text"
              placeholder="Search GIFs..."
              value={gifSearchTerm}
              onChange={(e) => {
                setGifSearchTerm(e.target.value);
                searchGifs(e.target.value);
              }}
              className={styles.gifSearchInput}
            />
            <button
              onClick={() => setShowGifPicker(false)}
              className={styles.closeGifPicker}
            >
              Close
            </button>
          </div>
          <div className={styles.gifResults}>
            {gifResults.length > 0 ? (
              gifResults.map((gif) => (
                <img
                  key={gif.id}
                  src={gif.url}
                  alt={gif.title}
                  className={styles.gifImage}
                  onClick={() => {
                    sendMessage({ gifUrl: gif.url });
                    setShowGifPicker(false);
                  }}
                />
              ))
            ) : (
              <p>No GIFs found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}