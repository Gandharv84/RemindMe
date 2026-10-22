import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { createApp } from '../app';
import { db } from '../db';
import { createSessionToken, hashPassword } from '../security';
import { reminderEngine } from '../services/reminderEngine';
import { notificationService } from '../services/notificationService';

process.env.SESSION_SECRET = 'test-only-session-secret-0123456789';
process.env.NODE_ENV = 'test';
let server: Server;
let baseUrl: string;
let employeeToken: string;
let adminToken: string;
let customerToken: string;

const customer = (id: string, passwordHash: string) => ({
  id, showroomId: 'sh-1', customerCode: id.toUpperCase(), name: id, phone: `+91 90000000${id === 'c1' ? '01' : '02'}`,
  email: `${id}@example.test`, address: '', city: '', pincode: '', status: 'ACTIVE' as const, preferredChannel: 'ALL' as const,
  passwordHash, createdAt: '', updatedAt: ''
});

before(async () => {
  const employeeHash = await hashPassword('employee-password-10');
  const adminHash = await hashPassword('administrator-password');
  const customerHash = await hashPassword('customer-password-10');
  db.showrooms = [
    { id: 'sh-1', name: 'Test showroom', code: 'TEST', city: '', state: '', address: '', phone: '', email: '', gstNumber: '', managerName: '', createdAt: '', updatedAt: '' },
    { id: 'sh-2', name: 'Other showroom', code: 'OTHER', city: '', state: '', address: '', phone: '', email: '', gstNumber: '', managerName: '', createdAt: '', updatedAt: '' }
  ];
  db.employees = [
    { id: 'e1', showroomId: 'sh-1', name: 'Employee', email: 'employee@example.test', phone: '', role: 'EMPLOYEE', employeeCode: 'EMP-1', designation: 'Advisor', passwordHash: employeeHash, active: true, createdAt: '', updatedAt: '' },
    { id: 'a1', showroomId: 'sh-1', name: 'Admin', email: 'admin@example.test', phone: '', role: 'ADMIN', employeeCode: 'ADMIN-1', designation: 'Admin', passwordHash: adminHash, active: true, createdAt: '', updatedAt: '' },
    { id: 'e2', showroomId: 'sh-1', name: 'Inactive', email: 'inactive@example.test', phone: '', role: 'EMPLOYEE', employeeCode: 'EMP-2', designation: 'Advisor', passwordHash: employeeHash, active: false, createdAt: '', updatedAt: '' }
  ];
  db.customers = [customer('c1', customerHash), customer('c2', customerHash), { ...customer('c3', customerHash), showroomId: 'sh-2' }];
  db.vehicles = [
    { id: 'v1', showroomId: 'sh-1', customerId: 'c1', registrationNumber: 'AA-01', brand: 'A', model: 'One', variant: '', fuelType: 'PETROL', purchaseDate: '2025-01-01', chassisNumber: '', engineNumber: '', color: '', currentOdometer: 1, status: 'ACTIVE', nextServiceDate: '2026-10-24', createdAt: '', updatedAt: '' },
    { id: 'v2', showroomId: 'sh-1', customerId: 'c2', registrationNumber: 'BB-02', brand: 'B', model: 'Two', variant: '', fuelType: 'PETROL', purchaseDate: '2025-01-01', chassisNumber: '', engineNumber: '', color: '', currentOdometer: 1, status: 'ACTIVE', createdAt: '', updatedAt: '' }
  ];
  db.services = [];
  db.insurancePolicies = [];
  db.documents = [{ id: 'd1', showroomId: 'sh-1', customerId: 'c1', vehicleId: 'v1', docType: 'PUC', docNumber: 'PUC-1', expiryDate: '2026-11-01', verificationCode: 'internal-code', createdAt: '', updatedAt: '' }];
  db.reminders = [];
  db.notifications = [];
  db.serviceRequests = [];
  employeeToken = createSessionToken({ id: 'e1', role: 'EMPLOYEE', showroomId: 'sh-1' });
  adminToken = createSessionToken({ id: 'a1', role: 'ADMIN', showroomId: 'sh-1' });
  customerToken = createSessionToken({ id: 'c1', role: 'CUSTOMER', showroomId: 'sh-1' });
  const app = await createApp({ serveFrontend: false });
  server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Could not start API test server');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise<void>(resolve => server.close(() => resolve()));
});

async function request(path: string, options: { method?: string; token?: string; body?: unknown } = {}) {
  return fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers: { ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}), ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
}

