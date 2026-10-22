import React from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Car,
  Wrench,
  ShieldCheck,
  FileText,
  BellRing,
  Mail,
  CalendarCheck2
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { activeTab, setActiveTab, stats } = useApp();
  const { isCustomer } = useAuth();

  const employeeNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Customers', icon: Users, badge: stats?.totalCustomers },
    { id: 'vehicles', label: 'Vehicles', icon: Car, badge: stats?.totalVehicles },
    { id: 'services', label: 'Service Records', icon: Wrench },
    { id: 'insurance', label: 'Insurance Policies', icon: ShieldCheck, alert: (stats?.insuranceExpiringSoon || 0) > 0 },
    { id: 'documents', label: 'PUC & Documents', icon: FileText },
    {
      id: 'reminders',
      label: 'Reminders',
      icon: BellRing,
      badge: stats?.upcomingRemindersCount,
      overdueBadge: stats?.overdueReminders
    },
    { id: 'notifications', label: 'Notification Logs', icon: Mail, badge: stats?.notificationsSent },
    { id: 'serviceRequests', label: 'Service Requests', icon: CalendarCheck2 }
  ];

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 border-r border-slate-800
        flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Top Brand */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-outfit font-extrabold text-white text-base tracking-tight leading-none">RemindMe</h2>
              <p className="text-[11px] text-slate-400 mt-1">
                Vehicle Service & Insurance
              </p>
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {isCustomer ? (
            <div className="space-y-1">
              <button
                onClick={() => handleNavClick('customerPortal')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'customerPortal'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Car className="w-4 h-4" />
                <span>My Vehicles & Due Dates</span>
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Menu
              </div>
              {employeeNavItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                      isActive
                        ? 'bg-blue-600 text-white font-semibold shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.overdueBadge !== undefined && item.overdueBadge > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                          {item.overdueBadge}
                        </span>
                      )}
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          isActive ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800/80 text-[11px] text-slate-400 bg-slate-950/40">
          <div className="font-semibold text-slate-300">RemindMe System</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Vehicle Service & Insurance Reminder</div>
        </div>
      </aside>
    </>
  );
};
