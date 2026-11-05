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
  Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const NAV_ITEMS = [
  { name: 'Overview', path: '/overview', icon: LayoutDashboard },
  { name: 'Regional Demand', path: '/regional', icon: MapPin },
  { name: 'Product Analytics', path: '/products', icon: Package },
  { name: 'Demand Forecasting', path: '/forecasting', icon: TrendingUp },
  { name: 'Inventory Intelligence', path: '/inventory', icon: Boxes },
  { name: 'Market Opportunities', path: '/opportunities', icon: Compass },
  { name: 'Pricing Intelligence', path: '/pricing', icon: DollarSign },
  { name: 'Marketing Analytics', path: '/marketing', icon: Megaphone },
  { name: 'Warehouse Advisor', path: '/warehouse', icon: Building2 },
  { name: 'AI Business Copilot', path: '/copilot', icon: Bot, badge: 'AI' },
  { name: 'What-If Simulator', path: '/simulator', icon: Sliders },
  { name: 'Reports', path: '/reports', icon: FileSpreadsheet },
  { name: 'Settings & Data', path: '/settings', icon: Settings },
];

export default function Sidebar({ mobileOpen, setMobileOpen }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center px-5 border-b border-slate-200 dark:border-slate-800 gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              GeoCommerce <span className="text-brand-500 text-xs px-1.5 py-0.5 rounded bg-brand-500/10 font-mono">AI</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Demand Intelligence</p>
          </div>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 truncate">{item.name}</span>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase rounded bg-sky-400 text-slate-950">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* User Card & Action Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
          {/* Quick theme & account details */}
          <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-7 h-7 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-xs uppercase">
                {user?.name ? user.name[0] : 'S'}
              </div>
              <div className="truncate text-left">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{user?.name || 'Seller'}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.storeName || 'My Store'}</p>
              </div>
            </div>

            <button
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

