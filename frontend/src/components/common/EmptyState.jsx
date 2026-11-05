import React from 'react';
import { Database, UploadCloud } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EmptyState({
  title = 'No Sales Data Available',
  description = 'Upload your marketplace CSV/Excel sales report or load our verified Indian e-commerce demo dataset to activate real analytics.',
  onLoadSample
}) {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 my-6 shadow-sm">
      <div className="w-16 h-16 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-4">
        <Database className="w-8 h-8" />
      </div>

      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">{description}</p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {onLoadSample && (
          <button
            onClick={onLoadSample}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-md shadow-brand-500/20 transition"
          >
            <Database className="w-4 h-4" />
            <span>Load Demo Dataset (1,500+ Orders)</span>
          </button>
        )}

        <Link
          to="/settings"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload CSV / Excel File</span>
        </Link>
      </div>
    </div>
  );
}

