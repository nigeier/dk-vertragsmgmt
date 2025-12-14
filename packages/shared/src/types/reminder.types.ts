/**
 * Reminder-related types shared between frontend and backend
 */

export enum ReminderType {
  EXPIRATION = 'EXPIRATION',
  RENEWAL = 'RENEWAL',
  CUSTOM = 'CUSTOM',
}

export interface Reminder {
  id: string;
  type: ReminderType;
  reminderDate: Date;
  message?: string;
  isSent: boolean;
  sentAt?: Date;
  contractId: string;
  createdAt: Date;
}

export interface ReminderListItem {
  id: string;
  type: ReminderType;
  reminderDate: Date;
  message?: string;
  isSent: boolean;
  contractNumber: string;
  contractTitle: string;
}

export interface UpcomingReminder {
  id: string;
  type: ReminderType;
  reminderDate: Date;
  contractId: string;
  contractNumber: string;
  contractTitle: string;
  partnerName: string;
  daysUntil: number;
}

export const REMINDER_TYPE_LABELS: Record<ReminderType, string> = {
  [ReminderType.EXPIRATION]: 'Ablauf',
  [ReminderType.RENEWAL]: 'Verlängerung',
  [ReminderType.CUSTOM]: 'Benutzerdefiniert',
};
