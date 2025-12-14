/**
 * Partner-related types shared between frontend and backend
 */

export enum PartnerType {
  SUPPLIER = 'SUPPLIER', // Lieferant
  CUSTOMER = 'CUSTOMER', // Kunde
  BOTH = 'BOTH', // Beides
  OTHER = 'OTHER', // Sonstige
}

export interface Partner {
  id: string;
  name: string;
  type: PartnerType;
  address?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  taxId?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PartnerListItem {
  id: string;
  name: string;
  type: PartnerType;
  contactPerson?: string;
  email?: string;
  contractCount: number;
  isActive: boolean;
}

export interface PartnerFilter {
  search?: string;
  type?: PartnerType[];
  isActive?: boolean;
}

export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  [PartnerType.SUPPLIER]: 'Lieferant',
  [PartnerType.CUSTOMER]: 'Kunde',
  [PartnerType.BOTH]: 'Kunde & Lieferant',
  [PartnerType.OTHER]: 'Sonstige',
};
