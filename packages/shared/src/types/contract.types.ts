/**
 * Contract-related types shared between frontend and backend
 */

export enum ContractStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  TERMINATED = 'TERMINATED',
  ARCHIVED = 'ARCHIVED',
}

export enum ContractType {
  SUPPLIER = 'SUPPLIER', // Lieferantenvertrag
  CUSTOMER = 'CUSTOMER', // Kundenvertrag
  EMPLOYMENT = 'EMPLOYMENT', // Arbeitsvertrag
  LEASE = 'LEASE', // Mietvertrag
  LICENSE = 'LICENSE', // Lizenzvertrag
  NDA = 'NDA', // Geheimhaltungsvereinbarung
  SERVICE = 'SERVICE', // Dienstleistungsvertrag
  OTHER = 'OTHER',
}

export interface Contract {
  id: string;
  contractNumber: string;
  title: string;
  description?: string;
  type: ContractType;
  status: ContractStatus;

  // Vertragsdaten
  startDate?: Date;
  endDate?: Date;
  terminationDate?: Date;
  renewalDate?: Date;
  noticePeriodDays?: number;
  autoRenewal: boolean;

  // Finanzen
  value?: number;
  currency: string;
  paymentTerms?: string;

  // Metadaten
  tags: string[];
  customFields?: Record<string, unknown>;

  // Relations
  partnerId: string;
  ownerId: string;
  createdById: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface ContractListItem {
  id: string;
  contractNumber: string;
  title: string;
  type: ContractType;
  status: ContractStatus;
  partnerName: string;
  endDate?: Date;
  value?: number;
  currency: string;
}

export interface ContractFilter {
  search?: string;
  status?: ContractStatus[];
  type?: ContractType[];
  partnerId?: string;
  startDateFrom?: Date;
  startDateTo?: Date;
  endDateFrom?: Date;
  endDateTo?: Date;
  minValue?: number;
  maxValue?: number;
  tags?: string[];
}

export interface ContractStats {
  total: number;
  byStatus: Record<ContractStatus, number>;
  byType: Record<ContractType, number>;
  expiringIn30Days: number;
  expiringIn60Days: number;
  expiringIn90Days: number;
  totalValue: number;
}

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  [ContractStatus.DRAFT]: 'Entwurf',
  [ContractStatus.PENDING_APPROVAL]: 'Genehmigung ausstehend',
  [ContractStatus.ACTIVE]: 'Aktiv',
  [ContractStatus.EXPIRED]: 'Abgelaufen',
  [ContractStatus.TERMINATED]: 'Gekündigt',
  [ContractStatus.ARCHIVED]: 'Archiviert',
};

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  [ContractType.SUPPLIER]: 'Lieferantenvertrag',
  [ContractType.CUSTOMER]: 'Kundenvertrag',
  [ContractType.EMPLOYMENT]: 'Arbeitsvertrag',
  [ContractType.LEASE]: 'Mietvertrag',
  [ContractType.LICENSE]: 'Lizenzvertrag',
  [ContractType.NDA]: 'Geheimhaltungsvereinbarung',
  [ContractType.SERVICE]: 'Dienstleistungsvertrag',
  [ContractType.OTHER]: 'Sonstige',
};
