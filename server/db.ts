import {
  Showroom,
  Vehicle,
  ServiceRecord,
  InsurancePolicy,
  VehicleDocument,
  Reminder,
  Notification,
  ServiceRequest
} from '../src/types';
import {
  initialShowrooms
} from './seedData';
import { hashPassword } from './security';
import { acquireSingleInstanceLock, deleteDemoData, loadCollection, migrateAndSeed, upsertRecord, type CollectionName, type PersistedRecord } from './postgres';
import type { CustomerAccount, EmployeeAccount } from './models';

// PostgreSQL-backed record store with an in-process read cache.
class RemindMeDatabase {
  private writeQueue: Promise<void> = Promise.resolve();
  public showrooms: Showroom[] = [];
  public employees: EmployeeAccount[] = [];
  public customers: CustomerAccount[] = [];
  public vehicles: Vehicle[] = [];
  public services: ServiceRecord[] = [];
  public insurancePolicies: InsurancePolicy[] = [];
  public documents: VehicleDocument[] = [];
  public reminders: Reminder[] = [];
  public notifications: Notification[] = [];
  public serviceRequests: ServiceRequest[] = [];

  constructor() {
    // PostgreSQL is initialized explicitly before the HTTP listener starts.
  }

  public async initialize() {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    if (Boolean(process.env.SEED_ADMIN_EMAIL) !== Boolean(process.env.SEED_ADMIN_PASSWORD)) throw new Error('Configure both SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to seed the first administrator');
    if (process.env.SEED_ADMIN_PASSWORD && process.env.SEED_ADMIN_PASSWORD.length < 10) throw new Error('SEED_ADMIN_PASSWORD must contain at least 10 characters');
    const seedEmployee = process.env.SEED_ADMIN_EMAIL && process.env.SEED_ADMIN_PASSWORD
      ? {
          id: 'emp-' + Date.now().toString(36), showroomId: initialShowrooms[0].id,
          name: process.env.SEED_ADMIN_NAME || 'Administrator', email: process.env.SEED_ADMIN_EMAIL.trim().toLowerCase(),
          phone: '', role: 'ADMIN' as const, employeeCode: 'ADMIN-001', designation: 'Administrator',
          passwordHash: await hashPassword(process.env.SEED_ADMIN_PASSWORD), active: true,
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        }
      : undefined;
    await migrateAndSeed({ showrooms: initialShowrooms }, seedEmployee);
    await acquireSingleInstanceLock();
    await this.loadCache();
  }

  private async loadCache() {
    this.showrooms = await loadCollection('showrooms');
    this.employees = await loadCollection('employees');
    this.customers = await loadCollection('customers');
    this.vehicles = await loadCollection('vehicles');
    this.services = await loadCollection('services');
    this.insurancePolicies = await loadCollection('insurancePolicies');
    this.documents = await loadCollection('documents');
    this.reminders = await loadCollection('reminders');
    this.notifications = await loadCollection('notifications');
    this.serviceRequests = await loadCollection('serviceRequests');
  }

  private async persist(collection: CollectionName, record: PersistedRecord) {
    const snapshot = structuredClone(record);
    const operation = this.writeQueue.then(() => upsertRecord(collection, snapshot));
    this.writeQueue = operation.then(() => undefined, () => undefined);
    try {
      await operation;
    } catch (error) {
      try { await this.loadCache(); } catch { /* keep the original persistence error */ }
      throw error;
    }
  }

  public async resetDemoData() {
    await this.writeQueue;
    await deleteDemoData();
    this.customers = [];
    this.vehicles = [];
    this.services = [];
    this.insurancePolicies = [];
    this.documents = [];
    this.reminders = [];
    this.notifications = [];
    this.serviceRequests = [];
  }

  // --- Showroom Operations ---
  public getShowrooms(): Showroom[] {
    return this.showrooms;
  }

  public getShowroomById(id: string): Showroom | undefined {
    return this.showrooms.find(s => s.id === id);
  }

