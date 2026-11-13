import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function StatCard({ title, value, subtext, icon: Icon, trend, color = 'brand' }) {
  const iconThemeMap = {
    brand: 'bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border-brand-200/60 dark:border-brand-800/60',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/60',
    amber: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/60',
    rose: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/60',
    indigo: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-800/60'
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-5 shadow-card hover:shadow-card-hover transition-all duration-150 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
            {title}
          </span>
          {Icon && (
            <div className={`p-2 rounded-lg border ${iconThemeMap[color] || iconThemeMap.brand}`}>
              <Icon className="w-4 h-4" />
            </div>
          )}
        </div>

        <div className="flex items-baseline gap-2 flex-wrap">
          <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
            {value}
          </h3>
          {trend !== undefined && trend !== null && (
            <span
              className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${
                Number(trend) >= 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60'
                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60'
              }`}
            >
              {Number(trend) >= 0 ? (
                <ArrowUpRight className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <ArrowDownRight className="w-3 h-3 text-rose-600 dark:text-rose-400" />
              )}
              {Number(trend) >= 0 ? `+${trend}%` : `${trend}%`}
            </span>
          )}
        </div>
      </div>

      {subtext && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 truncate">
          {subtext}
        </p>
      )}
    </div>
  );
}

