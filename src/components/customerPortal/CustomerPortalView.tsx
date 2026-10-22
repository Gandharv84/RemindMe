import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { Customer, Vehicle, ServiceRecord, InsurancePolicy, VehicleDocument, Reminder } from '../../types';
import {
  Car,
  Wrench,
  ShieldCheck,
  FileText,
  Calendar,
  Clock,
  AlertTriangle,
  Plus,
  CheckCircle2,
  ChevronRight,
  Phone,
  Building2,
  Sparkles,
  X,
  Gauge,
  Send
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const CustomerPortalView: React.FC = () => {
  const { user } = useAuth();
  const { showToast, refreshStats } = useApp();

  const [customerData, setCustomerData] = useState<{
    customer: Customer;
    vehicles: Vehicle[];
    services: ServiceRecord[];
    insurancePolicies: InsurancePolicy[];
    documents: VehicleDocument[];
    reminders: Reminder[];
  } | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Booking Modal
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingDate, setBookingDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const [serviceType, setServiceType] = useState('PERIODIC_MAINTENANCE');
  const [notes, setNotes] = useState('Please check front wheel brake noise and AC cooling.');

  useEffect(() => {
    if (user?.id) {
      loadCustomerPortal(user.id);
    }
  }, [user]);

  const loadCustomerPortal = async (customerId: string) => {
    setIsLoading(true);
    try {
      const data = await api.getCustomerPortalData(customerId);
      setCustomerData(data);
      if (data.vehicles && data.vehicles.length > 0) {
        setSelectedVehicle(data.vehicles[0]);
      }
    } catch (err) {
      console.error('Failed to load customer portal', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle || !user) return;

    try {
      await api.requestService({
        vehicleId: selectedVehicle.id,
        preferredDate: bookingDate,
        serviceType,
        notes
      });
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      showToast('success', 'Service Slot Requested', 'Dealership service team notified. You will receive a confirmation SMS shortly.');
      setIsBookingModalOpen(false);
      await loadCustomerPortal(user.id);
    } catch (err: any) {
      showToast('error', 'Booking Failed', err.message || 'Could not submit request');
    }
  };

  const getDaysDiff = (dateStr?: string) => {
    if (!dateStr) return null;
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const target = new Date(`${dateStr}T00:00:00`).getTime();
    return Math.round((target - startOfToday) / (1000 * 60 * 60 * 24));
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-slate-400 text-xs">
        Loading your vehicle garage & due dates...
      </div>
    );
  }

  if (!customerData) {
    return (
      <div className="py-20 text-center text-slate-400 text-xs">
        Customer profile not found.
      </div>
    );
  }

  const vehicleServices = customerData.services.filter(s => s.vehicleId === selectedVehicle?.id);
  const vehicleInsurance = customerData.insurancePolicies.filter(i => i.vehicleId === selectedVehicle?.id);
  const vehicleDocs = customerData.documents.filter(d => d.vehicleId === selectedVehicle?.id);
  const vehicleReminders = customerData.reminders.filter(r => r.vehicleId === selectedVehicle?.id && r.status !== 'COMPLETED');

  const serviceDiff = getDaysDiff(selectedVehicle?.nextServiceDate);
  const insuranceDiff = getDaysDiff(selectedVehicle?.insuranceExpiryDate);
  const pucDiff = getDaysDiff(selectedVehicle?.pucExpiryDate);

  return (
    <div className="space-y-6 pb-12">
      {/* Customer Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-emerald-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>RemindMe Customer Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-outfit tracking-tight">
              Hello, {customerData.customer.name}
            </h1>
            <p className="text-emerald-200/80 text-sm mt-1 max-w-xl">
              Track your vehicle's health status, upcoming service intervals, insurance renewals, and DigiLocker documents.
            </p>
          </div>

          <button
            onClick={() => setIsBookingModalOpen(true)}
            className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all self-start md:self-auto"
          >
            <Calendar className="w-4 h-4" />
            <span>Book Service Appointment</span>
          </button>
        </div>
      </div>

      {/* Vehicle Selector (if multiple vehicles) */}
      {customerData.vehicles.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-slate-500 mr-1">My Garage:</span>
          {customerData.vehicles.map(v => (
            <button
              key={v.id}
              onClick={() => setSelectedVehicle(v)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                selectedVehicle?.id === v.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Car className="w-4 h-4" />
              <span>{v.registrationNumber} ({v.model})</span>
            </button>
          ))}
        </div>
      )}

      {selectedVehicle && (
        <>
          {/* Main Vehicle Hero Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
              {/* Vehicle Title & Reg */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                  <Car className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-slate-900 text-white font-mono font-extrabold text-sm px-3 py-1 rounded-lg">
                      {selectedVehicle.registrationNumber}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {selectedVehicle.fuelType}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {selectedVehicle.transmission}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mt-1.5 font-outfit">
                    {selectedVehicle.brand} {selectedVehicle.model}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {selectedVehicle.variant} &bull; Model Year {selectedVehicle.yearOfManufacture} &bull; {selectedVehicle.color}
                  </p>
                </div>
              </div>

              {/* Odometer & Quick Booking */}
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[11px] text-slate-400 block font-semibold">Current Odometer</span>
                  <span className="text-lg font-mono font-extrabold text-slate-900">
                    {selectedVehicle.odometerReading.toLocaleString()} km
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-200"></div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-semibold">Service Dealership</span>
                  <span className="text-xs font-bold text-blue-700">Authorized Service Center</span>
                </div>
              </div>
            </div>

            {/* Critical Due Dates 3-Column Strip */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {/* 1. Periodic Service */}
              <div className={`p-4 rounded-xl border ${
                serviceDiff !== null && serviceDiff < 0
                  ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                  : 'bg-amber-50/60 border-amber-200 text-amber-950'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Wrench className="w-4 h-4 text-amber-600" />
                    Periodic Service
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    serviceDiff !== null && serviceDiff < 0 ? 'bg-rose-600 text-white' : 'bg-amber-200 text-amber-900'
                  }`}>
                    {serviceDiff !== null && serviceDiff < 0 ? `${Math.abs(serviceDiff)}d OVERDUE` : `${serviceDiff}d left`}
                  </span>
                </div>
                <div className="mt-3">
                  <span className="text-lg font-extrabold font-mono">{selectedVehicle.nextServiceDate || 'Not Scheduled'}</span>
                  <p className="text-[11px] text-slate-600 mt-0.5">Recommended at 10,000 km or 6-month interval</p>
                </div>
              </div>

              {/* 2. Motor Insurance Policy */}
              <div className={`p-4 rounded-xl border ${
                insuranceDiff !== null && insuranceDiff < 0
                  ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                  : 'bg-purple-50/60 border-purple-200 text-purple-950'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    Insurance Policy
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    insuranceDiff !== null && insuranceDiff < 0 ? 'bg-rose-600 text-white' : 'bg-purple-200 text-purple-900'
                  }`}>
                    {insuranceDiff !== null && insuranceDiff < 0 ? 'EXPIRED' : `${insuranceDiff}d left`}
                  </span>
                </div>
                <div className="mt-3">
                  <span className="text-lg font-extrabold font-mono">{selectedVehicle.insuranceExpiryDate || 'Not Found'}</span>
                  <p className="text-[11px] text-slate-600 mt-0.5">Comprehensive + Zero-Depreciation cover</p>
                </div>
              </div>

              {/* 3. PUC Certificate */}
              <div className="p-4 rounded-xl border bg-teal-50/60 border-teal-200 text-teal-950">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-teal-600" />
                    PUC Certificate
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-200 text-teal-900">
                    {pucDiff !== null && pucDiff >= 0 ? `${pucDiff}d left` : 'Valid'}
                  </span>
                </div>
                <div className="mt-3">
                  <span className="text-lg font-extrabold font-mono">{selectedVehicle.pucExpiryDate || 'Valid'}</span>
                  <p className="text-[11px] text-slate-600 mt-0.5">DigiLocker RTO verified</p>
                </div>
              </div>
            </div>
          </div>

          {/* Two Columns: Service History Timeline & Pending Reminders */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Service History Timeline */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-blue-600" />
                <span>Service History & Work Invoices</span>
              </h3>

              <div className="space-y-3">
                {vehicleServices.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    No past service records logged yet.
                  </div>
                ) : (
                  vehicleServices.map(s => (
                    <div key={s.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 capitalize">
                          {s.serviceType.replace('_', ' ').toLowerCase()}
                        </span>
                        <span className="font-mono font-bold text-slate-900">₹{s.cost.toLocaleString()}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center justify-between">
                        <span>Date: {s.serviceDate} &bull; Odo: {s.odometerReading.toLocaleString()} km</span>
                        <span className="font-mono text-[10px] text-slate-400">{s.invoiceNumber}</span>
                      </div>
                      {s.advisorNotes && (
                        <p className="text-[11px] text-slate-600 pt-1 border-t border-slate-200/60 leading-relaxed">
                          {s.advisorNotes}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Active Reminders & Dealership Contact */}
            <div className="space-y-6">
              {/* Active Reminders */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>Scheduled Reminders for Your Vehicle</span>
                </h3>

                <div className="space-y-2.5">
                  {vehicleReminders.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs">
                      All due dates are up to date! No pending alerts.
                    </div>
                  ) : (
                    vehicleReminders.map(r => (
                      <div key={r.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900">{r.title}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            r.status === 'OVERDUE' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            Due: {r.dueDate}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1">{r.description}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Dealership Helpdesk Card */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Need Roadside Assistance or Service?</h4>
                    <p className="text-xs text-slate-400">Dealership Service Reception &bull; Service Desk</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-mono flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    +91 20 2555 8899
                  </span>
                  <button
                    onClick={() => setIsBookingModalOpen(true)}
                    className="text-blue-400 font-semibold hover:underline"
                  >
                    Request Slot &rarr;
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {!selectedVehicle && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
            <Car className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Vehicles Registered Under Your Profile</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Your account does not currently have any vehicles registered in the dealership records. Please contact your dealership service advisor to link your vehicle registration.
          </p>
        </div>
      )}

      {/* Book Service Modal */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden text-slate-900">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Book Service Slot / Callback</h3>
              </div>
              <button
                onClick={() => setIsBookingModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBookService} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vehicle</label>
                <input
                  type="text"
                  disabled
                  value={`${selectedVehicle?.registrationNumber} (${selectedVehicle?.brand} ${selectedVehicle?.model})`}
                  className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl font-mono text-slate-700 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Service Type</label>
                <select
                  value={serviceType}
                  onChange={e => setServiceType(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                >
                  <option value="PERIODIC_MAINTENANCE">Periodic Maintenance (General Service)</option>
                  <option value="BRAKE_SERVICE">Running Repairs / Brake Inspection</option>
                  <option value="AC_SERVICE">AC Cooling / Gas Refill</option>
                  <option value="WHEEL_ALIGNMENT">Wheel Alignment & Balancing</option>
                  <option value="INSURANCE_ASSISTANCE">Insurance Renewal Assistance</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Preferred Appointment Date</label>
                <input
                  type="date"
                  required
                  value={bookingDate}
                  onChange={e => setBookingDate(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Specific Symptoms / Notes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBookingModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-600/20"
                >
                  Confirm Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