  // --- Employee Operations ---
  public getEmployees(showroomId?: string): EmployeeAccount[] {
    if (showroomId) {
      return this.employees.filter(e => e.showroomId === showroomId);
    }
    return this.employees;
  }

  public getEmployeeById(id: string): EmployeeAccount | undefined {
    return this.employees.find(e => e.id === id);
  }

  public getEmployeeByEmail(email: string): EmployeeAccount | undefined {
    return this.employees.find(e => e.email.toLowerCase() === email.toLowerCase());
  }

  // --- Customer Operations ---
  public getCustomers(showroomId?: string): (CustomerAccount & { vehicleCount: number })[] {
    let list = this.customers;
    if (showroomId) {
      list = list.filter(c => c.showroomId === showroomId);
    }
    return list.map(c => ({
      ...c,
      vehicleCount: this.vehicles.filter(v => v.customerId === c.id).length
    }));
  }

  public getCustomerById(id: string): (CustomerAccount & { vehicles: Vehicle[] }) | undefined {
    const customer = this.customers.find(c => c.id === id);
    if (!customer) return undefined;
    const linkedVehicles = this.vehicles.filter(v => v.customerId === id);
    return {
      ...customer,
      vehicles: linkedVehicles
    };
  }

  public getCustomerByPhoneOrEmail(identifier: string): CustomerAccount | undefined {
    const cleanId = identifier.trim().toLowerCase();
    const digits = cleanId.replace(/[^0-9]/g, '');
    return this.customers.find(c => c.email.toLowerCase() === cleanId || (digits.length >= 6 && c.phone.replace(/[^0-9]/g, '') === digits));
  }

