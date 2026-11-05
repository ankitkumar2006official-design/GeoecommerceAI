import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Layers, CheckCircle2, AlertCircle, ArrowRight, Mail, RefreshCw } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center text-white mx-auto shadow-lg shadow-brand-500/25">
            <Layers className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            GeoCommerce <span className="text-brand-500">AI</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Merchant Workspace Email Verification
          </p>
        </div>

        {/* State: Verifying */}
        {status === 'verifying' && (
          <div className="text-center py-8 space-y-4">
            <RefreshCw className="w-8 h-8 text-brand-400 animate-spin mx-auto" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Verifying your merchant credentials...
            </p>
            <p className="text-xs text-slate-500">
              Please wait while we validate your cryptographic verification token.
            </p>
          </div>
        )}

        {/* State: Success */}
        {status === 'success' && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h3 className="text-sm font-bold text-emerald-400">Workspace Verified</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {message}
              </p>
            </div>

            <button
              onClick={() => navigate(user ? '/overview' : '/login')}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-sky-500 hover:from-brand-500 hover:to-sky-400 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 transition-all text-xs"
            >
              <span>{user ? 'Enter Merchant Dashboard' : 'Sign In to Workspace'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* State: Error */}
        {status === 'error' && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-2">
              <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
              <h3 className="text-sm font-bold text-rose-400">Verification Failed</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {message}
              </p>
            </div>

            <form onSubmit={handleResend} className="space-y-3 pt-2 border-t border-slate-800">
              <label className="text-xs font-medium text-slate-400 block">
                Request a new verification link:
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder={user?.email || "merchant@store.com"}
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs"
                />
              </div>

              {resendMessage && (
                <p className={`text-xs ${resendMessage.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {resendMessage.text}
                </p>
              )}

              <button
                type="submit"
                disabled={resending}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center justify-center gap-2 transition"
              >
                {resending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5 text-brand-400" />}
                <span>{resending ? 'Sending...' : 'Resend Verification Email'}</span>
              </button>
            </form>

            <div className="text-center pt-2">
              <Link to="/login" className="text-xs text-brand-400 hover:text-brand-300 font-medium">
                Return to Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

