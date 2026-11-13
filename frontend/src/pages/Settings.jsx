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
    <div className="space-y-6">
      {/* Title */}
      <div className="pb-1">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          <span>Settings &amp; Data Pipeline Management</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Ingest multi-channel sales reports, maintain store credentials, and inspect automated data cleansing logs.
        </p>
      </div>

      {/* Grid: Upload Box + Merchant Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Form Box */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-xl p-5 sm:p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <span>Import Marketplace Sales Orders</span>
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
              CSV, XLSX, XLS
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Upload transaction exports from Amazon Seller Central, Flipkart Seller Hub, Meesho, or Shopify. The ingestion parser automatically validates headers and dedupes entries.
          </p>

          <form onSubmit={handleUpload} className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700/80 rounded-xl p-6 text-center hover:border-brand-500 dark:hover:border-brand-500 transition-colors cursor-pointer relative bg-slate-50/50 dark:bg-slate-950/40">
              <input
                type="file"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <FileSpreadsheet className="w-8 h-8 text-brand-600 dark:text-brand-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {file ? file.name : 'Choose a CSV or Excel file or drag & drop here'}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Maximum file size: 50MB'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="submit"
                disabled={!file || uploading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs disabled:opacity-50 transition shadow-subtle"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{uploading ? 'Processing File...' : 'Process & Ingest File'}</span>
              </button>

              <button
                type="button"
                onClick={handleLoadSample}
                disabled={loadingSample}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-medium transition shadow-subtle"
              >
                <Database className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <span>{loadingSample ? 'Seeding...' : 'Load Demo Dataset (1,500+ Orders)'}</span>
              </button>
            </div>
          </form>

          {/* Validation Report Alert */}
          {uploadResult && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs space-y-2 animate-fadeIn">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{uploadResult.message}</span>
              </div>

              {uploadResult.summary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-200/80 dark:border-emerald-800/60 font-mono text-[11px]">
                  <div>Total Rows: <strong className="text-slate-900 dark:text-white">{uploadResult.summary.totalRows}</strong></div>
                  <div>Valid Ingested: <strong className="text-emerald-600 dark:text-emerald-400">{uploadResult.summary.validImported}</strong></div>
                  <div>Duplicates Skipped: <strong className="text-slate-700 dark:text-slate-300">{uploadResult.summary.duplicateRows}</strong></div>
                  <div>Rejected Invalid: <strong className="text-rose-600 dark:text-rose-400">{uploadResult.summary.rejectedRows}</strong></div>
                </div>
              )}

              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className="pt-2 border-t border-emerald-200/80 dark:border-emerald-800/60 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                  <span className="font-semibold text-rose-600 dark:text-rose-400 block">Sample Rejected Records (Zero Silent Discards):</span>
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
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Field mapping guide */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
            <span className="font-medium text-slate-700 dark:text-slate-300 block">Required Header Columns:</span>
            <p>Order ID, Product ID, Product Name, Product Category, Order Date, Delivery PIN Code, Quantity, Selling Price</p>
            <span className="font-medium text-slate-700 dark:text-slate-300 block pt-1">Optional Enriched Columns:</span>
            <p>Cost Price, Return Status, Cancellation Status, Discount, Inventory Quantity, Shipping Cost, Advertising Spend</p>
          </div>
        </div>

        {/* Merchant Profile Box */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-xl p-5 sm:p-6 shadow-card space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Store className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <span>Store Profile &amp; Identity</span>
          </h2>

          <form onSubmit={handleProfileSave} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-slate-700 dark:text-slate-300 font-medium block">Merchant Full Name</label>
              <input
                type="text"
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-700 dark:text-slate-300 font-medium block">Store / Brand Name</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-700 dark:text-slate-300 font-medium block">Registered Email</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed text-xs"
              />
            </div>

            {profileMsg && (
              <p
                className={`text-[11px] font-medium ${
                  profileMsg.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {profileMsg.text}
              </p>
            )}

            <button
              type="submit"
              disabled={savingProfile}
              className="w-full py-2 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-semibold text-xs shadow-subtle transition disabled:opacity-50"
            >
              {savingProfile ? 'Saving...' : 'Update Store Profile'}
            </button>
          </form>
        </div>
      </div>

      {/* Upload History Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-xl p-5 sm:p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <span>Data Ingestion History &amp; Audit Log</span>
            </h2>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Immutable ledger of imported sales datasets with row validation and deduplication status.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">{history.length} batches</span>
        </div>

        {loadingHistory ? (
          <p className="text-xs text-slate-400">Loading history...</p>
        ) : history.length === 0 ? (
          <p className="text-xs text-slate-400 p-4">No uploads logged yet for your merchant account.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200/70 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200/70 dark:border-slate-800 text-[10px]">
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
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
                {history.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white truncate max-w-[200px]">
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
                    <td className="px-4 py-3 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {log.validRows}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500">{log.duplicateRows}</td>
                    <td className="px-4 py-3 font-mono text-rose-500">{log.invalidRows}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase font-mono ${
                          log.status === 'completed'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : log.status === 'partial'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
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