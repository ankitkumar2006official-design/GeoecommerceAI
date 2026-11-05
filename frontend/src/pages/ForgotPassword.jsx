import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, Mail, ArrowRight, AlertCircle, CheckCircle2, ArrowLeft, KeyRound, ExternalLink } from 'lucide-react';
import api from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successInfo, setSuccessInfo] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { email });
      setSuccessInfo({
        message: res.data.message || 'If an account exists with that email address, password reset instructions have been sent.',
        email,
        sent: res.data.sent !== false,
        previewUrl: res.data.previewResetUrl
      });
    } catch (err) {
      if (!err.response) {
        setError('Cannot reach server. Please check your network connection.');
      } else if (err.response.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Failed to process request. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center text-white mx-auto shadow-lg shadow-brand-500/25">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Reset Your Password
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Enter your merchant email and we'll send a secure password reset link via Resend.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successInfo ? (
          <div className="space-y-4">
            {successInfo.sent === false ? (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                  <span>No Registered Account Found</span>
                </div>
                <p className="leading-relaxed">
                  No merchant account exists with email <strong>{successInfo.email}</strong>. Please join GeoCommerce AI by creating your merchant workspace first.
                </p>
                <div className="pt-2">
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 font-bold text-xs transition"
                  >
                    <span>Create Merchant Account</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span>Reset Instructions Dispatched</span>
                </div>
                <p className="leading-relaxed">
                  We sent a secure password reset link to <strong>{successInfo.email}</strong>. Please check your inbox and click the link to update your credentials.
                </p>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                  ⏰ Note: The reset link expires in 60 minutes.
                </div>
              </div>
            )}

            {/* Development Quick-Link when simulated or for testing */}
            {successInfo.previewUrl && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs space-y-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <span>⚡ Development Quick-Link:</span>
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  Resend API key is in simulated dev mode. You can proceed with password reset directly below:
                </p>
                <a
                  href={successInfo.previewUrl}
                  className="inline-flex items-center gap-1 font-mono text-[11px] text-brand-600 dark:text-brand-400 hover:underline break-all font-semibold"
                >
                  <span>Open Reset Password Screen</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              </div>
            )}

            <div className="pt-2">
              <Link
                to="/login"
                className="w-full py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs transition flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Sign In</span>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="text-slate-500 dark:text-slate-400 font-semibold">Registered Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="seller@store.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Sending Instructions...' : 'Send Password Reset Link'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="pt-2 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white font-semibold transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

