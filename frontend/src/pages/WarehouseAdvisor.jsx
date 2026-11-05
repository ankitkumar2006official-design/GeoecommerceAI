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
  const [error, setError] = useState(null);

  const availableHubs = [
    'Gurugram (NCR Hub)',
    'Bhiwandi (Mumbai Hub)',
    'Hosur (Bengaluru Hub)',
    'Dankuni (Kolkata Hub)',
    'Hyderabad Hub'
  ];

  const fetchWarehouseAdvisor = async () => {
    try {
      setLoading(true);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-brand-500" />
            <span>Warehouse Location Advisor &amp; Logistics Optimizer</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            K-Means facility location &amp; demand-weighted centroid optimization minimizing ton-km delivery distances across India.
          </p>
        </div>

        <button
          onClick={fetchWarehouseAdvisor}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 self-start sm:self-auto transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Re-optimize Hubs</span>
        </button>
      </div>

      {/* Configuration Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white">Active Warehouse Setup</h4>
            <p className="text-slate-400 text-[11px]">Select your current warehouse facilities to calculate the baseline comparison:</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Proposed Hubs Count (K):</span>
            <select
              value={numHubs}
              onChange={(e) => setNumHubs(Number(e.target.value))}
              className="bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-1.5 font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
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
                className={`px-3 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
              title="Estimated Freight Savings"
              value={`₹${(data.optimized_recommendation?.estimated_shipping_savings_inr || 0).toLocaleString('en-IN')}`}
              subtext="Courier ton-km cost reduction"
              icon={TrendingUp}
              color="emerald"
            />
            <StatCard
              title="Transit Velocity Gain"
              value={data.optimized_recommendation?.speed_to_customer_improvement || 'Faster'}
              subtext="Expected SLA improvement"
              icon={Building2}
              color="brand"
            />
          </div>

          {/* Recommended Warehouses Cards */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  K-Means Recommended Fulfillment Centers
                </h3>
                <p className="text-[11px] text-slate-400">
                  Optimal warehouse coordinates calculated from real demand clustering across Indian PIN codes.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.optimized_recommendation?.recommended_hubs?.map((hub, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl border border-brand-200 dark:border-brand-900/60 bg-brand-50/40 dark:bg-brand-950/20 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400">
                      Hub Cluster #{hub.cluster_index}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-brand-600 text-white font-mono font-bold text-xs">
                      {hub.demand_share_pct}% Demand Share
                    </span>
                  </div>

                  <h4 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-brand-500" />
                    <span>{hub.recommended_location}</span>
                  </h4>

                  <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Cluster Volume</span>
                      <span className="font-bold text-slate-900 dark:text-white">{hub.served_units} units</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Centroid Coords</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{hub.center_lat}, {hub.center_lng}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    Regional Focus: <strong>{hub.regional_focus}</strong> — Captures high-density consumer delivery radius with minimal courier transit hops.
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Logistics Disclaimer */}
          <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-500">
            <strong>Logistics Calculation Notice:</strong> {data.disclaimer}
          </div>
        </>
      )}
    </div>
  );
}

