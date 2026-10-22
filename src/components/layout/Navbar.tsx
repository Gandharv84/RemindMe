import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import {
  Bell,
  Menu,
  X,
  Car,
  LogOut,
  User
} from 'lucide-react';

interface NavbarProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, isSidebarOpen }) => {
  const { user, logout, isCustomer } = useAuth();
  const { stats, setActiveTab } = useApp();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const employeeDisplayName = user?.name || 'Employee';

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      <div className="px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand & Mobile Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            aria-label="Toggle menu"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div
            onClick={() => setActiveTab(isCustomer ? 'customerPortal' : 'dashboard')}
            className="flex items-center gap-2.5 cursor-pointer select-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-outfit font-extrabold text-lg text-slate-900 tracking-tight">RemindMe</span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Vehicle Service & Insurance Reminder System
              </p>
            </div>
          </div>
        </div>

        {/* Right: Notifications, Employee Profile, Logout */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Notifications Shortcut */}
          <button
            onClick={() => setActiveTab(isCustomer ? 'customerPortal' : 'notifications')}
            className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            title="Notification History"
          >
            <Bell className="w-5 h-5" />
            {stats && stats.notificationsSent > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white"></span>
            )}
          </button>

          {/* User Profile Pill & Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl hover:bg-slate-100 border border-slate-200 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                {employeeDisplayName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[130px]">
                  {employeeDisplayName}
                </div>
                <div className="text-[10px] font-medium text-slate-500 capitalize">
                  {user?.designation || (user?.role === 'CUSTOMER' ? 'Customer' : 'Employee')}
                </div>
              </div>
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-40">
                <div className="p-3 border-b border-slate-100 bg-slate-50 rounded-xl mb-1">
                  <div className="text-xs font-bold text-slate-900">{employeeDisplayName}</div>
                  {user?.email && <div className="text-[11px] text-slate-500 truncate">{user.email}</div>}
                  {user?.designation && (
                    <div className="text-[10px] text-slate-400 mt-0.5">{user.designation}</div>
                  )}
                </div>

                <button
                  onClick={() => {
                    logout();
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 transition-colors mt-1"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
