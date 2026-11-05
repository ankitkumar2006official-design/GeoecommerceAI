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
  const [error, setError] = useState(null);

  const fetchMarketingAndBundles = async () => {
    try {
      setLoading(true);
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
    }
  };

  useEffect(() => {
    fetchMarketingAndBundles();
  }, []);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-brand-500" />
            <span>Marketing Intelligence &amp; Apriori Cross-Selling</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Regional ROAS, customer acquisition cost (CAC), and Apriori association rule mining for high-lift product bundles.
          </p>
        </div>

        <button
          onClick={fetchMarketingAndBundles}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 self-start sm:self-auto transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
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
                  title="Total Ad Spend"
                  value={`₹${(marketingData.overall_metrics?.total_ad_spend || 0).toLocaleString('en-IN')}`}
                  subtext="Attributed marketing investment"
                  icon={DollarSign}
                  color="brand"
                />
                <StatCard
                  title="Portfolio ROAS"
                  value={`${marketingData.overall_metrics?.portfolio_roas || 0}x`}
                  subtext="Return on Advertising Spend"
                  icon={TrendingUp}
                  color="emerald"
                />
                <StatCard
                  title="Average CAC"
                  value={`₹${marketingData.overall_metrics?.average_cac || 0}`}
                  subtext="Customer Acquisition Cost per order"
                  icon={Megaphone}
                  color="indigo"
                />
                <StatCard
                  title="Ad-Attributed Revenue"
                  value={`₹${(marketingData.overall_metrics?.total_ad_attributed_revenue || 0).toLocaleString('en-IN')}`}
                  subtext="Delivered gross order value"
                  icon={ShoppingBag}
                  color="emerald"
                />
              </div>

              {/* Regional ROAS Leaderboard Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Regional Campaign ROAS &amp; Budget Optimization
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Evaluates advertising return per Indian state to recommend marketing capital reallocation.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Region</th>
                        <th className="px-4 py-3">Ad Spend</th>
                        <th className="px-4 py-3">Delivered Revenue</th>
                        <th className="px-4 py-3">Orders</th>
                        <th className="px-4 py-3">ROAS</th>
                        <th className="px-4 py-3">CAC</th>
                        <th className="px-4 py-3">Strategic Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {marketingData.regional_marketing?.map((rm, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{rm.region}</td>
                          <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                            ₹{rm.ad_spend.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 font-mono font-semibold text-slate-900 dark:text-white">
                            ₹{rm.revenue.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">{rm.orders}</td>
                          <td className="px-4 py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {rm.roas}x
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                            ₹{rm.cac}
                          </td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium">
                            <span className="text-brand-600 dark:text-brand-400">{rm.action_recommendation}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 space-y-1">
              <strong className="text-slate-800 dark:text-slate-200 block text-sm">
                Advertising Performance Module (Honest State)
              </strong>
              <p>{marketingData?.message || 'No Advertising Spend logged in uploaded dataset.'}</p>
            </div>
          )}

          {/* Section 2: Product Bundle Discovery (Apriori Algorithm) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-500" />
                  <span>Frequently Purchased Together (Apriori Rule Mining)</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Data-mined cross-sell associations with statistical Support, Confidence, and Lift metrics.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {bundleData?.total_transactions_analyzed || 0} customer baskets analyzed
              </span>
            </div>

            {bundleData?.rules?.length === 0 ? (
              <p className="text-xs text-slate-400 p-4">
                No association rules exceeded the minimum support (1.5%) threshold in the current sample.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bundleData?.rules?.map((rule, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-brand-600 dark:text-brand-400">Combo #{idx + 1}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-[10px]">
                        Lift: {rule.lift}x
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                      <span className="font-bold text-slate-900 dark:text-white truncate max-w-[150px]">
                        {rule.antecedent}
                      </span>
                      <span className="text-brand-500 font-bold px-2">&rarr;</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 truncate max-w-[150px]">
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

