import React from 'react';
import { useApp } from '../../context/AppContext';
import { Mail, X, Server, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const EmailPreviewModal: React.FC = () => {
  const { previewMessage, closeMessagePreview } = useApp();
  if (!previewMessage || !previewMessage.isOpen) return null;
  const isEmail = previewMessage.channel === 'EMAIL';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden text-slate-900 flex flex-col border border-slate-200"
        >
          <div className="p-4 bg-[#262B33] text-white flex items-center justify-between border-b border-[#333944]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#FFF3EC] text-[#D95D1E] border border-[#FCD4BE]">
                <Mail className="w-4 h-4 text-[#F07836]" />
              </div>
              <div>
                <h3 className="text-sm font-bold">{isEmail ? 'Email Attempt Preview' : 'Legacy Notification Record'}</h3>
                <p className="text-xs text-slate-400">Recipient: <span className="text-slate-200 font-mono">{previewMessage.recipient}</span></p>
              </div>
            </div>
            <button onClick={closeMessagePreview} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 bg-slate-50 flex-1 overflow-y-auto">
            {isEmail ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-3.5 bg-slate-100/80 border-b border-slate-200 text-xs space-y-1.5 font-sans">
                  <div><span className="font-semibold text-slate-700">From:</span> Configured SMTP sender</div>
                  <div><span className="font-semibold text-slate-700">To:</span> {previewMessage.recipient}</div>
                  <div><span className="font-semibold text-slate-700">Subject:</span> <span className="text-slate-900 font-medium">{previewMessage.subject}</span></div>
                </div>
                <div className="p-5 text-sm text-slate-800 leading-relaxed whitespace-pre-line font-sans">{previewMessage.message}</div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                <p className="font-semibold">This historical channel is no longer supported. This record does not represent an active delivery.</p>
                <p className="mt-3 whitespace-pre-line">{previewMessage.message}</p>
              </div>
            )}

            {previewMessage.deliveryNotes && (
              <div className="mt-4 p-3 rounded-xl bg-slate-900 text-slate-300 font-mono text-[11px] border border-slate-800 flex items-start gap-2">
                <Server className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <span className="text-slate-500 block mb-0.5 uppercase tracking-wider text-[9px] font-bold">SMTP Attempt Details</span>
                  {previewMessage.deliveryNotes}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-slate-500" />
              <span>Notification attempt stored in history</span>
            </div>
            <button onClick={closeMessagePreview} className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors">Done</button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
