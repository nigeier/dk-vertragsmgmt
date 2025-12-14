/**
 * Notification-related types shared between frontend and backend
 */

export interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  userId: string;
  createdAt: Date;
  readAt?: Date;
}

export interface NotificationListItem {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: Date;
}

export interface NotificationStats {
  total: number;
  unread: number;
}
