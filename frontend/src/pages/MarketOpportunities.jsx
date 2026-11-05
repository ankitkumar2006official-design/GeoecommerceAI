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
  ChevronUp
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
  const [error, setError] = useState(null);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.post('/ml/opportunity-score', { groupBy });
      setOpportunities(res.data.results || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Compass className="w-6 h-6 text-brand-500" />
            <span>AI Regional Opportunity Scoring</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Explainable multi-factor scoring (0-100) combining demand volume, margin, growth velocity, and return quality.
          </p>
        </div>

        {/* Level selector */}
        <div className="flex items-center p-1 bg-slate-200 dark:bg-slate-800 rounded-xl text-xs font-semibold self-start sm:self-auto">
          {['state', 'city', 'pincode'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setGroupBy(lvl)}
              className={`px-3 py-1.5 rounded-lg capitalize transition ${
                groupBy === lvl
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              By {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by product name or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <button
          onClick={fetchOpportunities}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Recalculate Scores</span>
        </button>
      </div>

      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : opportunities.length === 0 ? (
        <EmptyState title="No opportunities calculated" description="Upload sales data to run the scoring algorithm." />
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
              subtext="Solid margins & growing consumer traction"
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Regional Opportunity Score Leaderboard
                </h3>
                <p className="text-[11px] text-slate-400">
                  Ranked by multi-factor mathematical opportunity index (Click row to expand factor weights).
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">{filtered.length} recommendations</span>
            </div>

            <div className="space-y-3">
              {filtered.slice(0, 20).map((op, idx) => {
                const isExpanded = expandedIndex === idx;
                const scoreColor =
                  op.opportunity_score >= 80
                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                    : op.opportunity_score >= 60
                    ? 'text-brand-600 dark:text-brand-400 bg-brand-500/10 border-brand-500/30'
                    : 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30';

                return (
                  <div
                    key={`${op.product_id}-${op.location}-${idx}`}
                    className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 hover:border-brand-500/50 transition cursor-pointer"
                    onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Product & Location */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-[10px] font-bold text-slate-600 dark:text-slate-300">
                            {op.location}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{op.category}</span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{op.product_name}</h4>
                        <p className="text-xs text-brand-600 dark:text-brand-400 font-medium">
                          ⚡ {op.recommended_action}
                        </p>
                      </div>

                      {/* Right: Metrics & Score */}
                      <div className="flex items-center gap-4 shrink-0 font-mono text-xs">
                        <div className="text-right hidden sm:block">
                          <span className="text-[9px] text-slate-400 uppercase block">Units Sold</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{op.units_sold}</span>
                        </div>
                        <div className="text-right hidden sm:block">
                          <span className="text-[9px] text-slate-400 uppercase block">Profit Margin</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{op.profit_margin_pct}%</span>
                        </div>
                        <div className="text-right hidden md:block">
                          <span className="text-[9px] text-slate-400 uppercase block">Confidence</span>
                          <span className="font-bold text-slate-600 dark:text-slate-300">{op.confidence}</span>
                        </div>

                        {/* Opportunity Score Badge */}
                        <div className={`px-3 py-1.5 rounded-xl border flex flex-col items-center justify-center min-w-[65px] ${scoreColor}`}>
                          <span className="text-[9px] uppercase font-bold tracking-wider">Score</span>
                          <span className="text-base font-extrabold">{op.opportunity_score}</span>
                        </div>

                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>

                    {/* Expanded Factor Breakdown */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3 animate-fadeIn">
                        <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Mathematical Factor Breakdown (Weights &amp; Scores)
                        </h5>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          {op.contributing_factors?.map((f, fIdx) => (
                            <div key={fIdx} className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-slate-600 dark:text-slate-400 text-[11px] truncate">{f.factor}</span>
                                <span className="font-mono font-bold text-slate-900 dark:text-white">{f.score}/100</span>
                              </div>
                              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-brand-500 h-full rounded-full" style={{ width: `${Math.min(100, f.score)}%` }} />
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

