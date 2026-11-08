import 'dotenv/config';
import { prisma } from '../server/prismaClient';

async function countIfPresent(readCount: () => Promise<number>) {
  try { return await readCount(); }
  catch (error) {
    if ((error as { code?: string })?.code === 'P2021' || (error as { code?: string })?.code === 'P2022') return null;
    throw error;
  }
}

async function countModels(entries: Array<[string, () => Promise<number>]>) {
  const pairs = await Promise.all(entries.map(async ([name, readCount]) => [name, await countIfPresent(readCount)] as const));
  return Object.fromEntries(pairs);
}

try {
  await prisma.$connect();
  const app = await countModels([
    ['showrooms', () => prisma.showroom.count()],
    ['employees', () => prisma.employee.count()],
    ['customers', () => prisma.customer.count()],
    ['vehicles', () => prisma.vehicle.count()],
    ['services', () => prisma.service.count()],
    ['insurancePolicies', () => prisma.insurancePolicy.count()],
    ['documents', () => prisma.vehicleDocument.count()],
    ['reminders', () => prisma.reminder.count()],
    ['notifications', () => prisma.notification.count()],
    ['serviceRequests', () => prisma.serviceRequest.count()]
  ]);
  const legacyPublic = await countModels([
    ['users', () => prisma.legacyUser.count()],
    ['customers', () => prisma.legacyCustomer.count()],
    ['vehicles', () => prisma.legacyVehicle.count()],
    ['services', () => prisma.legacyService.count()],
    ['insurancePolicies', () => prisma.legacyInsurancePolicy.count()],
    ['documents', () => prisma.legacyDocument.count()],
    ['reminders', () => prisma.legacyReminder.count()],
    ['notifications', () => prisma.legacyNotification.count()],
    ['serviceRequests', () => prisma.legacyServiceRequest.count()],
    ['emailDeliveries', () => prisma.legacyEmailDelivery.count()]
  ]);
  console.log(JSON.stringify({ appSchema: 'remindme_app', app, legacyPublic }, null, 2));
} finally {
  await prisma.$disconnect();
}
