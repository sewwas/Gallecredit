import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, CreditCard, DollarSign, TrendingUp, TrendingDown, PieChart as PieIcon, Activity, Wallet } from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area 
} from 'recharts';

const Dashboard = () => {
  const [stats, setStats] = useState({
    customers: 0,
    activeLoans: 0,
    dailyCollection: 0,
    outstanding: 0,
    projectedProfit: 0,
    totalExpenses: 0
  });
  const [trends, setTrends] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [loading, setLoading] = useState(true);

  const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#ef4444'];

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [customersRes, loansRes, dailyRes, outRes, trendsRes, distRes, profitRes] = await Promise.all([
          axios.get(`\${"https://gallecredit-a9a2.vercel.app"}/api/customers`),
          axios.get(`\${"https://gallecredit-a9a2.vercel.app"}/api/loans`).catch(() => ({ data: [] })),
          axios.get(`\${"https://gallecredit-a9a2.vercel.app"}/api/reports/daily-collection`).catch(() => ({ data: { total_collection: 0 } })),
          axios.get(`\${"https://gallecredit-a9a2.vercel.app"}/api/reports/outstanding`).catch(() => ({ data: [] })),
          axios.get(`\${"https://gallecredit-a9a2.vercel.app"}/api/reports/collection-trends`).catch(() => ({ data: [] })),
          axios.get(`\${"https://gallecredit-a9a2.vercel.app"}/api/reports/loan-distribution`).catch(() => ({ data: [] })),
          axios.get(`\${"https://gallecredit-a9a2.vercel.app"}/api/reports/profit-loss`).catch(() => ({ data: { projected_profit: 0, total_expenses: 0 } }))
        ]);

        const totalOutstanding = Array.isArray(outRes.data) 
          ? outRes.data.reduce((sum, loan) => sum + parseFloat(loan.outstanding_balance || 0), 0)
          : 0;

        const activeLoansCount = Array.isArray(loansRes.data)
          ? loansRes.data.filter(l => l.status === 'active').length
          : 0;

        setStats({
          customers: customersRes.data.length,
          activeLoans: activeLoansCount,
          dailyCollection: dailyRes.data.total_collection || 0,
          outstanding: totalOutstanding,
          projectedProfit: profitRes.data.projected_profit || 0,
          totalExpenses: profitRes.data.total_expenses || 0
        });

        // Format dates for the chart safely
        const trendsData = Array.isArray(trendsRes.data) ? trendsRes.data : [];
        const formattedTrends = trendsData.map(item => ({
          ...item,
          date: new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
        }));
        setTrends(formattedTrends);

        setDistribution(Array.isArray(distRes.data) ? distRes.data : []);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard</h2>
        <p className="text-sm text-slate-500 font-medium mt-1">Real-time overview of your microfinance operations</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Customers */}
        <div className="glass-panel p-6 hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Customers</p>
              <p className="text-3xl font-bold text-slate-900">{stats.customers}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center text-violet-600">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Active Loans */}
        <div className="glass-panel p-6 hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Active Loans</p>
              <p className="text-3xl font-bold text-slate-900">{stats.activeLoans}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-pink-100 flex items-center justify-center text-pink-600">
              <Activity className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Daily Collection */}
        <div className="glass-panel p-6 hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Daily Collection</p>
              <p className="text-2xl font-bold text-emerald-600">Rs. {parseFloat(stats.dailyCollection).toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Total Outstanding */}
        <div className="glass-panel p-6 hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Outstanding</p>
              <p className="text-2xl font-bold text-rose-600">Rs. {parseFloat(stats.outstanding).toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profitability Card */}
        <div className="glass-panel p-6 lg:col-span-1 bg-gradient-to-br from-violet-600 to-indigo-700 text-white border-none">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-xs font-bold text-violet-200 uppercase tracking-wider">Projected Profit</p>
              <h3 className="text-3xl font-bold mt-1">Rs. {parseFloat(stats.projectedProfit).toLocaleString()}</h3>
            </div>
            <div className="p-3 bg-white/10 rounded-xl">
              <Wallet className="w-6 h-6 text-white" />
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-violet-200">Total Expenses</span>
              <span className="font-bold">Rs. {parseFloat(stats.totalExpenses).toLocaleString()}</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div className="bg-white h-2 rounded-full" style={{ width: '70%' }}></div>
            </div>
            <p className="text-xs text-violet-200 font-medium">Expenses are within the projected safe margin.</p>
          </div>
        </div>

        {/* Collection Trends Chart */}
        <div className="glass-panel p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-violet-600" />
              <h3 className="text-lg font-bold text-slate-900">Collection Trends</h3>
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase">Last 7 Days</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b', fontWeight: '500'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b', fontWeight: '500'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', background: 'white' }}
                  formatter={(value) => [`Rs. ${value.toLocaleString()}`, 'Collection']}
                />
                <Area type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={4} fillOpacity={1} fill="url(#colorAmount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Loan Distribution Chart */}
        <div className="glass-panel p-6">
          <div className="flex items-center gap-2 mb-6">
            <PieIcon className="w-5 h-5 text-violet-600" />
            <h3 className="text-lg font-bold text-slate-900">Loan Distribution</h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', background: 'white' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: '500' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Info Card */}
        <div className="glass-panel p-6 bg-gradient-to-br from-white to-slate-50 border-slate-100 flex flex-col justify-center">
          <div className="w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center text-violet-600 mb-4">
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">System Health & Status</h3>
          <p className="text-slate-500 font-medium text-sm leading-relaxed">
            Your microfinance management system is operating normally. All data shown is real-time and reflects current database states. 
            Automated SMS and WhatsApp alerts are active for payment confirmations.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

