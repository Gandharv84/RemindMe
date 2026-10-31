import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Car, Lock, Mail, AlertCircle, ArrowRight, UserCheck, Phone, Shield } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [loginMode, setLoginMode] = useState<'EMPLOYEE' | 'CUSTOMER'>('EMPLOYEE');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [customerIdentifier, setCustomerIdentifier] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (loginMode === 'EMPLOYEE') {
        if (!identifier.trim()) {
          setError('Please enter your email or employee ID');
          return;
        }
        await login(identifier.trim(), password, 'EMPLOYEE');
      } else {
        if (!customerIdentifier.trim()) {
          setError('Please enter your registered mobile number or email');
          return;
        }
        await login(customerIdentifier.trim(), password, 'CUSTOMER');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-[#262B33] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 border border-slate-200">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#F07836] flex items-center justify-center text-white mx-auto shadow-lg shadow-[#F07836]/25 mb-4">
            <Car className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-outfit tracking-tight">
            RemindMe
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Vehicle Service & Insurance Reminder System
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => {
              setLoginMode('EMPLOYEE');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              loginMode === 'EMPLOYEE'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Dealership Staff</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMode('CUSTOMER');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              loginMode === 'CUSTOMER'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Customer Portal</span>
          </button>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {loginMode === 'EMPLOYEE' ? (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email / Employee Code
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    placeholder="Work email or employee code"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F07836] focus:border-[#F07836] focus:bg-white transition-all text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F07836] focus:border-[#F07836] focus:bg-white transition-all text-slate-900 font-medium"
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Registered Mobile Number or Email
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={customerIdentifier}
                  onChange={e => setCustomerIdentifier(e.target.value)}
                  placeholder="e.g. 9876543210 or email@domain.com"
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F07836] focus:border-[#F07836] focus:bg-white transition-all text-slate-900 font-medium"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Enter the phone number or email registered with your vehicle purchase.
              </p>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mt-4 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input type="password" required minLength={10} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 10 characters" className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F07836] focus:border-[#F07836] focus:bg-white transition-all text-slate-900 font-medium" />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-[#F07836] hover:bg-[#E06725] text-white text-xs font-bold shadow-lg shadow-[#F07836]/25 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-60 cursor-pointer"
          >
            <span>
              {isLoading
                ? 'Authenticating...'
                : loginMode === 'EMPLOYEE'
                ? 'Sign In as Employee'
                : 'Access Vehicle Portal'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Quick Access Helper */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">
            Demo Quick Access
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setLoginMode('EMPLOYEE');
                setIdentifier('admin@dealership.com');
                setPassword('Admin@123456');
                setError(null);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-[#FFF3EC] hover:border-[#F07836] text-[11px] font-medium text-slate-700 hover:text-[#F07836] transition-colors text-center cursor-pointer"
            >
              Fill Staff Admin
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMode('CUSTOMER');
                setCustomerIdentifier('mahesh@example.com');
                setPassword('Customer@123456');
                setError(null);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-[#FFF3EC] hover:border-[#F07836] text-[11px] font-medium text-slate-700 hover:text-[#F07836] transition-colors text-center cursor-pointer"
            >
              Fill Customer (Mahesh)
            </button>
          </div>
          <p className="text-[10px] text-slate-400 text-center mt-2">
            Default Admin: <code className="text-slate-600">admin@dealership.com / Admin@123456</code>
          </p>
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-slate-500">
        &copy; RemindMe Vehicle Service & Insurance Reminder System
      </div>
    </div>
  );
};
