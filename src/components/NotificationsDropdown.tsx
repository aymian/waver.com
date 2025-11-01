import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { 
  Bell, 
  X, 
  UserPlus, 
  Check, 
  XCircle,
  UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

interface FromUser {
  full_name: string;
  display_name: string;
  avatar_url: string;
}

interface Notification {
  id: string;
  user_id: string;
  from_user_id: string;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
  from_user?: FromUser;
}

const NotificationsDropdown = () => {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications
  useEffect(() => {
    if (!currentUser) return;

    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from("notifications")
          .select(`
            id,
            user_id,
            from_user_id,
            type,
            message,
            read,
            created_at,
            from_user:profiles!from_user_id (
              full_name,
              display_name,
              avatar_url
            )
          `)
          .eq("user_id", currentUser.id)
          .order("created_at", { ascending: false })
          .limit(10);
        
        if (error) throw error;
        
        // Fix the type issue by ensuring from_user is properly structured
        const notificationsData: Notification[] = (data || []).map((notification: any) => ({
          ...notification,
          from_user: notification.from_user && Array.isArray(notification.from_user) 
            ? notification.from_user[0] 
            : notification.from_user
        }));
        
        setNotifications(notificationsData);
        setUnreadCount(notificationsData.filter(n => !n.read).length || 0);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", id);
      
      if (error) throw error;
      
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => prev - 1);
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", currentUser?.id)
        .eq("read", false);
      
      if (error) throw error;
      
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const handleFollowAction = async (notificationId: string, fromUserId: string, action: "accept" | "reject") => {
    if (!currentUser) return;
    
    try {
      // Update the follow request status
      const { error } = await supabase
        .from("followers")
        .update({ status: action === "accept" ? "accepted" : "rejected" })
        .eq("follower_id", fromUserId)
        .eq("following_id", currentUser.id)
        .eq("status", "pending");
      
      if (error) throw error;
      
      // Mark notification as read
      await markAsRead(notificationId);
      
      // Create a new notification for the follower
      if (action === "accept") {
        await supabase
          .from("notifications")
          .insert([
            {
              user_id: fromUserId,
              from_user_id: currentUser.id,
              type: "follow_accepted",
              message: "Your follow request has been accepted"
            }
          ]);
      }
    } catch (error) {
      console.error(`Error ${action}ing follow request:`, error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "follow_request":
        return <UserPlus className="h-4 w-4 text-blue-500" />;
      case "follow_accepted":
        return <UserCheck className="h-4 w-4 text-green-500" />;
      case "new_follower":
        return <UserPlus className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getNotificationAction = (notification: Notification) => {
    if (notification.type === "follow_request") {
      return (
        <div className="flex gap-2 mt-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="h-8 text-xs"
            onClick={() => handleFollowAction(notification.id, notification.from_user_id, "accept")}
          >
            <Check className="h-3 w-3 mr-1" />
            Accept
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="h-8 text-xs"
            onClick={() => handleFollowAction(notification.id, notification.from_user_id, "reject")}
          >
            <X className="h-3 w-3 mr-1" />
            Reject
          </Button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-3 hover:bg-primary/10 rounded-full transition-all duration-300 group"
      >
        <Bell className="w-5 h-5 text-foreground group-hover:text-primary transition-colors duration-300" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-80 bg-background border rounded-lg shadow-lg z-50"
            >
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-semibold">Notifications</h3>
                {unreadCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-xs"
                    onClick={markAllAsRead}
                  >
                    Mark all as read
                  </Button>
                )}
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <div 
                      key={notification.id}
                      className={`p-4 border-b last:border-b-0 hover:bg-accent ${
                        !notification.read ? "bg-accent/50" : ""
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm">
                            <span className="font-medium">
                              {notification.from_user?.display_name || notification.from_user?.full_name || "User"}
                            </span> {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                          {getNotificationAction(notification)}
                        </div>
                        {!notification.read && (
                          <button 
                            onClick={() => markAsRead(notification.id)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No notifications</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationsDropdown;