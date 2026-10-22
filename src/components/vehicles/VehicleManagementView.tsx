import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { Vehicle, Customer } from '../../types';
import {
  Car,
  Search,
  Plus,
  Wrench,
  ShieldAlert,
  Calendar,
  Fuel,
  Gauge,
  Edit3,
  Trash2,
  X,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Send,
  FileText
} from 'lucide-react';

export const VehicleManagementView: React.FC = () => {
  const { activeShowroomId } = useAuth();
  const { showToast, refreshStats, setActiveTab, openMessagePreview } = useApp();

  const [vehicles, setVehicles] = useState<(Vehicle & { customerName: string; customerPhone: string; customerEmail: string })[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    customerId: '',
    registrationNumber: '',
    brand: 'Hyundai',
    model: 'Creta',
    variant: 'SX (O) 1.5 Turbo',
    yearOfManufacture: 2023,
    fuelType: 'PETROL' as 'PETROL' | 'DIESEL' | 'ELECTRIC' | 'HYBRID' | 'CNG',
    transmission: 'AUTOMATIC' as 'MANUAL' | 'AUTOMATIC' | 'DCT' | 'IMT',
    color: 'Titan Grey',
    odometerReading: 24500,
    lastServiceDate: '2026-02-15',
    nextServiceDate: '2026-08-15',
    insuranceExpiryDate: '2026-09-10',
    pucExpiryDate: '2026-11-20'
  });

  useEffect(() => {
    loadVehicles();
    loadCustomers();
  }, [activeShowroomId, search, filterType]);

  const loadVehicles = async () => {
    setIsLoading(true);
    try {
      const data = await api.getVehicles({
        showroomId: activeShowroomId,
        search,
        filter: filterType
      });
      setVehicles(data);
    } catch (err) {
      console.error('Failed to load vehicles', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const data = await api.getCustomers({ showroomId: activeShowroomId });
      setCustomers(data);
    } catch (err) {
      console.error('Failed to load customers', err);
    }
  };

  const handleOpenAdd = () => {
    setEditingVehicle(null);
    setFormData({
      customerId: customers[0]?.id || '',
      registrationNumber: 'MH-12-XX-',
      brand: 'Hyundai',
      model: 'Creta',
      variant: 'SX (O) 1.5 Turbo',
      yearOfManufacture: 2024,
      fuelType: 'PETROL',
      transmission: 'AUTOMATIC',
      color: 'Abyss Black',
      odometerReading: 12000,
      lastServiceDate: '2026-03-01',
      nextServiceDate: '2026-09-01',
      insuranceExpiryDate: '2026-09-25',
      pucExpiryDate: '2026-12-15'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v: Vehicle) => {
    setEditingVehicle(v);
    setFormData({
      customerId: v.customerId,
      registrationNumber: v.registrationNumber,
      brand: v.brand,
      model: v.model,
      variant: v.variant,
      yearOfManufacture: v.yearOfManufacture,
      fuelType: v.fuelType,
      transmission: v.transmission,
      color: v.color,
      odometerReading: v.odometerReading,
      lastServiceDate: v.lastServiceDate || '',
      nextServiceDate: v.nextServiceDate || '',
      insuranceExpiryDate: v.insuranceExpiryDate || '',
      pucExpiryDate: v.pucExpiryDate || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.registrationNumber.trim() || !formData.customerId) {
      showToast('error', 'Validation Error', 'Registration Number and Linked Customer are required.');
      return;
    }

    try {
      if (editingVehicle) {
        await api.updateVehicle(editingVehicle.id, formData);
        showToast('success', 'Vehicle Updated', `Vehicle ${formData.registrationNumber} details updated.`);
      } else {
        await api.createVehicle({
          ...formData,
          showroomId: activeShowroomId
        });
        showToast('success', 'Vehicle Registered', `Vehicle ${formData.registrationNumber} added to showroom inventory.`);
      }
      setIsModalOpen(false);
      await loadVehicles();
      await refreshStats();
    } catch (err: any) {
      showToast('error', 'Save Failed', err.message || 'Could not save vehicle');
    }
  };

  const handleDelete = async (v: Vehicle) => {
    if (window.confirm(`Are you sure you want to remove vehicle ${v.registrationNumber}?`)) {
      try {
        await api.deleteVehicle(v.id);
        showToast('info', 'Vehicle Removed', `Vehicle ${v.registrationNumber} deleted.`);
        await loadVehicles();
        await refreshStats();
      } catch (err) {
        showToast('error', 'Error', 'Failed to delete vehicle');
      }
    }
  };

  // Helper to calculate days relative to demo current date 2026-08-29
  const getDaysDiff = (dateStr?: string) => {
    if (!dateStr) return null;
    const now = new Date('2026-08-29').getTime();
    const target = new Date(dateStr).getTime();
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-outfit tracking-tight">Vehicle Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Fleet tracking, periodic service intervals, insurance renewals, and PUC compliance
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Vehicle</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by registration (e.g. MH-12), model, brand, or customer name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Vehicles</option>
            <option value="SERVICE_DUE">Service Due Soon / Overdue</option>
            <option value="INSURANCE_DUE">Insurance Expiring Soon</option>
            <option value="PUC_DUE">PUC Expiring Soon</option>
          </select>
        </div>
      </div>

      {/* Vehicles Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">
            Loading vehicles catalog...
          </div>
        ) : vehicles.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
            No vehicles found matching your criteria.
          </div>
        ) : (
          vehicles.map(v => {
            const serviceDiff = getDaysDiff(v.nextServiceDate);
            const insuranceDiff = getDaysDiff(v.insuranceExpiryDate);
            const pucDiff = getDaysDiff(v.pucExpiryDate);

            return (
              <div
                key={v.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between group"
              >
                <div>
                  {/* Card Header: Reg Plate & Badges */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="bg-slate-900 text-white font-mono font-bold text-xs px-2.5 py-1 rounded-lg tracking-wider border border-slate-800 shadow-xs flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      <span>{v.registrationNumber}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        v.fuelType === 'PETROL' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        v.fuelType === 'DIESEL' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                        v.fuelType === 'ELECTRIC' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {v.fuelType}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {v.transmission}
                      </span>
                    </div>
                  </div>

                  {/* Vehicle Model & Owner */}
                  <div className="mt-3">
                    <h3 className="font-bold text-slate-900 text-sm">
                      {v.brand} {v.model}
                    </h3>
                    <p className="text-xs text-slate-500">{v.variant} &bull; {v.yearOfManufacture} &bull; {v.color}</p>

                    <div className="mt-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Owner</span>
                      <span className="font-bold text-slate-800">{v.customerName}</span>
                      <span className="text-slate-500 font-mono text-[11px] block mt-0.5">{v.customerPhone}</span>
                    </div>
                  </div>

                  {/* Due Dates & Status Checkers */}
                  <div className="mt-4 space-y-2 text-xs">
                    {/* Service Due Row */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-2">
                        <Wrench className="w-3.5 h-3.5 text-amber-600" />
                        <span className="text-slate-600 font-medium">Service Due:</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-900 font-bold">{v.nextServiceDate || 'N/A'}</span>
                        {serviceDiff !== null && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            serviceDiff < 0 ? 'bg-rose-100 text-rose-700' :
                            serviceDiff <= 15 ? 'bg-amber-100 text-amber-800' :
                            'bg-slate-200 text-slate-700'
                          }`}>
                            {serviceDiff < 0 ? `${Math.abs(serviceDiff)}d overdue` : `${serviceDiff}d left`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Insurance Expiry Row */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />
                        <span className="text-slate-600 font-medium">Insurance Expiry:</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-900 font-bold">{v.insuranceExpiryDate || 'N/A'}</span>
                        {insuranceDiff !== null && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            insuranceDiff < 0 ? 'bg-rose-100 text-rose-700' :
                            insuranceDiff <= 30 ? 'bg-purple-100 text-purple-800' :
                            'bg-slate-200 text-slate-700'
                          }`}>
                            {insuranceDiff < 0 ? `${Math.abs(insuranceDiff)}d overdue` : `${insuranceDiff}d left`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* PUC Expiry Row */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-teal-600" />
                        <span className="text-slate-600 font-medium">PUC Valid Until:</span>
                      </div>
                      <span className="font-mono text-slate-900 font-bold">{v.pucExpiryDate || 'N/A'}</span>
                    </div>

                    {/* Odometer */}
                    <div className="flex items-center justify-between px-2 pt-1 text-slate-500 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Gauge className="w-3 h-3 text-slate-400" />
                        <span>Odometer:</span>
                      </div>
                      <span className="font-mono font-bold text-slate-700">{v.odometerReading.toLocaleString()} km</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(v)}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                      title="Edit Vehicle"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(v)}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      title="Delete Vehicle"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setActiveTab('services')}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Wrench className="w-3 h-3" />
                      <span>Log Service</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Vehicle Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900 max-h-[90vh] flex flex-col">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Car className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm">
                  {editingVehicle ? 'Edit Vehicle Details' : 'Register Vehicle to Showroom'}
                </h3>
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
                    Select Customer Owner <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.customerId}
                    onChange={e => setFormData({ ...formData, customerId: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
                  >
                    <option value="">-- Choose Registered Customer --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone}) - {c.customerCode}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Registration Number (RTO) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MH-12-AB-1234"
                    value={formData.registrationNumber}
                    onChange={e => setFormData({ ...formData, registrationNumber: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Brand</label>
                  <input
                    type="text"
                    required
                    value={formData.brand}
                    onChange={e => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Model Name</label>
                  <input
                    type="text"
                    required
                    value={formData.model}
                    onChange={e => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Variant / Trim</label>
                  <input
                    type="text"
                    value={formData.variant}
                    onChange={e => setFormData({ ...formData, variant: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fuel Type</label>
                  <select
                    value={formData.fuelType}
                    onChange={e => setFormData({ ...formData, fuelType: e.target.value as any })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="PETROL">Petrol</option>
                    <option value="DIESEL">Diesel</option>
                    <option value="ELECTRIC">Electric (EV)</option>
                    <option value="HYBRID">Strong Hybrid</option>
                    <option value="CNG">CNG</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Transmission</label>
                  <select
                    value={formData.transmission}
                    onChange={e => setFormData({ ...formData, transmission: e.target.value as any })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="MANUAL">Manual</option>
                    <option value="AUTOMATIC">Automatic (AT/CVT)</option>
                    <option value="DCT">Dual-Clutch (DCT)</option>
                    <option value="IMT">Intelligent Manual (iMT)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Year of Manufacture</label>
                  <input
                    type="number"
                    value={formData.yearOfManufacture}
                    onChange={e => setFormData({ ...formData, yearOfManufacture: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Current Odometer (km)</label>
                  <input
                    type="number"
                    value={formData.odometerReading}
                    onChange={e => setFormData({ ...formData, odometerReading: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-slate-200">
                  <h4 className="font-bold text-slate-900 mb-2 text-xs uppercase tracking-wider text-blue-600">
                    Reminder Schedule Configuration
                  </h4>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Next Service Due Date</label>
                  <input
                    type="date"
                    value={formData.nextServiceDate}
                    onChange={e => setFormData({ ...formData, nextServiceDate: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Insurance Policy Expiry</label>
                  <input
                    type="date"
                    value={formData.insuranceExpiryDate}
                    onChange={e => setFormData({ ...formData, insuranceExpiryDate: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">PUC Certificate Expiry</label>
                  <input
                    type="date"
                    value={formData.pucExpiryDate}
                    onChange={e => setFormData({ ...formData, pucExpiryDate: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
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
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md shadow-blue-600/20"
                >
                  {editingVehicle ? 'Save Vehicle Updates' : 'Complete Vehicle Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
