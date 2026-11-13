import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Package,
  ShoppingCart,
  Percent,
  TrendingUp,
  MapPin,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from 'recharts';
import api from '../services/api';
import StatCard from '../components/common/StatCard';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';

const CATEGORY_PALETTE = ['#2563eb', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b'];

export default function Overview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchOverview = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const res = await api.get('/analytics/overview');
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleLoadSample = async () => {
    try {
      setLoading(true);
      await api.post('/sales/load-sample');
      await fetchOverview();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading) return <LoadingSkeleton rows={6} />;

  if (!data || !data.hasData) {
    return <EmptyState onLoadSample={handleLoadSample} />;
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Executive Overview
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 font-medium">
              Synchronized
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Cross-channel e-commerce demand velocity, order density, and geographic distribution across Indian territories.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchOverview(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-xs font-medium text-slate-700 dark:text-slate-200 transition shadow-subtle disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-brand-600' : 'text-slate-400'}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Net Revenue"
          value={`₹${(data.totalRevenue || 0).toLocaleString('en-IN')}`}
          subtext="Net delivered sales value"
          icon={DollarSign}
          color="emerald"
          trend={14.8}
        />
        <StatCard
          title="Orders & Volume"
          value={(data.totalUnits || 0).toLocaleString('en-IN')}
          subtext={`${data.totalOrdersCount?.toLocaleString('en-IN')} individual shipments`}
          icon={Package}
          color="brand"
          trend={8.2}
        />
        <StatCard
          title="Gross Margin"
          value={`${data.profitMarginPct}%`}
          subtext={`Est. Gross: ₹${(data.grossProfit || 0).toLocaleString('en-IN')}`}
          icon={Percent}
          color="indigo"
          trend={2.4}
        />
        <StatCard
          title="Territories Active"
          value={`${data.distinctStatesCount} States`}
          subtext={`${data.distinctPincodesCount} delivery PIN codes`}
          icon={MapPin}
          color="amber"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue Trend */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Revenue Growth Velocity</h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Monthly revenue trends across all fulfillment channels (INR ₹)</p>
            </div>
            <Link
              to="/regional"
              className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 flex items-center gap-1 transition"
            >
              <span>Regional Drilldown</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthlyTrend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.15} />
                <XAxis dataKey="period" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: '0.5rem',
                    color: '#fff',
                    fontSize: '11px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Share Distribution */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-xl p-5 shadow-card flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Category Demand Share</h2>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Gross revenue proportion by product vertical</p>
          </div>

          <div className="h-48 w-full my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.categoryDistribution || []}
                  dataKey="revenue"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={72}
                  paddingAngle={3}
                >
                  {(data.categoryDistribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_PALETTE[index % CATEGORY_PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: '0.5rem',
                    color: '#fff',
                    fontSize: '11px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            {(data.categoryDistribution || []).slice(0, 4).map((cat, idx) => (
              <div key={cat.category} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length] }}
                  />
                  <span className="text-slate-600 dark:text-slate-400 truncate max-w-[130px]">{cat.category}</span>
                </div>
                <span className="font-medium text-slate-900 dark:text-slate-200 tabular-nums">
                  ₹{(cat.revenue || 0).toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Regional Markets Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-xl p-5 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Top Regional Markets</h2>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Leading states by consumer order volume and revenue generation</p>
          </div>
          <Link
            to="/regional"
            className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 flex items-center gap-1 transition"
          >
            <span>View All Regions &amp; Heatmap</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200/70 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200/70 dark:border-slate-800 text-[10px]">
              <tr>
                <th className="px-4 py-3">State / Union Territory</th>
                <th className="px-4 py-3">Units Sold</th>
                <th className="px-4 py-3">Total Revenue</th>
                <th className="px-4 py-3">Demand Share</th>
                <th className="px-4 py-3 text-right">Drilldown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
              {(data.topRegions || []).map((r) => {
                const share = data.totalRevenue > 0 ? ((r.revenue / data.totalRevenue) * 100).toFixed(1) : 0;
                return (
                  <tr key={r.state} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 shrink-0" />
                      <span>{r.state}</span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-600 dark:text-slate-400">{r.units} units</td>
                    <td className="px-4 py-3 tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                      ₹{Number(r.revenue).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-brand-600 dark:bg-brand-500 h-full rounded-full" style={{ width: `${Math.min(100, share * 2.5)}%` }} />
                        </div>
                        <span className="tabular-nums text-[11px] text-slate-400">{share}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/regional?state=${encodeURIComponent(r.state)}`}
                        className="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium inline-flex items-center gap-0.5"
                      >
                        <span>Inspect</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}