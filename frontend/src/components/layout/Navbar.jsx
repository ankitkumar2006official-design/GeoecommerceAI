import React, { useState } from 'react';
import { Menu, Database, Trash2, CheckCircle2, AlertCircle, RefreshCw, Activity, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function Navbar({ setMobileOpen, onDataMutated }) {
  const { user } = useAuth();
  const [loadingSample, setLoadingSample] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleLoadSample = async () => {
    try {
      setLoadingSample(true);
      setMsg(null);
      const res = await api.post('/sales/load-sample');
      setMsg({ type: 'success', text: res.data.message });
      if (onDataMutated) onDataMutated();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || err.message });
    } finally {
      setLoadingSample(false);
      setTimeout(() => setMsg(null), 5000);
    }
  };

  const handleClearData = async () => {
    if (!window.confirm('Are you sure you want to clear your sales data? You can reload the sample dataset anytime.')) return;
    try {
      setClearing(true);
      setMsg(null);
      await api.delete('/sales/clear');
      setMsg({ type: 'success', text: 'All sales records cleared.' });
      if (onDataMutated) onDataMutated();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || err.message });
    } finally {
      setClearing(false);
      setTimeout(() => setMsg(null), 4000);
    }
  };

  return (
    <header className="h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-30 flex items-center justify-between px-4 lg:px-8 select-none">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:block">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Workspace
            </span>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <h2 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {user?.storeName || 'Merchant Store'}
            </h2>
          </div>
        </div>
      </div>

      {/* Notifications / Toast Feedback */}
      {msg && (
        <div className={`hidden md:flex items-center gap-2 px-3 py-1 rounded-md text-xs font-medium animate-fadeIn ${
          msg.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
        }`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        <button
          onClick={handleLoadSample}
          disabled={loadingSample}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 text-xs font-medium transition disabled:opacity-50 shadow-subtle"
          title="Instant 1-Click: Seed 1,500+ authentic Indian e-commerce orders for demo testing"
        >
          {loadingSample ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-600" />
          ) : (
            <Database className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
          )}
          <span>{loadingSample ? 'Loading Data...' : 'Load Demo Data'}</span>
        </button>

        <button
          onClick={handleClearData}
          disabled={clearing}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition text-xs border border-transparent hover:border-rose-200 dark:hover:border-rose-800/50"
          title="Clear all uploaded data"
          aria-label="Clear all data"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block mx-1" />

        {/* System Health Pill */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-[11px] font-mono text-slate-600 dark:text-slate-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="hidden sm:inline">Engine Live</span>
        </div>
      </div>
    </header>
  );
}

