import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Activity, PieChart as PieChartIcon, Calendar } from 'lucide-react';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Reports = () => {
  const { user } = useAuth();
  const [outstanding, setOutstanding] = useState([]);
  const [profitLoss, setProfitLoss] = useState(null);
  const [dailyCollection, setDailyCollection] = useState(0);
  const [collectionTrends, setCollectionTrends] = useState([]);
  const [loanDistribution, setLoanDistribution] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dateRange, setDateRange] = useState('all');
  const [customDates, setCustomDates] = useState({ start: '', end: '' });

  if (user?.role !== 'admin' && user?.role !== 'accountant') {
    return <Navigate to="/" />;
  }

  const getDates = () => {
    if (dateRange === 'all') return { start: '', end: '' };
    
    const today = new Date();
    let start = new Date();
    let end = new Date();
    
    if (dateRange === 'today') {
      // Keep today
    } else if (dateRange === 'week') {
      start.setDate(today.getDate() - today.getDay());
    } else if (dateRange === 'month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (dateRange === 'custom') {
      return { start: customDates.start, end: customDates.end };
    }
    
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { start, end } = getDates();
      const params = new URLSearchParams();
      if (start && end) {
        params.append('startDate', start);
        params.append('endDate', end);
      }
      const qs = params.toString() ? `?${params.toString()}` : '';

      const [outRes, plRes, dcRes, ctRes, ldRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/reports/outstanding${qs}`),
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/reports/profit-loss${qs}`),
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/reports/daily-collection${qs}`),
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/reports/collection-trends${qs}`),
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/reports/loan-distribution${qs}`)
      ]);
      setOutstanding(outRes.data || []);
      setProfitLoss(plRes.data || null);
      setDailyCollection(dcRes.data?.total_collection || 0);
      
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

  useEffect(() => {
    if (dateRange === 'custom' && (!customDates.start || !customDates.end)) return;
    fetchReports();
  }, [dateRange, customDates]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Financial Reports</h2>
          <p className="text-sm text-slate-500 mt-1">Comprehensive overview of system financials, collections, and outstanding balances.</p>
        </div>
        
        {/* Date Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-400" />
            <select 
              className="text-sm font-medium bg-transparent outline-none text-slate-700 cursor-pointer"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2 animate-in slide-in-from-right-4 duration-300">
              <input 
                type="date" 
                className="text-xs px-2 py-1 border rounded text-slate-600"
                value={customDates.start}
                onChange={e => setCustomDates(prev => ({...prev, start: e.target.value}))}
              />
              <span className="text-slate-400 text-xs">to</span>
              <input 
                type="date" 
                className="text-xs px-2 py-1 border rounded text-slate-600"
                value={customDates.end}
                onChange={e => setCustomDates(prev => ({...prev, end: e.target.value}))}
              />
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="glass-panel p-5 border-b-4 border-b-blue-500 hover:shadow-lg transition-shadow relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Activity size={80} />
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Activity size={12} className="text-blue-500" /> {dateRange === 'all' ? "Total Collection" : "Period Collection"}
              </p>
              <p className="text-xl font-black text-slate-800">Rs. {parseFloat(dailyCollection).toLocaleString()}</p>
            </div>
            
            {profitLoss && (
              <>
                <div className="glass-panel p-5 border-b-4 border-b-emerald-500 hover:shadow-lg transition-shadow relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <TrendingUp size={80} />
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <TrendingUp size={12} className="text-emerald-500" /> Expected Interest
                  </p>
                  <p className="text-xl font-black text-slate-800">Rs. {parseFloat(profitLoss.expected_interest || 0).toLocaleString()}</p>
                </div>
                
                <div className="glass-panel p-5 border-b-4 border-b-amber-500 hover:shadow-lg transition-shadow relative overflow-hidden group">
                   <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <DollarSign size={80} />
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <DollarSign size={12} className="text-amber-500" /> Other Income
                  </p>
                  <p className="text-xl font-black text-slate-800">Rs. {parseFloat(profitLoss.other_income || 0).toLocaleString()}</p>
                </div>
                
                <div className="glass-panel p-5 border-b-4 border-b-rose-500 hover:shadow-lg transition-shadow relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <TrendingDown size={80} />
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <TrendingDown size={12} className="text-rose-500" /> Total Expenses
                  </p>
                  <p className="text-xl font-black text-slate-800">Rs. {parseFloat(profitLoss.total_expenses || 0).toLocaleString()}</p>
                </div>
                
                <div className="glass-panel p-5 border-b-4 border-b-primary-400 bg-slate-50 hover:shadow-lg transition-shadow relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <PieChartIcon size={80} />
                  </div>
                  <p className="text-[10px] font-bold text-primary-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <PieChartIcon size={12} className="text-primary-500" /> Projected Profit
                  </p>
                  <p className="text-xl font-black text-primary-800">Rs. {parseFloat(profitLoss.projected_profit || 0).toLocaleString()}</p>
                </div>

                <div className="glass-panel p-5 border-b-4 border-b-primary-600 bg-gradient-to-br from-primary-50 to-white hover:shadow-lg transition-shadow relative overflow-hidden group flex flex-col justify-between">
                  <div className="absolute -right-4 -top-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <DollarSign size={80} className="text-primary-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-primary-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <DollarSign size={12} className="text-primary-600" /> Actual Net Profit
                    </p>
                    <p className="text-2xl font-black text-primary-900">Rs. {parseFloat(profitLoss.actual_net_profit || 0).toLocaleString()}</p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-primary-100/50 text-[9px] text-primary-700 font-medium space-y-0.5">
                    <div className="flex justify-between"><span>Realized Interest:</span> <span>Rs. {parseFloat(profitLoss.realized_interest || 0).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Other Income:</span> <span>+ Rs. {parseFloat(profitLoss.other_income || 0).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Total Expenses:</span> <span>- Rs. {parseFloat(profitLoss.total_expenses || 0).toLocaleString()}</span></div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 glass-panel p-6 border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <TrendingUp size={20} className="text-primary-500" /> Collection Trends
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
                    No collection data for this period.
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
                Outstanding Active Loans {dateRange !== 'all' ? '(Period Specific)' : ''}
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
                      <td colSpan="4" className="py-12 text-center text-slate-500 font-medium">No outstanding loans found for this period.</td>
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

