CREATE TABLE IF NOT EXISTS showrooms (
  id text PRIMARY KEY,
  payload jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS employees (
  id text PRIMARY KEY,
  showroom_id text NOT NULL REFERENCES showrooms(id) ON DELETE RESTRICT,
  email text NOT NULL UNIQUE,
  employee_code text NOT NULL UNIQUE,
  payload jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
  id text PRIMARY KEY,
  showroom_id text NOT NULL REFERENCES showrooms(id) ON DELETE RESTRICT,
  email text,
  payload jsonb NOT NULL,
  UNIQUE (id, showroom_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS customers_email_unique ON customers (lower(email)) WHERE email IS NOT NULL AND email <> '';

CREATE TABLE IF NOT EXISTS vehicles (
  id text PRIMARY KEY,
  showroom_id text NOT NULL REFERENCES showrooms(id) ON DELETE RESTRICT,
  customer_id text NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  registration_number text NOT NULL UNIQUE,
  payload jsonb NOT NULL,
  UNIQUE (id, showroom_id, customer_id),
  FOREIGN KEY (customer_id, showroom_id) REFERENCES customers(id, showroom_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS services (
  id text PRIMARY KEY,
  showroom_id text NOT NULL REFERENCES showrooms(id) ON DELETE RESTRICT,
  customer_id text NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  vehicle_id text NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  payload jsonb NOT NULL,
  FOREIGN KEY (vehicle_id, showroom_id, customer_id) REFERENCES vehicles(id, showroom_id, customer_id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS insurance_policies (
  id text PRIMARY KEY,
  showroom_id text NOT NULL REFERENCES showrooms(id) ON DELETE RESTRICT,
  customer_id text NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  vehicle_id text NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  payload jsonb NOT NULL,
  FOREIGN KEY (vehicle_id, showroom_id, customer_id) REFERENCES vehicles(id, showroom_id, customer_id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS documents (
  id text PRIMARY KEY,
  showroom_id text NOT NULL REFERENCES showrooms(id) ON DELETE RESTRICT,
  customer_id text NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  vehicle_id text NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  payload jsonb NOT NULL,
  FOREIGN KEY (vehicle_id, showroom_id, customer_id) REFERENCES vehicles(id, showroom_id, customer_id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS reminders (
  id text PRIMARY KEY,
  showroom_id text NOT NULL REFERENCES showrooms(id) ON DELETE RESTRICT,
  customer_id text NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  vehicle_id text NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  payload jsonb NOT NULL,
  FOREIGN KEY (vehicle_id, showroom_id, customer_id) REFERENCES vehicles(id, showroom_id, customer_id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX IF NOT EXISTS reminders_cycle_unique ON reminders (vehicle_id, (payload->>'category'), (payload->>'dueDate')) WHERE payload->>'status' <> 'CANCELLED';
CREATE TABLE IF NOT EXISTS notifications (
  id text PRIMARY KEY,
  showroom_id text NOT NULL REFERENCES showrooms(id) ON DELETE RESTRICT,
  customer_id text NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  vehicle_id text NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  payload jsonb NOT NULL,
  FOREIGN KEY (vehicle_id, showroom_id, customer_id) REFERENCES vehicles(id, showroom_id, customer_id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS service_requests (
  id text PRIMARY KEY,
  showroom_id text NOT NULL REFERENCES showrooms(id) ON DELETE RESTRICT,
  customer_id text NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  vehicle_id text NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  payload jsonb NOT NULL,
  FOREIGN KEY (vehicle_id, showroom_id, customer_id) REFERENCES vehicles(id, showroom_id, customer_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
