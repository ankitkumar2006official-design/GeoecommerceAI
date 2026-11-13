import React from 'react';

export default function LoadingSkeleton({ rows = 4, className = '' }) {
  return (
    <div className={`space-y-4 animate-pulse ${className}`}>
      <div className="h-7 bg-slate-200/80 dark:bg-slate-800/80 rounded-lg w-1/4" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-slate-200/80 dark:bg-slate-800/80 rounded-xl" />
        ))}
      </div>
      <div className="h-64 bg-slate-200/80 dark:bg-slate-800/80 rounded-xl" />
      <div className="space-y-2 pt-2">
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="h-9 bg-slate-200/80 dark:bg-slate-800/80 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