test('login verifies password hashes and rejects inactive employee accounts', async () => {
  const wrong = await request('/api/auth/login', { method: 'POST', body: { identifier: 'employee@example.test', password: 'incorrect-password', role: 'EMPLOYEE' } });
  assert.equal(wrong.status, 401);
  const inactive = await request('/api/auth/login', { method: 'POST', body: { identifier: 'inactive@example.test', password: 'employee-password-10', role: 'EMPLOYEE' } });
  assert.equal(inactive.status, 401);
  const valid = await request('/api/auth/login', { method: 'POST', body: { identifier: 'employee@example.test', password: 'employee-password-10', role: 'EMPLOYEE' } });
  assert.equal(valid.status, 200);
  const user = (await valid.json() as any).user;
  assert.equal('passwordHash' in user, false);
  assert.equal('active' in user, false);
  assert.equal('employeeCode' in user, false);
  const customerLogin = await request('/api/auth/login', { method: 'POST', body: { identifier: 'c1@example.test', password: 'wrong-password-10', role: 'CUSTOMER' } });
  assert.equal(customerLogin.status, 401);
});

test('protected routes require authentication and customers cannot access staff APIs', async () => {
  assert.equal((await request('/api/customers')).status, 401);
  assert.equal((await request('/api/customers', { token: customerToken })).status, 403);
  assert.equal((await request('/api/customers', { token: employeeToken })).status, 200);
});

test('staff responses omit password hashes and cannot widen their showroom scope', async () => {
  const response = await request('/api/customers?showroomId=sh-2', { token: employeeToken });
  assert.equal(response.status, 200);
  const body = await response.json() as any[];
  assert.equal(body.length, 2);
  assert.equal(body.some((item: any) => item.id === 'c3'), false);
  assert.equal(body.some((item: any) => 'passwordHash' in item), false);
});

test('vehicle detail never serializes nested security fields', async () => {
  const response = await request('/api/vehicles/v1', { token: employeeToken });
  assert.equal(response.status, 200);
  const body = await response.json() as any;
  assert.equal('passwordHash' in body.customer, false);
  assert.equal('verificationCode' in body.documents[0], false);
});

test('customer portal derives identity from token and omits password hashes', async () => {
  const response = await request('/api/customer-portal/me?customerId=c2', { token: customerToken });
  assert.equal(response.status, 200);
  const body = await response.json() as any;
  assert.equal(body.customer.id, 'c1');
  assert.equal(Array.isArray(body.insurancePolicies), true);
  assert.equal('passwordHash' in body.customer, false);
  assert.deepEqual(body.vehicles.map((vehicle: any) => vehicle.id), ['v1']);
  assert.equal((await request('/api/customers/c2', { token: customerToken })).status, 403);
});

test('service requests reject client-supplied customer or showroom identities', async () => {
  const response = await request('/api/customer-portal/request-service', { method: 'POST', token: customerToken, body: {
    vehicleId: 'v1', preferredDate: new Date().toISOString().slice(0,10), serviceType: 'PERIODIC_MAINTENANCE', customerId: 'c2'
  } });
  assert.equal(response.status, 400);
});

test('customer updates reject mass assignment', async () => {
  const response = await request('/api/customers/c1', { method: 'PUT', token: employeeToken, body: { showroomId: 'other', passwordHash: 'injected' } });
  assert.equal(response.status, 400);
  assert.equal(db.customers[0].passwordHash?.startsWith('scrypt$'), true);
});

test('vehicle creation validates customer relationships before writing', async () => {
  const response = await request('/api/vehicles', { method: 'POST', token: employeeToken, body: {
    customerId: 'missing', registrationNumber: 'CC-03', brand: 'C', model: 'Three', purchaseDate: '2026-01-01'
  } });
  assert.equal(response.status, 400);
});

test('existing vehicle, service, insurance, and document form payloads reach the API', async () => {
  const originalMethods = {
    addVehicle: db.addVehicle, addService: db.addService, addInsurance: db.addInsurance, addDocument: db.addDocument, run: reminderEngine.run
  };
  const captures: Record<string, any> = {};
  db.addVehicle = async (data: any) => { captures.vehicle = data; return { ...data, id: 'new-v' }; };
  db.addService = async (data: any) => { captures.service = data; return { ...data, id: 'new-s' }; };
  db.addInsurance = async (data: any) => { captures.insurance = data; return { ...data, id: 'new-i' }; };
  db.addDocument = async (data: any) => { captures.document = data; return { ...data, id: 'new-d' }; };
  reminderEngine.run = async () => ({ evaluatedVehicles: 0, newRemindersCreated: 0, existingRemindersUpdated: 0, notificationsDispatched: 0, logs: [], timestamp: '' });
  try {
    const vehicle = await request('/api/vehicles', { method: 'POST', token: employeeToken, body: {
      showroomId: 'sh-1', customerId: 'c1', registrationNumber: 'CC-03', brand: 'C', model: 'Three', variant: 'Base', yearOfManufacture: 2026,
      fuelType: 'PETROL', transmission: 'MANUAL', color: 'White', odometerReading: 1200, lastServiceDate: '', nextServiceDate: '', insuranceExpiryDate: '', pucExpiryDate: ''
    } });
    assert.equal(vehicle.status, 201);
    assert.equal(captures.vehicle.currentOdometer, 1200);
    const service = await request('/api/services', { method: 'POST', token: employeeToken, body: {
      vehicleId: 'v1', serviceType: 'OIL_CHANGE', serviceDate: '2026-10-22', nextServiceDate: '2027-04-22', odometerReading: 900,
      cost: 2000, invoiceNumber: 'INV-1', advisorNotes: 'Checked', partsReplaced: 'Oil', nextServiceOdometer: 10000, status: 'COMPLETED'
    } });
    assert.equal(service.status, 201);
    assert.equal(captures.service.partsReplaced, 'Oil');
    const insurance = await request('/api/insurance', { method: 'POST', token: employeeToken, body: {
      vehicleId: 'v1', policyNumber: 'POL-1', insuranceProvider: 'Example Mutual', policyType: 'COMPREHENSIVE', startDate: '2026-10-22', expiryDate: '2027-10-22',
      premiumAmount: 1000, idvAmount: 10000, hasZeroDep: true, reminderDaysBefore: [30, 7]
    } });
    assert.equal(insurance.status, 201);
    assert.equal(captures.insurance.provider, 'Example Mutual');
    const document = await request('/api/documents', { method: 'POST', token: employeeToken, body: {
      vehicleId: 'v1', documentType: 'PUC_CERTIFICATE', documentNumber: 'PUC-1', issuedDate: '2026-10-22', expiryDate: '2027-04-22', isDigiLockerVerified: false, notes: ''
    } });
    assert.equal(document.status, 201);
    assert.equal(captures.document.docType, 'PUC');
    assert.equal('verificationCode' in captures.document, false);
  } finally {
    db.addVehicle = originalMethods.addVehicle;
    db.addService = originalMethods.addService;
    db.addInsurance = originalMethods.addInsurance;
    db.addDocument = originalMethods.addDocument;
    reminderEngine.run = originalMethods.run;
  }
});

