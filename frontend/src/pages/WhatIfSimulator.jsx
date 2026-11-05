import React, { useState, useEffect } from 'react';
import {
  Sliders,
  TrendingUp,
  DollarSign,
  Boxes,
  Bookmark,
  CheckCircle2,
  RefreshCw,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';
import api from '../services/api';
import StatCard from '../components/common/StatCard';
import LoadingSkeleton from '../components/common/LoadingSkeleton';

export default function WhatIfSimulator() {
  const [priceChange, setPriceChange] = useState(-5);
  const [inventoryChange, setInventoryChange] = useState(20);
  const [adSpendChange, setAdSpendChange] = useState(15);
  const [targetRegion, setTargetRegion] = useState('All');
  const [targetCategory, setTargetCategory] = useState('All');

  const [simulation, setSimulation] = useState(null);
  const [savedScenarios, setSavedScenarios] = useState([]);
  const [scenarioName, setScenarioName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);

  const runSimulation = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.post('/scenarios/simulate', {
        priceChangePct: priceChange,
        inventoryChangePct: inventoryChange,
        adSpendChangePct: adSpendChange,
        targetRegion,
        targetCategory
      });
      setSimulation(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedScenarios = async () => {
    try {
      const res = await api.get('/scenarios/saved');
      setSavedScenarios(res.data.scenarios || []);
    } catch (e) {
      console.warn('Could not load saved scenarios:', e.message);
    }
  };

  useEffect(() => {
    runSimulation();
    fetchSavedScenarios();
  }, [priceChange, inventoryChange, adSpendChange, targetRegion, targetCategory]);

  const handleSaveScenario = async (e) => {
    e.preventDefault();
    if (!scenarioName.trim() || !simulation) return;

    try {
      setSaving(true);
      await api.post('/scenarios/save', {
        name: scenarioName,
        parameters: simulation.parameters,
        projectedMetrics: simulation.simulated
      });
      setSaveSuccess(true);
      setScenarioName('');
      await fetchSavedScenarios();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert('Failed to save scenario: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (preset) => {
    setPriceChange(preset.price);
    setInventoryChange(preset.inv);
    setAdSpendChange(preset.ad);
    setTargetRegion(preset.reg || 'All');
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-6 h-6 text-brand-500" />
            <span>What-If Decision Simulator</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Model forward business scenarios before deploying working capital or altering pricing on marketplaces.
          </p>
        </div>

        <button
          onClick={runSimulation}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 self-start sm:self-auto transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Rerun Model</span>
        </button>
      </div>

      {/* Preset Quick Strategy Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0">Presets:</span>
        <button
          onClick={() => applyPreset({ price: -10, inv: 25, ad: 20 })}
          className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium hover:border-brand-500 border border-transparent transition shrink-0"
        >
          Festive Blitz (-10% Price, +25% Stock, +20% Ads)
        </button>
        <button
          onClick={() => applyPreset({ price: 10, inv: 0, ad: -10 })}
          className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium hover:border-brand-500 border border-transparent transition shrink-0"
        >
          Margin Harvesting (+10% Price, -10% Ads)
        </button>
        <button
          onClick={() => applyPreset({ price: 0, inv: 50, ad: 30, reg: 'Maharashtra' })}
          className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium hover:border-brand-500 border border-transparent transition shrink-0"
        >
          Regional Expansion (+50% Stock in MH)
        </button>
      </div>

      {/* Control Sliders Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Adjust Decision Levers</h3>

          {/* Price Change Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Price Adjustment (%)</span>
              <span className="font-mono font-bold text-brand-600 dark:text-brand-400">
                {priceChange > 0 ? `+${priceChange}%` : `${priceChange}%`}
              </span>
            </div>
            <input
              type="range"
              min={-25}
              max={25}
              step={5}
              value={priceChange}
              onChange={(e) => setPriceChange(Number(e.target.value))}
              className="w-full accent-brand-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>-25% (Clearance)</span>
              <span>0% (No Change)</span>
              <span>+25% (Premium markup)</span>
            </div>
          </div>

          {/* Inventory Change Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Target Inventory Buffer (%)</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {inventoryChange > 0 ? `+${inventoryChange}%` : `${inventoryChange}%`}
              </span>
            </div>
            <input
              type="range"
              min={-30}
              max={60}
              step={10}
              value={inventoryChange}
              onChange={(e) => setInventoryChange(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>-30% (Lean stock)</span>
              <span>0%</span>
              <span>+60% (Festive stockpile)</span>
            </div>
          </div>

          {/* Marketing Ad Spend Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Advertising Budget Allocation (%)</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {adSpendChange > 0 ? `+${adSpendChange}%` : `${adSpendChange}%`}
              </span>
            </div>
            <input
              type="range"
              min={-40}
              max={60}
              step={10}
              value={adSpendChange}
              onChange={(e) => setAdSpendChange(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>-40%</span>
              <span>0%</span>
              <span>+60% (Aggressive push)</span>
            </div>
          </div>
        </div>

        {/* Save Scenario Form & Saved List */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-1">
              <Bookmark className="w-4 h-4 text-brand-500" />
              <span>Save &amp; Compare Scenario</span>
            </h3>
            <p className="text-[11px] text-slate-400 mb-4">
              Save current simulation run to evaluate against alternative quarterly strategies.
            </p>

            <form onSubmit={handleSaveScenario} className="space-y-3">
              <input
                type="text"
                placeholder="Scenario label (e.g. Q4 Diwali Push)..."
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
              />

              <button
                type="submit"
                disabled={saving || !scenarioName.trim()}
                className="w-full py-2 px-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs disabled:opacity-50 transition"
              >
                {saving ? 'Saving...' : 'Save Scenario'}
              </button>

              {saveSuccess && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Scenario saved to memory!</span>
                </p>
              )}
            </form>
          </div>

          {/* Previously Saved List */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">
              Saved Scenarios ({savedScenarios.length})
            </span>
            <div className="max-h-36 overflow-y-auto space-y-1.5 text-xs">
              {savedScenarios.length === 0 ? (
                <p className="text-slate-400 text-[11px]">No scenarios saved yet.</p>
              ) : (
                savedScenarios.map((s, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{s.name}</span>
                    <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                      {s.projectedMetrics?.revenueChangePct > 0 ? '+' : ''}{s.projectedMetrics?.revenueChangePct}%
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Simulation Results Output */}
      {simulation && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Simulated Business Impact Projection
              </h3>
              <p className="text-xs text-slate-400">
                Comparing current baseline against projected outcomes under adjusted pricing, stock, and ad parameters.
              </p>
            </div>

            <span className="text-xs font-mono px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              Stockout Risk: <strong>{simulation.simulated?.stockoutRisk}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Projected Revenue */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Projected Revenue
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">
                  ₹{simulation.simulated?.projectedRevenue?.toLocaleString('en-IN')}
                </span>
                <span
                  className={`text-xs font-bold font-mono ${
                    simulation.simulated?.revenueChangePct >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-500'
                  }`}
                >
                  {simulation.simulated?.revenueChangePct > 0 ? '+' : ''}{simulation.simulated?.revenueChangePct}%
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">
                Baseline: ₹{simulation.baseline?.revenue?.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Projected Gross Profit */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Projected Gross Profit
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                  ₹{simulation.simulated?.projectedProfit?.toLocaleString('en-IN')}
                </span>
                <span
                  className={`text-xs font-bold font-mono ${
                    simulation.simulated?.profitChangePct >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-500'
                  }`}
                >
                  {simulation.simulated?.profitChangePct > 0 ? '+' : ''}{simulation.simulated?.profitChangePct}%
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">
                Baseline: ₹{simulation.baseline?.profit?.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Projected Unit Sales */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Projected Unit Volume
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">
                  {simulation.simulated?.projectedUnits} units
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">
                Baseline: {simulation.baseline?.units} units
              </span>
            </div>

            {/* Simulated Stock Needed */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Required Inventory
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">
                  {simulation.simulated?.projectedInventory} units
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">
                Baseline: {simulation.baseline?.inventory} units
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-500">
            <strong>Simulation Notice:</strong> {simulation.disclaimer}
          </div>
        </div>
      )}
    </div>
  );
}

