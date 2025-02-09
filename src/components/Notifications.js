"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaBell } from "react-icons/fa";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/services/supabase/supabaseClient";
// Initialize Supabase client


const Notifications = ({ userId }) => {
  const [notifications, setNotifications] = useState([]);
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .eq("read", false)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching notifications:", error);
      } else {
        setNotifications(data);
      }
    };

    fetchNotifications();

    // Listen for real-time notifications
    const channel = supabase
      .channel(`notifications:user:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <div className="position-relative">
      <FaBell 
        size={24} 
        className="text-warning cursor-pointer" 
        onClick={() => router.push("/notifications")}
      />
      {notifications.length > 0 && (
        <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
          {notifications.length}
        </span>
      )}
    </div>
  );
};

export default Notifications;
