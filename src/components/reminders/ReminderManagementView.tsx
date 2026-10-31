import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { Reminder, Vehicle } from '../../types';
import {
  BellRing,
  Plus,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Wrench,
  ShieldAlert,
  FileText,
  RefreshCw,
  X,
  Search,
  Filter,
  ChevronRight,
  Eye
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const ReminderManagementView: React.FC = () => {
  const { activeShowroomId } = useAuth();
  const {
    showToast,
    refreshStats,
    openMessagePreview,
    stats
  } = useApp();

  const [reminders, setReminders] = useState<(Reminder & { vehicleReg: string; vehicleModel: string; customerName: string; customerPhone: string; customerEmail: string })[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeStatusTab, setActiveStatusTab] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    vehicleId: '',
    category: 'SERVICE' as any,
    title: '6-Month Periodic Maintenance Reminder',
    description: 'Vehicle is due for routine engine oil replacement, brake inspection, and general servicing.',
    dueDate: '2026-09-10',
    targetDaysBefore: 15,
    channel: 'ALL' as any,
    priority: 'HIGH' as any
  });

  useEffect(() => {
    loadReminders();
    loadVehicles();
  }, [activeShowroomId, activeStatusTab, categoryFilter]);

  const loadReminders = async () => {
    setIsLoading(true);
    try {
      const data = await api.getReminders({
        showroomId: activeShowroomId,
        status: activeStatusTab === 'ALL' ? undefined : activeStatusTab,
        category: categoryFilter === 'ALL' ? undefined : categoryFilter
      });
      setReminders(data);
    } catch (err) {
      console.error('Failed to load reminders', err);
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

  const handleDispatchNotification = async (reminder: any) => {
    try {
      const result = await api.resendReminderNotification(reminder.id, reminder.channel || 'ALL');
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
      showToast(
        'success',
        'Notification Dispatched',
        `Demo ${reminder.channel} reminder alert delivered to ${reminder.customerName} (${reminder.customerPhone}).`
      );
      await loadReminders();
      await refreshStats();

      // Automatically preview the dispatched message
      if (result.notification) {
        openMessagePreview({
          channel: result.notification.channel,
          recipient: result.notification.recipient,
          subject: result.notification.subject,
          message: result.notification.message,
          deliveryNotes: result.notification.deliveryNotes
        });
      }
    } catch (err: any) {
      showToast('error', 'Dispatch Failed', err.message || 'Could not send notification');
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await api.updateReminderStatus(id, newStatus);
      showToast('info', 'Status Updated', `Reminder marked as ${newStatus}.`);
      await loadReminders();
      await refreshStats();
    } catch (err) {
      showToast('error', 'Error', 'Failed to update reminder status');
    }
  };

  const handleSaveReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicleId || !formData.title.trim()) {
      showToast('error', 'Validation Error', 'Vehicle and Title are required.');
      return;
    }

    try {
      const { channel: _channel, priority: _priority, ...reminderData } = formData;
      await api.createReminder({
        ...reminderData,
        showroomId: activeShowroomId
      });
      showToast('success', 'Reminder Created', 'Manual reminder scheduled successfully.');
      setIsModalOpen(false);
      await loadReminders();
      await refreshStats();
    } catch (err: any) {
      showToast('error', 'Failed', err.message || 'Could not create reminder');
    }
  };

  const filtered = reminders.filter(r =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.vehicleReg?.toLowerCase().includes(search.toLowerCase()) ||
    r.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    r.customerPhone?.includes(search)
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header with Engine Run Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-outfit tracking-tight">
            Reminders & Alerts
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time due date tracking, maintenance scheduling, and multi-channel notification dispatch
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#F07836] hover:bg-[#E06725] text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-[#F07836]/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Manual Reminder</span>
          </button>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'ALL', label: 'All Reminders', count: reminders.length },
            { id: 'OVERDUE', label: 'Overdue (Critical)', count: stats?.overdueReminders, alert: true },
            { id: 'DUE_TODAY', label: 'Due Today', count: reminders.filter(r => r.status === 'DUE_TODAY').length },
            { id: 'UPCOMING', label: 'Upcoming', count: stats?.upcomingRemindersCount },
            { id: 'COMPLETED', label: 'Completed', count: stats?.completedReminders }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveStatusTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeStatusTab === tab.id
                  ? tab.alert ? 'bg-rose-600 text-white shadow-xs' : 'bg-[#262B33] text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeStatusTab === tab.id ? 'bg-white/20 text-white font-bold' : 'bg-slate-200 text-slate-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pt-2 border-t border-slate-100">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by reminder title, vehicle registration, customer name, or phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F07836] focus:border-[#F07836] focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#F07836] focus:border-[#F07836]"
            >
              <option value="ALL">All Categories</option>
              <option value="SERVICE">Periodic Servicing</option>
              <option value="INSURANCE">Insurance Renewal</option>
              <option value="PUC">PUC Certificate</option>
              <option value="GENERAL">General Follow-ups</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reminders List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
            Scanning reminder queue...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
            No reminders found matching this view.
          </div>
        ) : (
          filtered.map(r => {
            const isOverdue = r.status === 'OVERDUE';
            const isDueToday = r.status === 'DUE_TODAY';
            const isCompleted = r.status === 'COMPLETED';

            return (
              <div
                key={r.id}
                className={`bg-white rounded-2xl border transition-all p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:shadow-md ${
                  isOverdue ? 'border-rose-200 bg-rose-50/20' :
                  isDueToday ? 'border-amber-200 bg-amber-50/20' :
                  'border-slate-200'
                }`}
              >
                {/* Left: Category Icon & Details */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    isOverdue ? 'bg-rose-100 text-rose-700' :
                    r.category === 'SERVICE' ? 'bg-[#FFF3EC] text-[#D95D1E] border border-[#FCD4BE]' :
                    r.category === 'INSURANCE' ? 'bg-purple-100 text-purple-700' :
                    'bg-teal-100 text-teal-700'
                  }`}>
                    {r.category === 'SERVICE' && <Wrench className="w-5 h-5 text-[#F07836]" />}
                    {r.category === 'INSURANCE' && <ShieldAlert className="w-5 h-5" />}
                    {r.category === 'PUC' && <FileText className="w-5 h-5" />}
                    {r.category === 'GENERAL' && <BellRing className="w-5 h-5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">{r.title}</span>

                      {/* Priority Tag */}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        r.priority === 'URGENT' ? 'bg-rose-100 text-rose-800' :
                        r.priority === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {r.priority}
                      </span>

                      {/* Status Tag */}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isOverdue ? 'bg-rose-600 text-white' :
                        isDueToday ? 'bg-amber-500 text-white' :
                        isCompleted ? 'bg-emerald-100 text-emerald-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {r.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{r.description}</p>

                    {/* Metadata strip */}
                    <div className="mt-2.5 flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                      <span className="bg-[#262B33] text-white font-mono font-bold px-2 py-0.5 rounded text-[10px]">
                        {r.vehicleReg}
                      </span>
                      <span className="font-semibold text-slate-700">{r.customerName}</span>
                      <span className="font-mono text-slate-600">{r.customerPhone}</span>
                      <span className="text-slate-400">&bull;</span>
                      <span className="font-semibold text-slate-800">Due Date: {r.dueDate}</span>
                      <span className="text-[#D95D1E] bg-[#FFF3EC] border border-[#FCD4BE] px-1.5 py-0.5 rounded font-mono text-[10px]">
                        {r.channel}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  {/* Dispatch Notification */}
                  <button
                    onClick={() => handleDispatchNotification(r)}
                    className="px-3 py-2 rounded-xl bg-[#F07836] hover:bg-[#E06725] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-[#F07836]/25 transition-all"
                    title="Send instant SMS/Email notification alert"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Alert</span>
                  </button>

                  {/* Status Dropdown */}
                  <select
                    value={r.status}
                    onChange={e => handleUpdateStatus(r.id, e.target.value)}
                    className="text-xs bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-800 font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="UPCOMING">Upcoming</option>
                    <option value="DUE_TODAY">Due Today</option>
                    <option value="OVERDUE">Overdue</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="DISMISSED">Dismissed</option>
                  </select>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Manual Add Reminder Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900 max-h-[90vh] flex flex-col">
            <div className="p-5 bg-[#262B33] text-white flex items-center justify-between border-b border-[#333944]">
              <div className="flex items-center gap-2.5">
                <BellRing className="w-5 h-5 text-[#F07836]" />
                <h3 className="font-bold text-sm">Schedule Manual Reminder</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReminder} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Select Target Vehicle <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.vehicleId}
                    onChange={e => setFormData({ ...formData, vehicleId: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F07836] focus:border-[#F07836] focus:outline-none bg-white font-medium"
                  >
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.registrationNumber} — {v.brand} {v.model}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F07836] focus:border-[#F07836] focus:outline-none bg-white"
                  >
                    <option value="SERVICE">Periodic Maintenance Service</option>
                    <option value="INSURANCE">Insurance Policy Expiry</option>
                    <option value="PUC">PUC Certificate Renewal</option>
                    <option value="GENERAL">General Dealership Follow-up</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority Level</label>
                  <select
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F07836] focus:border-[#F07836] focus:outline-none bg-white"
                  >
                    <option value="URGENT">Urgent / Critical</option>
                    <option value="HIGH">High Priority</option>
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="LOW">Low Priority</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Reminder Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F07836] focus:border-[#F07836] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Description / Message Template</label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F07836] focus:border-[#F07836] focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Due Date</label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F07836] focus:border-[#F07836] focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dispatch Channel</label>
                  <select
                    value={formData.channel}
                    onChange={e => setFormData({ ...formData, channel: e.target.value as any })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F07836] focus:border-[#F07836] focus:outline-none bg-white"
                  >
                    <option value="ALL">All (Email & SMS)</option>
                    <option value="SMS">SMS Only</option>
                    <option value="EMAIL">Email Only</option>
                  </select>
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
                  Schedule Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
