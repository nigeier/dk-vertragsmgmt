import { z } from 'zod';
import { ContractType, ContractStatus } from '@drykorn/shared';

/**
 * Zentrales Schema für Vertragsformulare
 * Verwendet in: new/page.tsx, [id]/edit/page.tsx
 */
export const contractFormSchema = z
  .object({
    title: z.string().min(1, 'Titel ist erforderlich').max(255, 'Maximal 255 Zeichen'),
    description: z.string().optional(),
    type: z.nativeEnum(ContractType),
    status: z.nativeEnum(ContractStatus).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    noticePeriodDays: z.number().min(0).optional().nullable(),
    autoRenewal: z.boolean().optional(),
    value: z.number().min(0).optional().nullable(),
    currency: z.string().default('EUR'),
    paymentTerms: z.string().optional(),
    tags: z.array(z.string()).optional(),
    partnerId: z.string().uuid('Bitte wählen Sie einen Partner'),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    {
      message: 'Enddatum muss nach dem Startdatum liegen',
      path: ['endDate'],
    },
  );

export type ContractFormData = z.infer<typeof contractFormSchema>;
