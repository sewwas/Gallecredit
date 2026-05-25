import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Plus, Lock, Unlock, CheckCircle2, TrendingUp, TrendingDown, Wallet } from 'lucide-react';


const Accounting = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('cashbook');
  const [data, setData] = useState({ expenses: [], income: [], cashbook: [], accounts: [], journals: [] });
  const [loading, setLoading] = useState(true);
  
  // Day Close States
  const [dayCloseDate, setDayCloseDate] = useState(new Date().toISOString().split('T')[0]);
  const [dayStatus, setDayStatus] = useState({ isClosed: false, summary: { total_in: 0, total_out: 0, balance: 0 } });
  const [closing, setClosing] = useState(false);

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ date: new Date().toISOString().split('T')[0], category: '', amount: '', description: '' });

  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [incomeForm, setIncomeForm] = useState({ date: new Date().toISOString().split('T')[0], source: '', amount: '' });

  if (user?.role !== 'admin' && user?.role !== 'accountant') {
    return <Navigate to="/" />;
  }

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'cashbook') {
        const res = await axios.get(`\https://gallecredit-a9a2.vercel.app/api/cashbook`);
        setData(prev => ({ ...prev, cashbook: res.data }));
      } else if (activeTab === 'expenses') {
        const res = await axios.get(`\https://gallecredit-a9a2.vercel.app/api/expenses`);
        setData(prev => ({ ...prev, expenses: res.data }));
      } else if (activeTab === 'income') {
        const res = await axios.get(`\https://gallecredit-a9a2.vercel.app/api/income`);
        setData(prev => ({ ...prev, income: res.data }));
      } else if (activeTab === 'accounts') {
        const res = await axios.get(`\https://gallecredit-a9a2.vercel.app/api/accounting/accounts`);
        setData(prev => ({ ...prev, accounts: res.data }));
      } else if (activeTab === 'journals') {
        const res = await axios.get(`\https://gallecredit-a9a2.vercel.app/api/accounting/journals`);
        setData(prev => ({ ...prev, journals: res.data }));
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
      const res = await axios.get(`\https://gallecredit-a9a2.vercel.app/api/accounting/status/${dayCloseDate}`);
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
      await axios.post(`\https://gallecredit-a9a2.vercel.app/api/accounting/close`, {
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

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`\https://gallecredit-a9a2.vercel.app/api/expenses`, expenseForm);
      setShowExpenseModal(false);
      setExpenseForm({ date: new Date().toISOString().split('T')[0], category: '', amount: '', description: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save expense');
    }
  };

  const handleIncomeSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`\https://gallecredit-a9a2.vercel.app/api/income`, incomeForm);
      setShowIncomeModal(false);
      setIncomeForm({ date: new Date().toISOString().split('T')[0], source: '', amount: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save income');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
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

      <div className="flex gap-2 p-1 bg-slate-100/80 backdrop-blur-sm rounded-xl border border-slate-200 overflow-x-auto max-w-full no-scrollbar">
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

      <div className="glass-panel overflow-hidden">
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
                  <div className="p-8 rounded-2xl bg-green-50 border border-green-100 text-center">
                    <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h4 className="text-xl font-bold text-green-800 mb-1">Accounting Verified</h4>
                    <p className="text-sm text-green-600 font-medium">This day was finalized on {new Date(dayStatus.closeData.closed_at).toLocaleString()}</p>
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
                <input required type="date" className="premium-input" value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Category</label>
                <input required type="text" className="premium-input" placeholder="e.g. Utility, Office Supply" value={expenseForm.category} onChange={e => setExpenseForm({...expenseForm, category: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Amount</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 font-medium">Rs.</span>
                  <input required type="number" step="0.01" className="premium-input pl-12" placeholder="0.00" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                <textarea className="premium-input resize-none" rows="3" placeholder="Add more details..." value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})}></textarea>
              </div>
              <div className="pt-2 flex gap-4">
                <button type="button" onClick={() => setShowExpenseModal(false)} className="flex-1 secondary-btn">Cancel</button>
                <button type="submit" className="flex-1 accent-btn">Save Expense</button>
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
                <input required type="date" className="premium-input" value={incomeForm.date} onChange={e => setIncomeForm({...incomeForm, date: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Source</label>
                <input required type="text" className="premium-input" placeholder="e.g. Consultation Fee" value={incomeForm.source} onChange={e => setIncomeForm({...incomeForm, source: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Amount</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 font-medium">Rs.</span>
                  <input required type="number" step="0.01" className="premium-input pl-12" placeholder="0.00" value={incomeForm.amount} onChange={e => setIncomeForm({...incomeForm, amount: e.target.value})} />
                </div>
              </div>
              <div className="pt-2 flex gap-4">
                <button type="button" onClick={() => setShowIncomeModal(false)} className="flex-1 secondary-btn">Cancel</button>
                <button type="submit" className="flex-1 premium-btn">Save Income</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounting;