  public async addCustomer(data: Omit<CustomerAccount, 'id' | 'customerCode' | 'createdAt' | 'updatedAt'>): Promise<CustomerAccount> {
    const count = this.customers.length + 1;
    const newCustomer: CustomerAccount = {
      ...data,
      id: 'cust-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      customerCode: `CUST-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`,
      status: data.status || 'ACTIVE',
      preferredChannel: data.preferredChannel || 'ALL',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.customers.unshift(newCustomer);
    await this.persist('customers', newCustomer);
    return newCustomer;
  }

  public async updateCustomer(id: string, updates: Partial<CustomerAccount>): Promise<CustomerAccount | undefined> {
    const index = this.customers.findIndex(c => c.id === id);
    if (index === -1) return undefined;
    this.customers[index] = {
      ...this.customers[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await this.persist('customers', this.customers[index]);
    return this.customers[index];
  }

  public async deleteCustomer(id: string): Promise<boolean> {
    const index = this.customers.findIndex(c => c.id === id);
    if (index === -1) return false;
    // Soft delete: mark inactive
    this.customers[index].status = 'INACTIVE';
    this.customers[index].updatedAt = new Date().toISOString();
    await this.persist('customers', this.customers[index]);
    return true;
  }

  // --- Vehicle Operations ---
  public getVehicles(showroomId?: string): (Vehicle & { customerName: string; customerPhone: string })[] {
    let list = this.vehicles;
    if (showroomId) {
      list = list.filter(v => v.showroomId === showroomId);
    }
    return list.map(v => {
      const customer = this.customers.find(c => c.id === v.customerId);
      return {
        ...v,
        odometerReading: v.odometerReading ?? v.currentOdometer,
        customerName: customer ? customer.name : 'Unknown Customer',
        customerPhone: customer ? customer.phone : ''
      };
    });
  }

  public getVehicleById(id: string) {
    const vehicle = this.vehicles.find(v => v.id === id);
    if (!vehicle) return undefined;
    const customer = this.customers.find(c => c.id === vehicle.customerId);
    const serviceHistory = this.services.filter(s => s.vehicleId === id);
    const insuranceList = this.insurancePolicies.filter(i => i.vehicleId === id);
    const docs = this.documents.filter(d => d.vehicleId === id);
    const vehicleReminders = this.reminders.filter(r => r.vehicleId === id);
    return {
      ...vehicle,
      odometerReading: vehicle.odometerReading ?? vehicle.currentOdometer,
      customer,
      services: serviceHistory,
      insurance: insuranceList,
      documents: docs,
      reminders: vehicleReminders
    };
  }

  public async addVehicle(data: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>): Promise<Vehicle> {
    const newVehicle: Vehicle = {
      ...data,
      id: 'veh-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.vehicles.unshift(newVehicle);
    await this.persist('vehicles', newVehicle);
    return newVehicle;
  }

  public async updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle | undefined> {
    const index = this.vehicles.findIndex(v => v.id === id);
    if (index === -1) return undefined;
    this.vehicles[index] = {
      ...this.vehicles[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    if (updates.currentOdometer !== undefined) this.vehicles[index].odometerReading = updates.currentOdometer;
    await this.persist('vehicles', this.vehicles[index]);
    return this.vehicles[index];
  }

  public async deleteVehicle(id: string): Promise<boolean> {
    const index = this.vehicles.findIndex(v => v.id === id);
    if (index === -1) return false;
    this.vehicles[index].status = 'INACTIVE';
    this.vehicles[index].updatedAt = new Date().toISOString();
    await this.persist('vehicles', this.vehicles[index]);
    return true;
  }

  // --- Service Record Operations ---
  public getServices(showroomId?: string): (ServiceRecord & { vehicleReg: string; customerName: string; model: string })[] {
    let list = this.services;
    if (showroomId) {
      list = list.filter(s => s.showroomId === showroomId);
    }
    return list.map(s => {
      const vehicle = this.vehicles.find(v => v.id === s.vehicleId);
      const customer = this.customers.find(c => c.id === s.customerId);
      return {
        ...s,
        vehicleReg: vehicle ? vehicle.registrationNumber : 'N/A',
        model: vehicle ? `${vehicle.brand} ${vehicle.model}` : 'N/A',
        customerName: customer ? customer.name : 'Unknown'
      };
    });
  }

  public async addService(data: Omit<ServiceRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceRecord> {
    const newService: ServiceRecord = {
      ...data,
      id: 'srv-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.services.unshift(newService);
    await this.persist('services', newService);

    // Update vehicle's lastServiceDate, nextServiceDate, and currentOdometer
    if (data.status === 'COMPLETED') {
      const v = this.vehicles.find(veh => veh.id === data.vehicleId);
      if (v) {
        v.lastServiceDate = data.serviceDate;
        v.nextServiceDate = data.nextServiceDate;
        if (data.odometerReading > v.currentOdometer) {
          v.currentOdometer = data.odometerReading;
          v.odometerReading = data.odometerReading;
        }
        v.updatedAt = new Date().toISOString();
        await this.persist('vehicles', v);
      }
    }

    return newService;
  }

  public async updateService(id: string, updates: Partial<ServiceRecord>): Promise<ServiceRecord | undefined> {
    const index = this.services.findIndex(s => s.id === id);
    if (index === -1) return undefined;
    this.services[index] = {
      ...this.services[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await this.persist('services', this.services[index]);

    // If marked as completed, synchronize vehicle
    if (updates.status === 'COMPLETED') {
      const s = this.services[index];
      const v = this.vehicles.find(veh => veh.id === s.vehicleId);
      if (v) {
        v.lastServiceDate = s.serviceDate;
        v.nextServiceDate = s.nextServiceDate;
        if (s.odometerReading > v.currentOdometer) {
          v.currentOdometer = s.odometerReading;
          v.odometerReading = s.odometerReading;
        }
        v.updatedAt = new Date().toISOString();
        await this.persist('vehicles', v);
      }
    }

    return this.services[index];
  }

  // --- Insurance Operations ---
  public getInsurance(showroomId?: string) {
    let list = this.insurancePolicies;
    if (showroomId) {
      list = list.filter(i => i.showroomId === showroomId);
    }
    return list.map(i => {
      const vehicle = this.vehicles.find(v => v.id === i.vehicleId);
      const customer = this.customers.find(c => c.id === i.customerId);
      return {
        ...i,
        insuranceProvider: i.provider,
        hasZeroDep: i.hasZeroDep ?? i.policyType === 'ZERO_DEP',
        reminderDaysBefore: i.reminderDaysBefore || i.reminderScheduleDays,
        vehicleReg: vehicle ? vehicle.registrationNumber : 'N/A',
        vehicleModel: vehicle ? `${vehicle.brand} ${vehicle.model}` : 'N/A',
        customerName: customer ? customer.name : 'Unknown',
        customerPhone: customer ? customer.phone : ''
      };
    });
  }

  public async addInsurance(data: Omit<InsurancePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<InsurancePolicy> {
    const newPolicy: InsurancePolicy = {
      ...data,
      id: 'ins-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.insurancePolicies.unshift(newPolicy);
    await this.persist('insurancePolicies', newPolicy);

    // Update vehicle insurance expiry date
    const v = this.vehicles.find(veh => veh.id === data.vehicleId);
    if (v) {
      v.insuranceExpiryDate = data.expiryDate;
      v.updatedAt = new Date().toISOString();
      await this.persist('vehicles', v);
    }

    return newPolicy;
  }

  public async updateInsurance(id: string, updates: Partial<InsurancePolicy>): Promise<InsurancePolicy | undefined> {
    const index = this.insurancePolicies.findIndex(i => i.id === id);
    if (index === -1) return undefined;
    this.insurancePolicies[index] = {
      ...this.insurancePolicies[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await this.persist('insurancePolicies', this.insurancePolicies[index]);

    if (updates.expiryDate) {
      const v = this.vehicles.find(veh => veh.id === this.insurancePolicies[index].vehicleId);
      if (v) {
        v.insuranceExpiryDate = updates.expiryDate;
        v.updatedAt = new Date().toISOString();
        await this.persist('vehicles', v);
      }
    }

    return this.insurancePolicies[index];
  }

  // --- Document Operations ---
  public getDocuments(showroomId?: string) {
    let list = this.documents;
    if (showroomId) {
      list = list.filter(d => d.showroomId === showroomId);
    }
    return list.map(d => {
      const vehicle = this.vehicles.find(v => v.id === d.vehicleId);
      const customer = this.customers.find(c => c.id === d.customerId);
      return {
        ...d,
        documentType: d.docType === 'PUC' ? 'PUC_CERTIFICATE' : d.docType || d.documentType || 'OTHER',
        documentNumber: d.docNumber || d.documentNumber || '',
        issuedDate: d.issueDate || d.issuedDate,
        vehicleReg: vehicle ? vehicle.registrationNumber : 'N/A',
        vehicleModel: vehicle ? `${vehicle.brand} ${vehicle.model}` : 'N/A',
        customerName: customer ? customer.name : 'Unknown'
      };
    });
  }

  public async addDocument(data: Omit<VehicleDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<VehicleDocument> {
    const newDoc: VehicleDocument = {
      ...data,
      id: 'doc-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.documents.unshift(newDoc);
    await this.persist('documents', newDoc);

    // If it's a PUC, update vehicle PUC expiry
    if (data.docType === 'PUC') {
      const v = this.vehicles.find(veh => veh.id === data.vehicleId);
      if (v) {
        v.pucExpiryDate = data.expiryDate;
        v.updatedAt = new Date().toISOString();
        await this.persist('vehicles', v);
      }
    }

    return newDoc;
  }

  public async updateDocument(id: string, updates: Partial<VehicleDocument>): Promise<VehicleDocument | undefined> {
    const index = this.documents.findIndex(d => d.id === id);
    if (index === -1) return undefined;
    this.documents[index] = {
      ...this.documents[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await this.persist('documents', this.documents[index]);

    if (this.documents[index].docType === 'PUC' && updates.expiryDate) {
      const v = this.vehicles.find(veh => veh.id === this.documents[index].vehicleId);
      if (v) {
        v.pucExpiryDate = updates.expiryDate;
        v.updatedAt = new Date().toISOString();
        await this.persist('vehicles', v);
      }
    }

    return this.documents[index];
  }

  // --- Reminder Operations ---
  public getReminders(showroomId?: string) {
    let list = this.reminders;
    if (showroomId) {
      list = list.filter(r => r.showroomId === showroomId);
    }
    return list.map(r => {
      const vehicle = this.vehicles.find(v => v.id === r.vehicleId);
      const customer = this.customers.find(c => c.id === r.customerId);
      return {
        ...r,
        vehicleReg: vehicle ? vehicle.registrationNumber : 'N/A',
        vehicleModel: vehicle ? `${vehicle.brand} ${vehicle.model}` : 'N/A',
        customerName: customer ? customer.name : 'Unknown',
        customerPhone: customer ? customer.phone : '',
        customerEmail: customer ? customer.email : ''
      };
    });
  }

  public async addReminder(data: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>): Promise<Reminder> {
    const newReminder: Reminder = {
      ...data,
      id: 'rem-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.reminders.unshift(newReminder);
    await this.persist('reminders', newReminder);
    return newReminder;
  }

  public async updateReminder(id: string, updates: Partial<Reminder>): Promise<Reminder | undefined> {
    const index = this.reminders.findIndex(r => r.id === id);
    if (index === -1) return undefined;
    this.reminders[index] = {
      ...this.reminders[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await this.persist('reminders', this.reminders[index]);
    return this.reminders[index];
  }

  // --- Notification Operations ---
  public getNotifications(showroomId?: string) {
    let list = this.notifications;
    if (showroomId) {
      list = list.filter(n => n.showroomId === showroomId);
    }
    return list.map(n => {
      const vehicle = this.vehicles.find(v => v.id === n.vehicleId);
      const customer = this.customers.find(c => c.id === n.customerId);
      return {
        ...n,
        vehicleReg: vehicle ? vehicle.registrationNumber : 'N/A',
        vehicleModel: vehicle ? `${vehicle.brand} ${vehicle.model}` : 'N/A',
        customerName: customer ? customer.name : 'Unknown'
      };
    });
  }

  public async addNotification(data: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    const newNotif: Notification = {
      ...data,
      id: 'notif-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      createdAt: new Date().toISOString()
    };
    this.notifications.unshift(newNotif);
    await this.persist('notifications', newNotif);
    return newNotif;
  }

  // --- Service Request Operations (Customer Portal) ---
  public getServiceRequests(showroomId?: string) {
    let list = this.serviceRequests;
    if (showroomId) {
      list = list.filter(r => r.showroomId === showroomId);
    }
    return list.map(req => {
      const vehicle = this.vehicles.find(v => v.id === req.vehicleId);
      const customer = this.customers.find(c => c.id === req.customerId);
      return {
        ...req,
        vehicleReg: vehicle ? vehicle.registrationNumber : 'N/A',
        vehicleModel: vehicle ? `${vehicle.brand} ${vehicle.model}` : 'N/A',
        customerName: customer ? customer.name : 'Unknown',
        customerPhone: customer ? customer.phone : ''
      };
    });
  }

  public async addServiceRequest(data: Omit<ServiceRequest, 'id' | 'createdAt'>): Promise<ServiceRequest> {
    const newReq: ServiceRequest = {
      ...data,
      id: 'req-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      createdAt: new Date().toISOString()
    };
    this.serviceRequests.unshift(newReq);
    await this.persist('serviceRequests', newReq);
    return newReq;
  }

  public async updateServiceRequest(id: string, updates: Partial<ServiceRequest>): Promise<ServiceRequest | undefined> {
    const index = this.serviceRequests.findIndex(r => r.id === id);
    if (index === -1) return undefined;
    this.serviceRequests[index] = {
      ...this.serviceRequests[index],
      ...updates
    };
    await this.persist('serviceRequests', this.serviceRequests[index]);
    return this.serviceRequests[index];
  }
}

export const db = new RemindMeDatabase();
