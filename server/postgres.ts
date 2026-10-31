import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { Pool, type PoolClient } from 'pg';
import type { InsurancePolicy, Notification, Reminder, ServiceRecord, ServiceRequest, Showroom, Vehicle, VehicleDocument } from '../src/types';
import type { CustomerAccount, EmployeeAccount } from './models';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.PG_POOL_MAX || 10),
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000
});
let applicationLockClient: PoolClient | null = null;

export type PersistedRecord = Showroom | EmployeeAccount | CustomerAccount | Vehicle | ServiceRecord | InsurancePolicy | VehicleDocument | Reminder | Notification | ServiceRequest;

const tableByCollection = {
  showrooms: 'showrooms', employees: 'employees', customers: 'customers', vehicles: 'vehicles', services: 'services',
  insurancePolicies: 'insurance_policies', documents: 'documents', reminders: 'reminders', notifications: 'notifications', serviceRequests: 'service_requests'
} as const;

export type CollectionName = keyof typeof tableByCollection;

export async function migrateAndSeed(seed: { showrooms: Showroom[] }, seedEmployee?: EmployeeAccount) {
  if (!process.env.DATABASE_URL) return;
  const migrationDirectory = path.resolve(process.cwd(), 'server/migrations');
  const files = (await readdir(migrationDirectory)).filter(name => /^\d+_[a-z0-9_-]+\.sql$/i.test(name)).sort();
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock(741205031)');
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    for (const file of files) {
      const version = file.replace(/\.sql$/i, '');
      const found = await client.query('SELECT 1 FROM schema_migrations WHERE version=$1', [version]);
      if (found.rowCount) continue;
      const sql = await readFile(path.join(migrationDirectory, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations(version) VALUES($1)', [version]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
    await client.query('BEGIN');
    const hasShowroom = await client.query('SELECT 1 FROM showrooms LIMIT 1');
    if (hasShowroom.rowCount === 0) {
      for (const showroom of seed.showrooms) await upsertOn(client, 'showrooms', showroom);
    }
    if (seedEmployee) {
      const hasEmployee = await client.query('SELECT 1 FROM employees LIMIT 1');
      if (hasEmployee.rowCount === 0) {
        const firstShowroom = await client.query<{ id: string }>('SELECT id FROM showrooms ORDER BY id LIMIT 1');
        if (firstShowroom.rows[0]) await upsertOn(client, 'employees', { ...seedEmployee, showroomId: firstShowroom.rows[0].id });
      }
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.query('SELECT pg_advisory_unlock(741205031)').catch(() => undefined);
    client.release();
  }
}

function relationshipColumns(record: PersistedRecord) {
  const value = record as unknown as Record<string, unknown>;
  return {
    showroomId: typeof value.showroomId === 'string' ? value.showroomId : null,
    customerId: typeof value.customerId === 'string' ? value.customerId : null,
    vehicleId: typeof value.vehicleId === 'string' ? value.vehicleId : null,
    registrationNumber: typeof value.registrationNumber === 'string' ? value.registrationNumber : null,
    email: typeof value.email === 'string' ? value.email : null,
    employeeCode: typeof value.employeeCode === 'string' ? value.employeeCode : null
  };
}

async function upsertOn(client: PoolClient, table: string, record: PersistedRecord) {
  const rel = relationshipColumns(record);
  const data = JSON.stringify(record);
  if (table === 'showrooms') {
    await client.query('INSERT INTO showrooms(id,payload) VALUES($1,$2::jsonb) ON CONFLICT(id) DO UPDATE SET payload=EXCLUDED.payload', [record.id, data]);
  } else if (table === 'employees') {
    await client.query('INSERT INTO employees(id,showroom_id,email,employee_code,payload) VALUES($1,$2,$3,$4,$5::jsonb) ON CONFLICT(id) DO UPDATE SET showroom_id=EXCLUDED.showroom_id,email=EXCLUDED.email,employee_code=EXCLUDED.employee_code,payload=EXCLUDED.payload', [record.id, rel.showroomId, rel.email, rel.employeeCode, data]);
  } else if (table === 'customers') {
    await client.query('INSERT INTO customers(id,showroom_id,email,payload) VALUES($1,$2,$3,$4::jsonb) ON CONFLICT(id) DO UPDATE SET showroom_id=EXCLUDED.showroom_id,email=EXCLUDED.email,payload=EXCLUDED.payload', [record.id, rel.showroomId, rel.email, data]);
  } else if (table === 'vehicles') {
    await client.query('INSERT INTO vehicles(id,showroom_id,customer_id,registration_number,payload) VALUES($1,$2,$3,$4,$5::jsonb) ON CONFLICT(id) DO UPDATE SET showroom_id=EXCLUDED.showroom_id,customer_id=EXCLUDED.customer_id,registration_number=EXCLUDED.registration_number,payload=EXCLUDED.payload', [record.id, rel.showroomId, rel.customerId, rel.registrationNumber, data]);
  } else {
    const columns = ['id', 'showroom_id', 'customer_id', 'vehicle_id', 'payload'];
    const values = [record.id, rel.showroomId, rel.customerId, rel.vehicleId, data];
    await client.query(`INSERT INTO ${table}(${columns.join(',')}) VALUES($1,$2,$3,$4,$5::jsonb) ON CONFLICT(id) DO UPDATE SET showroom_id=EXCLUDED.showroom_id,customer_id=EXCLUDED.customer_id,vehicle_id=EXCLUDED.vehicle_id,payload=EXCLUDED.payload`, values);
  }
}

export async function upsertRecord(collection: CollectionName, record: PersistedRecord) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await upsertOn(client, tableByCollection[collection], record);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

export async function loadCollection<T extends PersistedRecord>(collection: CollectionName): Promise<T[]> {
  const result = await pool.query<{ payload: T }>(`SELECT payload FROM ${tableByCollection[collection]} ORDER BY id`);
  return result.rows.map(row => row.payload);
}

export async function deleteDemoData() {
  await pool.query('TRUNCATE service_requests, notifications, reminders, documents, insurance_policies, services, vehicles, customers RESTART IDENTITY CASCADE');
}

export async function acquireReminderLock(): Promise<(() => Promise<void>) | null> {
  if (process.env.NODE_ENV === 'test') return async () => undefined;
  const client = await pool.connect();
  try {
    const result = await client.query<{ locked: boolean }>('SELECT pg_try_advisory_lock(741205032) AS locked');
    if (!result.rows[0]?.locked) { client.release(); return null; }
    return async () => {
      try { await client.query('SELECT pg_advisory_unlock(741205032)'); }
      finally { client.release(); }
    };
  } catch (error) {
    client.release();
    throw error;
  }
}

export async function acquireSingleInstanceLock() {
  const client = await pool.connect();
  try {
    const result = await client.query<{ locked: boolean }>('SELECT pg_try_advisory_lock(741205030) AS locked');
    if (!result.rows[0]?.locked) throw new Error('Another RemindMe server instance already holds the database lock');
    applicationLockClient = client;
  } catch (error) {
    client.release();
    throw error;
  }
}

export async function releaseSingleInstanceLock() {
  if (!applicationLockClient) return;
  const client = applicationLockClient;
  applicationLockClient = null;
  try { await client.query('SELECT pg_advisory_unlock(741205030)'); }
  finally { client.release(); }
}

export async function closePool() {
  await releaseSingleInstanceLock();
  await pool.end();
}
