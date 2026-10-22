# RemindMe

RemindMe manages dealership customers, vehicles, service history, insurance and vehicle documents. It evaluates service and expiry dates, stores reminder history, and exposes staff and customer portal APIs. Email, SMS, and WhatsApp delivery is simulated and logged; this project does not send through live providers.

## Local setup

Requirements: Node.js 20 or newer and a PostgreSQL database. The server applies SQL migrations at startup and seeds the showroom only when no showroom records exist. Existing database records are not reset on startup.

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set `DATABASE_URL` to the PostgreSQL connection string.
3. Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` (at least 10 characters) to create the first admin account when the employees table is empty. Keep these values in environment secrets. Set `SESSION_SECRET` to a randomly generated secret in production; production startup refuses to issue sessions without it.
4. Start the app with `npm run dev`.

The app listens on `PORT` (default 3000). The first admin signs in using the configured email and password. Staff create customer portal accounts and set a password when creating a customer record.

The current server keeps a read cache in the running process and takes a PostgreSQL advisory lock to prevent multiple app instances from using stale caches concurrently. Run one server process per database until reads are moved fully to request-scoped database queries.

## Checks

- `npm test` runs API and security tests.
- `npm run lint` runs the TypeScript check.
- `npm run build` builds the frontend and bundled server.

The test suite does not require a PostgreSQL service; the application itself does.
