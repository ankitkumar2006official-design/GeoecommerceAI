import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Layers, CheckCircle2, AlertCircle, ArrowRight, Mail, RefreshCw, ArrowLeft } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided in link. Please check your verification email.');
      return;
    }

    let isMounted = true;
    async function verify() {
      try {
        const res = await api.get(`/auth/verify-email/${token}`);
        if (isMounted) {
          setStatus('success');
          setMessage(res.data.message || 'Email successfully verified! Your merchant workspace is active.');
          if (user) {
            updateUser({ ...user, isVerified: true });
          }
        }
      } catch (err) {
        if (isMounted) {
          setStatus('error');
          setMessage(err.response?.data?.error || 'Verification link is invalid or has expired. Please request a fresh link.');
        }
      }
    }

    verify();
    return () => { isMounted = false; };
  }, [token]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail && !user?.email) return;
    setResending(true);
    setResendMessage(null);
    try {
      const emailToTarget = resendEmail || user?.email;
      const res = await api.post('/auth/resend-verification', { email: emailToTarget });
      setResendMessage({ type: 'success', text: res.data.message || 'Verification link has been sent to your email.' });
    } catch (err) {
      setResendMessage({ type: 'error', text: err.response?.data?.error || 'Failed to resend verification email.' });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-brand-500 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white mx-auto shadow-subtle">
            <Mail className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Email Verification
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Securing your merchant workspace identity.
          </p>
        </div>

        {/* Card Container */}
        <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 py-8 px-6 sm:px-8 shadow-card rounded-2xl space-y-5">
            {status === 'verifying' && (
              <div className="py-8 text-center space-y-3">
                <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-500 dark:text-slate-400">Verifying your merchant email token...</p>
              </div>
            )}

            {status === 'success' && (
              <div className="space-y-4 text-center">
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
                  <h3 className="font-semibold text-sm">Account Verified!</h3>
                  <p className="leading-relaxed">{message}</p>
                </div>

                <div className="pt-2">
                  <Link
                    to="/overview"
                    className="w-full py-2.5 px-4 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-subtle transition flex items-center justify-center gap-1.5"
                  >
                    <span>Proceed to Merchant Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>Verification Failed</span>
                  </div>
                  <p className="leading-relaxed">{message}</p>
                </div>

                {/* Resend Form */}
                <form onSubmit={handleResend} className="space-y-3 pt-2 text-xs">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Need a new verification link? Enter your merchant email below:
                  </p>

                  {resendMessage && (
                    <div className={`p-2.5 rounded-lg text-xs font-medium ${
                      resendMessage.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                        : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                    }`}>
                      {resendMessage.text}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-slate-700 dark:text-slate-300 font-medium block">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="seller@store.in"
                      value={resendEmail || user?.email || ''}
                      onChange={(e) => setResendEmail(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={resending}
                    className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-semibold text-xs shadow-subtle transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {resending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                    <span>{resending ? 'Sending Link...' : 'Resend Verification Email'}</span>
                  </button>
                </form>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Sign In</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}