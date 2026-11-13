import React, { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  TrendingUp,
  Percent,
  CheckCircle2,
  RefreshCw,
  Truck,
  ArrowRight
} from 'lucide-react';
import api from '../services/api';
import StatCard from '../components/common/StatCard';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';

export default function WarehouseAdvisor() {
  const [data, setData] = useState(null);
  const [numHubs, setNumHubs] = useState(2);
  const [currentHubs, setCurrentHubs] = useState(['Gurugram (NCR Hub)']);
  const [loading, setLoading] = useState(true);
  const [reoptimizing, setReoptimizing] = useState(false);
  const [error, setError] = useState(null);

  const availableHubs = [
    'Gurugram (NCR Hub)',
    'Bhiwandi (Mumbai Hub)',
    'Hosur (Bengaluru Hub)',
    'Dankuni (Kolkata Hub)',
    'Hyderabad Hub'
  ];

  const fetchWarehouseAdvisor = async (isManual = false) => {
    try {
      if (isManual) setReoptimizing(true);
      else setLoading(true);
      setError(null);
      const res = await api.post('/ml/warehouse-optimizer', {
        currentWarehouses: currentHubs,
        numRecommended: numHubs
      });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
      setReoptimizing(false);
    }
  };

  useEffect(() => {
    fetchWarehouseAdvisor();
  }, [numHubs, currentHubs]);

  const toggleCurrentHub = (hub) => {
    if (currentHubs.includes(hub)) {
      if (currentHubs.length > 1) {
        setCurrentHubs(currentHubs.filter((h) => h !== hub));
      }
    } else {
      setCurrentHubs([...currentHubs, hub]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              <span>Warehouse Location Advisor &amp; Logistics Optimizer</span>
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 border border-brand-200/60 dark:border-brand-800/60 font-semibold">
              K-Means Centroid Clustered
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Facility location modeling minimizing ton-km freight transit distance and SLA delivery times across India.
          </p>
        </div>

        <button
          onClick={() => fetchWarehouseAdvisor(true)}
          disabled={reoptimizing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 self-start sm:self-auto transition shadow-subtle disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${reoptimizing ? 'animate-spin text-brand-600' : 'text-slate-400'}`} />
          <span>{reoptimizing ? 'Optimizing...' : 'Re-optimize Hubs'}</span>
        </button>
      </div>

      {/* Configuration Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-xl p-5 shadow-card space-y-4 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-xs">Current Active Warehouses</h3>
            <p className="text-slate-400 text-[11px] mt-0.5">Select existing fulfillment facilities to compare against K-Means centroids:</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px] font-medium">Proposed Hubs (K):</span>
            <select
              value={numHubs}
              onChange={(e) => setNumHubs(Number(e.target.value))}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 dark:text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              <option value={1}>1 Central Super-Hub</option>
              <option value={2}>2 Regional Hubs (Recommended)</option>
              <option value={3}>3 Distributed Hubs</option>
              <option value={4}>4 Multi-Metro Hubs</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          {availableHubs.map((hub) => {
            const isSelected = currentHubs.includes(hub);
            return (
              <button
                key={hub}
                onClick={() => toggleCurrentHub(hub)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 shadow-subtle ${
                  isSelected
                    ? 'bg-brand-600 text-white font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>{hub}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : !data || !data.optimized_recommendation ? (
        <EmptyState title="Logistics Optimizer Inactive" description="Upload sales data to calibrate warehouse centroids." />
      ) : (
        <>
          {/* Comparison KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Baseline Avg Distance"
              value={`${data.current_configuration?.avg_delivery_distance_km || 0} km`}
              subtext="Current average last-mile transit"
              icon={Truck}
              color="amber"
            />
            <StatCard
              title="Optimized Avg Distance"
              value={`${data.optimized_recommendation?.avg_delivery_distance_km || 0} km`}
              subtext={`-${data.optimized_recommendation?.distance_reduction_pct || 0}% distance reduction`}
              icon={CheckCircle2}
              color="emerald"
            />
            <StatCard
              title="Est. Shipping Savings"
              value={`₹${(data.optimized_recommendation?.estimated_shipping_savings_inr || 0).toLocaleString('en-IN')}`}
              subtext="Ton-km courier cost reduction"
              icon={TrendingUp}
              color="emerald"
            />
            <StatCard
              title="Delivery Speed Improvement"
              value={data.optimized_recommendation?.speed_to_customer_improvement || 'Faster'}
              subtext="Projected customer SLA reduction"
              icon={Building2}
              color="brand"
            />
          </div>

          {/* Recommended Warehouses Cards */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-xl p-5 shadow-card space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                K-Means Optimal Fulfillment Hubs
              </h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Recommended geographic coordinates calculated from order volume clustering across Indian PIN codes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.optimized_recommendation?.recommended_hubs?.map((hub, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-xl border border-brand-200/80 dark:border-brand-900/60 bg-brand-50/20 dark:bg-brand-950/20 space-y-3 shadow-subtle"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-brand-600 dark:text-brand-400">
                      Hub Cluster #{hub.cluster_index}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-mono font-semibold text-[10px] border border-brand-200 dark:border-brand-800">
                      {hub.demand_share_pct}% Volume Share
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                    <span>{hub.recommended_location}</span>
                  </h3>

                  <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block font-medium">Cluster Units</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{hub.served_units}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block font-medium">Centroid Coords</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{hub.center_lat}, {hub.center_lng}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Regional Focus: <strong className="text-slate-900 dark:text-white">{hub.regional_focus}</strong> — Captures high-density consumer delivery radius with minimal courier transit hops.
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Logistics Disclaimer */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-500 shadow-subtle">
            <strong className="text-slate-700 dark:text-slate-300 font-semibold">Logistics Modeling Note:</strong> {data.disclaimer}
          </div>
        </>
      )}
    </div>
  );
}