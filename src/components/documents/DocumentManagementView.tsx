import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { VehicleDocument, Vehicle } from '../../types';
import {
  FileText,
  Plus,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ExternalLink,
  Sparkles,
  X,
  Search,
  Calendar,
  Award
} from 'lucide-react';

export const DocumentManagementView: React.FC = () => {
  const { activeShowroomId } = useAuth();
  const { showToast, refreshStats } = useApp();

  const [documents, setDocuments] = useState<(VehicleDocument & { vehicleReg: string; customerName: string; model: string })[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    vehicleId: '',
    documentType: 'PUC_CERTIFICATE' as any,
    documentNumber: 'PUC-MH12-2026-991',
    issuedDate: '2026-03-01',
    expiryDate: '2026-09-01',
    isDigiLockerVerified: false,
    notes: 'BS6 emission compliance tested and verified.'
  });

  useEffect(() => {
    loadDocuments();
    loadVehicles();
  }, [activeShowroomId]);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const data = await api.getDocuments(activeShowroomId);
      setDocuments(data);
    } catch (err) {
      console.error('Failed to load documents', err);
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

  const handleOpenAdd = () => {
    setFormData({
      vehicleId: vehicles[0]?.id || '',
      documentType: 'PUC_CERTIFICATE',
      documentNumber: `PUC-${Date.now().toString().slice(-6)}`,
      issuedDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isDigiLockerVerified: false,
      notes: 'Govt approved RTO online emission test certificate.'
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicleId || !formData.documentNumber.trim()) {
      showToast('error', 'Validation Error', 'Vehicle and Document Number are required.');
      return;
    }

    try {
      await api.createDocument(formData);
      showToast('success', 'Document Saved', 'Vehicle document registered and linked to compliance tracker.');
      setIsModalOpen(false);
      await loadDocuments();
      await refreshStats();
    } catch (err: any) {
      showToast('error', 'Failed', err.message || 'Could not save document');
    }
  };

  const getDaysLeft = (expiryDate?: string) => {
    if (!expiryDate) return null;
    const now = Date.now();
    const target = new Date(expiryDate).getTime();
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  };

  const filtered = documents.filter(d =>
    d.vehicleReg?.toLowerCase().includes(search.toLowerCase()) ||
    d.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    d.documentNumber.toLowerCase().includes(search.toLowerCase()) ||
    d.documentType.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-outfit tracking-tight">
            PUC & Vehicle Documents
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            DigiLocker-ready RTO compliance, Pollution Under Control (PUC), RC Books, and Fitness certificates
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-teal-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Document Record</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by vehicle registration, document number, customer, or document type..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Document Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">
            Loading compliance documents...
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
            No documents found matching your search.
          </div>
        ) : (
          filtered.map(doc => {
            const daysLeft = getDaysLeft(doc.expiryDate);
            const isExpired = daysLeft !== null && daysLeft < 0;
            const isExpiring = daysLeft !== null && daysLeft <= 30 && daysLeft >= 0;

            return (
              <div
                key={doc.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Top: Vehicle Reg & DigiLocker Verified Badge */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="bg-slate-900 text-white font-mono font-bold text-xs px-2.5 py-1 rounded-lg">
                      {doc.vehicleReg}
                    </div>

                    {doc.isDigiLockerVerified ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1 border border-emerald-200">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>DigiLocker Ref Linked</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        Manual Entry
                      </span>
                    )}
                  </div>

                  {/* Document Info */}
                  <div className="mt-3">
                    <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">
                      {doc.documentType.replace('_', ' ')}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm mt-0.5 font-mono">
                      {doc.documentNumber}
                    </h3>

                    <div className="mt-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Vehicle & Customer</span>
                      <span className="font-bold text-slate-800">{doc.customerName}</span>
                      <span className="text-slate-500 text-[11px] block">{doc.model}</span>
                    </div>
                  </div>

                  {/* Validity & Verification Code */}
                  <div className="mt-4 space-y-2 text-xs">
                    {doc.expiryDate && (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="text-slate-600 font-medium">Valid Until:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-900 font-bold">{doc.expiryDate}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isExpired ? 'bg-rose-100 text-rose-700' :
                            isExpiring ? 'bg-amber-100 text-amber-800' :
                            'bg-emerald-100 text-emerald-800'
                          }`}>
                            {isExpired ? `${Math.abs(daysLeft!)}d expired` : `${daysLeft}d left`}
                          </span>
                        </div>
                      </div>
                    )}

                    {doc.verificationCode && (
                      <div className="flex items-center justify-between px-2 text-[11px] text-slate-500">
                        <span>Digital Signature:</span>
                        <span className="font-mono font-bold text-slate-700">{doc.verificationCode}</span>
                      </div>
                    )}

                    {doc.notes && (
                      <p className="text-[11px] text-slate-500 italic px-1 pt-1">
                        "{doc.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Issued: {doc.issuedDate}</span>
                  <span className="text-teal-700 font-semibold cursor-pointer hover:underline">
                    RTO Online Archive &rarr;
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Document Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden text-slate-900">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-sm">Register Vehicle Compliance Document</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Select Vehicle <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.vehicleId}
                    onChange={e => setFormData({ ...formData, vehicleId: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white font-medium"
                  >
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.registrationNumber} — {v.brand} {v.model}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Document Category</label>
                  <select
                    value={formData.documentType}
                    onChange={e => setFormData({ ...formData, documentType: e.target.value as any })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white"
                  >
                    <option value="PUC_CERTIFICATE">PUC Certificate (Pollution)</option>
                    <option value="RC_BOOK">Registration Certificate (RC Book)</option>
                    <option value="FITNESS_CERTIFICATE">Fitness Certificate</option>
                    <option value="WARRANTY_CARD">Extended Warranty Card</option>
                    <option value="INSURANCE_CERTIFICATE">Insurance Policy Certificate</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Certificate / Doc Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.documentNumber}
                    onChange={e => setFormData({ ...formData, documentNumber: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={formData.issuedDate}
                    onChange={e => setFormData({ ...formData, issuedDate: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Notes / Authority</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="digiLocker"
                    checked={formData.isDigiLockerVerified}
                    onChange={e => setFormData({ ...formData, isDigiLockerVerified: e.target.checked })}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                  />
                  <label htmlFor="digiLocker" className="font-semibold text-slate-800 select-none">
                    Verified by dealership staff
                  </label>
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
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-md shadow-teal-600/20"
                >
                  Save Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
