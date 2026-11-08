import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import type { Showroom } from '../src/types';
import type { CustomerAccount, EmployeeAccount } from './models';
import { disconnectPrismaClient, prisma } from './prismaClient';
import type { PersistedRecord, CollectionName } from './storeTypes';
export type { PersistedRecord, CollectionName } from './storeTypes';

const modelByCollection = {
  showrooms: 'showroom',
  employees: 'employee',
  customers: 'customer',
  vehicles: 'vehicle',
  services: 'service',
  insurancePolicies: 'insurancePolicy',
  documents: 'vehicleDocument',
  reminders: 'reminder',
  notifications: 'notification',
  serviceRequests: 'serviceRequest'
} as const;

type ModelKey = typeof modelByCollection[CollectionName];
const testModelOverrides = new Map<ModelKey, any>();
const prismaClient = prisma as unknown as Record<ModelKey, any>;

/** Replace an individual Prisma delegate in isolated unit tests. */
export function setPrismaModelForTests(model: ModelKey, delegate?: unknown) {
  if (delegate === undefined) testModelOverrides.delete(model);
  else testModelOverrides.set(model, delegate);
}

function modelFor(collection: CollectionName) {
  const key = modelByCollection[collection];
  return testModelOverrides.get(key) ?? prismaClient[key];
}

export async function connectPrisma() {
  await prisma.$connect();
  await prisma.showroom.count();
}

export async function disconnectPrisma() {
  await releaseSingleInstanceLock();
  await disconnectPrismaClient();
}

export async function seedInitialData(showrooms: Showroom[], seedEmployee?: EmployeeAccount) {
  if (await prisma.showroom.count() === 0) {
    await prisma.$transaction(async transaction => {
      for (const showroom of showrooms) {
        await transaction.showroom.create({
          data: { id: showroom.id, payload: showroom as unknown as Prisma.InputJsonValue }
        });
      }
    });
  }

  if (seedEmployee && await prisma.employee.count() === 0) {
    const showroom = await prisma.showroom.findFirst({ orderBy: { id: 'asc' } });
    if (showroom) {
      await prisma.employee.create({
        data: {
          id: seedEmployee.id,
          showroomId: showroom.id,
          email: seedEmployee.email,
          employeeCode: seedEmployee.employeeCode,
          payload: seedEmployee as unknown as Prisma.InputJsonValue
        }
      });
    }
  }
}

export async function upsertRecord(collection: CollectionName, record: PersistedRecord) {
  const value = record as unknown as Record<string, unknown>;
  const data: Record<string, unknown> = {
    id: record.id,
    payload: record as unknown as Prisma.InputJsonValue
  };

  for (const field of ['showroomId', 'customerId', 'vehicleId', 'registrationNumber', 'email', 'employeeCode']) {
    if (Object.prototype.hasOwnProperty.call(value, field)) data[field] = value[field];
  }

  await modelFor(collection).upsert({
    where: { id: record.id },
    create: data,
    update: data
  });
}

export async function loadCollection<T extends PersistedRecord>(collection: CollectionName): Promise<T[]> {
  const rows = await modelFor(collection).findMany({
    select: { payload: true },
    orderBy: { id: 'asc' }
  }) as Array<{ payload: Prisma.JsonValue }>;
  return rows.map(row => row.payload as unknown as T);
}

export async function deleteDemoData() {
  if (!process.env.DATABASE_URL) return;
  await prisma.$transaction(async transaction => {
    await transaction.serviceRequest.deleteMany();
    await transaction.notification.deleteMany();
    await transaction.reminder.deleteMany();
    await transaction.vehicleDocument.deleteMany();
    await transaction.insurancePolicy.deleteMany();
    await transaction.service.deleteMany();
    await transaction.vehicle.deleteMany();
    await transaction.customer.deleteMany();
  });
}

const applicationLockTtlMs = 5 * 60 * 1000;

async function acquireLease(key: string): Promise<(() => Promise<void>) | null> {
  const now = new Date();
  const ownerToken = randomUUID();
  await prisma.applicationLock.deleteMany({ where: { key, expiresAt: { lt: now } } });

  try {
    await prisma.applicationLock.create({
      data: { key, ownerToken, expiresAt: new Date(now.getTime() + applicationLockTtlMs) }
    });
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2002') return null;
    throw error;
  }

  const heartbeat = setInterval(() => {
    void prisma.applicationLock.updateMany({
      where: { key, ownerToken },
      data: { expiresAt: new Date(Date.now() + applicationLockTtlMs) }
    }).catch(error => console.error('[RemindMe] Could not renew PostgreSQL lease:', error));
  }, Math.floor(applicationLockTtlMs / 3));
  heartbeat.unref();

  return async () => {
    clearInterval(heartbeat);
    await prisma.applicationLock.deleteMany({ where: { key, ownerToken } });
  };
}

let releaseApplicationLease: (() => Promise<void>) | null = null;

export async function acquireSingleInstanceLock() {
  if (process.env.NODE_ENV === 'test') return;
  const release = await acquireLease('application');
  if (!release) throw new Error('Another RemindMe server instance already holds the database lease');
  releaseApplicationLease = release;
}

export async function releaseSingleInstanceLock() {
  if (!releaseApplicationLease) return;
  const release = releaseApplicationLease;
  releaseApplicationLease = null;
  await release();
}

export async function acquireReminderLock(): Promise<(() => Promise<void>) | null> {
  if (process.env.NODE_ENV === 'test' || !process.env.DATABASE_URL) return async () => undefined;
  return acquireLease('reminder-engine');
}
