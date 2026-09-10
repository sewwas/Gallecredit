import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PWAProvider } from './context/PWAContext';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Loans from './pages/Loans';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import Accounting from './pages/Accounting';
import Vaults from './pages/Vaults';
import Holidays from './pages/Holidays';
import PortfolioRisk from './pages/PortfolioRisk';
import Users from './pages/Users';

// Dedicated Mobile Field Collector & Calculator Portal
import CollectorLayout from './components/CollectorLayout';
import CollectorRoute from './pages/collector/CollectorRoute';
import FieldCalculator from './pages/collector/FieldCalculator';
import CollectorDrawer from './pages/collector/CollectorDrawer';

function App() {
  return (
    <AuthProvider>
      <PWAProvider>
        <BrowserRouter>
          <PWAInstallPrompt />
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Universal Mobile Field Collector & Loan Calculator PWA Portal */}
            <Route path="/collector" element={<CollectorLayout />}>
              <Route index element={<CollectorRoute />} />
              <Route path="route" element={<CollectorRoute />} />
              <Route path="calculator" element={<FieldCalculator />} />
              <Route path="drawer" element={<CollectorDrawer />} />
            </Route>

            {/* Standard Desktop / Management Office Layout */}
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="customers" element={<Customers />} />
              <Route path="loans" element={<Loans />} />
              <Route path="payments" element={<Payments />} />
              <Route path="reports" element={<Reports />} />
              <Route path="accounting" element={<Accounting />} />
              <Route path="vaults" element={<Vaults />} />
              <Route path="holidays" element={<Holidays />} />
              <Route path="portfolio-risk" element={<PortfolioRisk />} />
              <Route path="users" element={<Users />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </PWAProvider>
    </AuthProvider>
  );
}

export default App;
