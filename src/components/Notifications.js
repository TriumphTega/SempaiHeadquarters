"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaBell } from "react-icons/fa";

const Notifications = ({ userId }) => {
  const [notifications, setNotifications] = useState([]);
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;

    // Fetch unread notifications
    const fetchNotifications = async () => {
      try {
        const res = await fetch(`/api/notifications?user_id=${userId}`);
        const data = await res.json();
        setNotifications(data || []);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchNotifications();
  }, [userId]);

  return (
    <div className="position-relative">
      <FaBell 
        size={24} 
        className="text-warning cursor-pointer" 
        onClick={() => router.push("/notifications")}
      />
      {notifications.length > 0 && (
        <span 
          className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
        >
          {notifications.length}
        </span>
      )}
    </div>
  );
};

export default Notifications;
