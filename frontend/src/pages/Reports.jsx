import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  FileText,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Reports() {
  const { user } = useAuth();
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [status, setStatus] = useState(null);

  const handleDownloadCsv = async () => {
    try {
      setDownloadingCsv(true);
      setStatus(null);
      const response = await api.get('/reports/export-csv', {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GeoCommerce_Sales_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setStatus({ type: 'success', text: 'CSV export downloaded successfully.' });
    } catch (err) {
      setStatus({ type: 'error', text: err.response?.data?.error || err.message });
    } finally {
      setDownloadingCsv(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      setStatus(null);
      const response = await api.get('/reports/export-pdf', {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GeoCommerce_Executive_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setStatus({ type: 'success', text: 'Executive PDF report downloaded successfully.' });
    } catch (err) {
      setStatus({ type: 'error', text: err.response?.data?.error || err.message });
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              <span>Intelligence Reports &amp; Data Exports</span>
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 border border-brand-200/60 dark:border-brand-800/60 font-semibold">
              PDF &amp; CSV Exports
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Compile and download enterprise sales records or executive PDF digests for strategic reviews.
          </p>
        </div>
      </div>

      {status && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center gap-2 animate-fadeIn ${
            status.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          {status.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span>{status.text}</span>
        </div>
      )}

      {/* Export Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PDF Executive Report Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-xl p-5 sm:p-6 shadow-card flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/60 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>

            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Executive PDF Intelligence Digest
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Formatted multi-section PDF document containing your financial velocity summary, top regional markets, catalog revenue distribution, and strategic recommendations.
            </p>

            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 pt-3 border-t border-slate-100 dark:border-slate-800">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Executive revenue &amp; gross margin analysis</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Geographic demand concentration table</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Safety stock and replenishment diagnostic</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Apriori cross-sell bundle suggestions</span>
              </li>
            </ul>
          </div>

          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-semibold text-xs shadow-subtle disabled:opacity-50 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloadingPdf ? 'Generating PDF...' : 'Download Executive PDF Report'}</span>
          </button>
        </div>

        {/* CSV Full Data Export Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-xl p-5 sm:p-6 shadow-card flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/60 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>

            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Complete Sales CSV Dataset
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Export all delivered sales records for your merchant account into an RFC-4180 compliant CSV spreadsheet ready for Microsoft Excel, Google Sheets, or custom BI ingestion.
            </p>

            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 pt-3 border-t border-slate-100 dark:border-slate-800">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Order dates, delivery PIN codes, and city names</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Product SKUs, titles, categories, and inventory stock</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Unit selling prices, cost prices, and discount amounts</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Shipping costs, ad attribution, and return flags</span>
              </li>
            </ul>
          </div>

          <button
            onClick={handleDownloadCsv}
            disabled={downloadingCsv}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-subtle disabled:opacity-50 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloadingCsv ? 'Compiling CSV...' : 'Download Sales CSV'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}