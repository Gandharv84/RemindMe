import React from 'react';
import { useApp } from '../../context/AppContext';
import { Mail, MessageSquare, Smartphone, CheckCheck, X, Server, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const SmsEmailPreviewModal: React.FC = () => {
  const { previewMessage, closeMessagePreview } = useApp();

  if (!previewMessage || !previewMessage.isOpen) return null;

  const isEmail = previewMessage.channel === 'EMAIL';
  const isSms = previewMessage.channel === 'SMS';
  const isWhatsApp = previewMessage.channel === 'WHATSAPP';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden text-slate-900 flex flex-col border border-slate-200"
        >
          {/* Header */}
          <div className="p-4 bg-[#262B33] text-white flex items-center justify-between border-b border-[#333944]">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isEmail ? 'bg-[#FFF3EC] text-[#D95D1E] border border-[#FCD4BE]' :
                isSms ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                'bg-teal-500/20 text-teal-400 border border-teal-500/30'
              }`}>
                {isEmail && <Mail className="w-4 h-4 text-[#F07836]" />}
                {isSms && <Smartphone className="w-4 h-4" />}
                {isWhatsApp && <MessageSquare className="w-4 h-4" />}
              </div>
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  Customer Notification Preview
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
                    Demo Sandbox Dispatch
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Recipient: <span className="text-slate-200 font-mono">{previewMessage.recipient}</span>
                </p>
              </div>
            </div>
            <button
              onClick={closeMessagePreview}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 bg-slate-50 flex-1 overflow-y-auto">
            {isEmail ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Email Client Bar */}
                <div className="p-3.5 bg-slate-100/80 border-b border-slate-200 text-xs space-y-1.5 font-sans">
                  <div className="flex items-center justify-between text-slate-500">
                    <div><span className="font-semibold text-slate-700">From:</span> Apex Autohub Dealership &lt;service@apexautohub.com&gt;</div>
                    <span className="text-[11px] text-slate-400">Just now</span>
                  </div>
                  <div><span className="font-semibold text-slate-700">To:</span> {previewMessage.recipient}</div>
                  <div><span className="font-semibold text-slate-700">Subject:</span> <span className="text-slate-900 font-medium">{previewMessage.subject}</span></div>
                </div>
                {/* Email Body */}
                <div className="p-5 text-sm text-slate-800 leading-relaxed whitespace-pre-line font-sans">
                  {previewMessage.message}
                </div>
                {/* Action buttons inside email */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Apex Autohub Dealership &bull; Pune Central</span>
                  <span className="text-[#F07836] font-semibold cursor-pointer hover:underline">One-Click Book Slot &rarr;</span>
                </div>
              </div>
            ) : (
              /* Mobile SMS Device Screen Mockup */
              <div className="max-w-sm mx-auto bg-slate-900 p-3 rounded-[32px] shadow-xl border-4 border-slate-800">
                <div className="w-20 h-3.5 bg-slate-800 rounded-full mx-auto mb-2"></div>
                <div className="bg-slate-950 rounded-2xl p-4 min-h-[220px] flex flex-col justify-between">
                  <div className="text-center text-[11px] text-slate-400 border-b border-slate-800 pb-2 mb-3">
                    <span className="font-bold text-white tracking-wide">APEX-MOTORS (DLT)</span>
                    <div className="text-[10px] text-slate-500">Today &bull; SMS Gateway</div>
                  </div>

                  <div className="bg-[#262B33] text-white p-3.5 rounded-2xl rounded-tl-sm text-xs leading-relaxed shadow-md border border-[#3E4551]">
                    {previewMessage.message}
                    <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-end gap-1">
                      <span>Delivered</span>
                      <CheckCheck className="w-3 h-3 text-[#F07836]" />
                    </div>
                  </div>

                  <div className="mt-4 pt-2 border-t border-slate-900 flex items-center justify-center text-[10px] text-slate-500">
                    Simulated Telecom Carrier Feed
                  </div>
                </div>
              </div>
            )}

            {/* Carrier / SMTP Audit Log */}
            {previewMessage.deliveryNotes && (
              <div className="mt-4 p-3 rounded-xl bg-slate-900 text-slate-300 font-mono text-[11px] border border-slate-800 flex items-start gap-2">
                <Server className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <span className="text-slate-500 block mb-0.5 uppercase tracking-wider text-[9px] font-bold">Carrier Audit Log</span>
                  {previewMessage.deliveryNotes}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Full notification record stored in database</span>
            </div>
            <button
              onClick={closeMessagePreview}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
