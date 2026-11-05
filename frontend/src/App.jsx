import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Layout & Common
import AppLayout from './components/layout/AppLayout';

// Pages
import Overview from './pages/Overview';
import RegionalDemand from './pages/RegionalDemand';
import ProductAnalytics from './pages/ProductAnalytics';
import DemandForecasting from './pages/DemandForecasting';
import InventoryIntelligence from './pages/InventoryIntelligence';
import MarketOpportunities from './pages/MarketOpportunities';
import PricingIntelligence from './pages/PricingIntelligence';
import MarketingAnalytics from './pages/MarketingAnalytics';
import WarehouseAdvisor from './pages/WarehouseAdvisor';
import AICopilot from './pages/AICopilot';
import WhatIfSimulator from './pages/WhatIfSimulator';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xs font-mono">
        Authenticating session...
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected SaaS Dashboard Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/overview" replace />} />
              <Route path="overview" element={<Overview />} />
              <Route path="regional" element={<RegionalDemand />} />
              <Route path="products" element={<ProductAnalytics />} />
              <Route path="forecasting" element={<DemandForecasting />} />
              <Route path="inventory" element={<InventoryIntelligence />} />
              <Route path="opportunities" element={<MarketOpportunities />} />
              <Route path="pricing" element={<PricingIntelligence />} />
              <Route path="marketing" element={<MarketingAnalytics />} />
              <Route path="warehouse" element={<WarehouseAdvisor />} />
              <Route path="copilot" element={<AICopilot />} />
              <Route path="simulator" element={<WhatIfSimulator />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

