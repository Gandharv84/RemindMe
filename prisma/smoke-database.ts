import 'dotenv/config';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { createApp } from '../server/app';
import { db } from '../server/db';
import { createSessionToken, hashPassword } from '../server/security';
import { disconnectPrisma } from '../server/prismaStore';
import { prisma } from '../server/prismaClient';

let listener: Server | undefined;
let customerId: string | undefined;
let vehicleId: string | undefined;
let requestId: string | undefined;

async function startApi() {
  const app = await createApp({ serveFrontend: false });
  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  listener = server;
  return `http://127.0.0.1:${address.port}`;
}

async function stopApi() {
  if (!listener) return;
  const server = listener;
  listener = undefined;
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}

async function apiRequest(baseUrl: string, path: string, token: string, method = 'GET', body?: unknown) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
}

try {
  await db.initialize();
  const showroom = db.showrooms[0];
  const employee = db.employees.find(item => item.showroomId === showroom?.id);
  assert.ok(showroom, 'an app showroom must be seeded');
  assert.ok(employee, 'an app employee/admin must be seeded');

  const unique = randomUUID();
  const customer = await db.addCustomer({
    showroomId: showroom.id,
    name: `Prisma smoke ${unique.slice(0, 8)}`,
    phone: '',
    email: `prisma-smoke-${unique}@example.invalid`,
    address: '', city: '', pincode: '', status: 'ACTIVE', preferredChannel: 'EMAIL',
    passwordHash: await hashPassword(randomUUID())
  });
  customerId = customer.id;

  const vehicle = await db.addVehicle({
    showroomId: showroom.id, customerId: customer.id, registrationNumber: `SMOKE-${unique.slice(0, 8)}`.toUpperCase(),
    brand: 'Smoke', model: 'Test', variant: 'Test', fuelType: 'PETROL', purchaseDate: new Date().toISOString().slice(0, 10),
    chassisNumber: '', engineNumber: '', color: '', currentOdometer: 1, status: 'ACTIVE'
  });
  vehicleId = vehicle.id;

  const customerToken = createSessionToken({ id: customer.id, role: 'CUSTOMER', showroomId: showroom.id });
  const staffToken = createSessionToken({ id: employee.id, role: employee.role, showroomId: employee.showroomId });
  const createUrl = await startApi();
  const preferredDate = new Date();
  preferredDate.setDate(preferredDate.getDate() + 3);
  const submitted = await apiRequest(createUrl, '/api/customer-portal/request-service', customerToken, 'POST', {
    vehicleId: vehicle.id,
    preferredDate: preferredDate.toISOString().slice(0, 10),
    serviceType: 'PERIODIC_MAINTENANCE',
    notes: 'Prisma persistence smoke test'
  });
  assert.equal(submitted.status, 201, `customer request creation returned ${submitted.status}`);
  const createdRequest = await submitted.json() as { id: string };
  requestId = createdRequest.id;

  await stopApi();
  await disconnectPrisma();
  await db.initialize();

  const staffUrl = await startApi();
  const listed = await apiRequest(staffUrl, `/api/service-requests?showroomId=${encodeURIComponent(showroom.id)}`, staffToken);
  assert.equal(listed.status, 200, `staff retrieval returned ${listed.status}`);
  const requests = await listed.json() as Array<{ id: string; showroomId: string }>;
  assert.ok(requests.some(item => item.id === createdRequest.id && item.showroomId === showroom.id), 'request persisted across reinitialization and is visible to its showroom staff');
  const stored = await prisma.serviceRequest.findUnique({ where: { id: createdRequest.id }, select: { id: true } });
  assert.ok(stored, 'Prisma can read the request from PostgreSQL after reinitialization');
  console.log('PASS: customer service request persisted through Prisma, survived database-client reinitialization, and appeared in its showroom staff API.');
} catch (error) {
  console.error('FAIL: live Prisma service-request smoke test did not complete.');
  throw error;
} finally {
  await stopApi().catch(() => undefined);
  if (customerId) {
    await prisma.$connect().catch(() => undefined);
    await prisma.serviceRequest.deleteMany({ where: { customerId } }).catch(() => undefined);
    if (requestId) await prisma.serviceRequest.deleteMany({ where: { id: requestId } }).catch(() => undefined);
    if (vehicleId) await prisma.vehicle.deleteMany({ where: { id: vehicleId } }).catch(() => undefined);
    await prisma.customer.deleteMany({ where: { id: customerId } }).catch(() => undefined);
  }
  await disconnectPrisma().catch(() => undefined);
}
