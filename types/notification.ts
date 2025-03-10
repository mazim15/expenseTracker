export interface NotificationType {
  id: string;
  userId: string;
  title: string;
  message: string;
  status: 'read' | 'unread';
  type: 'info' | 'warning' | 'error' | 'success';
  createdAt: Date;
  updatedAt?: Date;
  link?: string | null;
}

export type NotificationItem = NotificationType; 