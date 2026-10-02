"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/lib/auth/AuthContext";
import { NotificationType } from "@/types/notification";
import { getNotifications, markAsRead } from "@/lib/notifications";
import { NOTIFICATIONS_CHANGED } from "@/lib/alerts";
import NotificationList from "./NotificationList";

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await getNotifications(user.uid);
      setNotifications(data);
      setUnreadCount(data.filter((n) => n.status === "unread").length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  // New alerts are written in the background after load; refresh when that happens
  useEffect(() => {
    window.addEventListener(NOTIFICATIONS_CHANGED, fetchNotifications);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED, fetchNotifications);
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    if (!user) return;

    try {
      await markAsRead(id);

      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id ? { ...notification, status: "read" } : notification,
        ),
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;

    try {
      await markAsRead(user.uid);

      setNotifications((prev) => prev.map((notification) => ({ ...notification, status: "read" })));
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                key={unreadCount}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 18 }}
                className="bg-destructive ring-background absolute top-0.5 right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ring-2"
              >
                {unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 overflow-hidden p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="font-bold">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs"
              onClick={handleMarkAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : notifications.length > 0 ? (
            <NotificationList notifications={notifications} onMarkAsRead={handleMarkAsRead} />
          ) : (
            <EmptyState
              variant="minimal"
              icon={<Bell />}
              image="/illustrations/empty-notifications.png"
              title="All quiet"
              description="No notifications yet."
            />
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
