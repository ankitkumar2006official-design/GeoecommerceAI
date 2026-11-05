import React, { useState } from 'react';
import { Menu, Database, Trash2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
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
    <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 flex items-center justify-between px-4 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:block">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Merchant Workspace</p>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">{user?.storeName || 'My Store'}</h2>
        </div>
      </div>

      {/* Notifications or alerts banner */}
      {msg && (
        <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium animate-fadeIn ${
          msg.type === 'success'
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
        }`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Quick Action Tools */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={handleLoadSample}
          disabled={loadingSample}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-700 dark:text-brand-300 border border-brand-500/30 text-xs font-semibold transition disabled:opacity-50"
          title="Instant 1-Click: Seed 1,500+ authentic Indian e-commerce orders for demo testing"
        >
          {loadingSample ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Database className="w-3.5 h-3.5 text-brand-500" />
          )}
          <span>{loadingSample ? 'Loading Demo...' : 'Load Demo Data'}</span>
        </button>

        <button
          onClick={handleClearData}
          disabled={clearing}
          className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition text-xs"
          title="Clear sales data"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 hidden sm:inline">Engine Live</span>
        </div>
      </div>
    </header>
  );
}