test('reset is staff-restricted, admin-authorized, and disabled in production', async () => {
  assert.equal((await request('/api/database/reset')).status, 401);
  assert.equal((await request('/api/database/reset', { method: 'POST', token: employeeToken })).status, 403);
  assert.equal((await request('/api/customers/c1', { method: 'DELETE', token: employeeToken })).status, 403);
  assert.equal((await request('/api/auth/switch-account', { method: 'POST', token: employeeToken, body: { accountType: 'CUSTOMER', id: 'c2' } })).status, 403);
  const originalReset = db.resetDemoData;
  let called = false;
  db.resetDemoData = async () => { called = true; };
  try {
    assert.equal((await request('/api/database/reset', { method: 'POST', token: adminToken })).status, 200);
    assert.equal(called, true);
    process.env.NODE_ENV = 'production';
    assert.equal((await request('/api/database/reset', { method: 'POST', token: adminToken })).status, 404);
  } finally {
    process.env.NODE_ENV = 'test';
    db.resetDemoData = originalReset;
  }
});

test('reminder engine is idempotent for a vehicle and due-date cycle', async () => {
  db.reminders = [];
  const due = new Date();
  due.setDate(due.getDate() + 2);
  db.vehicles[0].nextServiceDate = due.toISOString().slice(0,10);
  const originalAddReminder = db.addReminder;
  const originalSend = notificationService.send;
  let sent = 0;
  db.addReminder = async (data: any) => {
    const item = { ...data, id: `rem-${db.reminders.length + 1}`, createdAt: '', updatedAt: '' };
    db.reminders.unshift(item);
    return item;
  };
  notificationService.send = async (payload: any) => { sent++; return { ...payload, id: `n-${sent}`, status: 'DELIVERED', mode: 'DEMO_SANDBOX', sentAt: '', createdAt: '' } as any; };
  try {
    await reminderEngine.run(new Date().toISOString().slice(0,10));
    const firstCount = db.reminders.length;
    await reminderEngine.run(new Date().toISOString().slice(0,10));
    assert.equal(firstCount, 1);
    assert.equal(db.reminders.length, firstCount);
    assert.equal(sent, 1);
  } finally {
    db.addReminder = originalAddReminder;
    notificationService.send = originalSend;
  }
});

test('dashboard revenue includes only completed services dated in the current month', async () => {
  const now = new Date();
  const currentDate = now.toISOString().slice(0,10);
  const prior = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0,10);
  db.services = [
    { id: 's1', showroomId: 'sh-1', vehicleId: 'v1', customerId: 'c1', serviceDate: currentDate, nextServiceDate: currentDate, serviceType: 'OIL_CHANGE', description: '', cost: 100, odometerReading: 1, status: 'COMPLETED', technicianName: '', createdAt: '', updatedAt: '' },
    { id: 's2', showroomId: 'sh-1', vehicleId: 'v2', customerId: 'c2', serviceDate: prior, nextServiceDate: prior, serviceType: 'OIL_CHANGE', description: '', cost: 200, odometerReading: 1, status: 'COMPLETED', technicianName: '', createdAt: '', updatedAt: '' }
  ];
  const response = await request('/api/dashboard/stats', { token: employeeToken });
  assert.equal(response.status, 200);
  const body = await response.json() as any;
  assert.equal(body.monthlyRevenueEstimate, 100);
});
