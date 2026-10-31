import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Reminder, Notification, Vehicle, ServiceRecord, InsurancePolicy } from '../../types';
import {
  Users,
  Car,
  Wrench,
  ShieldAlert,
  Clock,
  Mail,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  Send,
  Sparkles,
  Fuel,
  FileCheck2,
  Inbox
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export const DashboardView: React.FC = () => {
  const { stats, refreshStats, setActiveTab, openMessagePreview } = useApp();
  const { activeShowroomId, user } = useAuth();

  const [urgentReminders, setUrgentReminders] = useState<Reminder[]>([]);
  const [recentNotifs, setRecentNotifs] = useState<Notification[]>([]);
  const [vehiclesList, setVehiclesList] = useState<Vehicle[]>([]);
  const [servicesList, setServicesList] = useState<ServiceRecord[]>([]);
  const [insuranceList, setInsuranceList] = useState<InsurancePolicy[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadDashboardData();
  }, [activeShowroomId]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [remindersData, notifsData, vehiclesData, servicesData, insuranceData] = await Promise.all([
        api.getReminders({ showroomId: activeShowroomId }),
        api.getNotifications(activeShowroomId),
        api.getVehicles({ showroomId: activeShowroomId }),
        api.getServices({ showroomId: activeShowroomId }),
        api.getInsurance(activeShowroomId)
      ]);

      // Filter urgent: Overdue or Due Today or within 7 days
      const urgent = remindersData.filter((r: Reminder) =>
        r.status === 'OVERDUE' || r.status === 'DUE_TODAY' || (r.status === 'UPCOMING' && r.targetDaysBefore <= 7)
      );
      setUrgentReminders(urgent.slice(0, 6));
      setRecentNotifs(notifsData.slice(0, 6));
      setVehiclesList(vehiclesData);
      setServicesList(servicesData);
      setInsuranceList(insuranceData);
    } catch (err) {
      console.error('Error loading dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickResend = async (reminderId: string) => {
    try {
      await api.resendReminderNotification(reminderId, 'ALL');
      await refreshStats();
      await loadDashboardData();
    } catch (err) {
      console.error('Failed to resend reminder', err);
    }
  };

  // Fuel data for Chart
  const fuelStats = [
    { name: 'Petrol', count: vehiclesList.filter(v => v.fuelType === 'PETROL').length, color: '#F07836' },
    { name: 'Diesel', count: vehiclesList.filter(v => v.fuelType === 'DIESEL').length, color: '#262B33' },
    { name: 'Electric', count: vehiclesList.filter(v => v.fuelType === 'ELECTRIC').length, color: '#10b981' },
    { name: 'Hybrid', count: vehiclesList.filter(v => v.fuelType === 'HYBRID').length, color: '#f59e0b' },
    { name: 'CNG', count: vehiclesList.filter(v => v.fuelType === 'CNG').length, color: '#8b5cf6' }
  ].filter(f => f.count > 0);

  // Dynamic calculation for Monthly Service & Renewal Trend
  const getDynamicMonthlyData = () => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const result = [];

    // Last 6 months up to current
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const yr = d.getFullYear();
      const mName = monthNames[mIdx];
      const mLabel = i === 0 ? `${mName} (Current)` : mName;

      // Count services in this month
      const sCount = servicesList.filter(s => {
        const sd = new Date(s.serviceDate);
        return sd.getMonth() === mIdx && sd.getFullYear() === yr;
      }).length;

      // Count insurance policies in this month
      const iCount = insuranceList.filter(ins => {
        const id = new Date(ins.startDate);
        return id.getMonth() === mIdx && id.getFullYear() === yr;
      }).length;

      result.push({
        month: mLabel,
        services: sCount,
        renewals: iCount
      });
    }
    return result;
  };

  const monthlyData = getDynamicMonthlyData();

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner with Greetings & Quick Actions */}
      <div className="bg-gradient-to-r from-[#262B33] via-[#1E2229] to-[#262B33] rounded-2xl p-6 text-white shadow-xl relative overflow-hidden border border-[#3E4551]">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#F07836] uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4 text-[#F07836]" />
              <span>Dealership Operations Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-outfit tracking-tight">
              Welcome, {user?.name || 'Employee'}
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Automated reminder tracking active. Monitoring vehicle servicing schedules, motor insurance renewals, and PUC certificate expiries.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setActiveTab('customers')}
              className="px-4 py-2.5 rounded-xl bg-[#F07836] hover:bg-[#E06725] text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#F07836]/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Customer</span>
            </button>

            <button
              onClick={() => setActiveTab('vehicles')}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Car className="w-4 h-4 text-[#F07836]" />
              <span>Register Vehicle</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Customers */}
        <div
          onClick={() => setActiveTab('customers')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Customers</span>
            <div className="w-9 h-9 rounded-xl bg-[#FFF3EC] text-[#F07836] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900">{stats?.totalCustomers ?? 0}</span>
            <span className="text-[11px] font-medium text-slate-500 flex items-center">Directory</span>
          </div>
        </div>

        {/* Total Vehicles */}
        <div
          onClick={() => setActiveTab('vehicles')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Registered Vehicles</span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-[#262B33] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900">{stats?.totalVehicles ?? 0}</span>
            <span className="text-[11px] font-medium text-[#262B33]">Tracked</span>
          </div>
        </div>

        {/* Overdue Reminders */}
        <div
          onClick={() => setActiveTab('reminders')}
          className={`p-5 rounded-2xl border shadow-sm hover:shadow-md transition-all cursor-pointer group ${
            (stats?.overdueReminders || 0) > 0
              ? 'bg-rose-50/70 border-rose-200 text-rose-900'
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${(stats?.overdueReminders || 0) > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
              Overdue Reminders
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              (stats?.overdueReminders || 0) > 0 ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-100 text-slate-600'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold">{stats?.overdueReminders ?? 0}</span>
            <span className={`text-[11px] font-bold ${(stats?.overdueReminders || 0) > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
              {(stats?.overdueReminders || 0) > 0 ? 'Requires Action' : 'All Clear'}
            </span>
          </div>
        </div>

        {/* Notifications Dispatched */}
        <div
          onClick={() => setActiveTab('notifications')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Alerts Delivered</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Mail className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900">{stats?.notificationsSent ?? 0}</span>
            <span className="text-[11px] font-medium text-emerald-600">SMS & Email</span>
          </div>
        </div>
      </div>

      {/* Secondary Status Badges Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div
          onClick={() => setActiveTab('services')}
          className="bg-amber-50/80 border border-amber-200 p-4 rounded-xl flex items-center justify-between cursor-pointer hover:bg-amber-100/60 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-amber-900">Service Due Soon (&le;30 Days)</div>
              <div className="text-lg font-extrabold text-amber-950">{stats?.serviceDueSoon ?? 0} Vehicles</div>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-amber-700" />
        </div>

        <div
          onClick={() => setActiveTab('insurance')}
          className="bg-purple-50/80 border border-purple-200 p-4 rounded-xl flex items-center justify-between cursor-pointer hover:bg-purple-100/60 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-purple-900">Insurance Expiring (&le;30 Days)</div>
              <div className="text-lg font-extrabold text-purple-950">{stats?.insuranceExpiringSoon ?? 0} Policies</div>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-purple-700" />
        </div>

        <div
          onClick={() => setActiveTab('documents')}
          className="bg-teal-50/80 border border-teal-200 p-4 rounded-xl flex items-center justify-between cursor-pointer hover:bg-teal-100/60 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-teal-900">PUC Expiring (&le;30 Days)</div>
              <div className="text-lg font-extrabold text-teal-950">{stats?.pucExpiringSoon ?? 0} Documents</div>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-teal-700" />
        </div>
      </div>

      {/* Two Column Layout: Urgent Action Center & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Urgent Attention & Due Soon Vehicles */}
        <div className="lg:col-span-2 space-y-6">
          {/* Urgent Reminders Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${urgentReminders.length > 0 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                <h3 className="text-base font-bold text-slate-900">Urgent Due Dates & Reminders</h3>
              </div>
              <button
                onClick={() => setActiveTab('reminders')}
                className="text-xs font-semibold text-[#F07836] hover:text-[#E06725] flex items-center gap-1 cursor-pointer"
              >
                <span>View All ({stats?.upcomingRemindersCount ?? 0})</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {urgentReminders.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <Inbox className="w-5 h-5" />
                  </div>
                  <p className="font-medium text-slate-600">No overdue or pending urgent reminders.</p>
                  <p className="text-slate-400 max-w-sm">
                    When you enter customer vehicles and their maintenance/insurance dates, urgent alerts will appear here automatically.
                  </p>
                  <button
                    onClick={() => setActiveTab('vehicles')}
                    className="mt-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors cursor-pointer"
                  >
                    + Register First Vehicle
                  </button>
                </div>
              ) : (
                urgentReminders.map(rem => {
                  const isOverdue = rem.status === 'OVERDUE';
                  const isService = rem.category === 'SERVICE';
                  const isInsurance = rem.category === 'INSURANCE';

                  return (
                    <div key={rem.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 -mx-2 px-2 rounded-xl transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          isOverdue ? 'bg-rose-100 text-rose-700' :
                          isService ? 'bg-amber-100 text-amber-700' :
                          isInsurance ? 'bg-purple-100 text-purple-700' :
                          'bg-[#FFF3EC] text-[#D95D1E]'
                        }`}>
                          {isService && <Wrench className="w-4 h-4" />}
                          {isInsurance && <ShieldAlert className="w-4 h-4" />}
                          {!isService && !isInsurance && <Clock className="w-4 h-4" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-900">{rem.title}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isOverdue ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {rem.dueDate}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Customer: <span className="font-medium text-slate-700">{(rem as any).customerName}</span> &bull; Tel: <span className="font-mono text-slate-600">{(rem as any).customerPhone}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          onClick={() => handleQuickResend(rem.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#FFF3EC] hover:bg-[#FFE6D8] text-[#D95D1E] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Send instant notification"
                        >
                          <Send className="w-3 h-3" />
                          <span>Dispatch Alert</span>
                        </button>

                        <button
                          onClick={() => setActiveTab('services')}
                          className="px-2.5 py-1.5 rounded-lg bg-[#262B33] hover:bg-[#1E2229] text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Mark Done
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Monthly Service & Renewal Trend Chart */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Monthly Service & Renewal Trend</h3>
                <p className="text-xs text-slate-500">Service completions vs. Insurance policy renewals (Dynamically Calculated)</p>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                FY {new Date().getFullYear()}-{new Date().getFullYear() + 1}
              </span>
            </div>

            <div className="h-64 mt-4 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#262B33', borderColor: '#3E4551', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="services" name="Periodic Services" fill="#F07836" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="renewals" name="Insurance Renewals" fill="#262B33" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Fleet Distribution & Live Notification Feed */}
        <div className="space-y-6">
          {/* Fuel Fleet Distribution */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-900">Fleet by Fuel Type</h3>
            <p className="text-xs text-slate-500 mb-2">Registered customer powertrain portfolio</p>

            {fuelStats.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <Fuel className="w-5 h-5" />
                </div>
                <p className="font-medium text-slate-600">Zero vehicles registered in database.</p>
                <p className="text-slate-400 max-w-xs">
                  Register vehicles to view real-time powertrain breakdown across Petrol, Diesel, EV, CNG, and Hybrids.
                </p>
                <button
                  onClick={() => setActiveTab('vehicles')}
                  className="mt-1 px-3 py-1.5 rounded-lg bg-[#FFF3EC] text-[#D95D1E] font-semibold hover:bg-[#FFE6D8] transition-colors cursor-pointer"
                >
                  + Add Vehicle
                </button>
              </div>
            ) : (
              <>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={fuelStats}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={65}
                        paddingAngle={4}
                      >
                        {fuelStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#262B33', borderColor: '#3E4551', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  {fuelStats.map(f => (
                    <div key={f.name} className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: f.color }}></span>
                      <span className="font-medium truncate">{f.name}:</span>
                      <span className="font-bold text-slate-900 ml-auto">{f.count}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Recent Notification Activity Stream */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Recent Customer Alerts</h3>
              <button
                onClick={() => setActiveTab('notifications')}
                className="text-[11px] font-semibold text-[#F07836] hover:text-[#E06725] hover:underline cursor-pointer"
              >
                Full Log &rarr;
              </button>
            </div>

            <div className="space-y-3 mt-3">
              {recentNotifs.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-1">
                  <Mail className="w-6 h-6 text-slate-300 mb-1" />
                  <p className="font-medium text-slate-600">No alerts dispatched yet.</p>
                  <p className="text-slate-400 text-[11px]">
                    Dispatched notifications and gateway logs will appear here.
                  </p>
                </div>
              ) : (
                recentNotifs.map(notif => (
                  <div
                    key={notif.id}
                    onClick={() => openMessagePreview({
                      channel: notif.channel,
                      recipient: notif.recipient,
                      subject: notif.subject,
                      message: notif.message,
                      deliveryNotes: notif.deliveryNotes
                    })}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-[#FFF3EC]/50 hover:border-[#FCD4BE] transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-semibold text-slate-800 truncate max-w-[140px]">
                        {(notif as any).customerName || notif.recipient}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(notif.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 font-medium truncate group-hover:text-[#F07836]">
                      {notif.subject}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px]">
                      <span className={`px-1.5 py-0.5 rounded font-mono font-bold ${
                        notif.channel === 'EMAIL' ? 'bg-[#FFF3EC] text-[#D95D1E]' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {notif.channel}
                      </span>
                      <span className="text-slate-500 font-mono text-[9px]">View Message</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
