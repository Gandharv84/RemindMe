import 'dotenv/config';
import { defineConfig } from 'prisma/config';

function migrationDatabaseUrl() {
  const direct = process.env.DIRECT_URL?.trim();
  const configured = direct || process.env.DATABASE_URL;
  if (!configured) return 'postgresql://placeholder:placeholder@localhost:5432/remindme?schema=remindme_app';
  const url = new URL(configured);
  if (!direct && url.hostname === 'pooled.db.prisma.io') url.hostname = 'db.prisma.io';
  url.searchParams.set('schema', 'remindme_app');
  return url.toString();
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts'
  },
  datasource: { url: migrationDatabaseUrl() },
  experimental: { externalTables: true },
  tables: {
    external: [
      'public.users', 'public.customers', 'public.vehicles', 'public.services',
      'public.insurance_policies', 'public.documents', 'public.reminders',
      'public.notifications', 'public.service_requests', 'public.email_deliveries',
      'public.schema_migrations'
    ]
  },
  enums: { external: ['public.UserRole', 'public.UserStatus', 'public.EmailDeliveryStatus'] }
});
