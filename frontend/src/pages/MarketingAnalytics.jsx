import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  TrendingUp,
  DollarSign,
  Layers,
  Sparkles,
  RefreshCw,
  ShoppingBag,
  ArrowRight
} from 'lucide-react';
import api from '../services/api';
import StatCard from '../components/common/StatCard';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';

export default function MarketingAnalytics() {
  const [marketingData, setMarketingData] = useState(null);
  const [bundleData, setBundleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchMarketingAndBundles = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const [mRes, bRes] = await Promise.all([
        api.post('/ml/marketing', {}),
        api.post('/ml/bundles', {})
      ]);
      setMarketingData(mRes.data);
      setBundleData(bRes.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMarketingAndBundles();
  }, []);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              <span>Marketing ROI &amp; Apriori Association Mining</span>
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 border border-brand-200/60 dark:border-brand-800/60 font-semibold">
              Market Basket Mining
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Regional ROAS attribution, CAC efficiency, and Apriori association rule discovery for high-lift cross-selling.
          </p>
        </div>

        <button
          onClick={() => fetchMarketingAndBundles(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 self-start sm:self-auto transition shadow-subtle disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-brand-600' : 'text-slate-400'}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : (
        <>
          {/* Section 1: Marketing Campaign ROAS */}
          {marketingData?.has_ad_data ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Marketing Spend"
                  value={`₹${(marketingData.overall_metrics?.total_ad_spend || 0).toLocaleString('en-IN')}`}
                  subtext="Attributed marketing investment"
                  icon={DollarSign}
                  color="brand"
                />
                <StatCard
                  title="Portfolio ROAS"
                  value={`${marketingData.overall_metrics?.portfolio_roas || 0}x`}
                  subtext="Gross Return on Advertising Spend"
                  icon={TrendingUp}
                  color="emerald"
                />
                <StatCard
                  title="Blended CAC"
                  value={`₹${marketingData.overall_metrics?.average_cac || 0}`}
                  subtext="Customer Acquisition Cost per order"
                  icon={Megaphone}
                  color="indigo"
                />
                <StatCard
                  title="Attributed Revenue"
                  value={`₹${(marketingData.overall_metrics?.total_ad_attributed_revenue || 0).toLocaleString('en-IN')}`}
                  subtext="Delivered gross order volume"
                  icon={ShoppingBag}
                  color="emerald"
                />
              </div>

              {/* Regional ROAS Leaderboard Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-xl p-5 shadow-card space-y-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Regional Campaign ROAS &amp; Capital Reallocation
                  </h2>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Evaluates ad return across Indian states to recommend optimal media budget reallocation.
                  </p>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-200/70 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200/70 dark:border-slate-800 text-[10px]">
                      <tr>
                        <th className="px-4 py-3">State / Territory</th>
                        <th className="px-4 py-3">Ad Spend</th>
                        <th className="px-4 py-3">Delivered Revenue</th>
                        <th className="px-4 py-3">Orders</th>
                        <th className="px-4 py-3">ROAS</th>
                        <th className="px-4 py-3">CAC</th>
                        <th className="px-4 py-3">Recommended Strategy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
                      {marketingData.regional_marketing?.map((rm, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{rm.region}</td>
                          <td className="px-4 py-3 tabular-nums text-slate-600 dark:text-slate-400">
                            ₹{rm.ad_spend.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 tabular-nums font-semibold text-slate-900 dark:text-white">
                            ₹{rm.revenue.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 tabular-nums text-slate-600 dark:text-slate-400">{rm.orders}</td>
                          <td className="px-4 py-3 tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                            {rm.roas}x
                          </td>
                          <td className="px-4 py-3 tabular-nums text-slate-600 dark:text-slate-400">
                            ₹{rm.cac}
                          </td>
                          <td className="px-4 py-3 text-brand-600 dark:text-brand-400 font-medium">
                            {rm.action_recommendation}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-500 space-y-1 shadow-subtle">
              <strong className="text-slate-800 dark:text-slate-200 block text-xs font-semibold">
                Advertising Performance Module (Zero Hallucination Status)
              </strong>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {marketingData?.message || 'No direct advertising spend fields were logged in current sales transactions. Upload campaign logs with ad spend to populate ROAS metrics.'}
              </p>
            </div>
          )}

          {/* Section 2: Product Bundle Discovery (Apriori Algorithm) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-xl p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                  <span>Frequently Purchased Together (Apriori Association Rules)</span>
                </h2>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Data-mined cross-sell associations computed via statistical Support, Confidence, and Lift ratios.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {bundleData?.total_transactions_analyzed || 0} customer baskets evaluated
              </span>
            </div>

            {bundleData?.rules?.length === 0 ? (
              <p className="text-xs text-slate-400 p-4 text-center">
                No association rules exceeded the minimum support (1.5%) threshold in the current sample.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bundleData?.rules?.map((rule, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-850/40 space-y-3 shadow-subtle"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-brand-600 dark:text-brand-400 text-xs">Bundle #{idx + 1}</span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono font-semibold text-[10px] border border-emerald-200 dark:border-emerald-800">
                        Lift: {rule.lift}x
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs shadow-subtle">
                      <span className="font-medium text-slate-900 dark:text-white truncate max-w-[150px]">
                        {rule.antecedent}
                      </span>
                      <span className="text-brand-600 dark:text-brand-400 font-bold px-2">&rarr;</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400 truncate max-w-[150px]">
                        {rule.consequent}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                      <span>Support: {(rule.support * 100).toFixed(1)}%</span>
                      <span>Confidence: {(rule.confidence * 100).toFixed(1)}%</span>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                      {rule.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}