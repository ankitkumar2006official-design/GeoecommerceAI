import React from 'react';
import { Database, UploadCloud } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EmptyState({
  title = 'No Sales Data Available',
  description = 'Upload your marketplace CSV/Excel sales report or load our verified Indian e-commerce demo dataset to activate real analytics.',
  onLoadSample
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 my-6 shadow-subtle">
      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center mb-4">
        <Database className="w-6 h-6 text-brand-600 dark:text-brand-400" />
      </div>

      <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1.5">{title}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">{description}</p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {onLoadSample && (
          <button
            onClick={onLoadSample}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-subtle transition"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Load Demo Dataset (1,500+ Orders)</span>
          </button>
        )}

        <Link
          to="/settings"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Upload CSV / Excel File</span>
        </Link>
      </div>
    </div>
  );
}

