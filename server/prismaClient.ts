import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

export const REMINDME_DATABASE_SCHEMA = 'remindme_app';

export function databaseUrlForSchema(schema: string, configured = process.env.DATABASE_URL) {
  if (!configured) return undefined;
  const url = new URL(configured);
  if (url.hostname === 'pooled.db.prisma.io') {
    // Prisma Postgres' pooled TCP endpoint rejects schema routing parameters.
    // Every model declares @@schema, so Prisma can qualify tables directly.
    url.searchParams.delete('schema');
  } else {
    url.searchParams.set('schema', schema);
  }
  return url.toString();
}

let client: PrismaClient | undefined;
let pool: Pool | undefined;

function getClient() {
  if (!client) {
    const datasourceUrl = databaseUrlForSchema(REMINDME_DATABASE_SCHEMA);
    if (datasourceUrl) {
      pool = new Pool({ connectionString: datasourceUrl });
      client = new PrismaClient({ adapter: new PrismaPg(pool) });
    } else {
      client = new PrismaClient();
    }
  }
  return client;
}

// Defer construction until database access. This keeps API and store tests
// importable without a generated client while normal startup still requires it.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const instance = getClient();
    const value = Reflect.get(instance, property, instance);
    return typeof value === 'function' ? value.bind(instance) : value;
  }
});

export async function disconnectPrismaClient() {
  if (client) await client.$disconnect();
  if (pool) await pool.end();
}
