CREATE SCHEMA IF NOT EXISTS "remindme_app";

CREATE TABLE "remindme_app"."showrooms" (
    "id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    CONSTRAINT "showrooms_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "remindme_app"."employees" (
    "id" TEXT NOT NULL,
    "showroom_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "employee_code" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "remindme_app"."customers" (
    "id" TEXT NOT NULL,
    "showroom_id" TEXT NOT NULL,
    "email" TEXT,
    "payload" JSONB NOT NULL,
    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "remindme_app"."vehicles" (
    "id" TEXT NOT NULL,
    "showroom_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "registration_number" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "remindme_app"."services" (
    "id" TEXT NOT NULL,
    "showroom_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "remindme_app"."insurance_policies" (
    "id" TEXT NOT NULL,
    "showroom_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    CONSTRAINT "insurance_policies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "remindme_app"."documents" (
    "id" TEXT NOT NULL,
    "showroom_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "remindme_app"."reminders" (
    "id" TEXT NOT NULL,
    "showroom_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "remindme_app"."notifications" (
    "id" TEXT NOT NULL,
    "showroom_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "remindme_app"."service_requests" (
    "id" TEXT NOT NULL,
    "showroom_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    CONSTRAINT "service_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "remindme_app"."application_locks" (
    "key" TEXT NOT NULL,
    "owner_token" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "application_locks_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "remindme_app"."data_imports" (
    "key" TEXT NOT NULL,
    "completed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "data_imports_pkey" PRIMARY KEY ("key")
);

CREATE UNIQUE INDEX "employees_email_key" ON "remindme_app"."employees"("email");
CREATE UNIQUE INDEX "employees_employee_code_key" ON "remindme_app"."employees"("employee_code");
CREATE UNIQUE INDEX "customers_id_showroom_id_key" ON "remindme_app"."customers"("id", "showroom_id");
CREATE UNIQUE INDEX "customers_email_unique" ON "remindme_app"."customers"(LOWER("email")) WHERE "email" IS NOT NULL AND "email" <> '';
CREATE UNIQUE INDEX "vehicles_registration_number_key" ON "remindme_app"."vehicles"("registration_number");
CREATE UNIQUE INDEX "vehicles_id_showroom_id_customer_id_key" ON "remindme_app"."vehicles"("id", "showroom_id", "customer_id");
CREATE UNIQUE INDEX "reminders_cycle_unique" ON "remindme_app"."reminders"("vehicle_id", ("payload"->>'category'), ("payload"->>'dueDate')) WHERE "payload"->>'status' <> 'CANCELLED';

ALTER TABLE "remindme_app"."employees" ADD CONSTRAINT "employees_showroom_id_fkey" FOREIGN KEY ("showroom_id") REFERENCES "remindme_app"."showrooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "remindme_app"."customers" ADD CONSTRAINT "customers_showroom_id_fkey" FOREIGN KEY ("showroom_id") REFERENCES "remindme_app"."showrooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "remindme_app"."vehicles" ADD CONSTRAINT "vehicles_customer_id_showroom_id_fkey" FOREIGN KEY ("customer_id", "showroom_id") REFERENCES "remindme_app"."customers"("id", "showroom_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "remindme_app"."services" ADD CONSTRAINT "services_vehicle_id_showroom_id_customer_id_fkey" FOREIGN KEY ("vehicle_id", "showroom_id", "customer_id") REFERENCES "remindme_app"."vehicles"("id", "showroom_id", "customer_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "remindme_app"."insurance_policies" ADD CONSTRAINT "insurance_policies_vehicle_id_showroom_id_customer_id_fkey" FOREIGN KEY ("vehicle_id", "showroom_id", "customer_id") REFERENCES "remindme_app"."vehicles"("id", "showroom_id", "customer_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "remindme_app"."documents" ADD CONSTRAINT "documents_vehicle_id_showroom_id_customer_id_fkey" FOREIGN KEY ("vehicle_id", "showroom_id", "customer_id") REFERENCES "remindme_app"."vehicles"("id", "showroom_id", "customer_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "remindme_app"."reminders" ADD CONSTRAINT "reminders_vehicle_id_showroom_id_customer_id_fkey" FOREIGN KEY ("vehicle_id", "showroom_id", "customer_id") REFERENCES "remindme_app"."vehicles"("id", "showroom_id", "customer_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "remindme_app"."notifications" ADD CONSTRAINT "notifications_vehicle_id_showroom_id_customer_id_fkey" FOREIGN KEY ("vehicle_id", "showroom_id", "customer_id") REFERENCES "remindme_app"."vehicles"("id", "showroom_id", "customer_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "remindme_app"."service_requests" ADD CONSTRAINT "service_requests_vehicle_id_showroom_id_customer_id_fkey" FOREIGN KEY ("vehicle_id", "showroom_id", "customer_id") REFERENCES "remindme_app"."vehicles"("id", "showroom_id", "customer_id") ON DELETE RESTRICT ON UPDATE CASCADE;
