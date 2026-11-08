import {
  Customer,
  Vehicle,
  ServiceRecord,
  InsurancePolicy,
  VehicleDocument,
  Reminder,
  Notification,
  Showroom,
  DashboardStats,
  ServiceRequest
} from '../types';

const API_BASE = '/api';
let authToken: string | null = null;

export function setAuthToken(token: string | null) { authToken = token; }

async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  if (authToken) headers.set('Authorization', `Bearer ${authToken}`);
  return fetch(input, { ...init, headers });
}

export const api = {
  // Auth
  login: async (identifier: string, password?: string, role?: string) => {
    const res = await apiFetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password, role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }
    return res.json();
  },

  switchAccount: async (accountType: 'EMPLOYEE' | 'CUSTOMER', id?: string) => {
    const res = await apiFetch(`${API_BASE}/auth/switch-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountType, id })
    });
    if (!res.ok) throw new Error('Failed to switch account');
    return res.json();
  },

  // Showrooms
  getShowrooms: async (): Promise<Showroom[]> => {
    const res = await apiFetch(`${API_BASE}/showrooms`);
    return res.json();
  },

  // Dashboard
  getStats: async (showroomId?: string): Promise<DashboardStats> => {
    const url = showroomId ? `${API_BASE}/dashboard/stats?showroomId=${showroomId}` : `${API_BASE}/dashboard/stats`;
    const res = await apiFetch(url);
    return res.json();
  },

  getActivity: async (showroomId?: string) => {
    const url = showroomId ? `${API_BASE}/dashboard/activity?showroomId=${showroomId}` : `${API_BASE}/dashboard/activity`;
    const res = await apiFetch(url);
    return res.json();
  },

  // Customers
  getCustomers: async (params?: { showroomId?: string; search?: string; status?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    const res = await apiFetch(`${API_BASE}/customers?${query}`);
    return res.json();
  },

  getCustomerById: async (id: string) => {
    const res = await apiFetch(`${API_BASE}/customers/${id}`);
    if (!res.ok) throw new Error('Customer not found');
    return res.json();
  },

  createCustomer: async (data: Partial<Customer> & { password?: string }) => {
    const res = await apiFetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create customer');
    }
    return res.json();
  },

  updateCustomer: async (id: string, data: Partial<Customer>) => {
    const res = await apiFetch(`${API_BASE}/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update customer');
    return res.json();
  },

  deleteCustomer: async (id: string) => {
    const res = await apiFetch(`${API_BASE}/customers/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Vehicles
  getVehicles: async (params?: { showroomId?: string; search?: string; filter?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    const res = await apiFetch(`${API_BASE}/vehicles?${query}`);
    return res.json();
  },

  getVehicleById: async (id: string) => {
    const res = await apiFetch(`${API_BASE}/vehicles/${id}`);
    if (!res.ok) throw new Error('Vehicle not found');
    return res.json();
  },

  createVehicle: async (data: Partial<Vehicle>) => {
    const res = await apiFetch(`${API_BASE}/vehicles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create vehicle');
    }
    return res.json();
  },

  updateVehicle: async (id: string, data: Partial<Vehicle>) => {
    const res = await apiFetch(`${API_BASE}/vehicles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update vehicle');
    return res.json();
  },

  deleteVehicle: async (id: string) => {
    const res = await apiFetch(`${API_BASE}/vehicles/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Services
  getServices: async (params?: { showroomId?: string; vehicleId?: string }): Promise<(ServiceRecord & { vehicleReg: string; customerName: string; model: string })[]> => {
    const query = new URLSearchParams(params as any).toString();
    const res = await apiFetch(`${API_BASE}/services?${query}`);
    return res.json();
  },

  createService: async (data: Partial<ServiceRecord>) => {
    const res = await apiFetch(`${API_BASE}/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create service record');
    }
    return res.json();
  },

  updateService: async (id: string, data: Partial<ServiceRecord>) => {
    const res = await apiFetch(`${API_BASE}/services/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Insurance
  getInsurance: async (showroomId?: string) => {
    const url = showroomId ? `${API_BASE}/insurance?showroomId=${showroomId}` : `${API_BASE}/insurance`;
    const res = await apiFetch(url);
    return res.json();
  },

  createInsurance: async (data: Partial<InsurancePolicy>) => {
    const res = await apiFetch(`${API_BASE}/insurance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add insurance policy');
    }
    return res.json();
  },

  updateInsurance: async (id: string, data: Partial<InsurancePolicy>) => {
    const res = await apiFetch(`${API_BASE}/insurance/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Documents
  getDocuments: async (showroomId?: string) => {
    const url = showroomId ? `${API_BASE}/documents?showroomId=${showroomId}` : `${API_BASE}/documents`;
    const res = await apiFetch(url);
    return res.json();
  },

  createDocument: async (data: Partial<VehicleDocument>) => {
    const res = await apiFetch(`${API_BASE}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add vehicle document');
    }
    return res.json();
  },

  // Reminders
  getReminders: async (params?: { showroomId?: string; status?: string; category?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    const res = await apiFetch(`${API_BASE}/reminders?${query}`);
    return res.json();
  },

  createReminder: async (data: Partial<Reminder>) => {
    const res = await apiFetch(`${API_BASE}/reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  updateReminderStatus: async (id: string, status: string) => {
    const res = await apiFetch(`${API_BASE}/reminders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return res.json();
  },

  resendReminderNotification: async (id: string) => {
    const res = await apiFetch(`${API_BASE}/reminders/${id}/resend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: 'EMAIL' })
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Failed to send reminder email');
    return body;
  },

  getNotificationStatus: async (): Promise<{ configured: boolean; missing: string[] }> => {
    const res = await apiFetch(`${API_BASE}/notifications/status`);
    if (!res.ok) throw new Error('Failed to load SMTP status');
    return res.json();
  },

  retryNotification: async (id: string) => {
    const res = await apiFetch(`${API_BASE}/notifications/${id}/retry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Failed to retry email');
    return body.notification as Notification;
  },

  // Notifications
  getNotifications: async (showroomId?: string): Promise<(Notification & { vehicleReg: string; vehicleModel: string; customerName: string })[]> => {
    const url = showroomId ? `${API_BASE}/notifications?showroomId=${showroomId}` : `${API_BASE}/notifications`;
    const res = await apiFetch(url);
    return res.json();
  },

  sendDirectNotification: async (data: { vehicleId?: string; customerId: string; showroomId?: string; channel?: 'EMAIL'; subject: string; message: string }) => {
    const res = await apiFetch(`${API_BASE}/notifications/send-direct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Failed to send email');
    return body.notification;
  },

  // Reminder Engine Trigger
  runReminderEngine: async (referenceDate?: string) => {
    const res = await apiFetch(`${API_BASE}/engine/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referenceDate })
    });
    return res.json();
  },

  // Database Reset
  resetDatabase: async () => {
    const res = await apiFetch(`${API_BASE}/database/reset`, { method: 'POST' });
    return res.json();
  },

  // Customer Portal
  getCustomerPortalData: async (_customerId?: string) => {
    const res = await apiFetch(`${API_BASE}/customer-portal/me`);
    if (!res.ok) throw new Error('Failed to load customer profile');
    return res.json();
  },

  requestService: async (data: { vehicleId: string; preferredDate: string; serviceType: string; notes?: string }) => {
    const res = await apiFetch(`${API_BASE}/customer-portal/request-service`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'Could not submit service request');
    return body;
  },

  getServiceRequests: async (showroomId?: string) => {
    const url = showroomId ? `${API_BASE}/service-requests?showroomId=${showroomId}` : `${API_BASE}/service-requests`;
    const res = await apiFetch(url);
    if (!res.ok) throw new Error(`Failed to load service requests (${res.status})`);
    return res.json();
  },

  updateServiceRequestStatus: async (id: string, status: string) => {
    const res = await apiFetch(`${API_BASE}/service-requests/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error(`Failed to update service request (${res.status})`);
    return res.json();
  }
};
