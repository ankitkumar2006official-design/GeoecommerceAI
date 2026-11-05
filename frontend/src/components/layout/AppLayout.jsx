import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Mail, CheckCircle2, RefreshCw } from 'lucide-react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function AppLayout({ onDataMutated }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState(null);

  const handleResendVerification = async () => {
    if (!user?.email || resending) return;
    setResending(true);
    setResendStatus(null);
    try {
      const res = await api.post('/auth/resend-verification', { email: user.email });
      setResendStatus({ type: 'success', text: res.data.message || 'Verification email dispatched!' });
    } catch (err) {
      setResendStatus({ type: 'error', text: err.response?.data?.error || 'Failed to dispatch verification email.' });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="lg:pl-64 flex flex-col flex-1">
        <Navbar setMobileOpen={setMobileOpen} onDataMutated={onDataMutated} />

        {user && user.isVerified === false && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-xs text-amber-300 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Your email (<strong>{user.email}</strong>) is not yet verified. Please check your inbox for the verification link.
              </span>
            </div>
            <div className="flex items-center gap-3">
              {resendStatus && (
                <span className={resendStatus.type === 'success' ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
                  {resendStatus.text}
                </span>
              )}
              <button
                onClick={handleResendVerification}
                disabled={resending}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 font-medium text-[11px] flex items-center gap-1 transition"
              >
                {resending && <RefreshCw className="w-3 h-3 animate-spin" />}
                <span>{resending ? 'Sending...' : 'Resend Email'}</span>
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

