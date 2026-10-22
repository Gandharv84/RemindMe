import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { InsurancePolicy, Vehicle } from '../../types';
import {
  ShieldCheck,
  Plus,
  Calendar,
  Building,
  Car,
  Send,
  X,
  RefreshCw,
  Search,
  ShieldAlert,
  Clock,
  Sparkles,
  Award
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const InsuranceManagementView: React.FC = () => {
  const { activeShowroomId } = useAuth();
  const { showToast, refreshStats, openMessagePreview } = useApp();

  const [policies, setPolicies] = useState<(InsurancePolicy & { vehicleReg: string; customerName: string; model: string; customerPhone: string; customerEmail: string })[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    vehicleId: '',
    policyNumber: 'HDFC-ERGO-MOT-2026-987',
    insuranceProvider: 'HDFC ERGO General Insurance',
    policyType: 'COMPREHENSIVE' as any,
    startDate: '2026-09-01',
    expiryDate: '2027-08-31',
    premiumAmount: 18500,
    idvAmount: 1150000,
    hasZeroDep: true,
    reminderDaysBefore: [30, 15, 7, 1]
  });

  useEffect(() => {
    loadInsurance();
    loadVehicles();
  }, [activeShowroomId]);

  const loadInsurance = async () => {
    setIsLoading(true);
    try {
      const data = await api.getInsurance(activeShowroomId);
      setPolicies(data);
    } catch (err) {
      console.error('Failed to load insurance policies', err);
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
    setFormData({
      vehicleId: defaultVehicle?.id || '',
      policyNumber: `POL-${Date.now().toString().slice(-7)}`,
      insuranceProvider: 'ICICI Lombard General Insurance',
      policyType: 'COMPREHENSIVE',
      startDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      premiumAmount: 16800,
      idvAmount: 1050000,
      hasZeroDep: true,
      reminderDaysBefore: [30, 15, 7, 1]
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicleId || !formData.policyNumber.trim()) {
      showToast('error', 'Validation Error', 'Vehicle and Policy Number are required.');
      return;
    }

    try {
      await api.createInsurance(formData);
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
      showToast('success', 'Policy Registered', 'Insurance policy saved and linked to vehicle expiry tracker.');
      setIsModalOpen(false);
      await loadInsurance();
      await loadVehicles();
      await refreshStats();
    } catch (err: any) {
      showToast('error', 'Failed', err.message || 'Could not save insurance policy');
    }
  };

  const handleRenewPrompt = (policy: any) => {
    const today = new Date().toISOString().split('T')[0];
    const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setFormData({
      vehicleId: policy.vehicleId,
      policyNumber: `RNW-${policy.policyNumber.slice(-6)}-27`,
      insuranceProvider: policy.insuranceProvider,
      policyType: policy.policyType,
      startDate: today,
      expiryDate: nextYear,
      premiumAmount: policy.premiumAmount,
      idvAmount: Math.round(policy.idvAmount * 0.9), // 10% depreciation
      hasZeroDep: policy.hasZeroDep,
      reminderDaysBefore: [30, 15, 7, 1]
    });
    setIsModalOpen(true);
  };

  const getDaysLeft = (expiryDate: string) => {
    const now = Date.now();
    const target = new Date(expiryDate).getTime();
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  };

  const filtered = policies.filter(p =>
    p.vehicleReg?.toLowerCase().includes(search.toLowerCase()) ||
    p.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    p.policyNumber.toLowerCase().includes(search.toLowerCase()) ||
    p.insuranceProvider.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-outfit tracking-tight">
            Motor Insurance Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track policy expiries, Zero-Depreciation coverage, IDV valuations, and automated renewal reminders
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-purple-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Policy</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by vehicle registration, policy number, insurance provider, or customer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Policies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">
            Loading insurance policies...
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
            No insurance policies found matching your search.
          </div>
        ) : (
          filtered.map(p => {
            const daysLeft = getDaysLeft(p.expiryDate);
            const isExpiring = daysLeft <= 30 && daysLeft >= 0;
            const isExpired = daysLeft < 0;

            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Vehicle Reg & Policy Type */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="bg-slate-900 text-white font-mono font-bold text-xs px-2.5 py-1 rounded-lg">
                      {p.vehicleReg}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {p.hasZeroDep && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          <span>0-Dep</span>
                        </span>
                      )}
                      <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                        {p.policyType}
                      </span>
                    </div>
                  </div>

                  {/* Provider & Owner */}
                  <div className="mt-3">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-purple-600 shrink-0" />
                      <span className="truncate">{p.insuranceProvider}</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">Policy #{p.policyNumber}</p>

                    <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Vehicle & Customer</span>
                      <span className="font-bold text-slate-800">{p.customerName}</span>
                      <span className="text-slate-500 text-[11px] block">{p.model}</span>
                    </div>
                  </div>

                  {/* Expiry & IDV Details */}
                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-slate-600 font-medium">Valid Until:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-900 font-bold">{p.expiryDate}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isExpired ? 'bg-rose-100 text-rose-700' :
                          isExpiring ? 'bg-amber-100 text-amber-800' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isExpired ? `${Math.abs(daysLeft)}d expired` : `${daysLeft}d left`}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-slate-400 block text-[10px]">Insured Value (IDV)</span>
                        <span className="font-bold text-slate-800 font-mono">₹{p.idvAmount.toLocaleString()}</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-slate-400 block text-[10px]">Annual Premium</span>
                        <span className="font-bold text-slate-800 font-mono">₹{p.premiumAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="text-[10px] text-slate-400 font-mono">
                    Auto-alerts at 30, 15, 7, 1d
                  </div>
                  <button
                    onClick={() => handleRenewPrompt(p)}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Renew Policy</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Policy Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900 max-h-[90vh] flex flex-col">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-sm">Register Motor Insurance Policy</h3>
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
                    Select Vehicle <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.vehicleId}
                    onChange={e => setFormData({ ...formData, vehicleId: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white font-medium"
                  >
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.registrationNumber} — {v.brand} {v.model}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Policy Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.policyNumber}
                    onChange={e => setFormData({ ...formData, policyNumber: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Insurance Provider</label>
                  <input
                    type="text"
                    required
                    value={formData.insuranceProvider}
                    onChange={e => setFormData({ ...formData, insuranceProvider: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Policy Type</label>
                  <select
                    value={formData.policyType}
                    onChange={e => setFormData({ ...formData, policyType: e.target.value as any })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                  >
                    <option value="COMPREHENSIVE">Comprehensive (Own Damage + 3rd Party)</option>
                    <option value="THIRD_PARTY">Third-Party Liability Only</option>
                    <option value="ZERO_DEPRECIATION">Bumper-to-Bumper Zero Dep</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Policy Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={formData.expiryDate}
                    onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Insured Declared Value (IDV ₹)</label>
                  <input
                    type="number"
                    value={formData.idvAmount}
                    onChange={e => setFormData({ ...formData, idvAmount: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Annual Premium (₹)</label>
                  <input
                    type="number"
                    value={formData.premiumAmount}
                    onChange={e => setFormData({ ...formData, premiumAmount: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none font-mono"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="zeroDep"
                    checked={formData.hasZeroDep}
                    onChange={e => setFormData({ ...formData, hasZeroDep: e.target.checked })}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor="zeroDep" className="font-semibold text-slate-800 select-none">
                    Includes Zero-Depreciation / Bumper-to-Bumper Add-on Rider
                  </label>
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
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-md shadow-purple-600/20"
                >
                  Save Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
