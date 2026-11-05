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
  CheckCircle2
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Boxes className="w-6 h-6 text-brand-500" />
            <span>Smart Inventory Optimization</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Safety stock calculation (SS = Z·σ·√L), reorder points (ROP), stockout risk prevention, and inter-hub transfers.
          </p>
        </div>

        {/* Lead time configuration */}
        <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs self-start sm:self-auto">
          <Clock className="w-4 h-4 text-slate-400" />
          <span className="text-slate-500 font-medium">Supplier Lead Time:</span>
          <select
            value={leadTime}
            onChange={(e) => setLeadTime(Number(e.target.value))}
            className="bg-slate-100 dark:bg-slate-800 rounded-lg px-2 py-1 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value={3}>3 Days (Express local)</option>
            <option value={7}>7 Days (Standard India)</option>
            <option value={14}>14 Days (Cross-region)</option>
            <option value={21}>21 Days (Import/Custom)</option>
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
              title="Dead Stock SKUs"
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
              title="Recommended Transfers"
              value={data.transfer_recommendations?.length || 0}
              subtext="Inter-state rebalancing routes"
              color="brand"
              icon={ArrowRightLeft}
            />
          </div>

          {/* Module Navigation Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-xs font-bold">
            <button
              onClick={() => setActiveTab('reorder')}
              className={`pb-3 border-b-2 transition flex items-center gap-1.5 ${
                activeTab === 'reorder'
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>Safety Stock & Reorder Points ({data.inventory_items?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('deadstock')}
              className={`pb-3 border-b-2 transition flex items-center gap-1.5 ${
                activeTab === 'deadstock'
                  ? 'border-rose-500 text-rose-600 dark:text-rose-400'
                  : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <TrendingDown className="w-4 h-4" />
              <span>Dead Stock Prevention ({data.dead_stock_items?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('gaps')}
              className={`pb-3 border-b-2 transition flex items-center gap-1.5 ${
                activeTab === 'gaps'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Market Supply Gaps ({data.market_gaps?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('transfers')}
              className={`pb-3 border-b-2 transition flex items-center gap-1.5 ${
                activeTab === 'transfers'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Warehouse Stock Transfers ({data.transfer_recommendations?.length || 0})</span>
            </button>
          </div>

          {/* TAB 1: Reorder & Safety Stock Table */}
          {activeTab === 'reorder' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Stockout Risk & Reorder Quantities
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Calculated with 95% cycle service level (Z = 1.645) and {leadTime}-day replenishment lead time.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Product Name</th>
                      <th className="px-4 py-3">Current Stock</th>
                      <th className="px-4 py-3">Safety Stock (SS)</th>
                      <th className="px-4 py-3">Reorder Point (ROP)</th>
                      <th className="px-4 py-3">Days of Supply</th>
                      <th className="px-4 py-3">Stockout Risk</th>
                      <th className="px-4 py-3">Recommended Restock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {data.inventory_items?.map((item) => (
                      <tr key={item.product_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{item.product_name}</p>
                          <span className="text-[10px] text-slate-400 font-mono">{item.product_id} • {item.category}</span>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                          {item.current_stock} units
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                          {item.safety_stock} units
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">
                          {item.reorder_point} units
                        </td>
                        <td className="px-4 py-3 font-mono">
                          <span className={`${item.days_of_stock < 14 ? 'text-rose-500 font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
                            {item.days_of_stock} days
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                              item.stockout_risk === 'Critical'
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                : item.stockout_risk === 'Moderate'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            }`}
                          >
                            {item.stockout_risk}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-brand-600 dark:text-brand-400">
                          {item.suggested_reorder_qty > 0 ? `+${item.suggested_reorder_qty} units` : 'Adequate'}
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
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Dead Stock Diagnostic & Mitigation Engine
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Identifies slow-moving products risking capital depreciation and shelf expiration.
                  </p>
                </div>
              </div>

              {data.dead_stock_items?.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  ✓ Healthy inventory rotation. No dead stock risks detected across your catalog!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.dead_stock_items.map((item) => (
                    <div
                      key={item.product_id}
                      className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{item.product_name}</h4>
                          <span className="text-[10px] text-slate-400 font-mono">{item.product_id} • {item.category}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-mono font-bold text-[10px]">
                          Risk: {item.dead_stock_score}/100
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs font-mono bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase block">Units Stuck</span>
                          <span className="font-bold">{item.current_stock}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase block">Days Inactive</span>
                          <span className="font-bold text-rose-500">{item.days_inactive}d</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase block">Capital at Risk</span>
                          <span className="font-bold text-rose-600 dark:text-rose-400">₹{item.capital_at_risk.toLocaleString('en-IN')}</span>
                        </div>
                      </div>

                      <div className="space-y-1 text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300 block text-[10px] uppercase">
                          Root Causes:
                        </span>
                        {item.possible_reasons?.map((r, i) => (
                          <p key={i} className="text-slate-500 dark:text-slate-400 text-[11px]">• {r}</p>
                        ))}
                      </div>

                      <div className="space-y-1 text-xs pt-1 border-t border-rose-200 dark:border-rose-900/40">
                        <span className="font-bold text-brand-600 dark:text-brand-400 block text-[10px] uppercase">
                          AI Recommended Actions:
                        </span>
                        {item.recommended_actions?.map((a, i) => (
                          <p key={i} className="text-slate-700 dark:text-slate-300 font-medium text-[11px]">→ {a}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Market Gap Detector */}
          {activeTab === 'gaps' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Market Demand vs Supply Gap Detector
                </h3>
                <p className="text-[11px] text-slate-400">
                  Pinpoints regional customer demand surges where seller inventory is critically under-allocated.
                </p>
              </div>

              {data.market_gaps?.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No critical regional inventory deficits detected. Seller stock matches recent geographic demand.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.market_gaps.map((gap, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-bold font-mono text-[10px]">
                            {gap.location}
                          </span>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">{gap.product_name}</h4>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {gap.gap_type} — Accounts for <strong>{gap.demand_share_pct}%</strong> of all product demand.
                        </p>
                        <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                          {gap.suggested_action}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono shrink-0">
                        <div>
                          <span className="text-[9px] text-slate-400 block uppercase">Area Demand</span>
                          <span className="font-bold text-sm text-slate-900 dark:text-white">{gap.regional_demand_units} units</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block uppercase">Total Stock</span>
                          <span className="font-bold text-sm text-rose-500">{gap.available_inventory} units</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block uppercase">Opportunity</span>
                          <span className="font-bold text-sm text-brand-500">{gap.opportunity_score}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Inter-Warehouse Transfers */}
          {activeTab === 'transfers' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Inter-State Inventory Transfer Recommendations
                </h3>
                <p className="text-[11px] text-slate-400">
                  Rebalances stock from low-velocity states to surging regional clusters without purchasing additional inventory.
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
                      className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          Route #{idx + 1}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-indigo-500 text-white font-mono font-bold text-[10px]">
                          Transfer: {t.recommended_units} units
                        </span>
                      </div>

                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{t.product_name}</h4>

                      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-mono">
                        <div className="text-left">
                          <span className="text-[9px] text-slate-400 uppercase block">Source (Overstocked)</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">{t.source_region}</span>
                        </div>
                        <ArrowRightLeft className="w-4 h-4 text-brand-500" />
                        <div className="text-right">
                          <span className="text-[9px] text-slate-400 uppercase block">Destination (Surging)</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{t.destination_region}</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400">
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

