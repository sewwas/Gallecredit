import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
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

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
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
    </AuthProvider>
  );
}

export default App;
