import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { loadCollection, setPrismaModelForTests, upsertRecord } from '../prismaStore';
import { databaseUrlForSchema } from '../prismaClient';

test('Prisma Postgres pooled runtime URL omits schema routing and keeps TLS settings', () => {
  const url = new URL(databaseUrlForSchema(
    'remindme_app',
    'postgres://user:password@pooled.db.prisma.io:5432/postgres?sslmode=require&schema=public'
  )!);
  assert.equal(url.hostname, 'pooled.db.prisma.io');
  assert.equal(url.searchParams.get('sslmode'), 'require');
  assert.equal(url.searchParams.has('schema'), false);
});

test('Prisma store writes a structured service request with showroom relations', async () => {
  let received: any;
  setPrismaModelForTests('serviceRequest', {
    async upsert(args: unknown) { received = args; }
  });
  try {
    const record = {
      id: 'request-1', showroomId: 'showroom-1', customerId: 'customer-1', vehicleId: 'vehicle-1',
      preferredDate: '2026-11-05', serviceType: 'PERIODIC_MAINTENANCE', notes: 'Check brakes.',
      status: 'PENDING', createdAt: '2026-10-31T00:00:00.000Z'
    } as any;
    await upsertRecord('serviceRequests', record);
    assert.deepEqual(received.where, { id: 'request-1' });
    assert.equal(received.create.id, 'request-1');
    assert.equal(received.create.showroomId, 'showroom-1');
    assert.equal(received.create.customerId, 'customer-1');
    assert.equal(received.create.vehicleId, 'vehicle-1');
    assert.deepEqual(received.create.payload, record);
  } finally {
    setPrismaModelForTests('serviceRequest');
  }
});

test('Prisma store reloads persisted JSON payloads in stable order', async () => {
  let received: any;
  setPrismaModelForTests('serviceRequest', {
    async findMany(args: unknown) {
      received = args;
      return [{ payload: { id: 'request-1', showroomId: 'showroom-1' } }];
    }
  });
  try {
    const records = await loadCollection<any>('serviceRequests');
    assert.deepEqual(received, { select: { payload: true }, orderBy: { id: 'asc' } });
    assert.deepEqual(records, [{ id: 'request-1', showroomId: 'showroom-1' }]);
  } finally {
    setPrismaModelForTests('serviceRequest');
  }
});

test('Prisma migration is additive and creates its app schema without touching legacy tables', async () => {
  const migrationPath = path.resolve(process.cwd(), 'prisma/migrations/20261031120000_app_schema/migration.sql');
  const migration = await readFile(migrationPath, 'utf8');
  assert.match(migration, /CREATE SCHEMA IF NOT EXISTS "remindme_app"/i);
  assert.match(migration, /CREATE TABLE "remindme_app"\."service_requests"/i);
  assert.match(migration, /"payload" JSONB NOT NULL/i);
  assert.doesNotMatch(migration, /\bDROP\s+(TABLE|SCHEMA|COLUMN)\b|\bTRUNCATE\b/i);
  assert.doesNotMatch(migration, /public\.(users|customers|vehicles|services|notifications)/i);
});
