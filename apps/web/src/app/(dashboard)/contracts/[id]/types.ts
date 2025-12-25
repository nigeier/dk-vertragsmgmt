import { ContractType, ContractStatus, ReminderType, PartnerType } from '@drykorn/shared';

/**
 * Vollständiges Contract-Interface für Detail-Ansicht
 */
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

/**
 * Vereinfachtes Contract-Interface für Bearbeitung
 */
export interface ContractForEdit {
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
  partnerId: string;
  partner: { id: string; name: string };
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

export interface Partner {
  id: string;
  name: string;
  type: PartnerType;
  isActive: boolean;
}

export interface PartnersResponse {
  data: Partner[];
  meta: { total: number };
}
