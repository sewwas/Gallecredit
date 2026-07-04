import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Activity, PieChart as PieChartIcon } from 'lucide-react';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Reports = () => {
  const { user } = useAuth();
  const [outstanding, setOutstanding] = useState([]);
  const [profitLoss, setProfitLoss] = useState(null);
  const [dailyCollection, setDailyCollection] = useState(0);
  const [collectionTrends, setCollectionTrends] = useState([]);
  const [loanDistribution, setLoanDistribution] = useState([]);
  const [loading, setLoading] = useState(true);

  if (user?.role !== 'admin' && user?.role !== 'accountant') {
    return <Navigate to="/" />;
  }

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const [outRes, plRes, dcRes, ctRes, ldRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/reports/outstanding`),
          axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/reports/profit-loss`),
          axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/reports/daily-collection`),
          axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/reports/collection-trends`),
          axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/reports/loan-distribution`)
        ]);
        setOutstanding(outRes.data || []);
        setProfitLoss(plRes.data || null);
        setDailyCollection(dcRes.data?.total_collection || 0);
        
        // Format dates for the chart
        const formattedTrends = (ctRes.data || []).map(item => ({
          ...item,
          date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }));
        setCollectionTrends(formattedTrends);
        setLoanDistribution(ldRes.data || []);
      } catch (err) {
        console.error("Failed to load reports", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Financial Reports</h2>
        <p className="text-sm text-slate-500 mt-1">Comprehensive overview of system financials, collections, and outstanding balances.</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="glass-panel p-6 border-b-4 border-b-blue-500 hover:shadow-lg transition-shadow relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Activity size={80} />
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                <Activity size={14} className="text-blue-500" /> Today's Collection
              </p>
              <p className="text-2xl font-black text-slate-800">Rs. {parseFloat(dailyCollection).toLocaleString()}</p>
            </div>
            
            {profitLoss && (
              <>
                <div className="glass-panel p-6 border-b-4 border-b-emerald-500 hover:shadow-lg transition-shadow relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <TrendingUp size={80} />
                  </div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                    <TrendingUp size={14} className="text-emerald-500" /> Expected Interest
                  </p>
                  <p className="text-2xl font-black text-slate-800">Rs. {parseFloat(profitLoss.expected_interest).toLocaleString()}</p>
                </div>
                
                <div className="glass-panel p-6 border-b-4 border-b-amber-500 hover:shadow-lg transition-shadow relative overflow-hidden group">
                   <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <DollarSign size={80} />
                  </div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                    <DollarSign size={14} className="text-amber-500" /> Other Income
                  </p>
                  <p className="text-2xl font-black text-slate-800">Rs. {parseFloat(profitLoss.other_income).toLocaleString()}</p>
                </div>
                
                <div className="glass-panel p-6 border-b-4 border-b-rose-500 hover:shadow-lg transition-shadow relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <TrendingDown size={80} />
                  </div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                    <TrendingDown size={14} className="text-rose-500" /> Total Expenses
                  </p>
                  <p className="text-2xl font-black text-slate-800">Rs. {parseFloat(profitLoss.total_expenses).toLocaleString()}</p>
                </div>
                
                <div className="glass-panel p-6 border-b-4 border-b-primary-600 bg-gradient-to-br from-primary-50 to-white hover:shadow-lg transition-shadow relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <PieChartIcon size={80} />
                  </div>
                  <p className="text-xs font-bold text-primary-700 uppercase tracking-wider mb-1 flex items-center gap-2">
                    <PieChartIcon size={14} className="text-primary-600" /> Projected Profit
                  </p>
                  <p className="text-2xl font-black text-primary-900">Rs. {parseFloat(profitLoss.projected_profit).toLocaleString()}</p>
                </div>
              </>
            )}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 glass-panel p-6 border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <TrendingUp size={20} className="text-primary-500" /> Collection Trends (Last 7 Days)
              </h3>
              <div className="h-72 w-full">
                {collectionTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={collectionTrends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(value) => `Rs.${value/1000}k`} />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value) => [`Rs. ${parseFloat(value).toLocaleString()}`, 'Collection']}
                      />
                      <Area type="monotone" dataKey="amount" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-400 text-sm font-medium">
                    No collection data for the past 7 days.
                  </div>
                )}
              </div>
            </div>

            <div className="glass-panel p-6 border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <PieChartIcon size={20} className="text-primary-500" /> Loan Distribution
              </h3>
              <div className="h-72 w-full">
                {loanDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={loanDistribution}
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {loanDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value, name) => [value, name]}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-400 text-sm font-medium">
                    No active loans to display.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Table Section */}
          <div className="glass-panel overflow-hidden border border-slate-100 mt-8">
            <div className="p-6 border-b border-slate-100 bg-white/60">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                Outstanding Active Loans
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Customer</th>
                    <th className="py-4 px-6">Total Amount</th>
                    <th className="py-4 px-6">Total Paid</th>
                    <th className="py-4 px-6 text-right">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white/30">
                  {outstanding.map((loan, idx) => (
                    <tr key={idx} className="hover:bg-primary-50/30 transition-colors">
                      <td className="py-4 px-6 text-sm font-bold text-slate-800">{loan.name}</td>
                      <td className="py-4 px-6 text-sm font-medium text-slate-600">Rs. {parseFloat(loan.total_amount).toLocaleString()}</td>
                      <td className="py-4 px-6 text-sm font-medium text-slate-600">Rs. {parseFloat(loan.total_paid).toLocaleString()}</td>
                      <td className="py-4 px-6 text-sm font-black text-rose-600 text-right">Rs. {parseFloat(loan.outstanding_balance).toLocaleString()}</td>
                    </tr>
                  ))}
                  {outstanding.length === 0 && (
                    <tr>
                      <td colSpan="4" className="py-12 text-center text-slate-500 font-medium">No outstanding loans found.</td>
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

