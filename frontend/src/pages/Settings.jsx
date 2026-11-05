import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  History,
  Database,
  Trash2,
  User,
  Store,
  Layers,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSkeleton from '../components/common/LoadingSkeleton';

export default function Settings() {
  const { user, updateUser } = useAuth();

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [storeName, setStoreName] = useState(user?.storeName || '');
  const [sellerName, setSellerName] = useState(user?.name || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  const [loadingSample, setLoadingSample] = useState(false);

  const fetchUploadHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await api.get('/sales/upload-history');
      setHistory(res.data.uploads || []);
    } catch (e) {
      console.warn('Failed to load upload history:', e.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchUploadHistory();
  }, []);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setUploadResult(null);
      setUploadError(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      setUploadError(null);
      setUploadResult(null);

      const res = await api.post('/sales/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setUploadResult(res.data);
      setFile(null);
      await fetchUploadHistory();
    } catch (err) {
      setUploadError(err.response?.data?.error || err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleLoadSample = async () => {
    try {
      setLoadingSample(true);
      setUploadError(null);
      const res = await api.post('/sales/load-sample');
      setUploadResult({
        message: res.data.message,
        summary: {
          totalRows: res.data.count,
          validImported: res.data.count,
          rejectedRows: 0,
          duplicateRows: 0,
          status: 'completed'
        }
      });
      await fetchUploadHistory();
    } catch (err) {
      setUploadError(err.response?.data?.error || err.message);
    } finally {
      setLoadingSample(false);
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      setProfileMsg(null);
      const res = await api.put('/auth/profile', {
        name: sellerName,
        storeName
      });
      updateUser(res.data.user);
      setProfileMsg({ type: 'success', text: 'Store profile updated successfully!' });
      setTimeout(() => setProfileMsg(null), 3000);
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.response?.data?.error || err.message });
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-brand-500" />
          <span>Settings &amp; Sales Data Ingestion</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Upload marketplace sales reports, manage store profile, and inspect ingestion error logs.
        </p>
      </div>

      {/* Grid: Upload Box + Merchant Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Form Box */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-brand-500" />
              <span>Upload CSV or Excel Sales File</span>
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
              .csv, .xlsx, .xls
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Upload files exported from Amazon Seller Central, Flipkart Seller Hub, Meesho, or Shopify. Our parser automatically normalizes and maps column headers.
          </p>

          <form onSubmit={handleUpload} className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-brand-500 transition cursor-pointer relative bg-slate-50 dark:bg-slate-800/30">
              <input
                type="file"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <FileSpreadsheet className="w-10 h-10 text-brand-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {file ? file.name : 'Choose a CSV / Excel file or drag & drop here'}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Maximum file size: 50MB'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="submit"
                disabled={!file || uploading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs disabled:opacity-50 transition shadow-sm"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{uploading ? 'Processing & Validating...' : 'Process & Import File'}</span>
              </button>

              <button
                type="button"
                onClick={handleLoadSample}
                disabled={loadingSample}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-700 dark:text-brand-300 border border-brand-500/30 text-xs font-semibold transition"
              >
                <Database className="w-4 h-4 text-brand-500" />
                <span>{loadingSample ? 'Seeding...' : 'Load Verified Demo Dataset (1,500+ Orders)'}</span>
              </button>
            </div>
          </form>

          {/* Validation Report Alert */}
          {uploadResult && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs space-y-2 animate-fadeIn">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{uploadResult.message}</span>
              </div>

              {uploadResult.summary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-500/20 font-mono text-[11px]">
                  <div>Total Rows: <strong>{uploadResult.summary.totalRows}</strong></div>
                  <div>Valid Imported: <strong className="text-emerald-600 dark:text-emerald-400">{uploadResult.summary.validImported}</strong></div>
                  <div>Duplicates Skipped: <strong>{uploadResult.summary.duplicateRows}</strong></div>
                  <div>Rejected Invalid: <strong className="text-rose-500">{uploadResult.summary.rejectedRows}</strong></div>
                </div>
              )}

              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className="pt-2 border-t border-emerald-500/20 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                  <span className="font-bold text-rose-500 block">Sample Rejected Records (Not Silently Discarded):</span>
                  {uploadResult.errors.slice(0, 5).map((err, i) => (
                    <p key={i} className="text-slate-500 dark:text-slate-400">
                      • Row {err.row}: {err.reason}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {uploadError && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Field mapping guide */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 space-y-1">
            <span className="font-bold text-slate-700 dark:text-slate-300 block">Required Header Columns:</span>
            <p>Order ID, Product ID, Product Name, Product Category, Order Date, Delivery PIN Code, Quantity, Selling Price</p>
            <span className="font-bold text-slate-700 dark:text-slate-300 block pt-1">Optional Columns:</span>
            <p>Cost Price, Return Status, Cancellation Status, Discount, Inventory Quantity, Shipping Cost, Advertising Spend</p>
          </div>
        </div>

        {/* Merchant Profile Box */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Store className="w-4 h-4 text-brand-500" />
            <span>Store Profile &amp; Settings</span>
          </h3>

          <form onSubmit={handleProfileSave} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="text-slate-500 font-semibold">Merchant Full Name</label>
              <input
                type="text"
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-500 font-semibold">Store / Brand Name</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-500 font-semibold">Registered Email</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed"
              />
            </div>

            {profileMsg && (
              <p
                className={`text-[11px] font-semibold ${
                  profileMsg.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                }`}
              >
                {profileMsg.text}
              </p>
            )}

            <button
              type="submit"
              disabled={savingProfile}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold transition disabled:opacity-50"
            >
              {savingProfile ? 'Saving...' : 'Update Store Profile'}
            </button>
          </form>
        </div>
      </div>

      {/* Upload History Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-4 h-4 text-brand-500" />
            <span>Upload History &amp; Audit Log</span>
          </h3>
          <span className="text-xs font-mono text-slate-400">{history.length} uploads logged</span>
        </div>

        {loadingHistory ? (
          <p className="text-xs text-slate-400">Loading history...</p>
        ) : history.length === 0 ? (
          <p className="text-xs text-slate-400 p-4">No uploads logged yet for your merchant account.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">File Name</th>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Total Rows</th>
                  <th className="px-4 py-3">Imported</th>
                  <th className="px-4 py-3">Duplicates</th>
                  <th className="px-4 py-3">Rejected</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {history.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                      {log.filename}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                      {new Date(log.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">{log.totalRows}</td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {log.validRows}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500">{log.duplicateRows}</td>
                    <td className="px-4 py-3 font-mono text-rose-500">{log.invalidRows}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                          log.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : log.status === 'partial'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

