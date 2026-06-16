import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const Reports = () => {
  const { user } = useAuth();
  const [outstanding, setOutstanding] = useState([]);
  const [profitLoss, setProfitLoss] = useState(null);
  const [loading, setLoading] = useState(true);

  if (user?.role !== 'admin' && user?.role !== 'accountant') {
    return <Navigate to="/" />;
  }

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const [outRes, plRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/reports/outstanding`),
          axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/reports/profit-loss`)
        ]);
        setOutstanding(outRes.data);
        setProfitLoss(plRes.data);
      } catch (err) {
        console.error("Failed to load reports", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Financial Reports</h2>
        <p className="text-sm text-slate-500">Overview of system financials and outstanding balances</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-32"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div></div>
      ) : (
        <>
          {profitLoss && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="glass-panel p-6 border-l-4 border-l-blue-500">
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Expected Interest</p>
                <p className="text-2xl font-bold text-slate-800">Rs. {parseFloat(profitLoss.expected_interest).toLocaleString()}</p>
              </div>
              <div className="glass-panel p-6 border-l-4 border-l-green-500">
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Other Income</p>
                <p className="text-2xl font-bold text-slate-800">Rs. {parseFloat(profitLoss.other_income).toLocaleString()}</p>
              </div>
              <div className="glass-panel p-6 border-l-4 border-l-red-500">
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Total Expenses</p>
                <p className="text-2xl font-bold text-slate-800">Rs. {parseFloat(profitLoss.total_expenses).toLocaleString()}</p>
              </div>
              <div className="glass-panel p-6 border-l-4 border-l-primary-600 bg-primary-50/50">
                <p className="text-sm font-medium text-primary-700 uppercase tracking-wider mb-1">Projected Profit</p>
                <p className="text-2xl font-bold text-primary-900">Rs. {parseFloat(profitLoss.projected_profit).toLocaleString()}</p>
              </div>
            </div>
          )}

          <div className="glass-panel overflow-hidden mt-8">
            <div className="p-6 border-b border-slate-100 bg-white/50">
              <h3 className="text-lg font-semibold text-slate-800">Outstanding Active Loans</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Customer</th>
                    <th className="py-4 px-6">Total Amount</th>
                    <th className="py-4 px-6">Total Paid</th>
                    <th className="py-4 px-6">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {outstanding.map((loan, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 text-sm font-medium text-slate-800">{loan.name}</td>
                      <td className="py-4 px-6 text-sm text-slate-600">Rs. {parseFloat(loan.total_amount).toLocaleString()}</td>
                      <td className="py-4 px-6 text-sm text-slate-600">Rs. {parseFloat(loan.total_paid).toLocaleString()}</td>
                      <td className="py-4 px-6 text-sm font-semibold text-orange-600">Rs. {parseFloat(loan.outstanding_balance).toLocaleString()}</td>
                    </tr>
                  ))}
                  {outstanding.length === 0 && (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-slate-500">No outstanding loans found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;
