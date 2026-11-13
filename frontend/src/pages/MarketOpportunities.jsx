import React, { useState, useEffect } from 'react';
import {
  Compass,
  TrendingUp,
  Sparkles,
  HelpCircle,
  RefreshCw,
  Search,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Zap
} from 'lucide-react';
import api from '../services/api';
import StatCard from '../components/common/StatCard';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';

export default function MarketOpportunities() {
  const [opportunities, setOpportunities] = useState([]);
  const [groupBy, setGroupBy] = useState('state');
  const [search, setSearch] = useState('');
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState(null);

  const fetchOpportunities = async (isManual = false) => {
    try {
      if (isManual) setRecalculating(true);
      else setLoading(true);
      setError(null);
      const res = await api.post('/ml/opportunity-score', { groupBy });
      setOpportunities(res.data.results || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
      setRecalculating(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, [groupBy]);

  const filtered = opportunities.filter((op) =>
    op.product_name.toLowerCase().includes(search.toLowerCase()) ||
    op.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              <span>Regional Market Opportunities</span>
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 font-semibold">
              Scoring Index (0-100)
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Explainable multi-factor scoring evaluating volume traction, gross profit margin, return risk, and growth momentum.
          </p>
        </div>

        {/* Level selector segmented tabs */}
        <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 rounded-lg text-xs font-medium self-start sm:self-auto shadow-subtle">
          {['state', 'city', 'pincode'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setGroupBy(lvl)}
              className={`px-3 py-1.5 rounded-md capitalize transition-all ${
                groupBy === lvl
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 font-semibold shadow-subtle'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              By {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-xl p-3.5 shadow-card flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by product name or geographic location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500 placeholder:text-slate-400 transition"
          />
        </div>

        <button
          onClick={() => fetchOpportunities(true)}
          disabled={recalculating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition shadow-subtle disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${recalculating ? 'animate-spin text-brand-600' : 'text-slate-400'}`} />
          <span>{recalculating ? 'Scoring...' : 'Recalculate Scores'}</span>
        </button>
      </div>

      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : opportunities.length === 0 ? (
        <EmptyState title="No opportunities calculated" description="Upload sales data to calibrate the opportunity scoring algorithm." />
      ) : (
        <>
          {/* Top Hotspots Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Prime Hotspots (Score ≥ 80)"
              value={opportunities.filter((o) => o.opportunity_score >= 80).length}
              subtext="Highest commercial expansion potential"
              icon={Sparkles}
              color="emerald"
            />
            <StatCard
              title="Growth Niches (Score 60-79)"
              value={opportunities.filter((o) => o.opportunity_score >= 60 && o.opportunity_score < 80).length}
              subtext="Solid margins & growing demand velocity"
              icon={TrendingUp}
              color="brand"
            />
            <StatCard
              title="Avg Margin in Top 10"
              value={`${Math.round(opportunities.slice(0, 10).reduce((acc, o) => acc + o.profit_margin_pct, 0) / Math.min(10, opportunities.length))}%`}
              subtext="Healthy profit across priority areas"
              icon={Compass}
              color="indigo"
            />
          </div>

          {/* Opportunities Leaderboard */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-xl p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Regional Opportunity Score Leaderboard
                </h2>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Ranked by multi-factor mathematical opportunity index (Click any row to view weighted feature decomposition).
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">{filtered.length} recommendations</span>
            </div>

            <div className="space-y-2.5">
              {filtered.slice(0, 20).map((op, idx) => {
                const isExpanded = expandedIndex === idx;
                const scoreTier =
                  op.opportunity_score >= 80
                    ? 'emerald'
                    : op.opportunity_score >= 60
                    ? 'brand'
                    : 'amber';

                return (
                  <div
                    key={`${op.product_id}-${op.location}-${idx}`}
                    className="border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 transition-all cursor-pointer shadow-subtle"
                    onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Product & Location */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                            {op.location}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{op.category}</span>
                        </div>
                        <h3 className="font-semibold text-sm text-slate-900 dark:text-white">{op.product_name}</h3>
                        <p className="text-xs text-brand-600 dark:text-brand-400 font-medium flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          <span>{op.recommended_action}</span>
                        </p>
                      </div>

                      {/* Right: Metrics & Score */}
                      <div className="flex items-center gap-4 shrink-0 font-mono text-xs">
                        <div className="text-right hidden sm:block">
                          <span className="text-[9px] text-slate-400 uppercase block font-medium">Units Sold</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{op.units_sold}</span>
                        </div>
                        <div className="text-right hidden sm:block">
                          <span className="text-[9px] text-slate-400 uppercase block font-medium">Gross Margin</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{op.profit_margin_pct}%</span>
                        </div>
                        <div className="text-right hidden md:block">
                          <span className="text-[9px] text-slate-400 uppercase block font-medium">Confidence</span>
                          <span className="font-semibold text-slate-600 dark:text-slate-300">{op.confidence}</span>
                        </div>

                        {/* Opportunity Score Badge */}
                        <div className={`px-2.5 py-1 rounded-lg border flex flex-col items-center justify-center min-w-[60px] ${
                          scoreTier === 'emerald'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : scoreTier === 'brand'
                            ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-800'
                            : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                        }`}>
                          <span className="text-[8px] uppercase font-bold tracking-wider opacity-75">Score</span>
                          <span className="text-sm font-bold">{op.opportunity_score}</span>
                        </div>

                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>

                    {/* Expanded Factor Breakdown */}
                    {isExpanded && (
                      <div className="mt-3.5 pt-3.5 border-t border-slate-100 dark:border-slate-800 space-y-2.5 animate-fadeIn">
                        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Mathematical Factor Breakdown (Normalized Weights &amp; Feature Values)
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                          {op.contributing_factors?.map((f, fIdx) => (
                            <div key={fIdx} className="bg-slate-50 dark:bg-slate-850 p-2.5 rounded-lg border border-slate-200/70 dark:border-slate-800 text-xs">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-slate-600 dark:text-slate-400 text-[11px] truncate">{f.factor}</span>
                                <span className="font-mono font-semibold text-slate-900 dark:text-white">{f.score}/100</span>
                              </div>
                              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-brand-600 dark:bg-brand-500 h-full rounded-full" style={{ width: `${Math.min(100, f.score)}%` }} />
                              </div>
                              <span className="text-[9px] text-slate-400 font-mono block mt-1">Weight: {Math.round(f.weight * 100)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}