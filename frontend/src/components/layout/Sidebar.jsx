import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MapPin,
  Package,
  TrendingUp,
  Boxes,
  Compass,
  DollarSign,
  Megaphone,
  Building2,
  Bot,
  Sliders,
  FileSpreadsheet,
  Settings,
  LogOut,
  Moon,
  Sun,
  Activity,
  Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const NAV_GROUPS = [
  {
    title: 'Core Analytics',
    items: [
      { name: 'Overview', path: '/overview', icon: LayoutDashboard },
      { name: 'Regional Demand', path: '/regional', icon: MapPin },
      { name: 'Product Analytics', path: '/products', icon: Package },
    ]
  },
  {
    title: 'AI & Predictive',
    items: [
      { name: 'Demand Forecasting', path: '/forecasting', icon: TrendingUp },
      { name: 'Inventory Intelligence', path: '/inventory', icon: Boxes },
      { name: 'Market Opportunities', path: '/opportunities', icon: Compass },
      { name: 'Pricing Intelligence', path: '/pricing', icon: DollarSign },
      { name: 'Marketing & Bundles', path: '/marketing', icon: Megaphone },
      { name: 'Warehouse Advisor', path: '/warehouse', icon: Building2 },
    ]
  },
  {
    title: 'Workspaces',
    items: [
      { name: 'AI Business Copilot', path: '/copilot', icon: Bot, badge: 'AI' },
      { name: 'What-If Simulator', path: '/simulator', icon: Sliders },
    ]
  },
  {
    title: 'System & Data',
    items: [
      { name: 'Reports & Exports', path: '/reports', icon: FileSpreadsheet },
      { name: 'Settings & Data', path: '/settings', icon: Settings },
    ]
  }
];

export default function Sidebar({ mobileOpen, setMobileOpen }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col transition-transform duration-200 lg:translate-x-0 select-none ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center px-5 border-b border-slate-200/80 dark:border-slate-800/80 justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white shadow-subtle">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
                  GeoCommerce
                </span>
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200/60 dark:border-brand-800/60">
                  AI
                </span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Regional Demand Intel</p>
            </div>
          </div>
        </div>

        {/* Grouped Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {NAV_GROUPS.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              <h3 className="px-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {group.title}
              </h3>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                          isActive
                            ? 'bg-slate-100 dark:bg-slate-800/90 text-brand-600 dark:text-brand-400 font-semibold shadow-subtle'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1 truncate">{item.name}</span>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase rounded bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/60">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* User Card & Footer */}
        <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-white dark:bg-slate-850 border border-slate-200/70 dark:border-slate-800/70 shadow-subtle">
            <div className="flex items-center gap-2 truncate">
              <div className="w-7 h-7 rounded-md bg-brand-50 dark:bg-brand-950/80 text-brand-600 dark:text-brand-400 border border-brand-200/60 dark:border-brand-800/60 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                {user?.name ? user.name[0] : 'M'}
              </div>
              <div className="truncate text-left leading-tight">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {user?.name || 'Merchant'}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                  {user?.storeName || 'My Store'}
                </p>
              </div>
            </div>

            <button
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-medium text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 rounded-lg transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

