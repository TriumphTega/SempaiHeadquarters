"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/services/supabase/supabaseClient";
import styles from "./Chat.module.css";

// Helper function: Fetch user details from Supabase given a wallet address
async function fetchUserDetails(walletAddress) {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("name, profile_image")
      .eq("wallet_address", walletAddress)
      .single();
    if (error || !data) {
      console.error("Error fetching user details:", error);
      return { name: walletAddress, profile_image: null };
    }
    let { name } = data;
    if (name.length > 15) {
      name = `${name.slice(0, 3)}***${name.slice(-3)}`;
    }
    return { name, profile_image: data.profile_image };
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
  const messagesEndRef = useRef(null);

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
          // Order messages so the newest are at the bottom
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

  // Subscribe to real‑time inserts on the "messages" table
  useEffect(() => {
    const subscription = supabase
      .channel("messages_channel")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        // Append new message
        setMessages((prevMessages) => [...prevMessages, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

   // Scroll to bottom when messages change
   useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
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
      console.log("getPublicUrl result:", result);
      const publicUrl = result.data?.publicUrl;
      if (!publicUrl) {
        console.error("No public URL returned. Check bucket settings and policies.");
        throw new Error("Public URL is undefined");
      }
      console.log("File uploaded successfully. Public URL:", publicUrl);
      return publicUrl;
    } catch (error) {
      console.error("Error uploading file:", error);
      return null;
    }
  }

  async function sendMessage() {
    if (!message.trim() && !file) return; // require text or file
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
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: walletAddress,
          content: message,
          media_url,
          parent_id: replyingTo, // Will be null if not replying
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage("");
        setFile(null);
        if (replyingTo) {
          setReplyingTo(null);
        }
        // The real‑time subscription will update the messages, so no need to re‑fetch all messages.
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

  // Render a single message with user details
  function RenderMessage({ msg }) {
    const [userDetails, setUserDetails] = useState({
      name: msg.wallet_address,
      profile_image: null,
    });

    useEffect(() => {
      async function fetchUser() {
        const details = await fetchUserDetails(msg.wallet_address);
        setUserDetails(details);
      }
      fetchUser();
    }, [msg.wallet_address]);

    // Find parent message (if this message is a reply)
    const parentMessage =
      msg.parent_id && messages.find((m) => m.id === msg.parent_id);

    return (
      <div key={msg.id} className={styles.message}>
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
          <div>
            <img
              src={msg.media_url}
              alt="Attached Media"
              className={styles.mediaImage}
            />
          </div>
        )}
        {parentMessage && (
          <p className={styles.replyInfo}>
            Replied to <strong>{parentMessage.wallet_address}</strong>: {parentMessage.content}
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
                Replying to <strong>{parentMessage.wallet_address}</strong>: {parentMessage.content}
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

      {/* Input Row: Text input, file upload icon, and send icon in one row */}
      <div className={styles.inputRow}>
        <input
          type="text"
          placeholder="Type your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={styles.input}
        />
        <label htmlFor="fileInput" className={styles.iconButton}>
          <img src="/animations/image.svg" alt="Upload" className={styles.icon} />
        </label>
        <input
          type="file"
          id="fileInput"
          accept="image/*,video/*,gif/*"
          onChange={handleFileChange}
          className={styles.hiddenFileInput}
        />
        <button onClick={sendMessage} disabled={uploading} className={styles.iconButton}>
          <img src="/animations/send.svg" alt="Send" className={styles.icon} />
        </button>
      </div>
    </div>
  );
}
