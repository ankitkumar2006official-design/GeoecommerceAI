import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import LoadingSkeleton from './components/common/LoadingSkeleton';

// Core Layout
import AppLayout from './components/layout/AppLayout';

// Route-based code splitting via React.lazy()
const Overview = lazy(() => import('./pages/Overview'));
const RegionalDemand = lazy(() => import('./pages/RegionalDemand'));
const ProductAnalytics = lazy(() => import('./pages/ProductAnalytics'));
const DemandForecasting = lazy(() => import('./pages/DemandForecasting'));
const InventoryIntelligence = lazy(() => import('./pages/InventoryIntelligence'));
const MarketOpportunities = lazy(() => import('./pages/MarketOpportunities'));
const PricingIntelligence = lazy(() => import('./pages/PricingIntelligence'));
const MarketingAnalytics = lazy(() => import('./pages/MarketingAnalytics'));
const WarehouseAdvisor = lazy(() => import('./pages/WarehouseAdvisor'));
const AICopilot = lazy(() => import('./pages/AICopilot'));
const WhatIfSimulator = lazy(() => import('./pages/WhatIfSimulator'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));

function AuthSuspenseFallback() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center">
      <div className="w-7 h-7 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function PageSuspenseFallback() {
  return (
    <div className="py-4">
      <LoadingSkeleton rows={5} />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 text-xs font-mono">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <span>Authenticating session...</span>
        </div>
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
            <Route
              path="/login"
              element={
                <Suspense fallback={<AuthSuspenseFallback />}>
                  <Login />
                </Suspense>
              }
            />
            <Route
              path="/register"
              element={
                <Suspense fallback={<AuthSuspenseFallback />}>
                  <Register />
                </Suspense>
              }
            />
            <Route
              path="/verify-email"
              element={
                <Suspense fallback={<AuthSuspenseFallback />}>
                  <VerifyEmail />
                </Suspense>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <Suspense fallback={<AuthSuspenseFallback />}>
                  <ForgotPassword />
                </Suspense>
              }
            />
            <Route
              path="/reset-password"
              element={
                <Suspense fallback={<AuthSuspenseFallback />}>
                  <ResetPassword />
                </Suspense>
              }
            />

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
              <Route
                path="overview"
                element={
                  <Suspense fallback={<PageSuspenseFallback />}>
                    <Overview />
                  </Suspense>
                }
              />
              <Route
                path="regional"
                element={
                  <Suspense fallback={<PageSuspenseFallback />}>
                    <RegionalDemand />
                  </Suspense>
                }
              />
              <Route
                path="products"
                element={
                  <Suspense fallback={<PageSuspenseFallback />}>
                    <ProductAnalytics />
                  </Suspense>
                }
              />
              <Route
                path="forecasting"
                element={
                  <Suspense fallback={<PageSuspenseFallback />}>
                    <DemandForecasting />
                  </Suspense>
                }
              />
              <Route
                path="inventory"
                element={
                  <Suspense fallback={<PageSuspenseFallback />}>
                    <InventoryIntelligence />
                  </Suspense>
                }
              />
              <Route
                path="opportunities"
                element={
                  <Suspense fallback={<PageSuspenseFallback />}>
                    <MarketOpportunities />
                  </Suspense>
                }
              />
              <Route
                path="pricing"
                element={
                  <Suspense fallback={<PageSuspenseFallback />}>
                    <PricingIntelligence />
                  </Suspense>
                }
              />
              <Route
                path="marketing"
                element={
                  <Suspense fallback={<PageSuspenseFallback />}>
                    <MarketingAnalytics />
                  </Suspense>
                }
              />
              <Route
                path="warehouse"
                element={
                  <Suspense fallback={<PageSuspenseFallback />}>
                    <WarehouseAdvisor />
                  </Suspense>
                }
              />
              <Route
                path="copilot"
                element={
                  <Suspense fallback={<PageSuspenseFallback />}>
                    <AICopilot />
                  </Suspense>
                }
              />
              <Route
                path="simulator"
                element={
                  <Suspense fallback={<PageSuspenseFallback />}>
                    <WhatIfSimulator />
                  </Suspense>
                }
              />
              <Route
                path="reports"
                element={
                  <Suspense fallback={<PageSuspenseFallback />}>
                    <Reports />
                  </Suspense>
                }
              />
              <Route
                path="settings"
                element={
                  <Suspense fallback={<PageSuspenseFallback />}>
                    <Settings />
                  </Suspense>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
