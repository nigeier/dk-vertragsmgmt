import { ContractType, ContractStatus, ReminderType } from '@drykorn/shared';

export interface Contract {
  id: string;
  contractNumber: string;
  title: string;
  description?: string;
  type: ContractType;
  status: ContractStatus;
  startDate?: string;
  endDate?: string;
  noticePeriodDays?: number;
  autoRenewal: boolean;
  value?: number;
  currency: string;
  paymentTerms?: string;
  tags: string[];
  partner: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  owner: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  documents: ContractDocument[];
  reminders: ContractReminder[];
  createdAt: string;
  updatedAt: string;
}

export interface ContractDocument {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface ContractReminder {
  id: string;
  type: ReminderType;
  reminderDate: string;
  isSent: boolean;
}

export interface ActiveUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}
