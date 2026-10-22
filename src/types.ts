export type Role = 'EMPLOYEE' | 'ADMIN' | 'CUSTOMER';

export type FuelType = 'PETROL' | 'DIESEL' | 'ELECTRIC' | 'HYBRID' | 'CNG';

export type VehicleStatus = 'ACTIVE' | 'INACTIVE' | 'TRANSFERRED';

export type ServiceType =
  | 'PERIODIC_MAINTENANCE'
  | 'OIL_CHANGE'
  | 'MAJOR_SERVICE'
  | 'ACCIDENTAL_REPAIR'
  | 'GENERAL_CHECKUP'
  | 'WHEEL_ALIGNMENT'
  | 'BRAKE_SERVICE'
  | 'AC_SERVICE'
  | 'INSURANCE_ASSISTANCE';

export type ServiceStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type InsuranceType = 'COMPREHENSIVE' | 'THIRD_PARTY' | 'ZERO_DEP';

export type InsuranceStatus = 'ACTIVE' | 'EXPIRED' | 'RENEWED' | 'EXPIRING_SOON';

export type DocumentType = 'PUC' | 'RC' | 'INSURANCE' | 'EXTENDED_WARRANTY' | 'FASTAG' | 'OTHER';

export type DocumentStatus = 'ACTIVE' | 'EXPIRED' | 'EXPIRING_SOON';

export type ReminderCategory = 'SERVICE' | 'INSURANCE' | 'PUC' | 'DOCUMENT' | 'CUSTOM';

export type ReminderStatus = 'UPCOMING' | 'DUE_TODAY' | 'OVERDUE' | 'COMPLETED' | 'CANCELLED';

export type NotificationChannel = 'EMAIL' | 'SMS' | 'WHATSAPP';

export type NotificationStatus = 'SENT' | 'DELIVERED' | 'FAILED' | 'PENDING';

export type NotificationMode = 'DEMO_SANDBOX' | 'LIVE';

export interface Showroom {
  id: string;
  name: string;
  code: string;
  city: string;
  state: string;
  address: string;
  phone: string;
  email: string;
  gstNumber: string;
  managerName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  showroomId: string;
  name: string;
  email: string;
  phone: string;
  role: 'EMPLOYEE' | 'ADMIN';
  employeeCode: string;
  designation: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  showroomId: string;
  customerCode: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  pincode: string;
  status: 'ACTIVE' | 'INACTIVE';
  preferredChannel: 'ALL' | 'EMAIL' | 'SMS';
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  showroomId: string;
  customerId: string;
  registrationNumber: string;
  brand: string;
  model: string;
  variant: string;
  fuelType: FuelType;
  purchaseDate: string;
  yearOfManufacture?: number;
  transmission?: string;
  chassisNumber: string;
  engineNumber: string;
  color: string;
  lastServiceDate?: string;
  nextServiceDate?: string;
  insuranceExpiryDate?: string;
  pucExpiryDate?: string;
  currentOdometer: number;
  odometerReading?: number;
  status: VehicleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceRecord {
  id: string;
  vehicleId: string;
  customerId: string;
  showroomId: string;
  serviceDate: string;
  serviceType: ServiceType;
  description: string;
  cost: number;
  odometerReading: number;
  nextServiceDate: string;
  status: ServiceStatus;
  technicianName: string;
  invoiceNumber?: string;
  advisorNotes?: string;
  remarks?: string;
  partsReplaced?: string;
  nextServiceOdometer?: number;
  createdAt: string;
  updatedAt: string;
}

export interface InsurancePolicy {
  id: string;
  vehicleId: string;
  customerId: string;
  showroomId: string;
  provider: string;
  policyNumber: string;
  policyType: InsuranceType;
  startDate: string;
  expiryDate: string;
  premiumAmount: number;
  idvAmount: number;
  status: InsuranceStatus;
  reminderScheduleDays: number[]; // e.g. [30, 15, 7, 1]
  insuranceProvider?: string;
  hasZeroDep?: boolean;
  reminderDaysBefore?: number[];
  createdAt: string;
  updatedAt: string;
}

export interface VehicleDocument {
  id: string;
  vehicleId: string;
  customerId: string;
  showroomId: string;
  docType?: DocumentType;
  documentType?: string;
  docNumber?: string;
  documentNumber?: string;
  issueDate?: string;
  issuedDate?: string;
  expiryDate?: string;
  status?: DocumentStatus;
  isDigiLockerLinked?: boolean;
  isDigiLockerVerified?: boolean;
  verificationCode?: string;
  digiLockerUri?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  id: string;
  vehicleId: string;
  customerId: string;
  showroomId: string;
  category: ReminderCategory;
  title: string;
  description: string;
  dueDate: string;
  targetDaysBefore: number; // e.g. 30, 15, 7, 1, 0
  status: ReminderStatus;
  triggeredAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  reminderId?: string;
  vehicleId: string;
  customerId: string;
  showroomId: string;
  type: string;
  channel: NotificationChannel;
  recipient: string;
  subject: string;
  message: string;
  status: NotificationStatus;
  mode: NotificationMode;
  sentAt: string;
  deliveryNotes?: string;
  createdAt: string;
}

export interface ServiceRequest {
  id: string;
  vehicleId: string;
  customerId: string;
  showroomId: string;
  preferredDate: string;
  serviceType: ServiceType;
  notes: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'COMPLETED';
  createdAt: string;
}

export interface DashboardStats {
  totalCustomers: number;
  totalVehicles: number;
  serviceDueSoon: number;
  insuranceExpiringSoon: number;
  pucExpiringSoon: number;
  overdueReminders: number;
  completedReminders: number;
  notificationsSent: number;
  upcomingRemindersCount: number;
  monthlyRevenueEstimate: number;
}
