import { useEffect, useState } from "react";
import { supabase } from "@/services/supabase/supabaseClient";

const Notifications = ({ userId }) => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
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
  }, [userId]);

  return (
    <div>
      <h3>Notifications</h3>
      {notifications.length === 0 ? (
        <p>No new notifications</p>
      ) : (
        <ul>
          {notifications.map((notification) => (
            <li key={notification.id}>
              {notification.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Notifications;
