import type { InsurancePolicy, Notification, Reminder, ServiceRecord, ServiceRequest, Showroom, Vehicle, VehicleDocument } from '../src/types';
import type { CustomerAccount, EmployeeAccount } from './models';

export type PersistedRecord = Showroom | EmployeeAccount | CustomerAccount | Vehicle | ServiceRecord | InsurancePolicy | VehicleDocument | Reminder | Notification | ServiceRequest;
export type CollectionName = 'showrooms' | 'employees' | 'customers' | 'vehicles' | 'services' | 'insurancePolicies' | 'documents' | 'reminders' | 'notifications' | 'serviceRequests';
