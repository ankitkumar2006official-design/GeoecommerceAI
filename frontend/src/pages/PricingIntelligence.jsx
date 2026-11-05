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
  Legend
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

  const fetchPricing = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.post('/ml/pricing', {
        productId: selectedProductId || null
      });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-brand-500" />
            <span>AI Pricing Intelligence &amp; Elasticity Simulator</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Model price elasticity (Ed = %ΔQ / %ΔP) to identify gross-profit maximizing price points.
          </p>
        </div>

        <button
          onClick={fetchPricing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 self-start sm:self-auto transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Target Selector */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-3 text-xs">
        <span className="text-slate-400 font-semibold shrink-0">Product for Pricing Analysis:</span>
        <select
          value={selectedProductId}
          onChange={(e) => setSelectedProductId(e.target.value)}
          className="flex-1 max-w-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 font-medium text-slate-800 dark:text-slate-200 focus:outline-none"
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
              title="Estimated Price Elasticity"
              value={`${data.base_metrics?.estimated_elasticity || -1.25}`}
              subtext={data.base_metrics?.has_empirical_elasticity ? 'Empirical regression from discounts' : 'Standard retail elasticity prior'}
              icon={Percent}
              color="indigo"
            />
            <StatCard
              title="Max-Profit Recommended Price"
              value={`₹${data.best_profit_recommendation?.simulated_price || 0}`}
              subtext={`${data.best_profit_recommendation?.price_change_pct > 0 ? '+' : ''}${data.best_profit_recommendation?.price_change_pct}% optimal shift`}
              icon={CheckCircle2}
              color="emerald"
            />
            <StatCard
              title="Projected Max Profit"
              value={`₹${(data.best_profit_recommendation?.simulated_gross_profit || 0).toLocaleString('en-IN')}`}
              subtext={`Margin: ${data.best_profit_recommendation?.profit_margin_pct}%`}
              icon={TrendingUp}
              color="emerald"
            />
          </div>

          {/* Interactive Pricing Simulation Slider */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-brand-500" />
                  <span>Interactive Price Shift Simulator</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Simulate retail price adjustments from -20% to +20% to observe the trade-off between volume and gross profit.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-3 py-1 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                  Price Adjustment: {sliderPct > 0 ? `+${sliderPct}%` : `${sliderPct}%`}
                </span>
              </div>
            </div>

            {/* Slider */}
            <div className="space-y-2">
              <input
                type="range"
                min={-20}
                max={20}
                step={5}
                value={sliderPct}
                onChange={(e) => setSliderPct(Number(e.target.value))}
                className="w-full accent-brand-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>-20% (Heavy Discount)</span>
                <span>-10%</span>
                <span>0% (Current)</span>
                <span>+10%</span>
                <span>+20% (Premium)</span>
              </div>
            </div>

            {/* Simulated Live Results Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">Simulated Price</span>
                <span className="text-lg font-extrabold font-mono text-slate-900 dark:text-white">
                  ₹{currentSimPoint.simulated_price}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">Simulated Demand</span>
                <span className="text-lg font-extrabold font-mono text-slate-900 dark:text-white">
                  {currentSimPoint.simulated_volume} units
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">Projected Revenue</span>
                <span className="text-lg font-extrabold font-mono text-brand-600 dark:text-brand-400">
                  ₹{(currentSimPoint.simulated_revenue || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">Projected Gross Profit</span>
                <span className="text-lg font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                  ₹{(currentSimPoint.simulated_gross_profit || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Pricing Simulation Curve Chart */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Revenue &amp; Profit Elasticity Curve
            </h3>
            <p className="text-[11px] text-slate-400">
              Blue bars represent simulated revenue; Emerald line shows projected gross profit after accounting for unit product cost.
            </p>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.simulation_curve || []} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <XAxis
                    dataKey="price_change_pct"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}%`}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`]}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #1e293b',
                      borderRadius: '0.75rem',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="simulated_revenue" fill="#0284c7" radius={[4, 4, 0, 0]} name="Projected Revenue" />
                  <Line type="monotone" dataKey="simulated_gross_profit" stroke="#10b981" strokeWidth={3} name="Gross Profit" dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Explainability & Limitations Note */}
          <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
              <HelpCircle className="w-4 h-4 text-brand-500" />
              <span>Pricing Model Methodology &amp; Safeguards</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              {data.elasticity_explanation}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
              Safety rule: GeoCommerce AI provides consultative simulation recommendations only. It does not automatically execute price changes on live marketplaces.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

