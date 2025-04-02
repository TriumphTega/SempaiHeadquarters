"use client";

import { useState, useEffect, useRef, useCallback, useContext } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/services/supabase/supabaseClient";
import { EmbeddedWalletContext } from "@/components/EmbeddedWalletProvider";
import styles from "./Chat.module.css";

// Utility function to truncate names longer than 12 characters
const truncateName = (name) => {
  if (!name || name.length <= 12) return name;
  return `${name.slice(0, 3)}**${name.slice(-3)}`;
};

function Message({ msg, walletAddress, onReply, isPrivate, onScrollToParent }) {
  const isOwnMessage = isPrivate
    ? msg.sender_wallet === walletAddress
    : msg.wallet_address === walletAddress;

  // Determine badge to display
  const isSuper = msg.is_superuser || (msg.is_writer && msg.is_artist);
  const showWriterBadge = msg.is_writer && !msg.is_artist && !msg.is_superuser;
  const showArtistBadge = msg.is_artist && !msg.is_writer && !msg.is_superuser;

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
              {truncateName(msg.name)}
            </Link>
          ) : (
            truncateName(msg.name)
          )}
          {isSuper && (
            <span className={styles.writerBadge}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#F28C38">
                <path d="M10.007 2.104a3 3 0 0 0-3.595 1.49L5.606 5.17a1 1 0 0 1-.436.436l-1.577.806a3 3 0 0 0-1.49 3.595l.546 1.685a1 1 0 0 1 0 .616l-.545 1.685a3 3 0 0 0 1.49 3.595l1.576.806a1 1 0 0 1 .436.436l.806 1.577a3 3 0 0 0 3.595 1.49l1.685-.546a1 1 0 0 1 .616 0l1.685.545a3 3 0 0 0 3.595-1.489l.806-1.577a1 1 0 0 1 .436-.436l1.577-.805a3 3 0 0 0 1.49-3.596l-.546-1.685a1 1 0 0 1 0-.616l.545-1.685a3 3 0 0 0-1.489-3.595l-1.577-.806a1 1 0 0 1-.436-.436l-.805-1.577a3 3 0 0 0-3.596-1.49l-1.685.546a1 1 0 0 1-.616 0l-1.685-.545ZM6.76 11.757l1.414-1.414l2.828 2.829l5.657-5.657l1.415 1.414l-7.072 7.07l-4.242-4.242Z" />
              </svg>

             
            </span>
          )}
          {showWriterBadge && (
            <span className={styles.writerBadge}>
              <img src="/animations/writer-badge.png" alt="Writer Badge" width="16" height="16" />
            </span>
          )}
          {showArtistBadge && (
            <span className={styles.writerBadge}>
              <img src="/animations/artist-badge.png" alt="Artist Badge" width="16" height="16" />
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
        {msg.parent_id && (
          <div className={styles.replyPreview} onClick={() => onScrollToParent(msg.parent_id)}>
            <div className={styles.replyName}>{truncateName(msg.parent_name) || "Unknown"}</div>
            <div className={styles.replyContent}>
              {msg.parent_content ? (
                `${msg.parent_content.slice(0, 50)}${msg.parent_content.length > 50 ? "..." : ""}`
              ) : (
                <i>No content</i>
              )}
            </div>
          </div>
        )}
        {msg.content && <p className={styles.messageContent}>{msg.content}</p>}
        {msg.media_url && <img src={msg.media_url} alt="Media" className={styles.mediaImage} />}
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
  const router = useRouter();
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
  const [recentChats, setRecentChats] = useState([]);
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
    console.log("Wallet address set to:", wallet);
    setWalletAddress(wallet);
    if (embeddedWallet?.publicKey) localStorage.setItem("walletAddress", wallet);
    if (!wallet) setError("Please connect your wallet to chat.");
  }, [embeddedWallet?.publicKey]);

  const fetchRecentChats = useCallback(async () => {
    if (!walletAddress) return;
    console.log("Fetching recent chats for wallet:", walletAddress);
    try {
      const { data, error } = await supabase
        .from("private_messages")
        .select("sender_wallet, recipient_wallet, created_at")
        .or(`sender_wallet.eq.${walletAddress},recipient_wallet.eq.${walletAddress}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const uniqueContacts = new Set();
      const contacts = [];
      for (const msg of data) {
        const contactWallet = msg.sender_wallet === walletAddress ? msg.recipient_wallet : msg.sender_wallet;
        if (!uniqueContacts.has(contactWallet)) {
          uniqueContacts.add(contactWallet);
          const { data: userData } = await supabase
            .from("users")
            .select("id, name, wallet_address, image, isWriter, isArtist, isSuperuser")
            .eq("wallet_address", contactWallet)
            .single();
          contacts.push({
            id: userData?.id || null,
            name: userData?.name || contactWallet,
            wallet_address: userData?.wallet_address || contactWallet,
            image: userData?.image
              ? userData.image.startsWith("data:image/")
                ? userData.image
                : userData.image.startsWith("http")
                  ? userData.image
                  : `data:image/jpeg;base64,${userData.image}`
              : null,
            isWriter: userData?.isWriter || false,
            isArtist: userData?.isArtist || false,
            isSuperuser: userData?.isSuperuser || false,
          });
        }
      }
      console.log("Recent chats fetched:", contacts);
      setRecentChats(contacts.slice(0, 10));
    } catch (error) {
      console.error("Error in fetchRecentChats:", error.message);
      setError("Failed to load recent chats: " + error.message);
    }
  }, [walletAddress]);

  const fetchUsers = useCallback(async () => {
    if (!searchTerm.trim() || !walletAddress) {
      setUsers([]);
      return;
    }
    console.log("Fetching users with search term:", searchTerm);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, wallet_address, image, isWriter, isArtist, isSuperuser")
        .or(`name.ilike.%${searchTerm}%,wallet_address.ilike.%${searchTerm}%`)
        .neq("wallet_address", walletAddress)
        .limit(10);
      if (error) throw error;
      const userList = data.map((user) => ({
        id: user.id,
        name: user.name || user.wallet_address,
        wallet_address: user.wallet_address,
        image: user.image
          ? user.image.startsWith("data:image/")
            ? user.image
            : user.image.startsWith("http")
              ? user.image
              : `data:image/jpeg;base64,${user.image}`
          : null,
        isWriter: user.isWriter || false,
        isArtist: user.isArtist || false,
        isSuperuser: user.isSuperuser || false,
      }));
      console.log("Users fetched:", userList);
      setUsers(userList);
    } catch (error) {
      console.error("Error in fetchUsers:", error.message);
      setError("Failed to load users: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, walletAddress]);

  useEffect(() => {
    fetchRecentChats();
    const debounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounce);
  }, [fetchRecentChats, fetchUsers, searchTerm]);

  const fetchGroupMessages = useCallback(async () => {
    if (!walletAddress) {
      console.log("No wallet address, skipping fetchGroupMessages");
      return;
    }
    console.log("Starting fetchGroupMessages for wallet:", walletAddress);
    setLoading(true);
    try {
      const { data: messagesData, error } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      console.log("Raw group messages data:", messagesData);

      if (!messagesData || messagesData.length === 0) {
        console.log("No group messages found.");
        setMessages([]);
        return;
      }

      const enrichedMessages = await Promise.all(
        messagesData.map(async (msg) => {
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("id, name, image, isWriter, isArtist, isSuperuser")
            .eq("wallet_address", msg.wallet_address)
            .single();
          if (userError) console.error("Error fetching user for message:", userError.message);

          let parent_name = null;
          let parent_content = null;
          if (msg.parent_id) {
            const { data: parentMsg, error: parentError } = await supabase
              .from("messages")
              .select("wallet_address, content")
              .eq("id", msg.parent_id)
              .single();
            if (parentError) {
              console.error("Error fetching parent message:", parentError.message);
            } else if (parentMsg) {
              const { data: parentUser, error: parentUserError } = await supabase
                .from("users")
                .select("name")
                .eq("wallet_address", parentMsg.wallet_address)
                .single();
              if (parentUserError) console.error("Error fetching parent user:", parentUserError.message);
              parent_name = parentUser?.name || parentMsg.wallet_address || "Unknown";
              parent_content = parentMsg.content || null;
            }
          }

          return {
            ...msg,
            user_id: userData?.id || null,
            name: userData?.name || msg.wallet_address,
            profile_image: userData?.image
              ? userData.image.startsWith("data:image/")
                ? userData.image
                : userData.image.startsWith("http")
                  ? userData.image
                  : `data:image/jpeg;base64,${userData.image}`
              : null,
            is_writer: userData?.isWriter || false,
            is_artist: userData?.isArtist || false,
            is_superuser: userData?.isSuperuser || false,
            parent_name,
            parent_content,
          };
        })
      );
      console.log("Enriched group messages:", enrichedMessages);
      setMessages(enrichedMessages);
    } catch (error) {
      console.error("Error in fetchGroupMessages:", error.message);
      setError("Failed to load group messages: " + error.message);
    } finally {
      setLoading(false);
      console.log("fetchGroupMessages completed");
    }
  }, [walletAddress]);

  const fetchPrivateMessages = useCallback(async (recipientWallet) => {
    if (!walletAddress || !recipientWallet) {
      console.log("Missing wallet or recipient, skipping fetchPrivateMessages");
      return;
    }
    console.log("Starting fetchPrivateMessages for:", recipientWallet);
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
      console.log("Raw private messages data:", messagesData);

      if (!messagesData || messagesData.length === 0) {
        console.log("No private messages found for:", recipientWallet);
        setPrivateMessages((prev) => ({ ...prev, [recipientWallet]: [] }));
        return;
      }

      const enrichedMessages = await Promise.all(
        messagesData.map(async (msg) => {
          const { data: senderData, error: senderError } = await supabase
            .from("users")
            .select("id, name, image, isWriter, isArtist, isSuperuser")
            .eq("wallet_address", msg.sender_wallet)
            .single();
          if (senderError) console.error("Error fetching sender:", senderError.message);

          let parent_name = null;
          let parent_content = null;
          if (msg.parent_id) {
            const { data: parentMsg, error: parentError } = await supabase
              .from("private_messages")
              .select("sender_wallet, content")
              .eq("id", msg.parent_id)
              .single();
            if (parentError) {
              console.error("Error fetching parent private message:", parentError.message);
            } else if (parentMsg) {
              const { data: parentUser, error: parentUserError } = await supabase
                .from("users")
                .select("name")
                .eq("wallet_address", parentMsg.sender_wallet)
                .single();
              if (parentUserError) console.error("Error fetching parent user:", parentUserError.message);
              parent_name = parentUser?.name || parentMsg.sender_wallet || "Unknown";
              parent_content = parentMsg.content || null;
            }
          }

          return {
            ...msg,
            user_id: senderData?.id || null,
            name: senderData?.name || msg.sender_wallet,
            profile_image: senderData?.image
              ? senderData.image.startsWith("data:image/")
                ? senderData.image
                : senderData.image.startsWith("http")
                  ? senderData.image
                  : `data:image/jpeg;base64,${senderData.image}`
              : null,
            is_writer: senderData?.isWriter || false,
            is_artist: senderData?.isArtist || false,
            is_superuser: senderData?.isSuperuser || false,
            status: msg.status || "sent",
            parent_name,
            parent_content,
          };
        })
      );
      console.log("Enriched private messages:", enrichedMessages);
      setPrivateMessages((prev) => ({ ...prev, [recipientWallet]: enrichedMessages }));
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
      console.log("fetchPrivateMessages completed");
    }
  }, [walletAddress]);

  useEffect(() => {
    console.log("useEffect for fetching messages triggered with activeChat:", activeChat);
    if (activeChat === "group") {
      fetchGroupMessages();
    } else {
      fetchPrivateMessages(activeChat);
    }
  }, [activeChat, fetchGroupMessages, fetchPrivateMessages]);

  useEffect(() => {
    if (!walletAddress || activeChat === "group") {
      if (typingChannel) {
        typingChannel.unsubscribe();
        setTypingChannel(null);
      }
      return;
    }

    const channel = supabase.channel(`typing:${activeChat}`);
    channel
      .on("presence", { event: "typing" }, (payload) => {
        if (payload.user !== walletAddress) {
          setTypingUsers((prev) => ({
            ...prev,
            [activeChat]: payload.typing ? payload.user : null,
          }));
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Subscribed to typing channel for:", activeChat);
          setTypingChannel(channel);
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          console.error("Typing channel status:", status);
        }
      });

    return () => {
      if (channel) {
        console.log("Unsubscribing from typing channel");
        channel.unsubscribe();
        setTypingChannel(null);
      }
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

      console.log("Sending message:", { input, file, gifUrl });
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
          setError("Failed to upload file: " + error.message);
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
        setError("User not found: " + (userError?.message || "No data"));
        setUploading(false);
        setSending(false);
        return;
      }

      let parent_name = null;
      let parent_content = null;
      if (replyingTo) {
        if (activeChat === "group") {
          const parentMsg = messages.find((m) => m.id === replyingTo) || 
            (await supabase
              .from("messages")
              .select("wallet_address, content")
              .eq("id", replyingTo)
              .single())?.data;
          if (parentMsg) {
            const { data: parentUser, error: parentUserError } = await supabase
              .from("users")
              .select("name")
              .eq("wallet_address", parentMsg.wallet_address)
              .single();
            if (parentUserError) console.error("Error fetching parent user:", parentUserError.message);
            parent_name = parentUser?.name || parentMsg.wallet_address || "Unknown";
            parent_content = parentMsg.content || null;
          }
        } else {
          const parentMsg = (privateMessages[activeChat] || []).find((m) => m.id === replyingTo) || 
            (await supabase
              .from("private_messages")
              .select("sender_wallet, content")
              .eq("id", replyingTo)
              .single())?.data;
          if (parentMsg) {
            const { data: parentUser, error: parentUserError } = await supabase
              .from("users")
              .select("name")
              .eq("wallet_address", parentMsg.sender_wallet)
              .single();
            if (parentUserError) console.error("Error fetching parent user:", parentUserError.message);
            parent_name = parentUser?.name || parentMsg.sender_wallet || "Unknown";
            parent_content = parentMsg.content || null;
          }
        }
      }

      if (activeChat === "group") {
        const { data, error } = await supabase
          .from("messages")
          .insert({
            wallet_address: walletAddress,
            user_id: userData.id,
            content: input.trim() || null,
            media_url: mediaUrl,
            parent_id: replyingTo,
          })
          .select()
          .single();

        if (error) {
          setError("Failed to send group message: " + error.message);
        } else {
          setMessages((prev) => [
            ...prev,
            { ...data, name: userData.name, parent_name, parent_content },
          ]);
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
          is_artist: false,
          is_superuser: false,
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
            content: input.trim() || null,
            media_url: mediaUrl,
            parent_id: replyingTo,
            status: "sent",
          })
          .select()
          .single();

        if (error) {
          setError("Failed to send private message: " + error.message);
        } else {
          setPrivateMessages((prev) => ({
            ...prev,
            [activeChat]: prev[activeChat].map((msg) =>
              msg.status === "sending" && msg.created_at === newMessage.created_at
                ? { ...msg, id: data.id, status: "sent" }
                : msg
            ),
          }));

          const { data: recipientData, error: recipientError } = await supabase
            .from("users")
            .select("id, wallet_address")
            .eq("wallet_address", activeChat)
            .single();
          if (recipientError) console.error("Error fetching recipient:", recipientError.message);

          if (recipientData && recipientData.wallet_address !== walletAddress) {
            await supabase.from("notifications").insert({
              user_id: recipientData.id,
              recipient_wallet_address: activeChat,
              sender_wallet_address: walletAddress,
              message: `${userData.name || walletAddress} sent you a message: "${input.trim() || "Media"}"`,
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
      setFile(null);
      setReplyingTo(null);
      setShowGifPicker(false);
      setUploading(false);
      setSending(false);
    },
    [input, file, walletAddress, uploading, replyingTo, activeChat, fetchRecentChats, messages, privateMessages]
  );

  const handleFileChange = (e) => setFile(e.target.files?.[0] || null);
  const handleReply = (id) => setReplyingTo(id);
  const handleGifSelect = (url) => handleSend(url);
  const switchChat = (chatId) => {
    console.log("Switching to chat:", chatId);
    setActiveChat(chatId);
    if (chatId !== "group" && !privateMessages[chatId]) fetchPrivateMessages(chatId);
    setReplyingTo(null);
    setSidebarOpen(false);
  };

  const handleScrollToParent = (parentId) => {
    const element = document.getElementById(`message-${parentId}`);
    if (element) element.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className={styles.chatContainer}>
      <nav className={styles.navbar}>
        <Link href="/" className={styles.logoLink}>
          <img src="/images/logo.jpeg" alt="Logo" className={styles.logo} />
        </Link>
        <button
          className={styles.sidebarToggle}
          onClick={() => setSidebarOpen((prev) => !prev)}
        >
          ☰
        </button>
        <div className={styles.chatTitle}>
          {activeChat === "group"
            ? "Live Group Chat"
            : `Chat with ${
                truncateName(
                  recentChats.find((u) => u.wallet_address === activeChat)?.name ||
                  users.find((u) => u.wallet_address === activeChat)?.name ||
                  activeChat
                )
              }`}
        </div>
      </nav>

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
              {recentChats.length > 0 && !searchTerm.trim() && (
                <>
                  <div className={styles.sectionHeader}>Recent Chats</div>
                  {recentChats.map((chat) => (
                    <div
                      key={chat.wallet_address}
                      className={`${styles.chatItem} ${
                        activeChat === chat.wallet_address ? styles.activeChat : ""
                      }`}
                      onClick={() => switchChat(chat.wallet_address)}
                    >
                      <div className={styles.userInfo}>
                        {chat.image ? (
                          <img
                            src={chat.image}
                            alt="Profile"
                            className={styles.sidebarProfileImage}
                          />
                        ) : (
                          <div className={styles.sidebarProfilePlaceholder} />
                        )}
                        <span>{truncateName(chat.name)}</span>
                        <span
                          className={
                            onlineUsers.has(chat.wallet_address)
                              ? styles.onlineDot
                              : styles.offlineDot
                          }
                        />
                      </div>
                    </div>
                  ))}
                </>
              )}
              {searchTerm.trim() && users.length > 0 && (
                <>
                  <div className={styles.sectionHeader}>Search Results</div>
                  {users.map((user) => (
                    <div
                      key={user.wallet_address}
                      className={`${styles.chatItem} ${
                        activeChat === user.wallet_address ? styles.activeChat : ""
                      }`}
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
                        <span>{truncateName(user.name)}</span>
                        <span
                          className={
                            onlineUsers.has(user.wallet_address)
                              ? styles.onlineDot
                              : styles.offlineDot
                          }
                        />
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </aside>

        <main className={styles.messages}>
          {(activeChat === "group" ? messages : privateMessages[activeChat] || []).map(
            (msg, index) => (
              <div
                key={msg.id || `${msg.created_at}-${msg.sender_wallet || msg.wallet_address}-${index}`}
                id={`message-${msg.id || index}`}
              >
                <Message
                  msg={msg}
                  walletAddress={walletAddress}
                  onReply={handleReply}
                  isPrivate={activeChat !== "group"}
                  onScrollToParent={handleScrollToParent}
                />
              </div>
            )
          )}
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
                Replying to <strong>{truncateName(parentMsg?.name) || "Unknown"}</strong>
                {parentMsg?.content
                  ? `: ${parentMsg.content.slice(0, 50)}${parentMsg.content.length > 50 ? "..." : ""}`
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
        <button
          onClick={() => handleSend()}
          className={styles.sendButton}
          disabled={uploading || sending}
        >
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