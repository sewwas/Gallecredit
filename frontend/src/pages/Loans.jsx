import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Plus, Eye, ShieldAlert, CalendarClock, Check, X, Sparkles, Receipt, RefreshCw, Landmark } from 'lucide-react';

const Loans = () => {
  const { user } = useAuth();
  const isAdminOrAccountant = user?.role === 'admin' || user?.role === 'accountant';

  const [loans, setLoans] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'pending', 'approved', 'all'
  const [showModal, setShowModal] = useState(false);
  const [viewLoan, setViewLoan] = useState(null);
  const [viewInstallments, setViewInstallments] = useState([]);
  const [actioningId, setActioningId] = useState(null);
  const [notes, setNotes] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    customer_id: '',
    loan_amount: '',
    interest_rate: '',
    loan_type: 'daily',
    interest_method: 'flat',
    issue_date: new Date().toISOString().split('T')[0],
    no_of_installments: '',
    grace_period_days: '3',
    penalty_rate: '2.0',
    guarantor_name: '',
    guarantor_nic: '',
    guarantor_phone: '',
    guarantor_address: ''
  });
  const [previewSchedule, setPreviewSchedule] = useState([]);

  const calculatePreview = () => {
    const { loan_amount, interest_rate, no_of_installments, loan_type, interest_method, issue_date } = formData;
    if (!loan_amount || interest_rate === '' || !no_of_installments) {
      setPreviewSchedule([]);
      return;
    }

    const P = parseFloat(loan_amount);
    const r = parseFloat(interest_rate) / 100;
    const n = parseInt(no_of_installments);
    let installments = [];
    let currentDueDate = new Date(issue_date);

    if (interest_method === 'reducing') {
      let emi = 0;
      if (r === 0) {
        emi = P / n;
      } else {
        emi = P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
      }
      for (let i = 1; i <= n; i++) {
        if (loan_type === 'daily') currentDueDate.setDate(currentDueDate.getDate() + 1);
        if (loan_type === 'weekly') currentDueDate.setDate(currentDueDate.getDate() + 7);
        if (loan_type === 'monthly') currentDueDate.setMonth(currentDueDate.getMonth() + 1);
        installments.push({ due_date: new Date(currentDueDate).toISOString().split('T')[0], amount: emi.toFixed(2) });
      }
    } else {
      const total = P + (P * r);
      const instAmt = total / n;
      for (let i = 1; i <= n; i++) {
        if (loan_type === 'daily') currentDueDate.setDate(currentDueDate.getDate() + 1);
        if (loan_type === 'weekly') currentDueDate.setDate(currentDueDate.getDate() + 7);
        if (loan_type === 'monthly') currentDueDate.setMonth(currentDueDate.getMonth() + 1);
        installments.push({ due_date: new Date(currentDueDate).toISOString().split('T')[0], amount: instAmt.toFixed(2) });
      }
    }
    setPreviewSchedule(installments);
  };

  useEffect(() => {
    calculatePreview();
  }, [formData.loan_amount, formData.interest_rate, formData.no_of_installments, formData.loan_type, formData.interest_method, formData.issue_date]);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
      const [loansRes, customersRes] = await Promise.all([
        axios.get(`\${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/loans`, config),
        axios.get(`\${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/customers`, config)
      ]);
      setLoans(loansRes.data);
      setCustomers(customersRes.data);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load loans data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
      await axios.post(`\${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/loans`, formData, config);
      setSuccessMsg('Loan application registered successfully (Maker action completed)!');
      setShowModal(false);
      setFormData({
        customer_id: '',
        loan_amount: '',
        interest_rate: '',
        loan_type: 'daily',
        interest_method: 'flat',
        issue_date: new Date().toISOString().split('T')[0],
        no_of_installments: '',
        grace_period_days: '3',
        penalty_rate: '2.0',
        guarantor_name: '',
        guarantor_nic: '',
        guarantor_phone: '',
        guarantor_address: ''
      });
      fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to submit loan application');
    }
  };

  const handleApprove = async (id) => {
    setActioningId(id);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
      await axios.post(`\${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/loans/${id}/approve`, { notes: notes || 'Approved via Loans Desk.' }, config);
      setSuccessMsg('Loan application approved successfully (Checker status active)!');
      setNotes('');
      fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to approve loan application');
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (id) => {
    setActioningId(id);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
      await axios.post(`\${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/loans/${id}/reject`, { notes: notes || 'Rejected via Loans Desk.' }, config);
      setSuccessMsg('Loan application rejected.');
      setNotes('');
      fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to reject loan application');
    } finally {
      setActioningId(null);
    }
  };

  const handleDisburse = async (id) => {
    if (!window.confirm('Confirm physical cash payout? This will subtract funds from the Main Vault and commit active installments.')) return;
    
    setActioningId(id);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
      await axios.post(`\${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/loans/${id}/disburse`, {}, config);
      setSuccessMsg('Capital successfully released and disbursed! Installments schedule active.');
      fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to disburse loan');
    } finally {
      setActioningId(null);
    }
  };

  const viewDetails = async (loan) => {
    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
      const res = await axios.get(`\${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/loans/${loan.loan_id}`, config);
      setViewInstallments(res.data.installments);
      setViewLoan(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Tab Filtering
  const filteredLoans = loans.filter(l => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return l.status === 'pending_approval';
    if (activeTab === 'approved') return l.status === 'approved';
    if (activeTab === 'active') return l.status === 'disbursed';
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Alerts */}
      {errorMsg && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-semibold">{errorMsg}</p>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 text-green-500 rounded-2xl">
          <Sparkles className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-semibold">{successMsg}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Enterprise Loans Desk</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Multi-role Maker-Checker approval and disbursal gate</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-bold rounded-xl shadow-lg shadow-primary-500/20 hover:shadow-xl transition-all duration-300">
          <Plus className="w-5 h-5" /> File Loan Application
        </button>
      </div>

      {/* Tabs Layout */}
      <div className="flex border-b border-slate-200 gap-2 shrink-0">
        <button 
          onClick={() => setActiveTab('active')} 
          className={`pb-4 px-4 font-bold text-sm border-b-2 transition-all ${activeTab === 'active' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Active Portfolio
        </button>
        <button 
          onClick={() => setActiveTab('pending')} 
          className={`pb-4 px-4 font-bold text-sm border-b-2 transition-all relative ${activeTab === 'pending' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Pending Approvals
          {loans.filter(l => l.status === 'pending_approval').length > 0 && (
            <span className="ml-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
              {loans.filter(l => l.status === 'pending_approval').length}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('approved')} 
          className={`pb-4 px-4 font-bold text-sm border-b-2 transition-all relative ${activeTab === 'approved' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Disbursable approved
          {loans.filter(l => l.status === 'approved').length > 0 && (
            <span className="ml-2 bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
              {loans.filter(l => l.status === 'approved').length}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('all')} 
          className={`pb-4 px-4 font-bold text-sm border-b-2 transition-all ${activeTab === 'all' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          All Applications
        </button>
      </div>

      {/* List Container */}
      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        ) : filteredLoans.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-semibold">
            No loans found in this category.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="py-5 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider">Customer</th>
                  <th className="py-5 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider">Principal</th>
                  <th className="py-5 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider">Type</th>
                  <th className="py-5 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider">Due Date</th>
                  <th className="py-5 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="py-5 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLoans.map((l) => (
                  <tr key={l.loan_id} className="hover:bg-slate-50/50 transition-colors duration-200">
                    <td className="py-5 px-6 text-sm font-semibold text-slate-800">{l.customer_name}</td>
                    <td className="py-5 px-6 text-sm font-bold text-slate-900">Rs. {parseFloat(l.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="py-5 px-6 text-sm text-slate-600 capitalize">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        l.loan_type === 'daily' ? 'bg-amber-100 text-amber-700' :
                        l.loan_type === 'weekly' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {l.loan_type}
                      </span>
                    </td>
                    <td className="py-5 px-6 text-sm text-slate-600 font-medium">
                      {l.due_date ? new Date(l.due_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-5 px-6">
                      <span className={`px-3 py-1 text-xs font-bold rounded-xl ${
                        l.status === 'disbursed' ? 'bg-green-100 text-green-700' :
                        l.status === 'pending_approval' ? 'bg-amber-100 text-amber-700' :
                        l.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                        l.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {l.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-5 px-6 text-right">
                      <div className="flex justify-end items-center gap-2">
                        {/* Approval Desk (Pending status + Admin/Accountant) */}
                        {l.status === 'pending_approval' && isAdminOrAccountant && (
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              placeholder="Review notes..." 
                              onChange={(e) => setNotes(e.target.value)}
                              className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs" 
                            />
                            <button 
                              onClick={() => handleApprove(l.loan_id)}
                              disabled={actioningId === l.loan_id}
                              className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => handleReject(l.loan_id)}
                              disabled={actioningId === l.loan_id}
                              className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Disbursal Gate */}
                        {l.status === 'approved' && isAdminOrAccountant && (
                          <button 
                            onClick={() => handleDisburse(l.loan_id)}
                            disabled={actioningId === l.loan_id}
                            className="flex items-center gap-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-xs font-bold px-3 py-2 rounded-xl shadow shadow-green-500/10 transition-all"
                          >
                            <Landmark className="w-3.5 h-3.5" /> Disburse
                          </button>
                        )}

                        <button onClick={() => viewDetails(l)} className="text-primary-600 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 p-2 rounded-xl transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Issue Loan Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-300 p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-bold text-slate-900">File New Loan Application</h3>
                <p className="text-sm text-slate-500 font-medium mt-1">Application goes into pending approval (Maker action).</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Customer</label>
                <select required className="premium-input bg-white font-semibold" value={formData.customer_id} onChange={e => setFormData({...formData, customer_id: e.target.value})}>
                  <option value="">Select Customer</option>
                  {customers.map(c => <option key={c.customer_id} value={c.customer_id}>{c.name} - {c.nic} ({c.kyc_status.toUpperCase()})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Principal Amount</label>
                  <input required type="number" step="0.01" className="premium-input" placeholder="0.00" value={formData.loan_amount} onChange={e => setFormData({...formData, loan_amount: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Interest Rate (%)</label>
                  <input required type="number" step="0.01" className="premium-input" placeholder="0.00" value={formData.interest_rate} onChange={e => setFormData({...formData, interest_rate: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Loan Type</label>
                  <select required className="premium-input bg-white font-semibold" value={formData.loan_type} onChange={e => setFormData({...formData, loan_type: e.target.value})}>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">No. of Installments</label>
                  <input required type="number" className="premium-input" placeholder="e.g. 12" value={formData.no_of_installments} onChange={e => setFormData({...formData, no_of_installments: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Interest Method</label>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    type="button" 
                    onClick={() => setFormData({...formData, interest_method: 'flat'})}
                    className={`py-3 px-4 rounded-xl text-sm font-semibold border transition-all ${formData.interest_method === 'flat' ? 'bg-primary-50 border-primary-600 text-primary-700 shadow-sm font-bold' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                  >
                    Flat Rate
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setFormData({...formData, interest_method: 'reducing'})}
                    className={`py-3 px-4 rounded-xl text-sm font-semibold border transition-all ${formData.interest_method === 'reducing' ? 'bg-primary-50 border-primary-600 text-primary-700 shadow-sm font-bold' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                  >
                    Reducing Balance
                  </button>
                </div>
              </div>
              
              {previewSchedule.length > 0 && (
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Schedule Draft Preview (Sundays excluded)</h4>
                    <p className="text-sm font-bold text-primary-700">Total: Rs. {previewSchedule.reduce((sum, i) => sum + parseFloat(i.amount), 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                    {previewSchedule.map((inst, idx) => (
                      <div key={idx} className="flex justify-between text-sm py-2 border-b border-slate-200/50 last:border-0">
                        <span className="text-slate-600 font-medium">{idx + 1}. {new Date(inst.due_date).toLocaleDateString()}</span>
                        <span className="font-bold text-slate-800">Rs. {parseFloat(inst.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 pb-1 border-b border-slate-100">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Risk Parameters</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Grace Period (Days)</label>
                  <input required type="number" className="premium-input" value={formData.grace_period_days} onChange={e => setFormData({...formData, grace_period_days: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Penalty Rate (%)</label>
                  <input required type="number" step="0.1" className="premium-input" value={formData.penalty_rate} onChange={e => setFormData({...formData, penalty_rate: e.target.value})} />
                </div>
              </div>

              <div className="pt-2 pb-1 border-b border-slate-100">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Guarantor Details (Optional)</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Guarantor Name</label>
                  <input type="text" className="premium-input" value={formData.guarantor_name} onChange={e => setFormData({...formData, guarantor_name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Guarantor NIC</label>
                  <input type="text" className="premium-input" value={formData.guarantor_nic} onChange={e => setFormData({...formData, guarantor_nic: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Guarantor Phone</label>
                  <input type="text" className="premium-input" value={formData.guarantor_phone} onChange={e => setFormData({...formData, guarantor_phone: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Guarantor Address</label>
                  <input type="text" className="premium-input" value={formData.guarantor_address} onChange={e => setFormData({...formData, guarantor_address: e.target.value})} />
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-3.5 bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold rounded-xl transition-all">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-3.5 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-bold rounded-xl shadow-lg transition-all duration-300">File Application</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {viewLoan && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-300 p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Loan & Audit Details</h3>
                <p className="text-sm text-slate-500 font-medium mt-1">{viewLoan.customer_name} • Application ID: #{viewLoan.loan_id}</p>
              </div>
              <button onClick={() => setViewLoan(null)} className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="overflow-y-auto p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-3">
                    <CalendarClock className="w-4 h-4" /> Repayments
                  </div>
                  <p className="text-sm text-slate-700 font-semibold">Type: <span className="font-bold text-slate-900 capitalize">{viewLoan.loan_type}</span></p>
                  <p className="text-sm text-slate-700 font-semibold mt-1">Installments: <span className="font-bold text-slate-900">{viewLoan.no_of_installments}</span></p>
                </div>
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-3">
                    <ShieldAlert className="w-4 h-4" /> Penalties
                  </div>
                  <p className="text-sm text-slate-700 font-semibold">Rate: <span className="font-bold text-slate-900">{viewLoan.penalty_rate}%</span></p>
                  <p className="text-sm text-slate-700 font-semibold mt-1">Grace Period: <span className="font-bold text-slate-900">{viewLoan.grace_period_days} Days</span></p>
                </div>
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-3">
                    <Landmark className="w-4 h-4" /> Status
                  </div>
                  <p className="text-sm font-extrabold capitalize text-slate-900">{viewLoan.status}</p>
                  <p className="text-xs text-slate-400 font-medium mt-1">Maker-Checker Approved</p>
                </div>
              </div>

              {/* Status Audit logs */}
              {viewLoan.history && viewLoan.history.length > 0 && (
                <div className="space-y-4 p-5 rounded-2xl border border-slate-200/60 bg-slate-50/20">
                  <h4 className="text-sm font-extrabold text-slate-900 tracking-tight uppercase">Audit Status History Log</h4>
                  <div className="relative border-l border-slate-200 pl-6 ml-2 space-y-4">
                    {viewLoan.history.map((log) => (
                      <div key={log.history_id} className="relative">
                        <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-primary-500 border-2 border-white ring-2 ring-primary-500/10" />
                        <span className="text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-100 uppercase">
                          {log.to_status}
                        </span>
                        <p className="text-xs font-bold text-slate-800 mt-1">{log.notes}</p>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                          By: {log.operator_name || 'System Central'} | {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Installments details */}
              {viewLoan.status === 'disbursed' && (
                <div className="space-y-4">
                  <h4 className="text-lg font-bold text-slate-900">Installment Repayment Schedule</h4>
                  <div className="border border-slate-100 rounded-2xl overflow-x-auto shadow-sm">
                    <table className="w-full text-left border-collapse min-w-[500px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase">
                          <th className="py-4 px-6">Due Date</th>
                          <th className="py-4 px-6">Amount</th>
                          <th className="py-4 px-6">Paid</th>
                          <th className="py-4 px-6">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {viewInstallments.map((inst) => (
                          <tr key={inst.installment_id} className="text-sm hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 px-6 text-slate-600 font-medium">{new Date(inst.due_date).toLocaleDateString()}</td>
                            <td className="py-4 px-6 font-bold text-slate-900">Rs. {parseFloat(inst.amount).toLocaleString()}</td>
                            <td className="py-4 px-6 text-slate-600 font-medium">Rs. {parseFloat(inst.paid_amount).toLocaleString()}</td>
                            <td className="py-4 px-6">
                              <span className={`px-2.5 py-1 text-xs font-bold rounded-xl 
                                ${inst.status === 'paid' ? 'bg-green-100 text-green-700' : 
                                  inst.status === 'partial' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                                {inst.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Loans;
