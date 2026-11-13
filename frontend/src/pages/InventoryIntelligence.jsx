import React, { useState, useEffect } from 'react';
import {
  Boxes,
  AlertTriangle,
  ArrowRightLeft,
  RefreshCw,
  ShieldAlert,
  Clock,
  TrendingDown,
  Sparkles,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import api from '../services/api';
import StatCard from '../components/common/StatCard';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';

export default function InventoryIntelligence() {
  const [data, setData] = useState(null);
  const [leadTime, setLeadTime] = useState(7);
  const [activeTab, setActiveTab] = useState('reorder'); // 'reorder', 'deadstock', 'gaps', 'transfers'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.post('/ml/inventory-optimizer', {
        leadTimeDays: leadTime
      });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [leadTime]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Boxes className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <span>Smart Inventory Optimization</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Safety stock calculation (SS = Z·σ·√L), reorder points (ROP), stockout mitigation, and inter-hub transfer routes.
          </p>
        </div>

        {/* Lead time configuration */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-lg text-xs shadow-subtle self-start sm:self-auto">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">Lead Time:</span>
          <select
            value={leadTime}
            onChange={(e) => setLeadTime(Number(e.target.value))}
            className="bg-transparent font-semibold text-slate-800 dark:text-slate-200 text-xs focus:outline-none cursor-pointer"
          >
            <option value={3} className="bg-white dark:bg-slate-900">3 Days (Express local)</option>
            <option value={7} className="bg-white dark:bg-slate-900">7 Days (Standard India)</option>
            <option value={14} className="bg-white dark:bg-slate-900">14 Days (Cross-region)</option>
            <option value={21} className="bg-white dark:bg-slate-900">21 Days (Custom/Import)</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : !data || !data.inventory_items ? (
        <EmptyState title="No inventory metrics available" description="Upload sales data to calibrate safety stock." />
      ) : (
        <>
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Critical Stockouts"
              value={data.summary?.critical_stockouts || 0}
              subtext="SKUs below Safety Stock buffer"
              color={data.summary?.critical_stockouts > 0 ? 'rose' : 'emerald'}
              icon={AlertTriangle}
            />
            <StatCard
              title="Dead Stock Items"
              value={data.summary?.dead_stock_count || 0}
              subtext="Stagnant inventory requiring action"
              color="amber"
              icon={TrendingDown}
            />
            <StatCard
              title="Capital at Risk"
              value={`₹${(data.summary?.total_capital_at_risk || 0).toLocaleString('en-IN')}`}
              subtext="Locked in low-velocity stock"
              color="rose"
              icon={ShieldAlert}
            />
            <StatCard
              title="Rebalance Routes"
              value={data.transfer_recommendations?.length || 0}
              subtext="Inter-state inventory transfers"
              color="brand"
              icon={ArrowRightLeft}
            />
          </div>

          {/* Module Navigation Tabs */}
          <div className="flex border-b border-slate-200/80 dark:border-slate-800 gap-6 text-xs font-medium overflow-x-auto">
            <button
              onClick={() => setActiveTab('reorder')}
              className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'reorder'
                  ? 'border-brand-600 text-brand-600 dark:text-brand-400 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Safety Stock &amp; Reorder Points ({data.inventory_items?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('deadstock')}
              className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'deadstock'
                  ? 'border-rose-600 text-rose-600 dark:text-rose-400 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Dead Stock Mitigation ({data.dead_stock_items?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('gaps')}
              className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'gaps'
                  ? 'border-amber-600 text-amber-600 dark:text-amber-400 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Market Supply Gaps ({data.market_gaps?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('transfers')}
              className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'transfers'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Inter-Hub Transfers ({data.transfer_recommendations?.length || 0})</span>
            </button>
          </div>

          {/* TAB 1: Reorder & Safety Stock Table */}
          {activeTab === 'reorder' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-xl p-5 shadow-card space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Stockout Risk &amp; Reorder Quantities
                </h2>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Calibrated at 95% cycle service level (Z = 1.645) across a {leadTime}-day replenishment horizon.
                </p>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200/70 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200/70 dark:border-slate-800 text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Product Name &amp; SKU</th>
                      <th className="px-4 py-3">Current Stock</th>
                      <th className="px-4 py-3">Safety Stock (SS)</th>
                      <th className="px-4 py-3">Reorder Point (ROP)</th>
                      <th className="px-4 py-3">Days of Supply</th>
                      <th className="px-4 py-3">Risk Tier</th>
                      <th className="px-4 py-3">Restock Recommendation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
                    {data.inventory_items?.map((item) => (
                      <tr key={item.product_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900 dark:text-white truncate max-w-[200px]">{item.product_name}</p>
                          <span className="text-[10px] text-slate-400 font-mono">{item.product_id} • {item.category}</span>
                        </td>
                        <td className="px-4 py-3 tabular-nums font-semibold text-slate-900 dark:text-white">
                          {item.current_stock} units
                        </td>
                        <td className="px-4 py-3 tabular-nums text-slate-600 dark:text-slate-400">
                          {item.safety_stock} units
                        </td>
                        <td className="px-4 py-3 tabular-nums text-slate-700 dark:text-slate-300">
                          {item.reorder_point} units
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          <span className={`${item.days_of_stock < 14 ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-slate-600 dark:text-slate-400'}`}>
                            {item.days_of_stock} days
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${
                              item.stockout_risk === 'Critical'
                                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                                : item.stockout_risk === 'Moderate'
                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
                                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                            }`}
                          >
                            {item.stockout_risk}
                          </span>
                        </td>
                        <td className="px-4 py-3 tabular-nums font-semibold text-brand-600 dark:text-brand-400">
                          {item.suggested_reorder_qty > 0 ? `+${item.suggested_reorder_qty} units` : 'Optimal'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Dead Stock Prevention */}
          {activeTab === 'deadstock' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-xl p-5 shadow-card space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Dead Stock Diagnostic &amp; Mitigation Engine
                </h2>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Detects slow-moving inventory at risk of capital depreciation and obsolescence.
                </p>
              </div>

              {data.dead_stock_items?.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                  ✓ Healthy inventory rotation. No stagnant or dead stock risks identified across your catalog.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.dead_stock_items.map((item) => (
                    <div
                      key={item.product_id}
                      className="p-4 rounded-xl border border-rose-200/80 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-sm text-slate-900 dark:text-white">{item.product_name}</h3>
                          <span className="text-[10px] text-slate-400 font-mono">{item.product_id} • {item.category}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-mono font-semibold text-[10px] border border-rose-200 dark:border-rose-800">
                          Risk: {item.dead_stock_score}/100
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs font-mono bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800">
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase block font-medium">Stuck Units</span>
                          <span className="font-semibold">{item.current_stock}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase block font-medium">Days Inactive</span>
                          <span className="font-semibold text-rose-600 dark:text-rose-400">{item.days_inactive}d</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase block font-medium">Capital at Risk</span>
                          <span className="font-semibold text-rose-600 dark:text-rose-400">₹{item.capital_at_risk.toLocaleString('en-IN')}</span>
                        </div>
                      </div>

                      <div className="space-y-1 text-xs">
                        <span className="font-medium text-slate-600 dark:text-slate-400 block text-[10px] uppercase">
                          Contributing Factors:
                        </span>
                        {item.possible_reasons?.map((r, i) => (
                          <p key={i} className="text-slate-600 dark:text-slate-400 text-[11px]">• {r}</p>
                        ))}
                      </div>

                      <div className="space-y-1 text-xs pt-2 border-t border-rose-200/80 dark:border-rose-900/40">
                        <span className="font-semibold text-brand-600 dark:text-brand-400 block text-[10px] uppercase">
                          AI Recommended Action:
                        </span>
                        {item.recommended_actions?.map((a, i) => (
                          <p key={i} className="text-slate-800 dark:text-slate-200 font-medium text-[11px]">→ {a}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Market Supply Gaps */}
          {activeTab === 'gaps' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-xl p-5 shadow-card space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Market Demand vs Supply Gap Detector
                </h2>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Identifies geographical regions with elevated demand where local inventory is critically constrained.
                </p>
              </div>

              {data.market_gaps?.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No regional inventory deficits detected. Inventory aligns with local demand.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.market_gaps.map((gap, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-semibold font-mono text-[10px] border border-amber-200 dark:border-amber-800">
                            {gap.location}
                          </span>
                          <h3 className="font-semibold text-sm text-slate-900 dark:text-white">{gap.product_name}</h3>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {gap.gap_type} — Accounts for <strong>{gap.demand_share_pct}%</strong> of all product demand.
                        </p>
                        <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                          {gap.suggested_action}
                        </p>
                      </div>

                      <div className="flex items-center gap-5 text-xs font-mono shrink-0">
                        <div>
                          <span className="text-[9px] text-slate-400 block uppercase font-medium">Area Demand</span>
                          <span className="font-semibold text-sm text-slate-900 dark:text-white tabular-nums">{gap.regional_demand_units} units</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block uppercase font-medium">Stock</span>
                          <span className="font-semibold text-sm text-rose-600 dark:text-rose-400 tabular-nums">{gap.available_inventory} units</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block uppercase font-medium">Opportunity</span>
                          <span className="font-semibold text-sm text-brand-600 dark:text-brand-400 tabular-nums">{gap.opportunity_score}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Inter-Hub Transfers */}
          {activeTab === 'transfers' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-xl p-5 shadow-card space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Inter-State Stock Transfer Recommendations
                </h2>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Rebalances stock from low-velocity states to surging clusters without additional capital outlay.
                </p>
              </div>

              {data.transfer_recommendations?.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Inventory distribution across Indian states is currently well-balanced.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.transfer_recommendations.map((t, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                          Route #{idx + 1}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-mono font-semibold text-[10px] border border-indigo-200 dark:border-indigo-800">
                          Transfer: {t.recommended_units} units
                        </span>
                      </div>

                      <h3 className="font-semibold text-sm text-slate-900 dark:text-white">{t.product_name}</h3>

                      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 text-xs font-mono">
                        <div className="text-left">
                          <span className="text-[9px] text-slate-400 uppercase block font-medium">Source (Overstocked)</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{t.source_region}</span>
                        </div>
                        <ArrowRightLeft className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                        <div className="text-right">
                          <span className="text-[9px] text-slate-400 uppercase block font-medium">Destination (Surging)</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{t.destination_region}</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {t.reason}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}