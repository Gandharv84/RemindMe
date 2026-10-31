import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { ServiceRecord, Vehicle } from '../../types';
import {
  Wrench,
  Plus,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  Car,
  FileText,
  Sparkles,
  X,
  Search,
  Filter,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const ServiceManagementView: React.FC = () => {
  const { activeShowroomId, user } = useAuth();
  const { showToast, refreshStats } = useApp();

  const [services, setServices] = useState<(ServiceRecord & { vehicleReg: string; customerName: string; model: string })[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    vehicleId: '',
    serviceType: 'PERIODIC_MAINTENANCE' as any,
    serviceDate: '2026-08-29',
    odometerReading: 25000,
    cost: 5800,
    invoiceNumber: 'INV-2026-089',
    status: 'COMPLETED' as 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
    advisorNotes: 'Full synthetic engine oil change (5W-30), oil filter replaced, 40-point vehicle inspection, brake pads checked.',
    partsReplaced: 'Engine Oil, Oil Filter, Air Filter, Cabin AC Filter',
    nextServiceDate: '2027-02-28',
    nextServiceOdometer: 35000
  });

  useEffect(() => {
    loadServices();
    loadVehicles();
  }, [activeShowroomId]);

  const loadServices = async () => {
    setIsLoading(true);
    try {
      const data = await api.getServices({ showroomId: activeShowroomId });
      setServices(data);
    } catch (err) {
      console.error('Failed to load service records', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadVehicles = async () => {
    try {
      const data = await api.getVehicles({ showroomId: activeShowroomId });
      setVehicles(data);
      if (data.length > 0 && !formData.vehicleId) {
        setFormData(prev => ({ ...prev, vehicleId: data[0].id }));
      }
    } catch (err) {
      console.error('Failed to load vehicles', err);
    }
  };

  const handleOpenAdd = () => {
    const defaultVehicle = vehicles[0];
    const currOdo = defaultVehicle?.odometerReading || 20000;

    // Auto calculate next date (+6 months) and next odo (+10,000 km)
    const today = new Date();
    const nextDate = new Date(today);
    nextDate.setMonth(nextDate.getMonth() + 6);
    const nextDateStr = nextDate.toISOString().split('T')[0];

    setFormData({
      vehicleId: defaultVehicle?.id || '',
      serviceType: 'PERIODIC_MAINTENANCE',
      serviceDate: new Date().toISOString().split('T')[0],
      odometerReading: currOdo,
      cost: 6500,
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      status: 'COMPLETED',
      advisorNotes: 'General 10,000 km periodic service. Fluids topped up, wheel alignment & balancing completed.',
      partsReplaced: 'Engine Oil (Castrol 5W-40), Oil Filter, Washer Fluid',
      nextServiceDate: nextDateStr,
      nextServiceOdometer: currOdo + 10000
    });
    setIsModalOpen(true);
  };

  const handleVehicleSelectChange = (vehicleId: string) => {
    const selected = vehicles.find(v => v.id === vehicleId);
    const currentOdo = selected?.odometerReading || 15000;
    setFormData(prev => ({
      ...prev,
      vehicleId,
      odometerReading: currentOdo,
      nextServiceOdometer: currentOdo + 10000
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicleId) {
      showToast('error', 'Validation Error', 'Please select a vehicle.');
      return;
    }

    try {
      await api.createService({
        ...formData,
        showroomId: activeShowroomId,
        technicianName: user?.name || 'Service Center Tech'
      });

      if (formData.status === 'COMPLETED') {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
        showToast('success', 'Service Completed & Logged', 'Vehicle service history updated and next reminder scheduled.');
      } else {
        showToast('success', 'Service Scheduled', 'Service job card created.');
      }

      setIsModalOpen(false);
      await loadServices();
      await loadVehicles();
      await refreshStats();
    } catch (err: any) {
      showToast('error', 'Failed', err.message || 'Could not save service record');
    }
  };

  const handleQuickStatusChange = async (service: ServiceRecord, newStatus: any) => {
    try {
      await api.updateService(service.id, { status: newStatus });
      if (newStatus === 'COMPLETED') {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        showToast('success', 'Service Marked Complete', 'Service completed successfully.');
      } else {
        showToast('info', 'Status Updated', `Service marked as ${newStatus}.`);
      }
      await loadServices();
      await refreshStats();
    } catch (err) {
      showToast('error', 'Error', 'Failed to update service status');
    }
  };

  const filteredServices = services.filter(s => {
    const matchesSearch =
      s.vehicleReg?.toLowerCase().includes(search.toLowerCase()) ||
      s.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      s.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
      s.serviceType.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-outfit tracking-tight">
            Service Records & Maintenance
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Log periodic vehicle services, auto-compute next service dates, and update odometer readings
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-xl bg-[#F07836] hover:bg-[#E06725] text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-[#F07836]/25 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Log New Service Job</span>
        </button>
      </div>

      {/* Search & Status Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by registration number, customer, invoice no, or service type..."
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
            <option value="ALL">All Service Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="IN_PROGRESS">In Progress / Job Card Open</option>
            <option value="SCHEDULED">Scheduled</option>
          </select>
        </div>
      </div>

      {/* Service Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Vehicle & Customer</th>
                <th className="py-3.5 px-4">Service Details</th>
                <th className="py-3.5 px-4">Odometer</th>
                <th className="py-3.5 px-4">Cost & Invoice</th>
                <th className="py-3.5 px-4">Next Due Schedule</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading service records...
                  </td>
                </tr>
              ) : filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No service records found.
                  </td>
                </tr>
              ) : (
                filteredServices.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                          {s.vehicleReg}
                        </span>
                        <div className="font-semibold text-slate-800 text-xs mt-1">{s.customerName}</div>
                        <div className="text-[10px] text-slate-400">{s.model}</div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-slate-900 capitalize">
                          {s.serviceType.replace('_', ' ').toLowerCase()}
                        </span>
                        <div className="text-[11px] text-slate-500 mt-0.5">Date: {s.serviceDate}</div>
                        {s.partsReplaced && (
                          <div className="text-[10px] text-slate-500 truncate max-w-[200px] mt-0.5">
                            Parts: {s.partsReplaced}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      <span className="font-bold text-slate-800">{s.odometerReading?.toLocaleString()} km</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-slate-900 font-mono">₹{s.cost?.toLocaleString()}</span>
                        <div className="text-[10px] text-slate-400 font-mono">{s.invoiceNumber || 'N/A'}</div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-slate-800 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#F07836]" />
                          <span>{s.nextServiceDate || 'Not set'}</span>
                        </div>
                        {s.nextServiceOdometer && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            @ {s.nextServiceOdometer.toLocaleString()} km
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        s.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                        s.status === 'IN_PROGRESS' ? 'bg-[#FFF3EC] text-[#D95D1E] border border-[#FCD4BE]' :
                        s.status === 'SCHEDULED' ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {s.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {s.status !== 'COMPLETED' ? (
                        <button
                          onClick={() => handleQuickStatusChange(s, 'COMPLETED')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-xs transition-colors"
                          title="Mark service as finished"
                        >
                          Complete
                        </button>
                      ) : (
                        <span className="text-emerald-600 font-semibold text-[11px] inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Done</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Service Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900 max-h-[90vh] flex flex-col">
            <div className="p-5 bg-[#262B33] text-white flex items-center justify-between border-b border-[#333944]">
              <div className="flex items-center gap-2.5">
                <Wrench className="w-5 h-5 text-[#F07836]" />
                <h3 className="font-bold text-sm">Log New Vehicle Service Job</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Select Vehicle for Service <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.vehicleId}
                    onChange={e => handleVehicleSelectChange(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F07836] focus:border-[#F07836] focus:outline-none bg-white font-medium"
                  >
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.registrationNumber} — {v.brand} {v.model} (Odo: {v.odometerReading} km)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Service Type</label>
                  <select
                    value={formData.serviceType}
                    onChange={e => setFormData({ ...formData, serviceType: e.target.value as any })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F07836] focus:border-[#F07836] focus:outline-none bg-white"
                  >
                    <option value="PERIODIC_MAINTENANCE">Periodic General Maintenance</option>
                    <option value="FIRST_FREE">1st Free Inspection Service</option>
                    <option value="SECOND_FREE">2nd Free Service</option>
                    <option value="MAJOR_SERVICE">Major Engine & Transmission Service</option>
                    <option value="BRAKE_SERVICE">Brake Overhaul / Pad Replacement</option>
                    <option value="AC_SERVICE">AC Compressor & Gas Refill</option>
                    <option value="WHEEL_ALIGNMENT">Wheel Alignment & Balancing</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Service Execution Date</label>
                  <input
                    type="date"
                    required
                    value={formData.serviceDate}
                    onChange={e => setFormData({ ...formData, serviceDate: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F07836] focus:border-[#F07836] focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Current Odometer (km)</label>
                  <input
                    type="number"
                    required
                    value={formData.odometerReading}
                    onChange={e => {
                      const odo = Number(e.target.value);
                      setFormData({
                        ...formData,
                        odometerReading: odo,
                        nextServiceOdometer: odo + 10000
                      });
                    }}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F07836] focus:border-[#F07836] focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Total Bill Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={formData.cost}
                    onChange={e => setFormData({ ...formData, cost: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F07836] focus:border-[#F07836] focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Invoice / Job Card Number</label>
                  <input
                    type="text"
                    value={formData.invoiceNumber}
                    onChange={e => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F07836] focus:border-[#F07836] focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Job Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F07836] focus:border-[#F07836] focus:outline-none bg-white"
                  >
                    <option value="COMPLETED">Completed (Triggers Next Schedule Update)</option>
                    <option value="IN_PROGRESS">In Progress (Bay Active)</option>
                    <option value="SCHEDULED">Scheduled for Future</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Replaced Parts & Consumables</label>
                  <input
                    type="text"
                    placeholder="e.g. Engine Oil, Oil Filter, Brake Pads"
                    value={formData.partsReplaced}
                    onChange={e => setFormData({ ...formData, partsReplaced: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F07836] focus:border-[#F07836] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Advisor & Mechanic Notes</label>
                  <textarea
                    rows={2}
                    value={formData.advisorNotes}
                    onChange={e => setFormData({ ...formData, advisorNotes: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F07836] focus:border-[#F07836] focus:outline-none resize-none"
                  />
                </div>

                {/* Auto Calculated Next Service Schedule */}
                <div className="sm:col-span-2 p-3.5 bg-[#FFF3EC]/80 border border-[#FCD4BE] rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#D95D1E] mb-1 text-[11px]">
                      Automated Next Service Due Date (+6 Months)
                    </label>
                    <input
                      type="date"
                      value={formData.nextServiceDate}
                      onChange={e => setFormData({ ...formData, nextServiceDate: e.target.value })}
                      className="w-full px-3 py-1.5 border border-[#FCD4BE] rounded-lg focus:ring-2 focus:ring-[#F07836] focus:border-[#F07836] focus:outline-none font-mono bg-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#D95D1E] mb-1 text-[11px]">
                      Next Service Odometer (+10,000 km)
                    </label>
                    <input
                      type="number"
                      value={formData.nextServiceOdometer}
                      onChange={e => setFormData({ ...formData, nextServiceOdometer: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 border border-[#FCD4BE] rounded-lg focus:ring-2 focus:ring-[#F07836] focus:border-[#F07836] focus:outline-none font-mono bg-white text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#F07836] hover:bg-[#E06725] text-white font-bold shadow-md shadow-[#F07836]/25"
                >
                  Save Service Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
