import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, TrendingDown, Percent, PiggyBank, RefreshCw, BarChart2, ShieldCheck, User } from 'lucide-react';
import CustomerAuditModal from '../components/CustomerAuditModal';

const PortfolioRisk = () => {
  const { user } = useAuth();
  
  // Guard access (Only Admins and Accountants can see this page)
  const isAdminOrAccountant = user?.role === 'admin' || user?.role === 'accountant';

  if (!isAdminOrAccountant) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h3 className="text-xl font-bold text-slate-800">Access Denied</h3>
        <p className="text-sm text-slate-500 max-w-sm mt-2">Only administrators and accountants have authorization to view Portfolio at Risk analytics.</p>
      </div>
    );
  }

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [auditCustomerId, setAuditCustomerId] = useState(null);

  const fetchRiskData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/portfolio/aging`, config);
      setData(res.data);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load asset quality risk metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiskData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl">
        <ShieldAlert className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm font-semibold">{errorMsg}</p>
      </div>
    );
  }

  const summary = data?.summary || {
    total_outstanding_portfolio: 0,
    total_overdue_amount: 0,
    par_1_30: 0,
    par_31_90: 0,
    par_90_plus: 0,
    par_total_risk: 0,
    par_ratio: 0,
    total_provision_required: 0
  };

  const loans = data?.loans || [];

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <span className="text-sm font-bold uppercase tracking-wider text-slate-500">Asset Quality Board</span>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">Portfolio at Risk (PAR)</h2>
        </div>
        <button
          onClick={fetchRiskData}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 hover:text-primary-600 hover:border-primary-200 hover:shadow-sm rounded-xl font-bold transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Outstanding Portfolio */}
        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Active Outstanding Portfolio</span>
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-slate-600" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900">
            Rs. {parseFloat(summary.total_outstanding_portfolio).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-slate-400 font-semibold mt-2">Principal capital outstanding in field</p>
        </div>

        {/* PAR Ratio (Percentage of total at risk) */}
        <div className={`p-6 rounded-3xl shadow-sm relative overflow-hidden border ${
          summary.par_ratio > 10 ? 'bg-red-50/20 border-red-200 text-red-950' : 
          summary.par_ratio > 0 ? 'bg-amber-50/20 border-amber-200 text-amber-950' : 'bg-green-50/10 border-green-200 text-green-950'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wide opacity-80">Portfolio at Risk Ratio</span>
            <div className="w-10 h-10 rounded-xl bg-white/50 flex items-center justify-center">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold">
            {parseFloat(summary.par_ratio).toFixed(2)}%
          </h3>
          <p className="text-xs opacity-75 font-semibold mt-2">
            {summary.par_ratio > 10 ? '⚠️ High Portfolio Default Threat' : 
             summary.par_ratio > 0 ? '⚠️ Marginal Overdue Exposure' : '✅ Ideal Asset Health (0% Default)'}
          </p>
        </div>

        {/* Total Capital at Risk */}
        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Total Portfolio at Risk</span>
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-red-500" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900">
            Rs. {parseFloat(summary.par_total_risk).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-red-500 font-bold mt-2">
            Rs. {parseFloat(summary.total_overdue_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} Overdue amount
          </p>
        </div>

        {/* Bad Debt Provisions required */}
        <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl shadow-slate-900/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/10 rounded-full blur-2xl transform translate-x-5 -translate-y-5" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Total Bad-Debt Provision</span>
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <PiggyBank className="w-5 h-5 text-primary-400" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-white">
            Rs. {parseFloat(summary.total_provision_required).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-slate-500 font-semibold mt-2">Accrued regulatory equity buffer</p>
        </div>

      </div>

      {/* PAR Categories Trend Bar meters */}
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Portfolio Asset Breakdown</h3>
          <p className="text-xs text-slate-500 font-semibold">Overdue classification by credit bucket</p>
        </div>

        <div className="space-y-4">
          {/* Category: PAR 1-30 */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-bold text-slate-700">
              <span className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-amber-400" /> PAR 1-30 Days (Minor Delinquency)</span>
              <span>Rs. {parseFloat(summary.par_1_30).toLocaleString()} (5% Provision)</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-400 transition-all duration-500" 
                style={{ width: `${summary.total_outstanding_portfolio > 0 ? (summary.par_1_30 / summary.total_outstanding_portfolio * 100) : 0}%` }}
              />
            </div>
          </div>

          {/* Category: PAR 31-90 */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-bold text-slate-700">
              <span className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-orange-500" /> PAR 31-90 Days (Substandard Assets)</span>
              <span>Rs. {parseFloat(summary.par_31_90).toLocaleString()} (20% Provision)</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-orange-500 transition-all duration-500" 
                style={{ width: `${summary.total_outstanding_portfolio > 0 ? (summary.par_31_90 / summary.total_outstanding_portfolio * 100) : 0}%` }}
              />
            </div>
          </div>

          {/* Category: PAR 90+ */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-bold text-slate-700">
              <span className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-red-600" /> PAR 90+ Days (Non-Performing Assets)</span>
              <span>Rs. {parseFloat(summary.par_90_plus).toLocaleString()} (100% Provision)</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-red-600 transition-all duration-500" 
                style={{ width: `${summary.total_outstanding_portfolio > 0 ? (summary.par_90_plus / summary.total_outstanding_portfolio * 100) : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Loans Aging Analysis breakdown table */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Active Portfolio Aging Sheet</h3>
          <p className="text-xs text-slate-500 font-semibold">Exact risk profile, days past due, and bad debt provision per contract</p>
        </div>

        {loans.filter(l => l.overdue_days > 0).length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-semibold">
            <ShieldCheck className="w-10 h-10 text-green-500 mx-auto mb-3" />
            No overdue loans found. Outstanding portfolio is on track!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Loan ID / Customer</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Asset Class</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Days Past Due</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider text-right">Outstanding Bal</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider text-right">Accrued Provision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loans.filter(loan => loan.overdue_days > 0).map((loan) => (
                  <tr key={loan.loan_id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-extrabold text-slate-900">{loan.customer_name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Loan Contract ID: #{loan.loan_id} | Issued: Rs.{parseFloat(loan.loan_amount).toLocaleString()}</p>
                        </div>
                        <button 
                          onClick={() => setAuditCustomerId(loan.customer_id)}
                          className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 transition-colors font-medium text-[10px] uppercase tracking-wider"
                          title="View Customer Audit Profile"
                        >
                          <User className="w-3 h-3" /> Profile
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                        loan.asset_category === 'Performing' ? 'bg-green-50 border-green-200 text-green-700' :
                        loan.asset_category === 'PAR 1-30' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                        loan.asset_category === 'PAR 31-90' ? 'bg-orange-50 border-orange-200 text-orange-700' :
                        'bg-red-50 border-red-200 text-red-700'
                      }`}>
                        {loan.asset_category.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                      {loan.overdue_days > 0 ? `${loan.overdue_days} Days Overdue` : '0 Days (Up to Date)'}
                    </td>
                    <td className="px-6 py-4 text-sm font-extrabold text-slate-900 text-right">
                      Rs. {parseFloat(loan.outstanding_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-550 text-right">
                      Rs. {parseFloat(loan.required_provision).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Audit Profile Modal */}
      <CustomerAuditModal 
        isOpen={!!auditCustomerId} 
        customerId={auditCustomerId} 
        onClose={() => setAuditCustomerId(null)} 
      />

    </div>
  );
};

export default PortfolioRisk;
