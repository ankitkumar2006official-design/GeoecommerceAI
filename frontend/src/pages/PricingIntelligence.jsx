import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Percent,
  Sliders,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import api from '../services/api';
import StatCard from '../components/common/StatCard';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';

export default function PricingIntelligence() {
  const [data, setData] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productsList, setProductsList] = useState([]);
  const [sliderPct, setSliderPct] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await api.get('/analytics/product-analytics');
        setProductsList(res.data.products || []);
      } catch (e) {
        console.warn('Error loading products for pricing:', e.message);
      }
    }
    loadProducts();
  }, []);

  const fetchPricing = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const res = await api.post('/ml/pricing', {
        productId: selectedProductId || null
      });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPricing();
  }, [selectedProductId]);

  // Current simulation point based on sliderPct
  const currentSimPoint = data?.simulation_curve?.find((p) => p.price_change_pct === sliderPct) || {
    simulated_price: data?.base_metrics?.base_price || 0,
    simulated_volume: data?.base_metrics?.base_volume || 0,
    simulated_revenue: data?.base_metrics?.base_revenue || 0,
    simulated_gross_profit: data?.base_metrics?.base_profit || 0,
    profit_margin_pct: 0
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              <span>Pricing Intelligence &amp; Elasticity Simulator</span>
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 border border-brand-200/60 dark:border-brand-800/60 font-semibold">
              Ed = %ΔQ / %ΔP
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Model price elasticity of demand to identify gross-margin maximizing price points across the catalog.
          </p>
        </div>

        <button
          onClick={() => fetchPricing(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 self-start sm:self-auto transition shadow-subtle disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-brand-600' : 'text-slate-400'}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Target Selector */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-xl p-3.5 shadow-card flex items-center gap-3 text-xs">
        <span className="text-slate-400 text-[11px] font-medium shrink-0">Product for Pricing Analysis:</span>
        <select
          value={selectedProductId}
          onChange={(e) => setSelectedProductId(e.target.value)}
          className="flex-1 max-w-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
        >
          <option value="">Full Store Catalog Aggregate</option>
          {productsList.map((p) => (
            <option key={p.productId} value={p.productId}>
              {p.productName} ({p.productId})
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : !data || !data.simulation_curve ? (
        <EmptyState title="Pricing Intelligence Unavailable" description="Upload sales data to calibrate pricing curves." />
      ) : (
        <>
          {/* Base vs Optimal KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Baseline Selling Price"
              value={`₹${data.base_metrics?.base_price || 0}`}
              subtext={`Cost: ₹${data.base_metrics?.base_cost || 0} / unit`}
              icon={DollarSign}
              color="brand"
            />
            <StatCard
              title="Estimated Elasticity"
              value={`${data.base_metrics?.estimated_elasticity || -1.25}`}
              subtext={data.base_metrics?.has_empirical_elasticity ? 'Empirical regression from discounts' : 'Standard retail elasticity prior'}
              icon={Percent}
              color="indigo"
            />
            <StatCard
              title="Max-Profit Price Point"
              value={`₹${data.best_profit_recommendation?.simulated_price || 0}`}
              subtext={`${data.best_profit_recommendation?.price_change_pct > 0 ? '+' : ''}${data.best_profit_recommendation?.price_change_pct}% optimal shift`}
              icon={CheckCircle2}
              color="emerald"
            />
            <StatCard
              title="Projected Max Profit"
              value={`₹${(data.best_profit_recommendation?.simulated_gross_profit || 0).toLocaleString('en-IN')}`}
              subtext={`Gross Margin: ${data.best_profit_recommendation?.profit_margin_pct}%`}
              icon={TrendingUp}
              color="emerald"
            />
          </div>

          {/* Interactive Pricing Simulation Slider */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-xl p-5 sm:p-6 shadow-card space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                  <span>Interactive Price Shift Simulator</span>
                </h2>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Simulate retail price shifts (-20% to +20%) to observe volume sensitivity vs net gross profitability.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-md bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/60">
                  Shift: {sliderPct > 0 ? `+${sliderPct}%` : `${sliderPct}%`}
                </span>
              </div>
            </div>

            {/* Range Slider */}
            <div className="space-y-2">
              <input
                type="range"
                min={-20}
                max={20}
                step={5}
                value={sliderPct}
                onChange={(e) => setSliderPct(Number(e.target.value))}
                className="w-full accent-brand-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>-20% (Discount)</span>
                <span>-10%</span>
                <span>0% (Baseline)</span>
                <span>+10%</span>
                <span>+20% (Premium)</span>
              </div>
            </div>

            {/* Simulated Live Results Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50/70 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-medium">Simulated Price</span>
                <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                  ₹{currentSimPoint.simulated_price}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-medium">Projected Units</span>
                <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                  {currentSimPoint.simulated_volume}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-medium">Gross Revenue</span>
                <span className="text-lg font-bold font-mono text-brand-600 dark:text-brand-400">
                  ₹{(currentSimPoint.simulated_revenue || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-medium">Gross Profit</span>
                <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  ₹{(currentSimPoint.simulated_gross_profit || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Pricing Simulation Curve Chart */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-xl p-5 shadow-card space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Revenue &amp; Profit Elasticity Curve
              </h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Blue bars represent simulated gross revenue; Emerald line charts net gross profit factoring in unit product cost.
              </p>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.simulation_curve || []} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.15} />
                  <XAxis
                    dataKey="price_change_pct"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}%`}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`]}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #1e293b',
                      borderRadius: '0.5rem',
                      color: '#fff',
                      fontSize: '11px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar dataKey="simulated_revenue" fill="#2563eb" radius={[4, 4, 0, 0]} name="Projected Revenue" />
                  <Line type="monotone" dataKey="simulated_gross_profit" stroke="#10b981" strokeWidth={2.5} name="Gross Profit" dot={{ r: 3, fill: '#10b981' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Explainability & Limitations Note */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1.5 shadow-subtle">
            <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
              <HelpCircle className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <span>Pricing Methodology &amp; Execution Safeguards</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              {data.elasticity_explanation}
            </p>
            <p className="text-[11px] text-slate-400 italic">
              Note: GeoCommerce AI provides strategic pricing simulations. Price updates must be confirmed and executed manually on target marketplaces.
            </p>
          </div>
        </>
      )}
    </div>
  );
}