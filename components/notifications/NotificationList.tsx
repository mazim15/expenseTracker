import { formatDistanceToNow } from "date-fns";
import { NotificationItem } from "@/types/notification";
import { Check, Info, AlertCircle, AlertTriangle, Bell, ExternalLink } from "lucide-react";
import Link from "next/link";

interface NotificationListProps {
  notifications: NotificationItem[];
  onMarkAsRead: (id: string) => void;
}

export default function NotificationList({ notifications, onMarkAsRead }: NotificationListProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />;
      case "success":
        return <Check className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "error":
        return <AlertCircle className="text-destructive h-4 w-4" />;
      default:
        return <Bell className="text-muted-foreground h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-1">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`hover:bg-muted/50 flex items-start gap-3 p-3 text-sm transition-colors ${
            notification.status === "unread" ? "bg-muted/30" : ""
          }`}
          onClick={() => notification.status === "unread" && onMarkAsRead(notification.id)}
        >
          <div className="mt-0.5">{getIcon(notification.type)}</div>
          <div className="flex-1">
            <div className="font-medium">{notification.title}</div>
            <p className="text-muted-foreground">{notification.message}</p>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-muted-foreground text-xs">
                {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
              </span>
              {notification.link && (
                <Link
                  href={notification.link}
                  className="text-primary flex items-center gap-1 text-xs hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  View <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>
          {notification.status === "unread" && (
            <div className="bg-primary h-2 w-2 rounded-full"></div>
          )}
        </div>
      ))}
    </div>
  );
}
