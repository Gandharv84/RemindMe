import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { Customer, Vehicle } from '../../types';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Car,
  Edit3,
  UserX,
  CheckCircle2,
  X,
  ExternalLink,
  ChevronRight,
  Filter
} from 'lucide-react';

export const CustomerManagementView: React.FC = () => {
  const { activeShowroomId } = useAuth();
  const { showToast, refreshStats, setActiveTab } = useApp();

  const [customers, setCustomers] = useState<(Customer & { vehicleCount: number })[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<(Customer & { vehicles: Vehicle[] }) | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: 'Pune',
    pincode: '411001',
    preferredChannel: 'ALL' as 'ALL' | 'EMAIL' | 'SMS',
    password: ''
  });

  useEffect(() => {
    loadCustomers();
  }, [activeShowroomId, search, statusFilter]);

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const data = await api.getCustomers({
        showroomId: activeShowroomId,
        search,
        status: statusFilter
      });
      setCustomers(data);
    } catch (err) {
      console.error('Failed to load customers', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      phone: '+91 ',
      email: '',
      address: '',
      city: 'Pune',
      pincode: '411001',
      preferredChannel: 'ALL',
      password: ''
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      city: customer.city,
      pincode: customer.pincode,
      preferredChannel: customer.preferredChannel,
      password: ''
    });
    setIsAddModalOpen(true);
  };

  const handleViewCustomer = async (id: string) => {
    try {
      const data = await api.getCustomerById(id);
      setViewingCustomer(data);
    } catch (err) {
      showToast('error', 'Error', 'Could not fetch customer details');
    }
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      showToast('error', 'Validation Error', 'Customer Name and Mobile Number are required.');
      return;
    }
    if (!editingCustomer && formData.password.length < 10) {
      showToast('error', 'Validation Error', 'Set a customer portal password of at least 10 characters.');
      return;
    }

    try {
      if (editingCustomer) {
        const { password: _password, ...profile } = formData;
        await api.updateCustomer(editingCustomer.id, profile);
        showToast('success', 'Customer Updated', `${formData.name}'s profile has been updated.`);
      } else {
        await api.createCustomer({
          ...formData,
          showroomId: activeShowroomId
        });
        showToast('success', 'Customer Created', `New customer ${formData.name} added to showroom database.`);
      }
      setIsAddModalOpen(false);
      await loadCustomers();
      await refreshStats();
    } catch (err: any) {
      showToast('error', 'Save Failed', err.message || 'Could not save customer');
    }
  };

  const handleToggleStatus = async (customer: Customer) => {
    const newStatus = customer.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.updateCustomer(customer.id, { status: newStatus });
      showToast('info', 'Status Changed', `${customer.name} marked as ${newStatus}.`);
      await loadCustomers();
      await refreshStats();
    } catch (err) {
      showToast('error', 'Error', 'Failed to update customer status');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-outfit tracking-tight">Customer Directory</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage showroom customer contacts, communication channels, and associated vehicle ownership
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-xl bg-[#F07836] hover:bg-[#E06725] text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-[#F07836]/25 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer name, mobile (+91), email, or code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F07836] focus:border-[#F07836] focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#F07836] focus:border-[#F07836]"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Customers</option>
            <option value="INACTIVE">Inactive Customers</option>
          </select>
        </div>
      </div>

      {/* Customers List Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Customer Info</th>
                <th className="py-3.5 px-4">Contact Info</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4">Vehicles</th>
                <th className="py-3.5 px-4">Channel</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading customer records...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No customers found matching your criteria.
                  </td>
                </tr>
              ) : (
                customers.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#FFF3EC] text-[#D95D1E] font-bold flex items-center justify-center shrink-0 border border-[#FCD4BE]">
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <div
                            onClick={() => handleViewCustomer(c.id)}
                            className="font-bold text-slate-900 hover:text-[#F07836] cursor-pointer flex items-center gap-1"
                          >
                            <span>{c.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">{c.customerCode}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span className="font-mono">{c.phone}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span className="truncate max-w-[140px]">{c.email || 'N/A'}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-slate-700 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[120px]">{c.city}, {c.pincode}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-[#262B33] font-bold text-[11px] inline-flex items-center gap-1.5 border border-slate-200">
                        <Car className="w-3.5 h-3.5 text-[#F07836]" />
                        {c.vehicleCount} {c.vehicleCount === 1 ? 'Car' : 'Cars'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {c.preferredChannel}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {c.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleViewCustomer(c.id)}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-[#F07836]"
                          title="View Profile & Linked Vehicles"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          title="Edit Customer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleToggleStatus(c)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            c.status === 'ACTIVE' ? 'text-slate-400 hover:text-rose-600' : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={c.status === 'ACTIVE' ? 'Deactivate Customer' : 'Activate Customer'}
                        >
                          {c.status === 'ACTIVE' ? <UserX className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden text-slate-900">
            <div className="p-5 bg-[#262B33] text-white flex items-center justify-between border-b border-[#333944]">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-[#F07836]" />
                <h3 className="font-bold text-sm">
                  {editingCustomer ? 'Edit Customer Profile' : 'Add New Showroom Customer'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Customer Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Deshmukh"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F07836] focus:border-[#F07836] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98XXX XXXXX"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F07836] focus:border-[#F07836] focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="customer@example.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F07836] focus:border-[#F07836] focus:outline-none"
                  />
                </div>

                {!editingCustomer && <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Customer Portal Password <span className="text-rose-500">*</span></label>
                  <input type="password" required minLength={10} autoComplete="new-password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F07836] focus:border-[#F07836] focus:outline-none" />
                  <p className="text-[11px] text-slate-400 mt-1">Share this password privately with the customer.</p>
                </div>}

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Street Address</label>
                  <input
                    type="text"
                    placeholder="Flat / Building, Landmark, Area"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F07836] focus:border-[#F07836] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F07836] focus:border-[#F07836] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={e => setFormData({ ...formData, pincode: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F07836] focus:border-[#F07836] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Preferred Reminder Channel</label>
                  <select
                    value={formData.preferredChannel}
                    onChange={e => setFormData({ ...formData, preferredChannel: e.target.value as any })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F07836] focus:border-[#F07836] focus:outline-none"
                  >
                    <option value="ALL">All (Email & SMS Multi-Channel)</option>
                    <option value="SMS">SMS Only (DLT Telecom Alert)</option>
                    <option value="EMAIL">Email Only</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#F07836] hover:bg-[#E06725] text-white font-bold shadow-md shadow-[#F07836]/25"
                >
                  {editingCustomer ? 'Update Customer' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Detail Drawer / Modal */}
      {viewingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900 flex flex-col max-h-[85vh]">
            <div className="p-5 bg-[#262B33] text-white flex items-center justify-between border-b border-[#333944]">
              <div>
                <h3 className="font-bold text-base">{viewingCustomer.name}</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{viewingCustomer.customerCode} &bull; {viewingCustomer.phone}</p>
              </div>
              <button
                onClick={() => setViewingCustomer(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Profile Details Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-slate-400 text-[11px] block">Email</span>
                  <span className="font-medium text-slate-800">{viewingCustomer.email || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Address</span>
                  <span className="font-medium text-slate-800">{viewingCustomer.address}, {viewingCustomer.city}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Channel Preference</span>
                  <span className="font-semibold text-[#D95D1E]">{viewingCustomer.preferredChannel}</span>
                </div>
              </div>

              {/* Linked Vehicles */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Car className="w-4 h-4 text-[#F07836]" />
                    <span>Registered Vehicles ({viewingCustomer.vehicles.length})</span>
                  </h4>
                  <button
                    onClick={() => {
                      setViewingCustomer(null);
                      setActiveTab('vehicles');
                    }}
                    className="text-[#F07836] font-semibold hover:underline text-[11px]"
                  >
                    Go to Vehicles &rarr;
                  </button>
                </div>

                <div className="space-y-2.5">
                  {viewingCustomer.vehicles.length === 0 ? (
                    <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-400">
                      No vehicles currently registered for this customer.
                    </div>
                  ) : (
                    viewingCustomer.vehicles.map(v => (
                      <div key={v.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {v.registrationNumber}
                            </span>
                            <span className="font-bold text-slate-800">{v.brand} {v.model} ({v.variant})</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-slate-500 text-[11px]">
                            <span>Next Service: <strong className="text-slate-700">{v.nextServiceDate || 'Not set'}</strong></span>
                            <span>Insurance: <strong className="text-slate-700">{v.insuranceExpiryDate || 'Not set'}</strong></span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {v.fuelType}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <button
                onClick={() => setViewingCustomer(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
