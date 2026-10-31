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
    name: 'Sai Service Vehicle Agency',
    code: 'SAI-01',
    city: 'Mumbai',
    state: 'Maharashtra',
    address: 'Plot 42, Western Express Highway, Andheri East, Mumbai, MH 400069',
    phone: '+91 22 2834 5000',
    email: 'service@saiservice.example.com',
    gstNumber: '27AAACS1234F1Z8',
    managerName: 'Rajesh Kulkarni',
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
