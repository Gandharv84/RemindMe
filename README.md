# RemindMe

RemindMe manages dealership customers, vehicles, service history, insurance, and vehicle documents. It evaluates service dates, insurance expiry, and PUC expiry, stores reminder history, and exposes staff and customer portal APIs. Reminder delivery supports email only through SMTP.

## Local setup

Requirements: Node.js 20.19 or newer and a PostgreSQL database. Prisma 7 ORM is the application persistence layer. The Prisma schema and migrations live in `prisma/`; generated Prisma Client reads and writes the app's relational keys and JSONB domain records. Normal server startup requires PostgreSQL and stops if the database is unavailable.

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set `DATABASE_URL` to the PostgreSQL connection string. Prisma routes app models to the `remindme_app` schema; existing `public` tables are left untouched. For Prisma Postgres, use the pooled `pooled.db.prisma.io` URL for `DATABASE_URL`; the app leaves off a connection-level `schema` parameter because each Prisma model declares its schema. Keep `ALLOW_IN_MEMORY_DEMO=false` for normal operation. If PostgreSQL is missing or unreachable, the server stops instead of switching to temporary memory.
3. Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` (at least 10 characters) to create the first admin account when the employees table is empty. Keep these values in environment secrets. Set `SESSION_SECRET` to a randomly generated secret in production; production startup refuses to issue sessions without it.
4. To send reminder emails, set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `FROM_EMAIL` in the server environment. Port 465 uses TLS; port 587 uses STARTTLS. Keep credentials in the server environment and never add them to frontend configuration.
5. Run `npm run db:migrate` to apply pending Prisma migrations, then start the app with `npm run dev`. Apply pending migrations before `npm start` in production as well. The server itself stops with a clear Prisma/PostgreSQL initialization error if its schema has not been migrated.

## Database migration

The previous checkout used `pg`, handwritten SQL, and JSONB `payload` columns in the default schema. The configured database contains a different, older normalized schema in `public` (integer IDs, `users`, `customers`, `vehicles`, and related tables). `CREATE TABLE IF NOT EXISTS` had skipped those existing tables; the next reminder index then failed because `reminders.payload` did not exist. The old SQL migration is no longer run by the application.

Prisma models the current app data in the dedicated `remindme_app` schema, including its JSONB payloads and showroom/customer/vehicle relations. Its migration history is isolated there, so the historical `_prisma_migrations` records in `public` do not get reconciled or rewritten. The initial Prisma migration creates app tables and indexes only; it does not drop, rename, or alter the old public tables. A setup step creates the new schema before Prisma Migrate runs.

The initial migration also keeps two PostgreSQL expression/partial indexes: case-insensitive uniqueness for non-empty customer email addresses and reminder-cycle deduplication except for cancelled reminders. Prisma's schema model does not encode these index forms, so preserve these statements in future migration SQL when changing related tables.

For Prisma Postgres, Prisma Migrate and schema preparation use `DIRECT_URL` when set. If it is blank, the tooling derives `db.prisma.io` from the pooled `DATABASE_URL` host, preserving the same credentials. Application runtime continues to use the pooled URL. Set `DIRECT_URL` explicitly if your provider or network requires a different direct endpoint.

The existing public `users` and `customers` are represented as externally managed Prisma models. On first startup, their account/customer rows are copied once to the current app model with deterministic IDs; the original rows remain in `public`. Legacy bcrypt password hashes remain verifiable. The current database inspection found no legacy vehicles, service records, insurance policies, documents, reminders, notifications, service requests, or email deliveries, so no such rows needed conversion. If those tables contain records in another deployment, they remain intact in `public` and need an explicit mapping before the new app schema can display them.

Useful Prisma commands:

- `npm run db:generate` generates Prisma Client.
- `npm run db:migrate` applies committed migrations without resetting the database.
- `npm run db:migrate:dev` creates/applies a development migration; use only against a development database.
- `npm run db:seed` seeds the initial showroom/admin and performs the idempotent legacy account import.
- `npm run db:inspect` reports aggregate row counts in `remindme_app` and the preserved legacy `public` tables without printing records or credentials.
- `npm run smoke:database` runs a live customer-to-staff service-request check after migrations are applied, then removes only its uniquely identified test rows.
- `npm run prisma:validate` validates `prisma/schema.prisma`.

The app listens on `PORT` (default 3000). The first admin signs in using the configured email and password. Staff create customer portal accounts and set a password when creating a customer record.

The reminder engine emails customers for vehicle servicing, insurance expiry, and PUC expiry. Without all SMTP settings, it records the attempt as failed and the Notification History page lists the missing setting names. After configuring SMTP and restarting the server, staff can retry failed email attempts from that page. A successful SMTP response is recorded as `SENT` / “SMTP accepted”; this confirms acceptance by the SMTP server, not delivery to the recipient's inbox.

Older SMS and WhatsApp records remain visible as historical, unverified entries. They are not available for new delivery or retry. Legacy simulated notification records are marked failed because they did not represent verified delivery.

The current server keeps a read cache in the running process and maintains a Prisma-backed database lease to prevent multiple app instances from using stale caches concurrently. Run one server process per database until reads are moved fully to request-scoped database queries. For an intentional local demo only, set `ALLOW_IN_MEMORY_DEMO=true` when `NODE_ENV` is not `production`; demo data and requests disappear on restart and are not shared between server instances.

## Checks

- `npm test` generates Prisma Client and runs API, Prisma-store, security, and email delivery tests. SMTP and Prisma delegates are mocked in tests; no real email is sent and tests do not write to PostgreSQL.
- `npm run lint` generates Prisma Client and runs the TypeScript check.
- `npm run build` generates Prisma Client and builds the frontend and bundled server.

The application requires a configured PostgreSQL database unless intentional demo mode is enabled. Prisma migration and connection checks use the configured database when you run `npm run db:migrate` or start the server.
