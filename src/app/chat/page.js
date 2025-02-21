"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/services/supabase/supabaseClient";
import styles from "./Chat.module.css";

// Helper function: Fetch user details from Supabase given a wallet address
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
    // Check if profile_image already starts with a data URL prefix; if not, add one.
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

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const messagesEndRef = useRef(null);

  // State for GIF picker
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearchTerm, setGifSearchTerm] = useState("");
  const [gifResults, setGifResults] = useState([]);

  // Giphy API key using the public beta key
  const GIPHY_API_KEY = "Dc6zaTOxFJmzC";

  // Fetch wallet address from localStorage on mount
  useEffect(() => {
    try {
      const storedWallet = localStorage.getItem("walletAddress");
      if (storedWallet) setWalletAddress(storedWallet);
    } catch (err) {
      console.error("LocalStorage not available:", err);
    }
  }, []);

  // Fetch initial messages once on mount
  useEffect(() => {
    async function fetchMessages() {
      try {
        const res = await fetch("/api/chat", { method: "GET" });
        const data = await res.json();
        if (data.success) {
          // Order messages so that the newest are at the bottom
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

  // Subscribe to real‑time inserts on the "messages" table so new messages are appended
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

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      setInitialLoad(false);
    }
  }, [messages]);

  // Upload file to Supabase Storage and return its public URL
  async function uploadMedia(file) {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = fileName;
      console.log("Uploading file to bucket 'chat-media':", filePath);
      const { error: uploadError } = await supabase.storage
        .from("chat-media")
        .upload(filePath, file);
      if (uploadError) {
        console.error("Upload error details:", uploadError);
        throw uploadError;
      }
      const result = supabase.storage.from("chat-media").getPublicUrl(filePath);
      const publicUrl = result.data?.publicUrl;
      if (!publicUrl) {
        console.error("No public URL returned. Check bucket settings and policies.");
        throw new Error("Public URL is undefined");
      }
      return publicUrl;
    } catch (error) {
      console.error("Error uploading file:", error);
      return null;
    }
  }

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
          content: message,
          media_url,
          parent_id: replyingTo,
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

  // Function to search GIFs using the Giphy API
  async function searchGifs(query) {
    if (!query.trim()) {
      setGifResults([]);
      return;
    }
    try {
      const res = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(
          query
        )}&limit=25`
      );
      const data = await res.json();
      console.log("GIF API response:", data);
      setGifResults(data.data);
    } catch (error) {
      console.error("Error fetching GIFs:", error);
    }
  }

  // Render a single message with user details and apply styling based on ownership.
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

    const parentMessage =
      msg.parent_id && messages.find((m) => m.id === msg.parent_id);
    const isOwnMessage = msg.wallet_address === walletAddress;

    return (
      <div
        key={msg.id}
        className={`${styles.message} ${
          isOwnMessage ? styles.ownMessage : styles.otherMessage
        }`}
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
        <p className={styles.messageContent}>{msg.content}</p>
        {msg.media_url && (
          <div className={styles.mediaContainer}>
            <img
              src={msg.media_url}
              alt="Attached Media"
              className={styles.mediaImage}
            />
          </div>
        )}
        {parentMessage && (
          <p className={styles.replyInfo}>
            Replied to <strong>{parentMessage.wallet_address}</strong>:{" "}
            {parentMessage.content}
          </p>
        )}
        <button
          className={styles.replyButton}
          onClick={() => setReplyingTo(msg.id)}
        >
          Reply
        </button>
      </div>
    );
  }

  return (
    <div className={styles.chatContainer}>
      <h1 className={styles.title}>Live Chat</h1>
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
              <p className={styles.replyingTo}>
                Replying to message id: {replyingTo}
              </p>
            );
          })()}
          <button
            className={styles.cancelReplyButton}
            onClick={() => setReplyingTo(null)}
          >
            Cancel Reply
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
        />
        <label htmlFor="fileInput" className={styles.iconButton}>
          <svg
            className={`${styles.icon} ${styles.uploadIcon}`}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
          >
            <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm7 14a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
          </svg>
        </label>
        <input
          type="file"
          id="fileInput"
          accept="image/*,video/*,gif/*"
          onChange={handleFileChange}
          className={styles.hiddenFileInput}
        />
        <button
          onClick={() => setShowGifPicker((prev) => !prev)}
          className={styles.iconButton}
        >
          <svg
            className={`${styles.icon}`}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
          >
            <path d="M12 2a10 10 0 1 0 10 10A10.0114 10.0114 0 0 0 12 2Zm1 14.93V17h-2v-.07A8.0134 8.0134 0 0 1 4.07 13H5v-2H4.07A8.0134 8.0134 0 0 1 11 5.07V5h2v.07A8.0134 8.0134 0 0 1 19.93 11H19v2h.93A8.0134 8.0134 0 0 1 13 16.93Z" />
          </svg>
        </button>
        <button
          onClick={() => sendMessage()}
          disabled={uploading}
          className={styles.iconButton}
        >
          <svg
            className={`${styles.icon} ${styles.sendIcon}`}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
          >
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
            {gifResults.map((gif) => (
              <img
                key={gif.id}
                src={gif.images.fixed_height_small.url}
                alt={gif.title}
                className={styles.gifImage}
                onClick={() => {
                  sendMessage({ gifUrl: gif.images.fixed_height.url });
                  setShowGifPicker(false);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
