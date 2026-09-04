import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Plus, Lock, Unlock, CheckCircle2, TrendingUp, TrendingDown, Wallet, Printer, FileText, X } from 'lucide-react';


const Accounting = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('cashbook');
  const [data, setData] = useState({ expenses: [], income: [], cashbook: [], accounts: [], journals: [] });
  const [expenseSummary, setExpenseSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [staffs, setStaffs] = useState([]);

  useEffect(() => {
    const fetchStaffs = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users`, config);
        setStaffs(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchStaffs();
  }, []);
  
  // Day Close States
  const [dayCloseDate, setDayCloseDate] = useState(new Date().toISOString().split('T')[0]);
  const [dayStatus, setDayStatus] = useState({ isClosed: false, summary: { total_in: 0, total_out: 0, balance: 0 } });
  const [closing, setClosing] = useState(false);

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ date: new Date().toISOString().split('T')[0], category: '', amount: '', description: '', staff_name: '' });

  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [incomeForm, setIncomeForm] = useState({ date: new Date().toISOString().split('T')[0], source: '', amount: '' });

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user?.role !== 'admin' && user?.role !== 'accountant') {
    return <Navigate to="/" />;
  }

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'cashbook') {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/cashbook`);
        setData(prev => ({ ...prev, cashbook: Array.isArray(res.data.data) ? res.data.data : res.data }));
      } else if (activeTab === 'expenses') {
        const [resExp, resSum] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/expenses`),
          axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/expenses/summary`)
        ]);
        setData(prev => ({ ...prev, expenses: Array.isArray(resExp.data.data) ? resExp.data.data : resExp.data }));
        setExpenseSummary(resSum.data);
      } else if (activeTab === 'income') {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/income`);
        setData(prev => ({ ...prev, income: Array.isArray(res.data.data) ? res.data.data : res.data }));
      } else if (activeTab === 'accounts') {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/accounting/accounts`);
        setData(prev => ({ ...prev, accounts: Array.isArray(res.data.data) ? res.data.data : res.data }));
      } else if (activeTab === 'journals') {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/accounting/journals`);
        setData(prev => ({ ...prev, journals: Array.isArray(res.data.data) ? res.data.data : res.data }));
      } else if (activeTab === 'dayclose') {
        await fetchDayStatus();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDayStatus = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/accounting/status/${dayCloseDate}`);
      setDayStatus(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'dayclose') fetchDayStatus();
  }, [dayCloseDate]);

  const handleDayClose = async () => {
    if (!window.confirm(`Are you sure you want to close the accounts for ${dayCloseDate}? This cannot be undone.`)) return;
    setClosing(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/accounting/close`, {
        date: dayCloseDate,
        total_in: dayStatus.summary.total_in,
        total_out: dayStatus.summary.total_out,
        balance: dayStatus.summary.balance
      });
      await fetchDayStatus();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to close day');
    } finally {
      setClosing(false);
    }
  };

  const handleGenerateReport = async () => {
    setLoadingReport(true);
    setShowReportModal(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/accounting/status/${dayCloseDate}/report`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setReportData(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to load report');
      setShowReportModal(false);
    } finally {
      setLoadingReport(false);
    }
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const payload = { ...expenseForm };
      if (['Salary', 'Allowance', 'Fuel'].includes(payload.category) && payload.staff_name) {
        payload.description = `${payload.category} for ${payload.staff_name}: ${payload.description || ''}`;
      }
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/expenses`, payload, config);
      setShowExpenseModal(false);
      setExpenseForm({ date: new Date().toISOString().split('T')[0], category: '', amount: '', description: '', staff_name: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIncomeSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/income`, incomeForm);
      setShowIncomeModal(false);
      setIncomeForm({ date: new Date().toISOString().split('T')[0], source: '', amount: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save income');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Accounting</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Manage expenses, income, and financial day-end procedures</p>
        </div>
        <div className="flex gap-3">

          {activeTab === 'expenses' && (
            <button onClick={() => setShowExpenseModal(true)} className="accent-btn">
              <Plus className="w-5 h-5" /> Add Expense
            </button>
          )}
          {activeTab === 'income' && (
            <button onClick={() => setShowIncomeModal(true)} className="premium-btn">
              <Plus className="w-5 h-5" /> Add Income
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-slate-100/80 backdrop-blur-sm rounded-xl border border-slate-200 overflow-x-auto max-w-full no-scrollbar print:hidden">
        {[
          { id: 'cashbook', label: 'Cash Book' },
          { id: 'expenses', label: 'Expenses' },
          { id: 'income', label: 'Other Income' },
          { id: 'accounts', label: 'Chart of Accounts' },
          { id: 'journals', label: 'General Ledger' },
          { id: 'dayclose', label: 'Day Close' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-white text-primary-600 shadow-sm border border-slate-200/50' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="glass-panel overflow-hidden print:hidden">
        {loading && activeTab !== 'dayclose' ? (
          <div className="flex justify-center items-center h-48">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === 'cashbook' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                    <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Source</th>
                    <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.cashbook.map(t => (
                    <tr key={t.transaction_id} className="hover:bg-slate-50/50 transition-colors duration-200">
                      <td className="py-5 px-6 text-sm text-slate-600 font-medium">{new Date(t.date).toLocaleString()}</td>
                      <td className="py-5 px-6">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${t.type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="py-5 px-6 text-sm text-slate-700 font-medium capitalize">{t.source.replace('_', ' ')}</td>
                      <td className="py-5 px-6 text-sm font-bold text-slate-900">Rs. {parseFloat(t.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                  {data.cashbook.length === 0 && <tr><td colSpan="4" className="py-12 text-center text-slate-400 font-medium">No transactions found.</td></tr>}
                </tbody>
              </table>
            )}

            {activeTab === 'expenses' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                    <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
                    <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.expenses.map(e => (
                    <tr key={e.expense_id} className="hover:bg-slate-50/50 transition-colors duration-200">
                      <td className="py-5 px-6 text-sm text-slate-600 font-medium">{new Date(e.date).toLocaleDateString()}</td>
                      <td className="py-5 px-6 text-sm font-bold text-slate-800">{e.category}</td>
                      <td className="py-5 px-6 text-sm text-slate-500 font-medium">{e.description}</td>
                      <td className="py-5 px-6 text-sm font-bold text-red-600">Rs. {parseFloat(e.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                  {data.expenses.length === 0 && <tr><td colSpan="4" className="py-12 text-center text-slate-400 font-medium">No expenses found.</td></tr>}
                </tbody>
              </table>
            )}

            {activeTab === 'income' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Source</th>
                    <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.income.map(i => (
                    <tr key={i.income_id} className="hover:bg-slate-50/50 transition-colors duration-200">
                      <td className="py-5 px-6 text-sm text-slate-600 font-medium">{new Date(i.date).toLocaleDateString()}</td>
                      <td className="py-5 px-6 text-sm font-bold text-slate-800">{i.source}</td>
                      <td className="py-5 px-6 text-sm font-bold text-green-600">Rs. {parseFloat(i.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                  {data.income.length === 0 && <tr><td colSpan="3" className="py-12 text-center text-slate-400 font-medium">No other income found.</td></tr>}
                </tbody>
              </table>
            )}

            {activeTab === 'accounts' && (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].map(cat => {
                    const catAccounts = data.accounts.filter(a => a.category === cat);
                    const catColors = {
                      ASSET: 'from-emerald-500/20 to-teal-500/10 border-emerald-200 text-emerald-800',
                      LIABILITY: 'from-amber-500/20 to-orange-500/10 border-amber-200 text-amber-800',
                      EQUITY: 'from-blue-500/20 to-indigo-500/10 border-blue-200 text-blue-800',
                      REVENUE: 'from-purple-500/20 to-pink-500/10 border-purple-200 text-purple-800',
                      EXPENSE: 'from-rose-500/20 to-red-500/10 border-rose-200 text-rose-800'
                    };
                    const badgeColors = {
                      ASSET: 'bg-emerald-100 text-emerald-800',
                      LIABILITY: 'bg-amber-100 text-amber-800',
                      EQUITY: 'bg-blue-100 text-blue-800',
                      REVENUE: 'bg-purple-100 text-purple-800',
                      EXPENSE: 'bg-rose-100 text-rose-800'
                    };

                    return (
                      <div key={cat} className={`rounded-2xl border p-5 bg-gradient-to-br ${catColors[cat] || 'from-slate-50 to-slate-100 border-slate-200'} shadow-sm`}>
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="font-bold text-lg tracking-tight uppercase">{cat}s</h4>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badgeColors[cat]}`}>
                            {catAccounts.length} Accounts
                          </span>
                        </div>
                        <div className="space-y-2">
                          {catAccounts.map(acc => (
                            <div key={acc.account_code} className="flex justify-between items-center p-3 rounded-xl bg-white/70 border border-white/50 shadow-sm hover:scale-[1.01] transition-transform duration-200">
                              <div>
                                <p className="text-sm font-bold text-slate-800">{acc.account_name}</p>
                                <p className="text-xs text-slate-400 font-medium">Code: {acc.account_code}</p>
                              </div>
                              {acc.parent_code && (
                                <span className="text-[10px] font-bold text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded">
                                  Sub of {acc.parent_code}
                                </span>
                              )}
                            </div>
                          ))}
                          {catAccounts.length === 0 && (
                            <p className="text-xs text-slate-400 italic py-4 text-center">No accounts registered.</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'journals' && (
              <div className="p-6 space-y-6">
                <div className="space-y-6 max-w-4xl mx-auto">
                  {data.journals.map(entry => {
                    const totalDebit = entry.lines.reduce((sum, l) => sum + l.debit, 0);
                    const totalCredit = entry.lines.reduce((sum, l) => sum + l.credit, 0);

                    return (
                      <div key={entry.journal_id} className="rounded-2xl border border-slate-200/60 bg-white/85 backdrop-blur-sm p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
                        {/* Header Details */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100 mb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Journal Voucher</span>
                              <span className="text-sm font-extrabold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-lg border border-primary-100">
                                #JV-{entry.journal_id}
                              </span>
                            </div>
                            <h4 className="text-base font-bold text-slate-800 mt-1 capitalize">
                              {entry.description || `Transaction ref: ${entry.reference_source} #${entry.reference_id}`}
                            </h4>
                          </div>
                          <div className="text-left md:text-right">
                            <p className="text-sm font-bold text-slate-600">
                              {new Date(entry.transaction_date).toLocaleString()}
                            </p>
                            <p className="text-xs text-slate-400 font-medium mt-0.5">
                              Logged by: <span className="text-slate-500 font-bold">{entry.operator_name || 'System Engine'}</span>
                            </p>
                          </div>
                        </div>

                        {/* Balanced Lines Breakdown */}
                        <div className="overflow-x-auto rounded-xl border border-slate-100 bg-slate-50/50">
                          <table className="w-full text-left border-collapse min-w-[500px]">
                            <thead>
                              <tr className="bg-slate-100/60 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/50">
                                <th className="py-2.5 px-4">Account Code</th>
                                <th className="py-2.5 px-4">Account Name</th>
                                <th className="py-2.5 px-4 text-right">Debit (Dr)</th>
                                <th className="py-2.5 px-4 text-right">Credit (Cr)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                              {entry.lines.map(line => (
                                <tr key={line.line_id} className="hover:bg-white/40 transition-colors duration-150">
                                  <td className="py-3 px-4 font-mono text-slate-600 text-xs font-bold">{line.account_code}</td>
                                  <td className="py-3 px-4 text-slate-700 font-medium">{line.account_name}</td>
                                  <td className="py-3 px-4 text-right font-bold text-emerald-600">
                                    {line.debit > 0 ? `Rs. ${line.debit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                                  </td>
                                  <td className="py-3 px-4 text-right font-bold text-rose-600">
                                    {line.credit > 0 ? `Rs. ${line.credit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                                  </td>
                                </tr>
                              ))}
                              {/* Total Balanced Footer */}
                              <tr className="bg-slate-100/30 font-bold border-t border-slate-200/80">
                                <td colSpan="2" className="py-3 px-4 text-xs uppercase text-slate-400 tracking-wider text-right">Total Balanced</td>
                                <td className="py-3 px-4 text-right text-emerald-700">
                                  Rs. {totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="py-3 px-4 text-right text-rose-700">
                                  Rs. {totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                  {data.journals.length === 0 && (
                    <div className="py-16 text-center text-slate-400 font-medium glass-panel bg-white/40">
                      No general ledger records found.
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'dayclose' && (
              <div className="p-8 max-w-3xl mx-auto space-y-8">
                <div className="flex items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-100 shadow-sm">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Select Date</label>
                    <input type="date" className="bg-transparent border-none p-0 text-xl font-bold text-slate-800 focus:ring-0 cursor-pointer" value={dayCloseDate} onChange={e => setDayCloseDate(e.target.value)} />
                  </div>
                  <div className="flex items-center gap-2">
                    {dayStatus.isClosed ? (
                      <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-100 text-green-700 font-bold text-sm shadow-sm">
                        <Lock className="w-4 h-4" /> Day Closed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-100 text-amber-700 font-bold text-sm shadow-sm">
                        <Unlock className="w-4 h-4" /> Day Open
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
                    <div className="flex justify-between items-start mb-4">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total In</p>
                      <div className="p-2 bg-green-100 rounded-lg text-green-600">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-green-600">Rs. {parseFloat(dayStatus.summary.total_in).toLocaleString()}</p>
                  </div>
                  <div className="p-6 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
                    <div className="flex justify-between items-start mb-4">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Out</p>
                      <div className="p-2 bg-red-100 rounded-lg text-red-600">
                        <TrendingDown className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-red-600">Rs. {parseFloat(dayStatus.summary.total_out).toLocaleString()}</p>
                  </div>
                  <div className="p-6 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
                    <div className="flex justify-between items-start mb-4">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Balance</p>
                      <div className="p-2 bg-primary-100 rounded-lg text-primary-600">
                        <Wallet className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">Rs. {parseFloat(dayStatus.summary.balance).toLocaleString()}</p>
                  </div>
                </div>

                {!dayStatus.isClosed ? (
                  <button 
                    onClick={handleDayClose}
                    disabled={closing}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white font-bold text-lg shadow-xl shadow-slate-200 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {closing ? 'Closing Day...' : 'Finalize & Close Day'}
                  </button>
                ) : (
                  <div className="p-8 rounded-2xl bg-green-50 border border-green-100 text-center flex flex-col items-center justify-center">
                    <div className="flex items-center gap-4 mb-4 text-left">
                      <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center shadow-sm shrink-0">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-green-800 mb-1">Accounting Verified</h4>
                        <p className="text-sm text-green-600 font-medium">This day was finalized on {new Date(dayStatus.closeData.closed_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleGenerateReport} 
                      className="mt-2 inline-flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-500/30 transition-all"
                    >
                      <FileText className="w-5 h-5" />
                      Print Day Summary
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add Expense</h3>
                <p className="text-sm text-slate-500 font-medium mt-1">Record a new operational expense.</p>
              </div>
              <button onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-full">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleExpenseSubmit} className="p-8 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Date</label>
                <input required disabled={isSubmitting} type="date" className="premium-input" value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Category</label>
                <select required disabled={isSubmitting} className="premium-input" value={expenseForm.category} onChange={e => setExpenseForm({...expenseForm, category: e.target.value, staff_name: ['Salary', 'Allowance', 'Fuel'].includes(e.target.value) ? expenseForm.staff_name : ''})}>
                  <option value="" disabled>Select Expense Category</option>
                  <option value="Salary">Salary</option>
                  <option value="Allowance">Allowance</option>
                  <option value="Stamp">Stamp</option>
                  <option value="Fuel">Fuel</option>
                  <option value="Card">Card</option>
                  <option value="Photocopy">Photocopy</option>
                  <option value="Promissory">Promissory</option>
                  <option value="Other">Other Operational Expense</option>
                </select>
              </div>
              {(expenseForm.category === 'Salary' || expenseForm.category === 'Allowance' || expenseForm.category === 'Fuel') && (
                <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Select Employee / Staff</label>
                  <select required disabled={isSubmitting} className="premium-input" value={expenseForm.staff_name} onChange={e => setExpenseForm({...expenseForm, staff_name: e.target.value})}>
                    <option value="" disabled>Select Staff Member</option>
                    {staffs.map(staff => (
                      <option key={staff.user_id} value={staff.name}>{staff.name} ({staff.role})</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Amount (Rs.)</label>
                <input required disabled={isSubmitting} type="number" step="0.01" className="premium-input" placeholder="0.00" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                <textarea disabled={isSubmitting} className="premium-input resize-none" rows="3" placeholder="Add more details..." value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})}></textarea>
              </div>
              <div className="pt-2 flex gap-4">
                <button type="button" onClick={() => setShowExpenseModal(false)} className="flex-1 secondary-btn" disabled={isSubmitting}>Cancel</button>
                <button type="submit" className="flex-1 accent-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Income Modal */}
      {showIncomeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add Income</h3>
                <p className="text-sm text-slate-500 font-medium mt-1">Record other sources of income.</p>
              </div>
              <button onClick={() => setShowIncomeModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-full">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleIncomeSubmit} className="p-8 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Date</label>
                <input required disabled={isSubmitting} type="date" className="premium-input" value={incomeForm.date} onChange={e => setIncomeForm({...incomeForm, date: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Source</label>
                <select required disabled={isSubmitting} className="premium-input" value={incomeForm.source} onChange={e => setIncomeForm({...incomeForm, source: e.target.value})}>
                  <option value="" disabled>Select Income Source</option>
                  <option value="Consultation Fee">Consultation Fee</option>
                  <option value="Late Payment Penalty">Late Payment Penalty</option>
                  <option value="Service Charge">Service Charge</option>
                  <option value="Miscellaneous">Miscellaneous Income</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Amount (Rs.)</label>
                <input required disabled={isSubmitting} type="number" step="0.01" className="premium-input" placeholder="0.00" value={incomeForm.amount} onChange={e => setIncomeForm({...incomeForm, amount: e.target.value})} />
              </div>
              <div className="pt-2 flex gap-4">
                <button type="button" onClick={() => setShowIncomeModal(false)} className="flex-1 secondary-btn" disabled={isSubmitting}>Cancel</button>
                <button type="submit" className="flex-1 premium-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Income'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Day Close Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-300 print:bg-white print:static print:inset-auto print:block print:w-full print:h-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300 print:shadow-none print:rounded-none print:max-h-none print:overflow-visible print:w-full">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 print:hidden">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Day End Audit Report</h3>
                <p className="text-sm text-slate-500 font-medium mt-1">Detailed summary of all transactions and operator actions.</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => window.print()} disabled={loadingReport || !reportData} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-900 disabled:opacity-50">
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-8 print:p-0">
              {loadingReport ? (
                <div className="flex justify-center items-center py-20 text-slate-400">Loading audit trail...</div>
              ) : reportData ? (
                <div className="space-y-4 text-black" id="printable-report">
                  <div className="text-center border-b border-gray-300 pb-2">
                    <h1 className="text-xl font-extrabold uppercase tracking-widest">Cashon Galle Credit - Daily Audit</h1>
                    <p className="text-xs font-semibold mt-1">Date: {new Date(reportData.dayStatus.date).toLocaleDateString()} | Closed By: {reportData.dayStatus.closed_by_name || 'System'}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 my-2">
                    <div className="border border-gray-200 p-2 bg-white text-center">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Inflow</p>
                      <p className="text-sm font-bold text-black">Rs. {Number(reportData.dayStatus.total_in).toLocaleString()}</p>
                    </div>
                    <div className="border border-gray-200 p-2 bg-white text-center">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Outflow</p>
                      <p className="text-sm font-bold text-black">Rs. {Number(reportData.dayStatus.total_out).toLocaleString()}</p>
                    </div>
                    <div className="border border-gray-200 p-2 bg-white text-center">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Net Balance</p>
                      <p className="text-sm font-bold text-black">Rs. {Number(reportData.dayStatus.closing_balance).toLocaleString()}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold border-b border-gray-300 pb-1 mb-2 uppercase tracking-wide">Journal Entries & Actions</h3>
                    {reportData.journals && reportData.journals.length > 0 ? (
                      <div className="space-y-1">
                        {reportData.journals.map((j, i) => (
                          <div key={i} className="border-b border-gray-300 p-1">
                            <div className="flex justify-between items-start mb-1 pb-1 border-0">
                              <div>
                                <p className="font-bold text-xs">[{j.reference_source || 'MANUAL'}] Ref: {j.reference_id}</p>
                                <p className="text-[10px] text-gray-600 mt-0.5">{j.description}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-[10px] text-gray-800">Op: {j.created_by_name || 'System'}</p>
                                <p className="text-gray-500 mt-0 text-[9px]">{new Date(j.transaction_date).toLocaleTimeString()}</p>
                              </div>
                            </div>
                            <table className="w-full text-[10px]">
                              <thead>
                                <tr className="text-left text-gray-500 border-b border-gray-200">
                                  <th className="pb-1 font-bold w-1/2">Account</th>
                                  <th className="pb-1 font-bold text-right">Debit (Rs)</th>
                                  <th className="pb-1 font-bold text-right">Credit (Rs)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {j.lines && j.lines.map((l, idx) => (
                                  <tr key={idx} className="border-b border-gray-50 last:border-0">
                                    <td className="py-0.5 text-gray-800">{l.account_code} - {l.account_name}</td>
                                    <td className="py-0.5 text-right font-medium text-gray-800">{Number(l.debit) > 0 ? Number(l.debit).toLocaleString() : '-'}</td>
                                    <td className="py-0.5 text-right font-medium text-gray-800">{Number(l.credit) > 0 ? Number(l.credit).toLocaleString() : '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic">No journal entries recorded for this day.</p>
                    )}
                  </div>
                  
                  <div className="pt-2 text-center text-[10px] text-gray-400 border-t border-gray-200">
                    End of Report
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounting;


