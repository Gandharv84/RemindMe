import express, { Request, Response } from 'express';
import { db } from '../db';
import { reminderEngine } from '../services/reminderEngine';
import { notificationService } from '../services/notificationService';
import { DashboardStats, ReminderStatus, ServiceStatus } from '../../src/types';
import { authenticate, createSessionToken, hashPassword, requireRole, safeCustomer, safeDocument, safeEmployee, verifyPassword } from '../security';
import { hasOnlyKeys, isDate, isEmail, isEnum, isFiniteNonNegative, isOptionalDate, isOptionalText, isPhone, isRecord, isText, isValidPassword } from '../validation';

export const apiRouter = express.Router();

function showroomScope(req: Request, requested?: string) {
  if (req.auth?.role === 'ADMIN') return requested || undefined;
  return req.auth?.showroomId;
}

function bodyShowroom(req: Request, requested?: string) {
  return req.auth?.role === 'ADMIN' && requested ? requested : req.auth?.showroomId || '';
}

function belongsToShowroom(req: Request, showroomId: string) {
  return req.auth?.role === 'ADMIN' || req.auth?.showroomId === showroomId;
}

// --- Health & Auth Routes ---
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString(), app: 'RemindMe Backend' });
});

apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  const { identifier, password, role } = req.body || {};
  if (!isText(identifier, 254) || !isValidPassword(password) || !['EMPLOYEE', 'ADMIN', 'CUSTOMER'].includes(role)) {
    return res.status(400).json({ error: 'Identifier, account type, and password (at least 10 characters) are required' });
  }
  const clean = identifier.trim().toLowerCase();
  if (role === 'CUSTOMER') {
    const customer = db.getCustomerByPhoneOrEmail(clean);
    if (!customer || customer.status !== 'ACTIVE' || !await verifyPassword(password, customer.passwordHash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const showroom = db.getShowroomById(customer.showroomId);
    const user = safeCustomer({ ...customer, role: 'CUSTOMER' as const, showroomName: showroom?.name || 'Dealership' });
    return res.json({ user, token: createSessionToken({ id: customer.id, role: 'CUSTOMER', showroomId: customer.showroomId }) });
  }
  const employee = db.getEmployeeByEmail(clean) || db.employees.find(e => e.employeeCode.toLowerCase() === clean || (e.phone && e.phone === identifier.trim()));
  if (!employee || !employee.active || (role === 'ADMIN' && employee.role !== 'ADMIN') || !await verifyPassword(password, employee.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const showroom = db.getShowroomById(employee.showroomId);
  const user = safeEmployee({ ...employee, showroomName: showroom?.name || 'Dealership' });
  return res.json({ user, token: createSessionToken({ id: employee.id, role: employee.role, showroomId: employee.showroomId }) });
});

// Every route below this point requires a signed bearer token. Customers are
// confined to their own portal; showroom-wide APIs are staff-only.
apiRouter.use(authenticate);
apiRouter.use((req: Request, res: Response, next) => {
  const portalRoute = req.path.startsWith('/customer-portal/');
  if ((req.auth?.role === 'CUSTOMER') !== portalRoute) return res.status(403).json({ error: 'Insufficient permissions' });
  if (req.auth!.role === 'CUSTOMER') {
    const customer = db.customers.find(c => c.id === req.auth!.id && c.status === 'ACTIVE' && c.showroomId === req.auth!.showroomId);
    if (!customer) return res.status(401).json({ error: 'Account is inactive or no longer available' });
  } else {
    const employee = db.employees.find(e => e.id === req.auth!.id && e.active && e.role === req.auth!.role && e.showroomId === req.auth!.showroomId);
    if (!employee) return res.status(401).json({ error: 'Account is inactive or no longer available' });
  }
  next();
});

apiRouter.post('/auth/switch-account', requireRole('ADMIN'), (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') return res.status(404).json({ error: 'Not found' });
  return res.status(403).json({ error: 'Account switching is disabled; sign in with the account credentials' });
});

// --- Showroom Routes ---
apiRouter.get('/showrooms', (req: Request, res: Response) => {
  res.json(db.getShowrooms().filter(s => req.auth?.role === 'ADMIN' || s.id === req.auth?.showroomId));
});

apiRouter.get('/showrooms/:id', (req: Request, res: Response) => {
  if (!belongsToShowroom(req, req.params.id)) return res.status(404).json({ error: 'Showroom not found' });
  const showroom = db.getShowroomById(req.params.id);
  if (!showroom) return res.status(404).json({ error: 'Showroom not found' });
  res.json(showroom);
});

// --- Dashboard Routes ---
apiRouter.get('/dashboard/stats', (req: Request, res: Response) => {
  const showroomId = showroomScope(req, req.query.showroomId as string | undefined);

  const customers = db.getCustomers(showroomId);
  const vehicles = db.getVehicles(showroomId);
  const reminders = db.getReminders(showroomId);
  const notifications = db.getNotifications(showroomId);
  const services = db.getServices(showroomId);

  const now = Date.now();

  let serviceDueSoon = 0;
  let insuranceExpiringSoon = 0;
  let pucExpiringSoon = 0;

  vehicles.forEach(v => {
    if (v.status !== 'ACTIVE') return;
    if (v.nextServiceDate) {
      const diff = (new Date(v.nextServiceDate).getTime() - now) / (1000 * 3600 * 24);
      if (diff >= 0 && diff <= 30) serviceDueSoon++;
    }
    if (v.insuranceExpiryDate) {
      const diff = (new Date(v.insuranceExpiryDate).getTime() - now) / (1000 * 3600 * 24);
      if (diff >= 0 && diff <= 30) insuranceExpiringSoon++;
    }
    if (v.pucExpiryDate) {
      const diff = (new Date(v.pucExpiryDate).getTime() - now) / (1000 * 3600 * 24);
      if (diff >= 0 && diff <= 30) pucExpiringSoon++;
    }
  });

  const overdueReminders = reminders.filter(r => r.status === 'OVERDUE').length;
  const completedReminders = reminders.filter(r => r.status === 'COMPLETED').length;
  const upcomingRemindersCount = reminders.filter(r => r.status === 'UPCOMING' || r.status === 'DUE_TODAY').length;

  const currentDate = new Date();
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const nextMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  const monthlyRevenueEstimate = services
    .filter(s => s.status === 'COMPLETED' && new Date(`${s.serviceDate}T00:00:00`).getTime() >= monthStart.getTime() && new Date(`${s.serviceDate}T00:00:00`).getTime() < nextMonthStart.getTime())
    .reduce((sum, s) => sum + (s.cost || 0), 0);

  const stats: DashboardStats = {
    totalCustomers: customers.length,
    totalVehicles: vehicles.length,
    serviceDueSoon,
    insuranceExpiringSoon,
    pucExpiringSoon,
    overdueReminders,
    completedReminders,
    notificationsSent: notifications.length,
    upcomingRemindersCount,
    monthlyRevenueEstimate
  };

  res.json(stats);
});

apiRouter.get('/dashboard/activity', (req: Request, res: Response) => {
  const showroomId = showroomScope(req, req.query.showroomId as string | undefined);
  const notifs = db.getNotifications(showroomId).slice(0, 8);
  const services = db.getServices(showroomId).slice(0, 5);
  res.json({ notifications: notifs, recentServices: services });
});

// --- Customer Routes ---
apiRouter.get('/customers', (req: Request, res: Response) => {
  const showroomId = showroomScope(req, req.query.showroomId as string | undefined);
  const search = (req.query.search as string || '').toLowerCase().trim();
  const status = req.query.status as string | undefined;

  let list = db.getCustomers(showroomId);

  if (status && status !== 'ALL') {
    list = list.filter(c => c.status === status);
  }

  if (search) {
    list = list.filter(c =>
      c.name.toLowerCase().includes(search) ||
      c.phone.toLowerCase().includes(search) ||
      c.email.toLowerCase().includes(search) ||
      c.customerCode.toLowerCase().includes(search)
    );
  }

  res.json(list.map(c => safeCustomer(c)));
});

apiRouter.get('/customers/:id', (req: Request, res: Response) => {
  const customer = db.getCustomerById(req.params.id);
  if (!customer || !belongsToShowroom(req, customer.showroomId)) return res.status(404).json({ error: 'Customer not found' });
  res.json(safeCustomer(customer));
});

apiRouter.post('/customers', async (req: Request, res: Response) => {
  const { name, phone, email, address = '', city = '', pincode = '', preferredChannel = 'ALL', password } = req.body || {};
  if (!isRecord(req.body) || !hasOnlyKeys(req.body, ['name','phone','email','address','city','pincode','preferredChannel','password','showroomId']) || !isText(name, 120) || !isPhone(phone) || (email && !isEmail(email)) || !['ALL','EMAIL','SMS'].includes(preferredChannel) || !isOptionalText(address) || !isOptionalText(city, 100) || !isOptionalText(pincode, 20) || !isValidPassword(password)) {
    return res.status(400).json({ error: 'Invalid customer details; set a password of at least 10 characters' });
  }
  const targetShowroom = bodyShowroom(req, typeof req.body.showroomId === 'string' ? req.body.showroomId : undefined);
  if (!db.showrooms.some(s => s.id === targetShowroom)) return res.status(400).json({ error: 'Invalid showroom' });
  if (email && db.customers.some(c => c.email.toLowerCase() === email.trim().toLowerCase())) return res.status(409).json({ error: 'Email is already registered' });
  const customer = await db.addCustomer({
    showroomId: targetShowroom, name: name.trim(), phone: phone.trim(), email: (email || '').trim().toLowerCase(),
    address: address || '', city: city || '', pincode: pincode || '', status: 'ACTIVE', preferredChannel: preferredChannel as 'ALL' | 'EMAIL' | 'SMS',
    passwordHash: await hashPassword(password)
  });
  res.status(201).json(safeCustomer(customer));
});

apiRouter.put('/customers/:id', async (req: Request, res: Response) => {
  const current = db.customers.find(c => c.id === req.params.id);
  const allowed = ['name','phone','email','address','city','pincode','status','preferredChannel'];
  if (!current || !belongsToShowroom(req, current.showroomId)) return res.status(404).json({ error: 'Customer not found' });
  if (!isRecord(req.body) || !hasOnlyKeys(req.body, allowed) || Object.keys(req.body).length === 0 || ('name' in req.body && !isText(req.body.name,120)) || ('phone' in req.body && !isPhone(req.body.phone)) || ('email' in req.body && req.body.email !== '' && !isEmail(req.body.email)) || ('address' in req.body && !isOptionalText(req.body.address)) || ('city' in req.body && !isOptionalText(req.body.city,100)) || ('pincode' in req.body && !isOptionalText(req.body.pincode,20)) || ('status' in req.body && !['ACTIVE','INACTIVE'].includes(req.body.status as string)) || ('preferredChannel' in req.body && !['ALL','EMAIL','SMS'].includes(req.body.preferredChannel as string))) return res.status(400).json({ error: 'Invalid customer update' });
  if (typeof req.body.email === 'string' && req.body.email && db.customers.some(c => c.id !== current.id && c.email.toLowerCase() === req.body.email!.toString().toLowerCase())) return res.status(409).json({ error: 'Email is already registered' });
  const updated = await db.updateCustomer(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Customer not found' });
  res.json(safeCustomer(updated));
});

apiRouter.delete('/customers/:id', requireRole('ADMIN'), async (req: Request, res: Response) => {
  const current = db.customers.find(c => c.id === req.params.id);
  if (!current || !belongsToShowroom(req, current.showroomId)) return res.status(404).json({ error: 'Customer not found' });
  const success = await db.deleteCustomer(req.params.id);
  if (!success) return res.status(404).json({ error: 'Customer not found' });
  res.json({ message: 'Customer marked as inactive' });
});

// --- Vehicle Routes ---
apiRouter.get('/vehicles', (req: Request, res: Response) => {
  const showroomId = showroomScope(req, req.query.showroomId as string | undefined);
  const search = (req.query.search as string || '').toLowerCase().trim();
  const filter = req.query.filter as string | undefined;

  let list = db.getVehicles(showroomId);

  if (search) {
    list = list.filter(v =>
      v.registrationNumber.toLowerCase().includes(search) ||
      v.model.toLowerCase().includes(search) ||
      v.brand.toLowerCase().includes(search) ||
      v.customerName.toLowerCase().includes(search) ||
      v.customerPhone.includes(search)
    );
  }

  if (filter === 'SERVICE_DUE') {
    const now = Date.now();
    list = list.filter(v => {
      if (!v.nextServiceDate) return false;
      const diff = (new Date(v.nextServiceDate).getTime() - now) / (1000 * 3600 * 24);
      return diff <= 30;
    });
  } else if (filter === 'INSURANCE_DUE') {
    const now = Date.now();
    list = list.filter(v => {
      if (!v.insuranceExpiryDate) return false;
      const diff = (new Date(v.insuranceExpiryDate).getTime() - now) / (1000 * 3600 * 24);
      return diff <= 30;
    });
  } else if (filter === 'PUC_DUE') {
    const now = Date.now();
    list = list.filter(v => {
      if (!v.pucExpiryDate) return false;
      const diff = (new Date(v.pucExpiryDate).getTime() - now) / (1000 * 3600 * 24);
      return diff <= 30;
    });
  }

  res.json(list);
});

apiRouter.get('/vehicles/:id', (req: Request, res: Response) => {
  const vehicle = db.getVehicleById(req.params.id);
  if (!vehicle || !belongsToShowroom(req, vehicle.showroomId)) return res.status(404).json({ error: 'Vehicle not found' });
  res.json({ ...vehicle, customer: vehicle.customer ? safeCustomer(vehicle.customer) : undefined, documents: vehicle.documents.map(safeDocument) });
});

apiRouter.post('/vehicles', async (req: Request, res: Response) => {
  const {
    showroomId,
    customerId,
    registrationNumber,
    brand,
    model,
    variant,
    fuelType,
    purchaseDate,
    chassisNumber,
    engineNumber,
    color,
    lastServiceDate,
    nextServiceDate,
    insuranceExpiryDate,
    pucExpiryDate,
    currentOdometer,
    odometerReading,
    yearOfManufacture,
    transmission
  } = req.body || {};

  if (!isRecord(req.body) || !hasOnlyKeys(req.body, ['showroomId','customerId','registrationNumber','brand','model','variant','fuelType','purchaseDate','chassisNumber','engineNumber','color','lastServiceDate','nextServiceDate','insuranceExpiryDate','pucExpiryDate','currentOdometer','odometerReading','yearOfManufacture','transmission']) || !isText(registrationNumber, 32) || !isText(brand, 100) || !isText(model, 100) || !isText(customerId, 100) || !isEnum('fuelType', fuelType || 'PETROL') || !isDate(purchaseDate || '2025-01-01') || !isOptionalDate(lastServiceDate) || !isOptionalDate(nextServiceDate) || !isOptionalDate(insuranceExpiryDate) || !isOptionalDate(pucExpiryDate) || ((currentOdometer ?? odometerReading) !== undefined && !isFiniteNonNegative(currentOdometer ?? odometerReading)) || (yearOfManufacture !== undefined && (!Number.isInteger(yearOfManufacture) || yearOfManufacture < 1900 || yearOfManufacture > new Date().getFullYear() + 1)) || !isOptionalText(variant,120) || !isOptionalText(transmission,40)) {
    return res.status(400).json({ error: 'Registration Number, Brand, Model, and Customer are required' });
  }

  const owner = db.customers.find(c => c.id === customerId && c.status === 'ACTIVE');
  if (!owner || !belongsToShowroom(req, owner.showroomId)) return res.status(400).json({ error: 'Customer does not exist in this showroom' });
  const targetShowroom = bodyShowroom(req, showroomId);
  if (owner.showroomId !== targetShowroom || !db.showrooms.some(s => s.id === targetShowroom)) return res.status(400).json({ error: 'Vehicle and customer must belong to the same showroom' });

  const cleanReg = registrationNumber.toUpperCase().replace(/\s+/g, '-').trim();

  // Check duplicate registration
  const duplicate = db.vehicles.find(v => v.registrationNumber.toUpperCase() === cleanReg);
  if (duplicate) {
    return res.status(400).json({ error: `Vehicle with registration ${cleanReg} already exists.` });
  }

  const newVehicle = await db.addVehicle({
    showroomId: targetShowroom,
    customerId,
    registrationNumber: cleanReg,
    brand: brand.trim(),
    model: model.trim(),
    variant: variant || 'Standard',
    yearOfManufacture,
    transmission,
    fuelType: fuelType || 'PETROL',
    purchaseDate: purchaseDate || '2025-01-01',
    chassisNumber: chassisNumber || `CHAS${Date.now().toString(36).toUpperCase()}`,
    engineNumber: engineNumber || `ENG${Date.now().toString(36).toUpperCase()}`,
    color: color || 'Arctic White',
    lastServiceDate,
    nextServiceDate,
    insuranceExpiryDate,
    pucExpiryDate,
    currentOdometer: Number(currentOdometer ?? odometerReading) || 0,
    odometerReading: Number(currentOdometer ?? odometerReading) || 0,
    status: 'ACTIVE'
  });

  // Automatically trigger Reminder Engine to generate any initial reminders for this vehicle
  await reminderEngine.run();

  res.status(201).json(newVehicle);
});

apiRouter.put('/vehicles/:id', async (req: Request, res: Response) => {
  const current = db.vehicles.find(v => v.id === req.params.id);
  const allowed = ['customerId','registrationNumber','brand','model','variant','fuelType','purchaseDate','yearOfManufacture','transmission','chassisNumber','engineNumber','color','lastServiceDate','nextServiceDate','insuranceExpiryDate','pucExpiryDate','currentOdometer','odometerReading','status'];
  if (!current || !belongsToShowroom(req, current.showroomId)) return res.status(404).json({ error: 'Vehicle not found' });
  if (!isRecord(req.body) || !hasOnlyKeys(req.body, allowed) || Object.keys(req.body).length === 0 || ('customerId' in req.body && !db.customers.some(c => c.id === req.body.customerId && c.showroomId === current.showroomId && c.status === 'ACTIVE')) || ('registrationNumber' in req.body && !isText(req.body.registrationNumber,32)) || ('brand' in req.body && !isText(req.body.brand,100)) || ('model' in req.body && !isText(req.body.model,100)) || (['variant','transmission','chassisNumber','engineNumber','color'].some(k => k in req.body && !isOptionalText(req.body[k],120))) || ('yearOfManufacture' in req.body && (!Number.isInteger(req.body.yearOfManufacture) || Number(req.body.yearOfManufacture) < 1900 || Number(req.body.yearOfManufacture) > new Date().getFullYear() + 1)) || ('fuelType' in req.body && !isEnum('fuelType',req.body.fuelType)) || ('purchaseDate' in req.body && !isDate(req.body.purchaseDate)) || ['lastServiceDate','nextServiceDate','insuranceExpiryDate','pucExpiryDate'].some(k => k in req.body && !isOptionalDate(req.body[k])) || (['currentOdometer','odometerReading'].some(k => k in req.body && !isFiniteNonNegative(req.body[k]))) || ('status' in req.body && !['ACTIVE','INACTIVE','TRANSFERRED'].includes(req.body.status as string))) return res.status(400).json({ error: 'Invalid vehicle update' });
  if (typeof req.body.registrationNumber === 'string') {
    const clean = req.body.registrationNumber.toUpperCase().replace(/\s+/g, '-').trim();
    if (db.vehicles.some(v => v.id !== current.id && v.registrationNumber.toUpperCase() === clean)) return res.status(409).json({ error: 'Registration number is already in use' });
    req.body.registrationNumber = clean;
  }
  const updates = { ...req.body };
  if ('odometerReading' in updates) {
    updates.currentOdometer = updates.odometerReading;
    delete updates.odometerReading;
  }
  const updated = await db.updateVehicle(req.params.id, updates);
  if (!updated) return res.status(404).json({ error: 'Vehicle not found' });
  await reminderEngine.run();
  res.json(updated);
});

apiRouter.delete('/vehicles/:id', requireRole('ADMIN'), async (req: Request, res: Response) => {
  const current = db.vehicles.find(v => v.id === req.params.id);
  if (!current || !belongsToShowroom(req, current.showroomId)) return res.status(404).json({ error: 'Vehicle not found' });
  const success = await db.deleteVehicle(req.params.id);
  if (!success) return res.status(404).json({ error: 'Vehicle not found' });
  res.json({ message: 'Vehicle deactivated' });
});

// --- Service Routes ---
apiRouter.get('/services', (req: Request, res: Response) => {
  const showroomId = showroomScope(req, req.query.showroomId as string | undefined);
  const vehicleId = req.query.vehicleId as string | undefined;

  let list = db.getServices(showroomId);
  if (vehicleId) {
    list = list.filter(s => s.vehicleId === vehicleId);
  }
  res.json(list);
});

apiRouter.post('/services', async (req: Request, res: Response) => {
  const {
    vehicleId,
    customerId,
    showroomId,
    serviceDate,
    serviceType,
    description,
    cost,
    odometerReading,
    nextServiceDate,
    status,
    technicianName,
    remarks,
    invoiceNumber,
    advisorNotes,
    partsReplaced,
    nextServiceOdometer
  } = req.body || {};

  if (!isRecord(req.body) || !hasOnlyKeys(req.body, ['vehicleId','customerId','showroomId','serviceDate','serviceType','description','cost','odometerReading','nextServiceDate','status','technicianName','remarks','invoiceNumber','advisorNotes','partsReplaced','nextServiceOdometer']) || !isText(vehicleId,100) || !isDate(serviceDate) || !isDate(nextServiceDate) || !isEnum('serviceType',serviceType || 'PERIODIC_MAINTENANCE') || !isFiniteNonNegative(Number(cost || 0)) || !isFiniteNonNegative(Number(odometerReading || 0)) || !isOptionalText(description) || !isOptionalText(technicianName,120) || !isOptionalText(remarks) || !isOptionalText(invoiceNumber,100) || !isOptionalText(advisorNotes) || !isOptionalText(partsReplaced) || (nextServiceOdometer !== undefined && !isFiniteNonNegative(nextServiceOdometer)) || !['SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED',undefined].includes(status)) {
    return res.status(400).json({ error: 'Vehicle, Service Date, and Next Service Date are required' });
  }

  const vehicle = db.vehicles.find(v => v.id === vehicleId);
  const customer = vehicle && db.customers.find(c => c.id === (customerId || vehicle.customerId));
  if (!vehicle || !customer || vehicle.customerId !== customer.id || !belongsToShowroom(req, vehicle.showroomId)) return res.status(400).json({ error: 'Vehicle and customer relationship is invalid' });

  const service = await db.addService({
    vehicleId,
    customerId: customer.id,
    showroomId: vehicle.showroomId,
    serviceDate,
    serviceType: serviceType || 'PERIODIC_MAINTENANCE',
    description: description || 'Periodic Maintenance and General Inspection',
    cost: Number(cost) || 0,
    odometerReading: Number(odometerReading ?? vehicle.currentOdometer),
    nextServiceDate,
    status: status || 'COMPLETED',
    technicianName: technicianName || 'Certified Service Technician',
    remarks: remarks || '',
    invoiceNumber,
    advisorNotes,
    partsReplaced,
    nextServiceOdometer
  });

  // If service was completed, mark previous SERVICE reminders for this vehicle as COMPLETED
  if (service.status === 'COMPLETED') {
    const activeServiceReminders = db.reminders.filter(r =>
      r.vehicleId === vehicleId &&
      r.category === 'SERVICE' &&
      r.status !== 'COMPLETED'
    );
    for (const r of activeServiceReminders) {
      await db.updateReminder(r.id, {
        status: 'COMPLETED',
        completedAt: new Date().toISOString()
      });
    }

    // Create next cycle service reminder
    await reminderEngine.run();
  }

  res.status(201).json(service);
});

apiRouter.put('/services/:id', async (req: Request, res: Response) => {
  const current = db.services.find(s => s.id === req.params.id);
  const allowed = ['serviceDate','serviceType','description','cost','odometerReading','nextServiceDate','status','technicianName','invoiceNumber','advisorNotes','remarks','partsReplaced','nextServiceOdometer'];
  if (!current || !belongsToShowroom(req, current.showroomId)) return res.status(404).json({ error: 'Service record not found' });
  if (!isRecord(req.body) || !hasOnlyKeys(req.body,allowed) || Object.keys(req.body).length === 0 || ('serviceDate' in req.body && !isDate(req.body.serviceDate)) || ('nextServiceDate' in req.body && !isDate(req.body.nextServiceDate)) || ('serviceType' in req.body && !isEnum('serviceType',req.body.serviceType)) || ('status' in req.body && !['SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED'].includes(req.body.status as string)) || (['cost','odometerReading','nextServiceOdometer'].some(k => k in req.body && !isFiniteNonNegative(req.body[k]))) || (['description','technicianName','invoiceNumber','advisorNotes','remarks','partsReplaced'].some(k => k in req.body && !isOptionalText(req.body[k])))) return res.status(400).json({ error: 'Invalid service update' });
  const updated = await db.updateService(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Service record not found' });
  res.json(updated);
});

// --- Insurance Routes ---
apiRouter.get('/insurance', (req: Request, res: Response) => {
  const showroomId = showroomScope(req, req.query.showroomId as string | undefined);
  res.json(db.getInsurance(showroomId));
});

apiRouter.post('/insurance', async (req: Request, res: Response) => {
  const {
    vehicleId,
    customerId,
    showroomId,
    provider,
    policyNumber,
    policyType,
    startDate,
    expiryDate,
    premiumAmount,
    idvAmount,
    status,
    reminderScheduleDays,
    insuranceProvider,
    hasZeroDep,
    reminderDaysBefore
  } = req.body || {};

  const finalProvider = provider || insuranceProvider;
  const finalReminderSchedule = reminderScheduleDays || reminderDaysBefore || [30,15,7,1];
  if (!isRecord(req.body) || !hasOnlyKeys(req.body,['vehicleId','customerId','showroomId','provider','insuranceProvider','policyNumber','policyType','startDate','expiryDate','premiumAmount','idvAmount','status','reminderScheduleDays','reminderDaysBefore','hasZeroDep']) || !isText(vehicleId,100) || !isText(finalProvider,120) || !isText(policyNumber,100) || !isDate(expiryDate) || !isDate(startDate || new Date().toISOString().slice(0,10)) || !isEnum('insuranceType',policyType || 'COMPREHENSIVE') || (status !== undefined && !['ACTIVE','EXPIRED','RENEWED','EXPIRING_SOON'].includes(status)) || (hasZeroDep !== undefined && typeof hasZeroDep !== 'boolean') || !isFiniteNonNegative(Number(premiumAmount || 0)) || !isFiniteNonNegative(Number(idvAmount || 0)) || !Array.isArray(finalReminderSchedule) || !finalReminderSchedule.every((d: unknown) => Number.isInteger(d) && Number(d) >= 0 && Number(d) <= 365)) {
    return res.status(400).json({ error: 'Vehicle, Provider, Policy Number and Expiry Date are required' });
  }
  const vehicle = db.vehicles.find(v => v.id === vehicleId);
  const owner = vehicle && db.customers.find(c => c.id === vehicle.customerId);
  if (!vehicle || !owner || !belongsToShowroom(req, vehicle.showroomId)) return res.status(400).json({ error: 'Vehicle does not exist in this showroom' });

  const policy = await db.addInsurance({
    vehicleId,
    customerId: owner.id,
    showroomId: vehicle.showroomId,
    provider: finalProvider,
    insuranceProvider: finalProvider,
    policyNumber,
    policyType: policyType || 'COMPREHENSIVE',
    startDate: startDate || new Date().toISOString().split('T')[0],
    expiryDate,
    premiumAmount: Number(premiumAmount) || 0,
    idvAmount: Number(idvAmount) || 0,
    status: status || 'ACTIVE',
    reminderScheduleDays: finalReminderSchedule,
    reminderDaysBefore: finalReminderSchedule,
    hasZeroDep: hasZeroDep ?? policyType === 'ZERO_DEP'
  });

  await reminderEngine.run();
  res.status(201).json(policy);
});

apiRouter.put('/insurance/:id', async (req: Request, res: Response) => {
  const current = db.insurancePolicies.find(i => i.id === req.params.id);
  const allowed = ['provider','policyNumber','policyType','startDate','expiryDate','premiumAmount','idvAmount','status','reminderScheduleDays'];
  if (!current || !belongsToShowroom(req,current.showroomId)) return res.status(404).json({ error: 'Insurance policy not found' });
  if (!isRecord(req.body) || !hasOnlyKeys(req.body,allowed) || Object.keys(req.body).length===0 || ('provider' in req.body && !isText(req.body.provider,120)) || ('policyNumber' in req.body && !isText(req.body.policyNumber,100)) || ('policyType' in req.body && !isEnum('insuranceType',req.body.policyType)) || ('status' in req.body && !['ACTIVE','EXPIRED','RENEWED','EXPIRING_SOON'].includes(req.body.status as string)) || (['startDate','expiryDate'].some(k => k in req.body && !isDate(req.body[k]))) || (['premiumAmount','idvAmount'].some(k => k in req.body && !isFiniteNonNegative(req.body[k]))) || ('reminderScheduleDays' in req.body && (!Array.isArray(req.body.reminderScheduleDays) || !req.body.reminderScheduleDays.every((d: unknown) => Number.isInteger(d) && Number(d)>=0 && Number(d)<=365)))) return res.status(400).json({ error: 'Invalid insurance update' });
  const updated = await db.updateInsurance(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Insurance policy not found' });
  await reminderEngine.run();
  res.json(updated);
});

// --- Document Routes (PUC & DigiLocker) ---
apiRouter.get('/documents', (req: Request, res: Response) => {
  const showroomId = showroomScope(req, req.query.showroomId as string | undefined);
  res.json(db.getDocuments(showroomId).map(safeDocument));
});

apiRouter.post('/documents', async (req: Request, res: Response) => {
  const {
    vehicleId,
    customerId,
    showroomId,
    docType,
    documentType,
    docNumber,
    documentNumber,
    issueDate,
    issuedDate,
    expiryDate,
    status,
    isDigiLockerLinked,
    digiLockerUri,
    isDigiLockerVerified,
    notes
  } = req.body || {};

  const rawType = docType || documentType;
  const documentTypes: Record<string, string> = { PUC_CERTIFICATE: 'PUC', RC_BOOK: 'RC', FITNESS_CERTIFICATE: 'OTHER', WARRANTY_CARD: 'EXTENDED_WARRANTY', INSURANCE_CERTIFICATE: 'INSURANCE' };
  const normalizedType = documentTypes[rawType] || rawType;
  const rawNumber = docNumber || documentNumber;
  const normalizedIssueDate = issueDate || issuedDate;
  if (!isRecord(req.body) || !hasOnlyKeys(req.body,['vehicleId','customerId','showroomId','docType','documentType','docNumber','documentNumber','issueDate','issuedDate','expiryDate','status','isDigiLockerLinked','digiLockerUri','isDigiLockerVerified','notes']) || !isText(vehicleId,100) || !isEnum('documentType',normalizedType) || !isText(rawNumber,100) || !isDate(expiryDate) || !isOptionalDate(normalizedIssueDate) || (status && !['ACTIVE','EXPIRED','EXPIRING_SOON'].includes(status)) || (isDigiLockerLinked !== undefined && typeof isDigiLockerLinked !== 'boolean') || (isDigiLockerVerified !== undefined && typeof isDigiLockerVerified !== 'boolean') || !isOptionalText(digiLockerUri,500) || !isOptionalText(notes)) {
    return res.status(400).json({ error: 'Vehicle, Document Type, Number, and Expiry Date are required' });
  }
  const vehicle = db.vehicles.find(v => v.id === vehicleId);
  const owner = vehicle && db.customers.find(c => c.id === vehicle.customerId);
  if (!vehicle || !owner || !belongsToShowroom(req,vehicle.showroomId)) return res.status(400).json({ error: 'Vehicle does not exist in this showroom' });

  const doc = await db.addDocument({
    vehicleId,
    customerId: owner.id,
    showroomId: vehicle.showroomId,
    docType: normalizedType as any,
    documentType: rawType,
    docNumber: rawNumber,
    documentNumber: rawNumber,
    issueDate: normalizedIssueDate || new Date().toISOString().split('T')[0],
    issuedDate: normalizedIssueDate || new Date().toISOString().split('T')[0],
    expiryDate,
    status: status || 'ACTIVE',
    isDigiLockerLinked: Boolean(isDigiLockerLinked),
    isDigiLockerVerified: Boolean(isDigiLockerVerified),
    digiLockerUri,
    notes: notes || ''
  });

  await reminderEngine.run();
  res.status(201).json(doc);
});

apiRouter.put('/documents/:id', async (req: Request, res: Response) => {
  const current = db.documents.find(d => d.id === req.params.id);
  const allowed = ['docType','docNumber','issueDate','expiryDate','status','isDigiLockerLinked','digiLockerUri','notes'];
  if (!current || !belongsToShowroom(req,current.showroomId)) return res.status(404).json({ error: 'Document not found' });
  if (!isRecord(req.body) || !hasOnlyKeys(req.body,allowed) || Object.keys(req.body).length===0 || ('docType' in req.body && !isEnum('documentType',req.body.docType)) || ('docNumber' in req.body && !isText(req.body.docNumber,100)) || (['issueDate','expiryDate'].some(k => k in req.body && !isOptionalDate(req.body[k]))) || ('status' in req.body && !['ACTIVE','EXPIRED','EXPIRING_SOON'].includes(req.body.status as string)) || ('isDigiLockerLinked' in req.body && typeof req.body.isDigiLockerLinked !== 'boolean') || ('notes' in req.body && !isOptionalText(req.body.notes))) return res.status(400).json({ error: 'Invalid document update' });
  const updated = await db.updateDocument(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Document not found' });
  await reminderEngine.run();
  res.json(updated);
});

// --- Reminder Routes ---
apiRouter.get('/reminders', (req: Request, res: Response) => {
  const showroomId = showroomScope(req, req.query.showroomId as string | undefined);
  const status = req.query.status as ReminderStatus | undefined;
  const category = req.query.category as string | undefined;

  let list = db.getReminders(showroomId);

  if (status && status !== ('ALL' as any)) {
    list = list.filter(r => r.status === status);
  }
  if (category && category !== 'ALL') {
    list = list.filter(r => r.category === category);
  }

  res.json(list);
});

apiRouter.post('/reminders', async (req: Request, res: Response) => {
  const { vehicleId, customerId, showroomId, category, title, description, dueDate, targetDaysBefore } = req.body || {};

  if (!isRecord(req.body) || !hasOnlyKeys(req.body,['vehicleId','customerId','showroomId','category','title','description','dueDate','targetDaysBefore']) || !isText(vehicleId,100) || !isText(title,200) || !isDate(dueDate) || !isEnum('reminderCategory',category || 'CUSTOM') || !isOptionalText(description) || !Number.isInteger(Number(targetDaysBefore || 0)) || Number(targetDaysBefore || 0)<0) {
    return res.status(400).json({ error: 'Vehicle, Title, and Due Date are required' });
  }
  const vehicle = db.vehicles.find(v => v.id === vehicleId);
  const owner = vehicle && db.customers.find(c => c.id === vehicle.customerId);
  if (!vehicle || !owner || !belongsToShowroom(req,vehicle.showroomId)) return res.status(400).json({ error: 'Vehicle does not exist in this showroom' });

  const reminder = await db.addReminder({
    vehicleId,
    customerId: owner.id,
    showroomId: vehicle.showroomId,
    category: category || 'CUSTOM',
    title,
    description: description || '',
    dueDate,
    targetDaysBefore: Number(targetDaysBefore) || 0,
    status: 'UPCOMING',
    triggeredAt: new Date().toISOString()
  });

  res.status(201).json(reminder);
});

apiRouter.patch('/reminders/:id/status', async (req: Request, res: Response) => {
  const { status } = req.body || {};
  const current = db.reminders.find(r => r.id === req.params.id);
  if (!current || !belongsToShowroom(req,current.showroomId)) return res.status(404).json({ error: 'Reminder not found' });
  if (!isRecord(req.body) || !hasOnlyKeys(req.body,['status']) || !isEnum('reminderStatus',status)) return res.status(400).json({ error: 'Invalid reminder status' });
  const updated = await db.updateReminder(req.params.id, {
    status,
    completedAt: status === 'COMPLETED' ? new Date().toISOString() : undefined
  });
  if (!updated) return res.status(404).json({ error: 'Reminder not found' });
  res.json(updated);
});

// Manually trigger SMS / Email notification for a reminder
apiRouter.post('/reminders/:id/resend', async (req: Request, res: Response) => {
  const reminder = db.reminders.find(r => r.id === req.params.id);
  if (!reminder || !belongsToShowroom(req, reminder.showroomId)) return res.status(404).json({ error: 'Reminder not found' });

  const vehicle = db.vehicles.find(v => v.id === reminder.vehicleId);
  const customer = db.customers.find(c => c.id === reminder.customerId);
  const showroom = db.showrooms.find(s => s.id === reminder.showroomId);

  if (!vehicle || !customer) {
    return res.status(400).json({ error: 'Vehicle or customer not found for this reminder' });
  }

  const { channel = 'ALL' } = req.body || {};
  if (req.body !== undefined && (!isRecord(req.body) || !hasOnlyKeys(req.body, ['channel']))) return res.status(400).json({ error: 'Invalid notification request' });
  if (!['ALL','EMAIL','SMS'].includes(channel)) return res.status(400).json({ error: 'Invalid notification channel' });
  const dispatched: any[] = [];

  const template = notificationService.generateTemplate(
    reminder.category as any,
    'EMAIL',
    {
      customerName: customer.name,
      vehicleReg: vehicle.registrationNumber,
      brandModel: `${vehicle.brand} ${vehicle.model}`,
      dueDate: reminder.dueDate,
      daysRemaining: Math.round((new Date(reminder.dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24)),
      showroomName: showroom ? showroom.name : 'Dealership'
    }
  );

  if (channel === 'ALL' || channel === 'EMAIL') {
    const notif = await notificationService.send({
      reminderId: reminder.id,
      vehicleId: vehicle.id,
      customerId: customer.id,
      showroomId: reminder.showroomId,
      type: `${reminder.category}_REMINDER`,
      channel: 'EMAIL',
      recipient: customer.email,
      subject: template.subject,
      message: template.message
    });
    dispatched.push(notif);
  }

  if (channel === 'ALL' || channel === 'SMS') {
    const smsTemplate = notificationService.generateTemplate(
      reminder.category as any,
      'SMS',
      {
        customerName: customer.name,
        vehicleReg: vehicle.registrationNumber,
        brandModel: `${vehicle.brand} ${vehicle.model}`,
        dueDate: reminder.dueDate,
        daysRemaining: Math.round((new Date(reminder.dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24)),
        showroomName: showroom ? showroom.name : 'Dealership'
      }
    );

    const notif = await notificationService.send({
      reminderId: reminder.id,
      vehicleId: vehicle.id,
      customerId: customer.id,
      showroomId: reminder.showroomId,
      type: `${reminder.category}_REMINDER`,
      channel: 'SMS',
      recipient: customer.phone,
      subject: smsTemplate.subject,
      message: smsTemplate.message
    });
    dispatched.push(notif);
  }

  res.json({ message: 'Notifications generated and logged successfully', dispatched });
});

// --- Notification Routes ---
apiRouter.get('/notifications', (req: Request, res: Response) => {
  const showroomId = showroomScope(req, req.query.showroomId as string | undefined);
  res.json(db.getNotifications(showroomId));
});

apiRouter.post('/notifications/send-direct', async (req: Request, res: Response) => {
  const { vehicleId, customerId, showroomId, channel, subject, message } = req.body || {};

  if (!isRecord(req.body) || !hasOnlyKeys(req.body,['vehicleId','customerId','showroomId','channel','subject','message']) || !isText(customerId,100) || (vehicleId !== undefined && !isText(vehicleId,100))) return res.status(400).json({ error: 'Invalid notification details' });

  const customer = db.customers.find(c => c.id === customerId);
  if (!customer || !belongsToShowroom(req, customer.showroomId)) return res.status(404).json({ error: 'Customer not found' });
  if (!isEnum('channel',channel || 'SMS') || !isText(subject || 'Notice from Dealership',200) || !isText(message || 'Hello, this is a notice regarding your vehicle service.',2000) || (vehicleId && !db.vehicles.some(v => v.id === vehicleId && v.customerId === customer.id))) return res.status(400).json({ error: 'Invalid notification details' });

  const notif = await notificationService.send({
    vehicleId: vehicleId || '',
    customerId: customer.id,
    showroomId: customer.showroomId,
    type: 'CUSTOM_ALERT',
    channel: channel || 'SMS',
    recipient: channel === 'EMAIL' ? customer.email : customer.phone,
    subject: subject || 'Notice from Dealership',
    message: message || 'Hello, this is a notice regarding your vehicle service.'
  });

  res.status(201).json(notif);
});

// --- Reminder Engine Trigger Route ---
apiRouter.post('/engine/run', async (req: Request, res: Response) => {
  const { referenceDate } = req.body || {};
  if (req.body !== undefined && (!isRecord(req.body) || !hasOnlyKeys(req.body,['referenceDate']))) return res.status(400).json({ error: 'Invalid engine request' });
  if (referenceDate !== undefined && !isDate(referenceDate)) return res.status(400).json({ error: 'referenceDate must be YYYY-MM-DD' });
  const result = await reminderEngine.run(referenceDate);
  res.json(result);
});

// --- Database Reset Route ---
apiRouter.post('/database/reset', requireRole('ADMIN'), async (_req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') return res.status(404).json({ error: 'Not found' });
  await db.resetDemoData();
  res.json({ message: 'Demo business records were cleared' });
});

// --- Customer Portal Routes ---
apiRouter.get('/customer-portal/me', (req: Request, res: Response) => {
  const customerId = req.auth!.id;
  const customer = db.customers.find(c => c.id === customerId);
  if (!customer) return res.status(404).json({ error: 'Customer account not found' });

  const vehicles = db.vehicles.filter(v => v.customerId === customerId);
  const vehicleIds = vehicles.map(v => v.id);

  const services = db.services.filter(s => vehicleIds.includes(s.vehicleId));
  const insurance = db.insurancePolicies.filter(i => vehicleIds.includes(i.vehicleId));
  const documents = db.documents.filter(d => vehicleIds.includes(d.vehicleId));
  const reminders = db.reminders.filter(r => vehicleIds.includes(r.vehicleId));
  const notifications = db.notifications.filter(n => n.customerId === customerId);
  const requests = db.serviceRequests.filter(r => r.customerId === customerId);

  res.json({
    customer: safeCustomer(customer),
    vehicles,
    services,
    insurancePolicies: insurance,
    documents: documents.map(safeDocument),
    reminders,
    notifications,
    serviceRequests: requests
  });
});

apiRouter.post('/customer-portal/request-service', async (req: Request, res: Response) => {
  const { vehicleId, preferredDate, serviceType = 'PERIODIC_MAINTENANCE', notes = '' } = req.body || {};

  if (!isRecord(req.body) || !hasOnlyKeys(req.body,['vehicleId','preferredDate','serviceType','notes']) || !isText(vehicleId,100) || !isDate(preferredDate) || !isEnum('serviceType',serviceType) || !isOptionalText(notes,1000)) {
    return res.status(400).json({ error: 'Customer, Vehicle, and Preferred Date are required' });
  }
  const customerId = req.auth!.id;
  const vehicle = db.vehicles.find(v => v.id === vehicleId && v.customerId === customerId && v.status === 'ACTIVE');
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found for this customer' });

  const reqObj = await db.addServiceRequest({
    customerId,
    vehicleId,
    showroomId: vehicle.showroomId,
    preferredDate,
    serviceType: serviceType || 'PERIODIC_MAINTENANCE',
    notes: notes || '',
    status: 'PENDING'
  });

  res.status(201).json(reqObj);
});

apiRouter.get('/service-requests', (req: Request, res: Response) => {
  const showroomId = showroomScope(req, req.query.showroomId as string | undefined);
  res.json(db.getServiceRequests(showroomId));
});

apiRouter.patch('/service-requests/:id/status', async (req: Request, res: Response) => {
  const { status } = req.body || {};
  const current = db.serviceRequests.find(r => r.id === req.params.id);
  if (!current || !belongsToShowroom(req,current.showroomId)) return res.status(404).json({ error: 'Service request not found' });
  if (!isRecord(req.body) || !hasOnlyKeys(req.body,['status']) || !isEnum('requestStatus',status)) return res.status(400).json({ error: 'Invalid request status' });
  const updated = await db.updateServiceRequest(req.params.id, { status });
  if (!updated) return res.status(404).json({ error: 'Service request not found' });
  res.json(updated);
});

// Express 4 does not forward rejected async route promises to its error
// middleware. Wrap registered handlers once so PostgreSQL errors become 500s.
for (const layer of (apiRouter as any).stack) {
  if (!layer.route) continue;
  for (const routeLayer of layer.route.stack) {
    const handler = routeLayer.handle;
    routeLayer.handle = (req: Request, res: Response, next: (error?: unknown) => void) => {
      try {
        const result = handler(req, res, next);
        if (result && typeof result.then === 'function') result.catch(next);
      } catch (error) { next(error); }
    };
  }
}
