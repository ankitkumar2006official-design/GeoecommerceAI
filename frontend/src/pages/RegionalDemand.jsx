import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Filter,
  Layers,
  TrendingUp,
  Package,
  Calendar,
  Building,
  RefreshCw,
  Search
} from 'lucide-react';
import api from '../services/api';
import DemandMap from '../components/map/DemandMap';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';

export default function RegionalDemand() {
  const [level, setLevel] = useState('state'); // 'state', 'district', 'city', 'pincode'
  const [selectedState, setSelectedState] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [regions, setRegions] = useState([]);
  const [mapPoints, setMapPoints] = useState([]);
  const [selectedPoint, setSelectedPoint] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRegionalData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = { level };
      if (selectedState !== 'All') params.state = selectedState;
      if (selectedCategory !== 'All') params.category = selectedCategory;

      const [regRes, mapRes] = await Promise.all([
        api.get('/analytics/regional-demand', { params }),
        api.get('/analytics/map-data', { params: { state: selectedState, category: selectedCategory } })
      ]);

      setRegions(regRes.data.regions || []);
      setMapPoints(mapRes.data.points || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegionalData();
  }, [level, selectedState, selectedCategory]);

  const uniqueStates = ['All', ...new Set(mapPoints.map((p) => p.state).filter(Boolean))];
  const uniqueCategories = ['All', 'Electronics', 'Fashion', 'Home & Kitchen', 'Beauty', 'Groceries'];

  const filteredRegions = regions.filter((r) =>
    String(r.location || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-6 h-6 text-brand-500" />
            <span>Regional Demand Intelligence</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Multi-tier consumer purchase demand at State, District, City, and PIN code levels across India.
          </p>
        </div>

        {/* Level Selector Pills */}
        <div className="flex items-center p-1 bg-slate-200 dark:bg-slate-800 rounded-xl text-xs font-semibold self-start sm:self-auto">
          {['state', 'district', 'city', 'pincode'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevel(lvl)}
              className={`px-3 py-1.5 rounded-lg capitalize transition ${
                level === lvl
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {lvl} Level
            </button>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder={`Filter ${level} names...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* State Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">State:</span>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 font-medium text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              {uniqueStates.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 font-medium text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={fetchRegionalData}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-slate-600 dark:text-slate-300 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Apply</span>
        </button>
      </div>

      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : regions.length === 0 ? (
        <EmptyState title="No regional demand matches" description="Try selecting 'All' for states or categories." />
      ) : (
        <>
          {/* Interactive Demand Map */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-500" />
                <span>Geospatial Demand Heatmap — India</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                {mapPoints.length} verified delivery clusters mapped
              </span>
            </div>

            <DemandMap
              points={mapPoints}
              selectedState={selectedState}
              onSelectPoint={(pt) => setSelectedPoint(pt)}
            />
          </div>

          {/* Selected cluster quick detail card if clicked on map */}
          {selectedPoint && (
            <div className="p-4 rounded-2xl bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-900 flex flex-wrap items-center justify-between gap-4 animate-fadeIn">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                  Selected Area Details
                </span>
                <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {selectedPoint.city} — PIN {selectedPoint.pincode} ({selectedPoint.state})
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Top Product in this locality: <strong className="text-slate-900 dark:text-white">{selectedPoint.topProduct}</strong> ({selectedPoint.topProductQty} units)
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Total Units</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{selectedPoint.units}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Revenue</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{Math.round(selectedPoint.revenue).toLocaleString('en-IN')}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedPoint(null)}
                  className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Regional Demand Ranking Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                  {level} Demand & Product Popularity Ranking
                </h3>
                <p className="text-[11px] text-slate-400">
                  Showing top products, volumes, and revenues per geographic boundary
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">{filteredRegions.length} locations</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3 capitalize">{level}</th>
                    <th className="px-4 py-3">Most Purchased Product</th>
                    <th className="px-4 py-3">Top Product Units</th>
                    <th className="px-4 py-3">Top Product Revenue</th>
                    <th className="px-4 py-3">Total Area Units</th>
                    <th className="px-4 py-3">Total Area Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredRegions.map((r, idx) => (
                    <tr key={`${r.location}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                      <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span className="w-5 text-slate-400 text-[10px] font-mono">{idx + 1}.</span>
                        <span>{r.location}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium">
                        <span className="font-semibold text-brand-600 dark:text-brand-400">{r.topProduct}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                        {r.topProductUnits} units
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">
                        ₹{Number(r.topProductRevenue || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {r.totalUnits} units
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{Number(r.totalRevenue || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

