import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { Notification } from '../../types';
import { AlertTriangle, CheckCheck, Clock, Eye, Mail, RefreshCw, Search, Server } from 'lucide-react';

type NotificationRow = Notification & { vehicleReg: string; vehicleModel: string; customerName: string };

export const NotificationHistoryView: React.FC = () => {
  const { activeShowroomId } = useAuth();
  const { openMessagePreview, showToast } = useApp();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [smtpStatus, setSmtpStatus] = useState<{ configured: boolean; missing: string[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [retryingId, setRetryingId] = useState<string | null>(null);

  useEffect(() => {
    void loadNotifications();
  }, [activeShowroomId]);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const [data, status] = await Promise.all([
        api.getNotifications(activeShowroomId),
        api.getNotificationStatus()
      ]);
      setNotifications(data);
      setSmtpStatus(status);
    } catch (err) {
      console.error('Failed to load notification history or SMTP status', err);
      showToast('error', 'Could not load email status', 'Refresh the page to check SMTP configuration and notification history.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = async (notification: NotificationRow) => {
    setRetryingId(notification.id);
    try {
      const retried = await api.retryNotification(notification.id);
      if (retried.status === 'SENT') {
        showToast('success', 'Email accepted by SMTP', 'The SMTP server accepted this message. Inbox delivery is not confirmed.');
      } else {
        showToast('error', 'Email not sent', retried.deliveryNotes || 'SMTP did not accept this message.');
      }
      await loadNotifications();
    } catch (err) {
      showToast('error', 'Retry unavailable', err instanceof Error ? err.message : 'This email could not be retried.');
    } finally {
      setRetryingId(null);
    }
  };

  const filtered = notifications.filter(notification =>
    notification.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    notification.vehicleReg?.toLowerCase().includes(search.toLowerCase()) ||
    notification.recipient.toLowerCase().includes(search.toLowerCase()) ||
    notification.subject.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-outfit tracking-tight">Email Notification History</h1>
          <p className="text-sm text-slate-500 mt-0.5">SMTP attempts for servicing, insurance expiry, and PUC expiry reminders.</p>
        </div>
        <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
          smtpStatus?.configured ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          {smtpStatus?.configured ? <Server className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-amber-600" />}
          <span>{smtpStatus?.configured ? 'SMTP settings complete' : 'SMTP not configured'}</span>
        </div>
      </div>

      {smtpStatus && !smtpStatus.configured && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">SMTP email is not configured. Reminder attempts will be recorded as failed.</p>
              <p className="mt-1">Set these variables in the server environment, restart the server, then retry failed emails below:</p>
              <p className="mt-1 font-mono text-xs">{smtpStatus.missing.join(', ')}</p>
            </div>
          </div>
        </div>
      )}
      {smtpStatus?.configured && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
          All SMTP settings are present. A real send still depends on successful authentication and server acceptance. “Sent” means the SMTP server accepted the message; it does not confirm delivery to the recipient’s inbox.
        </div>
      )}

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search customer, email address, vehicle registration, or subject..."
            value={search}
            onChange={event => setSearch(event.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F07836] focus:border-[#F07836] focus:bg-white transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Channel & Recipient</th>
                <th className="py-3.5 px-4">Vehicle & Customer</th>
                <th className="py-3.5 px-4">Subject & Message Excerpt</th>
                <th className="py-3.5 px-4">Attempted At</th>
                <th className="py-3.5 px-4">SMTP Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {isLoading ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-400">Loading email attempts...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-400">No email attempts found.</td></tr>
              ) : filtered.map(notification => {
                const isEmail = notification.channel === 'EMAIL';
                const attemptedAt = new Date(notification.sentAt);
                const validAttemptTime = Number.isFinite(attemptedAt.getTime());
                const statusStyle = notification.status === 'SENT'
                  ? 'bg-emerald-100 text-emerald-800'
                  : notification.status === 'FAILED'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800';
                return (
                  <tr key={notification.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isEmail ? 'bg-[#FFF3EC] text-[#D95D1E] border border-[#FCD4BE]' : 'bg-slate-100 text-slate-500'}`}>
                          <Mail className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded font-mono bg-[#FFF3EC] text-[#D95D1E] border border-[#FCD4BE]">
                            {isEmail ? 'EMAIL' : `LEGACY ${notification.channel}`}
                          </span>
                          <div className="font-mono text-slate-700 font-medium text-[11px] mt-0.5">{notification.recipient}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{notification.vehicleReg || 'General'}</span>
                      <div className="font-semibold text-slate-800 mt-0.5">{notification.customerName}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="max-w-md">
                        <div className="font-bold text-slate-900 truncate">{notification.subject}</div>
                        <div className="text-slate-500 text-[11px] truncate mt-0.5">{notification.message}</div>
                        {notification.deliveryNotes && <div className="text-slate-500 text-[10px] mt-1">{notification.deliveryNotes}</div>}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 text-[11px]">
                      {validAttemptTime ? <><div>{attemptedAt.toLocaleDateString()}</div><div className="text-[10px] text-slate-400">{attemptedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div></> : 'Not attempted'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit ${statusStyle}`}>
                        {notification.status === 'PENDING' ? <Clock className="w-3 h-3" /> : <CheckCheck className="w-3 h-3" />}
                        <span>{notification.status === 'SENT' ? 'SMTP accepted' : notification.status}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => openMessagePreview({ channel: notification.channel, recipient: notification.recipient, subject: notification.subject, message: notification.message, deliveryNotes: notification.deliveryNotes })}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3 h-3" /><span>Preview</span>
                      </button>
                      {isEmail && notification.status === 'FAILED' && (
                        <button
                          onClick={() => void handleRetry(notification)}
                          disabled={retryingId === notification.id}
                          className="ml-1 px-2.5 py-1.5 rounded-lg bg-[#F07836] hover:bg-[#E06725] disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                        >
                          <RefreshCw className={`w-3 h-3 ${retryingId === notification.id ? 'animate-spin' : ''}`} /><span>Retry</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
