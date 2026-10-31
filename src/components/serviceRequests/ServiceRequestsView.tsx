import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { ServiceRequest } from '../../types';
import {
  CalendarCheck2,
  Car,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const ServiceRequestsView: React.FC = () => {
  const { activeShowroomId } = useAuth();
  const { showToast, setActiveTab } = useApp();

  const [requests, setRequests] = useState<(ServiceRequest & { customerName: string; customerPhone: string; customerEmail: string; vehicleReg: string; vehicleModel: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, [activeShowroomId]);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const data = await api.getServiceRequests(activeShowroomId);
      setRequests(data);
    } catch (err) {
      console.error('Failed to load service requests', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await api.updateServiceRequestStatus(id, status);
      if (status === 'CONFIRMED') {
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
        showToast('success', 'Appointment Confirmed', 'Service slot confirmed and customer notified via SMS/Email.');
      } else {
        showToast('info', 'Status Updated', `Booking request marked as ${status}.`);
      }
      await loadRequests();
    } catch (err) {
      showToast('error', 'Error', 'Failed to update request');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 font-outfit tracking-tight">
          Customer Service Bookings & Requests
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Appointments and service slot requests placed by customers via the RemindMe Customer Portal
        </p>
      </div>

      {/* Grid of Requests */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">
            Loading appointment requests...
          </div>
        ) : requests.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
            No service requests pending at this time.
          </div>
        ) : (
          requests.map(r => (
            <div
              key={r.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="bg-[#262B33] text-white font-mono font-bold text-xs px-2.5 py-1 rounded-lg">
                    {r.vehicleReg}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    r.status === 'PENDING' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                    r.status === 'CONFIRMED' ? 'bg-[#FFF3EC] text-[#D95D1E] border border-[#FCD4BE]' :
                    r.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {r.status}
                  </span>
                </div>

                {/* Customer & Vehicle */}
                <div className="mt-3">
                  <h3 className="font-bold text-slate-900 text-sm">{r.customerName}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{r.customerPhone}</span>
                  </div>

                  <div className="mt-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Vehicle</span>
                    <span className="font-bold text-slate-800">{r.vehicleModel}</span>
                  </div>
                </div>

                {/* Request Details */}
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#FFF3EC]/80 border border-[#FCD4BE] text-slate-900">
                    <div className="flex items-center gap-1.5 font-medium text-[#D95D1E]">
                      <Calendar className="w-3.5 h-3.5 text-[#F07836]" />
                      <span>Preferred Slot:</span>
                    </div>
                    <span className="font-bold font-mono text-[#D95D1E]">{r.preferredDate}</span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-slate-700">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Service Type Requested</span>
                    <span className="font-semibold text-slate-900">{r.serviceType}</span>
                  </div>

                  {r.notes && (
                    <p className="text-[11px] text-slate-500 italic px-1 pt-1">
                      "{r.notes}"
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                {r.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus(r.id, 'CANCELLED')}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(r.id, 'CONFIRMED')}
                      className="px-3.5 py-1.5 rounded-xl bg-[#F07836] hover:bg-[#E06725] text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm Slot</span>
                    </button>
                  </>
                )}

                {r.status === 'CONFIRMED' && (
                  <button
                    onClick={() => setActiveTab('services')}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1"
                  >
                    <span>Open Job Card in Bay &rarr;</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
