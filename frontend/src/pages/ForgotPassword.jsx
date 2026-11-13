import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, AlertCircle, CheckCircle2, ArrowLeft, KeyRound, ExternalLink } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-brand-500 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white mx-auto shadow-subtle">
            <KeyRound className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Reset Password
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Enter your merchant email and we'll send a secure password reset link.
          </p>
        </div>

        {/* Card Container */}
        <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 py-8 px-6 sm:px-8 shadow-card rounded-2xl space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {successInfo ? (
              <div className="space-y-4">
                {successInfo.sent === false ? (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>No Registered Account Found</span>
                    </div>
                    <p className="leading-relaxed">
                      No merchant account exists with email <strong>{successInfo.email}</strong>. Please join GeoCommerce AI by creating your merchant workspace first.
                    </p>
                    <div className="pt-2">
                      <Link
                        to="/register"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-subtle transition"
                      >
                        <span>Create Merchant Account</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs space-y-2.5">
                    <div className="flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Password Reset Link Dispatched</span>
                    </div>
                    <p className="leading-relaxed">
                      {successInfo.message} Check your inbox at <strong>{successInfo.email}</strong>.
                    </p>

                    {successInfo.previewUrl && (
                      <div className="pt-2 border-t border-emerald-200/80 dark:border-emerald-900/60">
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-mono block mb-1">
                          Direct Reset Link (Local Dev):
                        </span>
                        <a
                          href={successInfo.previewUrl}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline break-all"
                        >
                          <span>Open Password Reset Form</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Return to Sign In</span>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="text-slate-700 dark:text-slate-300 font-medium block">
                    Merchant Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="email"
                      required
                      placeholder="seller@store.in"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-lg bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-semibold text-xs shadow-subtle transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <span>{loading ? 'Sending link...' : 'Send Reset Link'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Sign In</span>
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}