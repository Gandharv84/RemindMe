import {
  Showroom,
  Employee,
  Customer,
  Vehicle,
  ServiceRecord,
  InsurancePolicy,
  VehicleDocument,
  Reminder,
  Notification,
  ServiceRequest
} from '../src/types';

// Showroom Locations for System Setup
export const initialShowrooms: Showroom[] = [
  {
    id: 'sh-01',
    name: 'Showroom',
    code: 'SH-01',
    city: '',
    state: '',
    address: '',
    phone: '',
    email: '',
    gstNumber: '',
    managerName: '',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  }
];

// Initial Staff Account for Authentication
// Staff accounts are seeded only when an operator explicitly configures
// SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD. Never ship a reusable default login.
export const initialEmployees: Employee[] = [];

// Clean Slate: Zero business records. All data is entered manually by the user.
export const initialCustomers: Customer[] = [];

export const initialVehicles: Vehicle[] = [];

export const initialServices: ServiceRecord[] = [];

export const initialInsurance: InsurancePolicy[] = [];

export const initialDocuments: VehicleDocument[] = [];

export const initialReminders: Reminder[] = [];

export const initialNotifications: Notification[] = [];

export const initialServiceRequests: ServiceRequest[] = [];
