require('dotenv').config({ quiet: true });
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const directUrl = process.env.DIRECT_URL?.trim();
const databaseUrl = directUrl || process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required before applying Prisma migrations.');

const publicUrl = new URL(databaseUrl);
if (!directUrl && publicUrl.hostname === 'pooled.db.prisma.io') publicUrl.hostname = 'db.prisma.io';
publicUrl.searchParams.delete('schema');
const pool = new Pool({ connectionString: publicUrl.toString() });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

(async () => {
  try {
    // Create only the app namespace; existing public tables remain untouched.
    await prisma.$executeRawUnsafe('CREATE SCHEMA IF NOT EXISTS "remindme_app"');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
})();
