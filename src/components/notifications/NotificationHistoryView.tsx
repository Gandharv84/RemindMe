import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { Notification } from '../../types';
import {
  Mail,
  Smartphone,
  CheckCheck,
  Clock,
  Send,
  Search,
  Filter,
  Eye,
  Sparkles,
  Server,
  Building
} from 'lucide-react';

export const NotificationHistoryView: React.FC = () => {
  const { activeShowroomId } = useAuth();
  const { openMessagePreview, showToast } = useApp();

  const [notifications, setNotifications] = useState<(Notification & { vehicleReg: string; vehicleModel: string; customerName: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('ALL');

  useEffect(() => {
    loadNotifications();
  }, [activeShowroomId]);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const data = await api.getNotifications(activeShowroomId);
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = notifications.filter(n => {
    const matchesSearch =
      n.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      n.vehicleReg?.toLowerCase().includes(search.toLowerCase()) ||
      n.recipient.toLowerCase().includes(search.toLowerCase()) ||
      n.subject.toLowerCase().includes(search.toLowerCase());

    const matchesChannel = channelFilter === 'ALL' || n.channel === channelFilter;
    return matchesSearch && matchesChannel;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-outfit tracking-tight">
            Notification Audit Logs
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Complete telecommunications history of automated SMS gateway dispatches, email templates, and carrier delivery reports
          </p>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <Server className="w-4 h-4 text-emerald-600" />
          <span>SMS & Email Gateway Ready</span>
        </div>
      </div>

      {/* Search & Channel Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer name, mobile number, email, vehicle registration, or subject..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F07836] focus:border-[#F07836] focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={channelFilter}
            onChange={e => setChannelFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#F07836] focus:border-[#F07836]"
          >
            <option value="ALL">All Channels</option>
            <option value="SMS">SMS Only (DLT Telecom)</option>
            <option value="EMAIL">Email Only (SMTP)</option>
            <option value="WHATSAPP">WhatsApp Official</option>
          </select>
        </div>
      </div>

      {/* Notifications Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Channel & Recipient</th>
                <th className="py-3.5 px-4">Vehicle & Customer</th>
                <th className="py-3.5 px-4">Subject & Message Excerpt</th>
                <th className="py-3.5 px-4">Dispatched At</th>
                <th className="py-3.5 px-4">Delivery Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading notification logs...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No notification logs found.
                  </td>
                </tr>
              ) : (
                filtered.map(n => {
                  const isEmail = n.channel === 'EMAIL';
                  const isSms = n.channel === 'SMS';

                  return (
                    <tr key={n.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isEmail ? 'bg-[#FFF3EC] text-[#D95D1E] border border-[#FCD4BE]' :
                            isSms ? 'bg-emerald-100 text-emerald-700' :
                            'bg-teal-100 text-teal-700'
                          }`}>
                            {isEmail ? <Mail className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                              isEmail ? 'bg-[#FFF3EC] text-[#D95D1E] border border-[#FCD4BE]' : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              {n.channel}
                            </span>
                            <div className="font-mono text-slate-700 font-medium text-[11px] mt-0.5">
                              {n.recipient}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                            {n.vehicleReg || 'General'}
                          </span>
                          <div className="font-semibold text-slate-800 mt-0.5">{n.customerName}</div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="max-w-md">
                          <div className="font-bold text-slate-900 truncate">{n.subject}</div>
                          <div className="text-slate-500 text-[11px] truncate mt-0.5 font-sans">
                            {n.message}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-600 text-[11px]">
                        <div>{new Date(n.sentAt).toLocaleDateString()}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(n.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 w-fit">
                          <CheckCheck className="w-3 h-3 text-emerald-600" />
                          <span>{n.status}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openMessagePreview({
                            channel: n.channel,
                            recipient: n.recipient,
                            subject: n.subject,
                            message: n.message,
                            deliveryNotes: n.deliveryNotes
                          })}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Preview</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
