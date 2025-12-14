import { PrismaClient, ContractType, ContractStatus, ReminderType } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Seeding database...');

  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: 'admin@drykorn.de' },
    update: {},
    create: {
      keycloakId: 'dev-admin-user',
      email: 'admin@drykorn.de',
      firstName: 'Admin',
      lastName: 'User',
      department: 'IT',
      isActive: true,
    },
  });

  console.log('Created user:', user.email);

  // Create demo partners
  const partners = await Promise.all([
    prisma.partner.upsert({
      where: { id: '00000000-0000-0000-0000-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Premium Textiles GmbH',
        type: 'Lieferant',
        address: 'Stoffstraße 123, 80331 München',
        contactPerson: 'Hans Müller',
        email: 'kontakt@premium-textiles.de',
        phone: '+49 89 123456',
        taxId: 'DE123456789',
        notes: 'Premium-Lieferant für hochwertige Stoffe',
        isActive: true,
      },
    }),
    prisma.partner.upsert({
      where: { id: '00000000-0000-0000-0000-000000000002' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000002',
        name: 'Fashion Store AG',
        type: 'Kunde',
        address: 'Modeallee 45, 10117 Berlin',
        contactPerson: 'Maria Schmidt',
        email: 'einkauf@fashion-store.de',
        phone: '+49 30 987654',
        taxId: 'DE987654321',
        notes: 'Großkunde seit 2019',
        isActive: true,
      },
    }),
    prisma.partner.upsert({
      where: { id: '00000000-0000-0000-0000-000000000003' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000003',
        name: 'Logistik Express GmbH',
        type: 'Dienstleister',
        address: 'Speditionsweg 78, 20457 Hamburg',
        contactPerson: 'Klaus Weber',
        email: 'service@logistik-express.de',
        phone: '+49 40 555666',
        isActive: true,
      },
    }),
  ]);

  console.log('Created partners:', partners.length);

  // Create contract sequence
  await prisma.contractSequence.upsert({
    where: { year: new Date().getFullYear() },
    update: {},
    create: {
      year: new Date().getFullYear(),
      lastValue: 0,
    },
  });

  // Create demo contracts
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const lastYear = new Date(now.getFullYear() - 1, 0, 1);

  const contracts = await Promise.all([
    prisma.contract.upsert({
      where: { contractNumber: `DK-${now.getFullYear()}-00001` },
      update: {},
      create: {
        contractNumber: `DK-${now.getFullYear()}-00001`,
        title: 'Rahmenvertrag Stofflieferung 2024',
        description: 'Jährlicher Rahmenvertrag für die Lieferung von Premium-Stoffen',
        type: ContractType.SUPPLIER,
        status: ContractStatus.ACTIVE,
        startDate: lastYear,
        endDate: in30Days,
        noticePeriodDays: 90,
        autoRenewal: true,
        value: 250000,
        currency: 'EUR',
        paymentTerms: '30 Tage netto',
        tags: ['premium', 'stoffe', 'rahmenvertrag'],
        partnerId: partners[0].id,
        ownerId: user.id,
        createdById: user.id,
      },
    }),
    prisma.contract.upsert({
      where: { contractNumber: `DK-${now.getFullYear()}-00002` },
      update: {},
      create: {
        contractNumber: `DK-${now.getFullYear()}-00002`,
        title: 'Vertriebsvertrag Fashion Store',
        description: 'Exklusiver Vertriebsvertrag für die DACH-Region',
        type: ContractType.CUSTOMER,
        status: ContractStatus.ACTIVE,
        startDate: lastYear,
        endDate: in90Days,
        noticePeriodDays: 180,
        autoRenewal: false,
        value: 500000,
        currency: 'EUR',
        paymentTerms: '14 Tage netto',
        tags: ['vertrieb', 'exklusiv', 'dach'],
        partnerId: partners[1].id,
        ownerId: user.id,
        createdById: user.id,
      },
    }),
    prisma.contract.upsert({
      where: { contractNumber: `DK-${now.getFullYear()}-00003` },
      update: {},
      create: {
        contractNumber: `DK-${now.getFullYear()}-00003`,
        title: 'Logistikvertrag 2024',
        description: 'Vertrag für Lagerung und Versand',
        type: ContractType.SERVICE,
        status: ContractStatus.ACTIVE,
        startDate: lastYear,
        endDate: in60Days,
        noticePeriodDays: 60,
        autoRenewal: true,
        value: 75000,
        currency: 'EUR',
        paymentTerms: '30 Tage netto',
        tags: ['logistik', 'lager', 'versand'],
        partnerId: partners[2].id,
        ownerId: user.id,
        createdById: user.id,
      },
    }),
    prisma.contract.upsert({
      where: { contractNumber: `DK-${now.getFullYear()}-00004` },
      update: {},
      create: {
        contractNumber: `DK-${now.getFullYear()}-00004`,
        title: 'NDA Premium Textiles',
        description: 'Geheimhaltungsvereinbarung für Produktentwicklung',
        type: ContractType.NDA,
        status: ContractStatus.DRAFT,
        noticePeriodDays: 30,
        tags: ['nda', 'vertraulich'],
        partnerId: partners[0].id,
        ownerId: user.id,
        createdById: user.id,
      },
    }),
  ]);

  console.log('Created contracts:', contracts.length);

  // Update sequence
  await prisma.contractSequence.update({
    where: { year: now.getFullYear() },
    data: { lastValue: 4 },
  });

  // Create reminders for expiring contracts
  const reminders = await Promise.all([
    prisma.reminder.create({
      data: {
        type: ReminderType.EXPIRATION,
        reminderDate: new Date(in30Days.getTime() - 14 * 24 * 60 * 60 * 1000),
        message: 'Stoffliefervertrag läuft in 2 Wochen ab',
        contractId: contracts[0].id,
      },
    }),
    prisma.reminder.create({
      data: {
        type: ReminderType.RENEWAL,
        reminderDate: new Date(in90Days.getTime() - 30 * 24 * 60 * 60 * 1000),
        message: 'Vertriebsvertrag sollte verlängert werden',
        contractId: contracts[1].id,
      },
    }),
  ]);

  console.log('Created reminders:', reminders.length);

  // Create sample notifications
  await prisma.notification.createMany({
    data: [
      {
        title: 'Vertrag läuft bald ab',
        message: 'Der Rahmenvertrag Stofflieferung 2024 läuft in 30 Tagen ab.',
        link: `/contracts/${contracts[0].id}`,
        userId: user.id,
      },
      {
        title: 'Neuer Vertrag erstellt',
        message: 'Der NDA Premium Textiles wurde als Entwurf gespeichert.',
        link: `/contracts/${contracts[3].id}`,
        userId: user.id,
        isRead: true,
        readAt: new Date(),
      },
    ],
  });

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
