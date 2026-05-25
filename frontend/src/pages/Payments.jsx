import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, CreditCard, Receipt, User, Check, AlertCircle, Wallet, Calendar, Clock, ArrowRight, Sparkles, Landmark, TrendingUp, CheckCircle, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Payments = () => {
  const { user } = useAuth();
  const [loans, setLoans] = useState([]);
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [installments, setInstallments] = useState([]);
  const [allInstallments, setAllInstallments] = useState([]);
  const [customerDetails, setCustomerDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [drawerBalance, setDrawerBalance] = useState(0);
  const [paymentData, setPaymentData] = useState({
    installment_id: '',
    amount: '',
    method: 'cash'
  });

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastPaymentDetails, setLastPaymentDetails] = useState(null);

  const fetchLoans = async () => {
    try {
      const res = await axios.get(`\${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/loans`);
      setLoans(res.data.filter(l => l.status === 'disbursed'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDrawerBalance = async () => {
    try {
      const config = {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      };
      const res = await axios.get(`\${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/vaults/my-drawer`, config);
      setDrawerBalance(parseFloat(res.data.current_balance || 0));
    } catch (err) {
      console.error('Failed to load collector drawer balance', err);
    }
  };

  useEffect(() => {
    fetchLoans();
    fetchDrawerBalance();
  }, []);

  useEffect(() => {
    if (selectedLoanId) {
      axios.get(`\${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/installments/loan/${selectedLoanId}`)
        .then(res => {
          setAllInstallments(res.data);
          setInstallments(res.data.filter(i => i.status !== 'paid'));
        })
        .catch(err => console.error(err));

      const selectedLoanObj = loans.find(l => l.loan_id == selectedLoanId);
      if (selectedLoanObj) {
        axios.get(`\${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/customers/${selectedLoanObj.customer_id}`)
          .then(res => setCustomerDetails(res.data))
          .catch(err => console.error(err));
      }
    } else {
      setAllInstallments([]);
      setInstallments([]);
      setCustomerDetails(null);
    }
    // Reset payment data on loan change
    setPaymentData({ installment_id: '', amount: '', method: 'cash' });
  }, [selectedLoanId, loans]);

  // Compute Outstanding & Due Metrics for the Selected Loan
  const selectedLoan = loans.find(l => l.loan_id == selectedLoanId);
  const totalLoanGranted = parseFloat(selectedLoan?.loan_amount || 0);
  const totalDueWithInterest = allInstallments.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);
  const totalPaidSoFar = allInstallments.reduce((sum, i) => sum + parseFloat(i.paid_amount || 0), 0);
  const totalOutstandingBalance = Math.max(0, totalDueWithInterest - totalPaidSoFar);

  const todayStr = new Date().toISOString().split('T')[0];
  const totalOverdueRightNow = allInstallments
    .filter(i => i.status !== 'paid' && i.due_date <= todayStr)
    .reduce((sum, i) => sum + (parseFloat(i.amount || 0) - parseFloat(i.paid_amount || 0)), 0);

  const selectedInstallment = allInstallments.find(i => i.installment_id == paymentData.installment_id);
  const selectedInstallmentRemaining = selectedInstallment 
    ? parseFloat(selectedInstallment.amount) - parseFloat(selectedInstallment.paid_amount || 0) 
    : 0;

  const parsedEnteredAmount = parseFloat(paymentData.amount) || 0;
  const progressPercent = totalDueWithInterest > 0 ? Math.round((totalPaidSoFar / totalDueWithInterest) * 100) : 0;

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!paymentData.installment_id) {
      alert('Please select an installment to log a payment');
      return;
    }

    try {
      const res = await axios.post(`\${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/payments`, {
        loan_id: selectedLoanId,
        ...paymentData
      });

      const paymentInfo = res.data;
      const targetInstIndex = allInstallments.findIndex(i => i.installment_id == paymentData.installment_id) + 1;

      // Store payment details to show on the receipt modal
      setLastPaymentDetails({
        payment_id: paymentInfo.payment_id,
        amount: parseFloat(paymentInfo.amount),
        method: paymentInfo.method,
        payment_date: paymentInfo.payment_date,
        customerName: selectedLoan?.customer_name || 'N/A',
        customerPhone: customerDetails ? customerDetails.phone : 'N/A',
        customerNic: customerDetails ? customerDetails.nic : 'N/A',
        loanId: selectedLoanId,
        installmentIndex: targetInstIndex,
        installmentDue: selectedInstallment ? parseFloat(selectedInstallment.amount) : 0,
        installmentPaidBefore: selectedInstallment ? parseFloat(selectedInstallment.paid_amount) : 0,
        remainingInstallmentBalance: selectedInstallment 
          ? parseFloat(selectedInstallment.amount) - (parseFloat(selectedInstallment.paid_amount) + parseFloat(paymentInfo.amount))
          : 0,
        newLoanOutstanding: totalOutstandingBalance - parseFloat(paymentInfo.amount),
        collectorName: user ? user.name : 'System Collector'
      });

      setShowReceiptModal(true);

      // Reset form input values
      setPaymentData({ installment_id: '', amount: '', method: 'cash' });
      
      // Refresh backend active loans data instantly
      fetchLoans();
      
      // Refresh personal drawer balance instantly
      fetchDrawerBalance();

    } catch (err) {
      alert(err.response?.data?.error || 'Failed to record payment');
    }
  };

  const filteredLoans = loans.filter(l => 
    l.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.loan_id.toString().includes(searchQuery)
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner with Collector Cash Drawer */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 font-sans block mb-1">Microfinance Desk Operations</span>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Log Payments</h2>
        </div>
        
        {/* Collector Drawer Balance Capsule */}
        <div className="flex items-center gap-3.5 px-5 py-3 bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-800 rounded-2xl text-white shadow-xl self-start md:self-auto">
          <div className="w-10 h-10 bg-primary-500/20 text-primary-400 rounded-xl flex items-center justify-center border border-primary-500/10">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Your Cash In-Hand Drawer</span>
            <span className="text-lg font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-300">
              Rs. {drawerBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Customer Search & Active Loans */}
        <div className={`lg:col-span-1 space-y-6 ${selectedLoanId ? 'hidden lg:block' : 'block'}`}>
          <div className="glass-panel p-6 space-y-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Active Repayment Portfolios</h3>
              <p className="text-xs text-slate-400 font-medium">Search client name or Loan ID reference to retrieve billing details</p>
            </div>

            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input 
                type="text" 
                placeholder="Search name or Loan ID..." 
                className="premium-input pl-10 text-sm py-3"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="max-h-[55vh] overflow-y-auto space-y-2.5 pr-1 divide-y divide-slate-100/50">
              {loading ? (
                <div className="flex justify-center py-6">
                  <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : filteredLoans.length > 0 ? (
                filteredLoans.map(l => (
                  <div 
                    key={l.loan_id} 
                    className={`p-4 rounded-2xl cursor-pointer transition-all duration-300 border pt-3 ${
                      selectedLoanId == l.loan_id 
                        ? 'bg-gradient-to-tr from-primary-50 via-primary-100/10 to-primary-100/30 border-primary-500 shadow-sm scale-[1.01]' 
                        : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/50'
                    }`}
                    onClick={() => setSelectedLoanId(l.loan_id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-800 text-sm tracking-tight">{l.customer_name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Loan ID: #{l.loan_id}</p>
                      </div>
                      {selectedLoanId == l.loan_id && (
                        <span className="bg-primary-600 text-white p-1 rounded-full shadow-sm animate-in zoom-in">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex justify-between items-center text-xs">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-400 uppercase font-bold">Total Contract Value</span>
                        <span className="text-slate-900 font-extrabold">Rs. {parseFloat(l.total_amount).toLocaleString()}</span>
                      </div>
                      <span className="text-slate-500 font-semibold bg-slate-50 border border-slate-100 px-2 py-0.5 rounded text-[10px] capitalize">
                        {l.loan_type}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 text-sm font-medium">
                  No active disbursed loans found
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Payments Desk */}
        <div className={`lg:col-span-2 space-y-6 ${!selectedLoanId ? 'hidden lg:block' : 'block'}`}>
          {selectedLoan && (
            <button
              onClick={() => setSelectedLoanId('')}
              className="lg:hidden flex items-center gap-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl px-4 py-2.5 font-extrabold text-xs uppercase transition-all shadow-sm mb-2"
            >
              <svg className="w-4.5 h-4.5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              Back to Customer Search
            </button>
          )}
          {selectedLoan ? (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Sleek Loan Health Dashboard (Total outstanding & Due today clearly shown) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                
                {/* 1. Loan Granted */}
                <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500"></div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Principal Granted</span>
                  <p className="text-base font-extrabold text-slate-800 mt-1">Rs. {totalLoanGranted.toLocaleString()}</p>
                  <p className="text-[9px] text-slate-400 font-medium mt-0.5">Original Loan Sum</p>
                </div>

                {/* 2. Total Paid So Far */}
                <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500"></div>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Total Repaid</span>
                  <p className="text-base font-extrabold text-emerald-600 mt-1">Rs. {totalPaidSoFar.toLocaleString()}</p>
                  <p className="text-[9px] text-slate-400 font-medium mt-0.5">Amortized Received</p>
                </div>

                {/* 3. Total Outstanding Remaining */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-800 rounded-2xl p-4 shadow-md relative overflow-hidden text-white">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-primary-500"></div>
                  <span className="text-[10px] font-bold text-primary-400 uppercase tracking-wider block">Remaining Balance</span>
                  <p className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-200 mt-1">
                    Rs. {totalOutstandingBalance.toLocaleString()}
                  </p>
                  <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Total Left to Pay</p>
                </div>

                {/* 4. Overdue / Due Now */}
                <div className={`border rounded-2xl p-4 shadow-sm relative overflow-hidden ${
                  totalOverdueRightNow > 0 
                    ? 'bg-red-50/50 border-red-100 text-red-900' 
                    : 'bg-white border-slate-100 text-slate-800'
                }`}>
                  <div className={`absolute top-0 left-0 right-0 h-1 ${totalOverdueRightNow > 0 ? 'bg-red-500' : 'bg-slate-300'}`}></div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider block ${totalOverdueRightNow > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                    Overdue / Due Now
                  </span>
                  <p className={`text-base font-extrabold mt-1 ${totalOverdueRightNow > 0 ? 'text-red-700' : 'text-slate-800'}`}>
                    Rs. {totalOverdueRightNow.toLocaleString()}
                  </p>
                  <p className="text-[9px] text-slate-400 font-medium mt-0.5">Collection Target Today</p>
                </div>

              </div>

              {/* Overdue Alert Action Banner */}
              {totalOverdueRightNow > 0 && (
                <div className="bg-red-50/80 border border-red-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in slide-in-from-top duration-300 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-red-800 uppercase tracking-wider block">Overdue Billing Alert</span>
                      <p className="text-xs text-red-600/90 font-medium mt-0.5">
                        This client has unpaid arrears of <strong>Rs. {totalOverdueRightNow.toLocaleString()}</strong>. settle arrears by selecting the oldest pending installment.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const oldestOverdue = allInstallments.find(i => i.status !== 'paid' && new Date(i.due_date) <= new Date());
                      if (oldestOverdue) {
                        const remaining = parseFloat(oldestOverdue.amount) - parseFloat(oldestOverdue.paid_amount || 0);
                        setPaymentData({
                          ...paymentData,
                          installment_id: oldestOverdue.installment_id,
                          amount: remaining.toFixed(2)
                        });
                      }
                    }}
                    className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs uppercase rounded-xl transition-all shadow-md self-start sm:self-auto hover:shadow-lg hover:shadow-red-500/25 animate-pulse"
                  >
                    Load Oldest Overdue
                  </button>
                </div>
              )}

              {/* Form & Installment Cards Panel */}
              <div className="glass-panel p-8 space-y-8">
                
                {/* Customer Profile Banner */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-tr from-primary-600 to-accent-500 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shadow-primary-500/20">
                      {selectedLoan?.customer_name?.charAt(0) || '?'}
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-extrabold text-slate-900 tracking-tight leading-none">{selectedLoan.customer_name}</h3>
                      {customerDetails ? (
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          NIC Reference: {customerDetails.nic} | Mobile: {customerDetails.phone}
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          Loan Reference: #{selectedLoanId}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Progress bar inside profile banner */}
                  <div className="w-full md:w-64 bg-slate-50 border border-slate-200/50 rounded-2xl px-5 py-3 space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className="text-slate-400 uppercase tracking-wider">Loan Repaid Progress</span>
                      <span className="text-emerald-600 font-extrabold">{progressPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-200/60 rounded-full h-2 overflow-hidden p-[1px]">
                      <div 
                        className="bg-gradient-to-r from-emerald-500 to-teal-400 h-1.5 rounded-full transition-all duration-700 shadow-sm" 
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Completely Redesigned Billing Statement & Payment Workstation */}
                <div className="space-y-8">
                  
                  {/* Part 1: Interactive Installment Selection (Ultra-premium spacious cards with zero-clipping overflow layout) */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Select Installment Due</h4>
                        <p className="text-xs text-slate-400 font-medium">Click directly on an installment card below to select it for repayment</p>
                      </div>
                      <span className="text-slate-400 text-xs font-semibold">{installments.length} Pending Installments</span>
                    </div>

                    {installments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 bg-slate-50">
                        <CheckCircle className="w-10 h-10 text-green-500 mb-2 animate-bounce" />
                        <span className="text-sm font-bold text-slate-700">All Installments Fully Paid!</span>
                        <p className="text-xs text-slate-400 font-medium mt-1">This loan portfolio is successfully recovered and completed.</p>
                      </div>
                    ) : (
                      /* SPACIOUS CARD WRAPPER - padded by negative margin + positive padding to completely prevent edge/top/bottom cropping of scaling cards & shadows */
                      <div className="-mx-4 -my-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[380px] overflow-y-auto px-4 py-3 select-none">
                          {installments.map((i) => {
                            const total = parseFloat(i.amount);
                            const paid = parseFloat(i.paid_amount || 0);
                            const remaining = total - paid;
                            const isSelected = paymentData.installment_id == i.installment_id;
                            const dueDateObj = new Date(i.due_date);
                            const isOverdue = dueDateObj <= new Date() && i.status !== 'paid';

                            // Find total index of this installment from all installments
                            const overallIndex = allInstallments.findIndex(inst => inst.installment_id == i.installment_id) + 1;

                            // Calculate relative days
                            const diffTime = dueDateObj - new Date();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            let relativeDateStr = '';
                            if (isOverdue) {
                              const days = Math.abs(diffDays);
                              relativeDateStr = days === 0 ? 'Due Today' : `${days} Day${days > 1 ? 's' : ''} Overdue`;
                            } else {
                              relativeDateStr = diffDays === 0 ? 'Due Today' : `Due in ${diffDays} Day${diffDays > 1 ? 's' : ''}`;
                            }

                            return (
                              <div 
                                key={i.installment_id}
                                onClick={() => setPaymentData({ ...paymentData, installment_id: i.installment_id, amount: remaining.toFixed(2) })}
                                className={`group relative p-5 rounded-2xl cursor-pointer border transition-all duration-300 ${
                                  isSelected 
                                    ? 'bg-gradient-to-br from-primary-50 to-primary-100/30 border-primary-500 shadow-md scale-[1.01] ring-2 ring-primary-500/10' 
                                    : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 hover:shadow-sm hover:scale-[1.005]'
                                }`}
                              >
                                <div className="flex justify-between items-start">
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                                      Installment #{overallIndex}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                      <span className="text-sm font-bold text-slate-800">
                                        {dueDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                                    isOverdue 
                                      ? 'bg-red-50 text-red-600 border border-red-100 animate-pulse' 
                                      : paid > 0 
                                        ? 'bg-amber-50 text-amber-600 border border-amber-100' 
                                        : 'bg-primary-50 text-primary-700 border border-primary-100'
                                  }`}>
                                    {isOverdue ? relativeDateStr : paid > 0 ? 'Partial' : 'Pending'}
                                  </span>
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-100/80 flex justify-between items-end">
                                  <div>
                                    <span className="text-[9px] font-bold text-slate-400 block uppercase">Total Required</span>
                                    <span className="text-xs font-semibold text-slate-500">Rs. {total.toLocaleString()}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-[9px] font-bold text-primary-600 block uppercase">Remaining Due</span>
                                    <span className="text-sm font-black text-slate-900">
                                      Rs. {remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                </div>

                                {isSelected && (
                                  <div className="absolute -top-1.5 -right-1.5 bg-primary-600 text-white p-1 rounded-full shadow-lg border-2 border-white animate-in zoom-in">
                                    <Check className="w-3.5 h-3.5" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Collapsible Paid Installments History List */}
                  {allInstallments.some(inst => inst.status === 'paid') && (
                    <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
                      <details className="group">
                        <summary className="flex justify-between items-center cursor-pointer text-xs font-bold text-slate-600 select-none uppercase tracking-wider">
                          <span className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            View Paid Repayments History ({allInstallments.filter(inst => inst.status === 'paid').length})
                          </span>
                          <span className="text-slate-400 group-open:rotate-180 transition-transform duration-200">▼</span>
                        </summary>
                        <div className="mt-3 overflow-x-auto pt-2 border-t border-slate-200/50">
                          <table className="w-full text-left text-xs text-slate-500">
                            <thead>
                              <tr className="text-[9px] uppercase font-bold text-slate-400 border-b border-slate-100">
                                <th className="py-2">No.</th>
                                <th className="py-2">Due Date</th>
                                <th className="py-2">Paid Sum</th>
                                <th className="py-2 text-right">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {allInstallments.map((i, index) => i.status === 'paid' && (
                                <tr key={i.installment_id} className="text-slate-600">
                                  <td className="py-2 font-bold">#{index + 1}</td>
                                  <td className="py-2">{new Date(i.due_date).toLocaleDateString()}</td>
                                  <td className="py-2 font-semibold text-emerald-600">Rs. {parseFloat(i.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                  <td className="py-2 text-right">
                                    <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                                      Fully Settled
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    </div>
                  )}

                  {/* Part 2: Repayment Submission Form & Live Calculation Breakdown */}
                  <form onSubmit={handlePayment} className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6 border-t border-slate-100 animate-in fade-in duration-300">
                    
                    {/* Log details (7 Cols) */}
                    <div className="lg:col-span-7 space-y-6">
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Log Billing Receipt</h4>
                        <p className="text-xs text-slate-400 font-semibold mt-0.5">Please fill correct payment amount and method to print voucher slip</p>
                      </div>

                      {/* Select indicator */}
                      {!paymentData.installment_id ? (
                        <div className="p-5 border-2 border-dashed border-slate-200/80 rounded-2xl bg-slate-50 flex items-center gap-3 text-slate-500">
                          <Info className="w-5 h-5 text-primary-500 flex-shrink-0 animate-bounce" />
                          <span className="text-xs font-bold leading-normal">
                            Please select a pending or overdue installment card above to initialize the billing invoice console.
                          </span>
                        </div>
                      ) : (
                        <div className="p-4 bg-gradient-to-tr from-primary-50 to-primary-100/20 border border-primary-200/50 rounded-2xl flex items-center justify-between text-xs animate-in zoom-in duration-200">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-primary-600" />
                            <span className="font-bold text-slate-800">
                              Selected Installment Target: 
                            </span>
                            <span className="bg-primary-600 text-white font-extrabold px-2 py-0.5 rounded">
                              #{allInstallments.findIndex(i => i.installment_id == paymentData.installment_id) + 1}
                            </span>
                          </div>
                          <span className="text-slate-500 font-semibold">
                            Due on {new Date(selectedInstallment.due_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        
                        {/* Amount Entry with Live Helper presets */}
                        <div className="space-y-3">
                          <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">Amount to Collect (Rs.)</label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 font-bold text-sm">Rs.</span>
                            <input 
                              required 
                              type="number" 
                              step="0.01" 
                              className="premium-input pl-11 text-base font-bold" 
                              placeholder="0.00"
                              value={paymentData.amount}
                              onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
                              disabled={!paymentData.installment_id}
                            />
                          </div>

                          {/* Quick Preset Actions (One-click fills!) */}
                          {paymentData.installment_id && (
                            <div className="flex gap-2 animate-in fade-in duration-300">
                              <button
                                type="button"
                                onClick={() => handlePresetSelect(selectedInstallmentRemaining)}
                                className="flex-1 py-2 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-extrabold text-[10px] uppercase rounded-xl transition-all"
                              >
                                Pay Exact Due
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePresetSelect(selectedInstallmentRemaining / 2)}
                                className="flex-1 py-2 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-extrabold text-[10px] uppercase rounded-xl transition-all"
                              >
                                Pay Half
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Payment Method Selector (Highly modern button grids) */}
                        <div className="space-y-3">
                          <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">Repayment Channel</label>
                          <div className="grid grid-cols-1 gap-2">
                            {[
                              { val: 'cash', label: 'Cash Drawer', desc: 'AddToDrawer' },
                              { val: 'bank', label: 'Bank Transfer', desc: 'Direct Ledger' },
                              { val: 'card', label: 'Card Payment', desc: 'Merchant Swipe' }
                            ].map(item => (
                              <button
                                key={item.val}
                                type="button"
                                disabled={!paymentData.installment_id}
                                onClick={() => setPaymentData({ ...paymentData, method: item.val })}
                                className={`flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all ${
                                  paymentData.method === item.val
                                    ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white border-slate-950 shadow-md scale-[1.01]'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50/50'
                                } ${!paymentData.installment_id ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                <span>{item.label}</span>
                                <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded ${
                                  paymentData.method === item.val ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-400'
                                }`}>{item.desc}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                      </div>

                      {/* Warnings and Capping limit alerts */}
                      {paymentData.installment_id && parsedEnteredAmount > selectedInstallmentRemaining && (
                        <div className="p-4 bg-amber-50 border border-amber-200/60 rounded-2xl flex gap-3 text-amber-800 animate-in slide-in-from-bottom duration-200">
                          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div className="text-xs">
                            <span className="font-extrabold block">Caution: Overpayment Registered</span>
                            <span className="font-medium text-amber-700 block mt-0.5">
                              The entered Rs. {parsedEnteredAmount.toLocaleString()} exceeds this installment's due sum (Rs. {selectedInstallmentRemaining.toLocaleString()}).
                            </span>
                            <span className="font-semibold text-amber-800 block mt-1">
                              Double-entry rules will log the excess directly to the selected target. To pay multiple full installments, log separate entries respectively.
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="pt-2">
                        <button 
                          type="submit" 
                          disabled={!paymentData.installment_id}
                          className="premium-btn w-full py-4 text-base font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-[1.005] duration-250 shadow-xl shadow-primary-500/20"
                        >
                          <Receipt className="w-5 h-5" />
                          Post Repayment & Issue Bill
                        </button>
                      </div>
                    </div>

                    {/* LIVE BILLING STATEMENT PREVIEW PANEL (5 Cols) */}
                    <div className="lg:col-span-5">
                      <div className="bg-gradient-to-b from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-xl space-y-5 border border-slate-950 flex flex-col justify-between h-full min-h-[300px] relative overflow-hidden">
                        {/* Background subtle elements */}
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/10 rounded-full blur-2xl transform translate-x-5 -translate-y-5"></div>
                        
                        <div className="space-y-4 relative z-10">
                          <div className="flex justify-between items-center pb-3.5 border-b border-slate-800">
                            <div>
                              <span className="text-[10px] font-black text-primary-400 uppercase tracking-widest block">Ledger Invoice</span>
                              <span className="text-sm font-black block mt-0.5">Repayment Breakdown</span>
                            </div>
                            <span className="bg-primary-500/20 text-primary-400 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider animate-pulse">
                              Live
                            </span>
                          </div>

                          <div className="space-y-3 text-xs">
                            <div className="flex justify-between items-center text-slate-400 font-semibold">
                              <span>Customer Account:</span>
                              <span className="text-white font-extrabold">{selectedLoan.customer_name}</span>
                            </div>
                            
                            <div className="flex justify-between items-center text-slate-400 font-semibold">
                              <span>Active Target:</span>
                              <span className="text-white font-bold">
                                {paymentData.installment_id 
                                  ? `Installment #${allInstallments.findIndex(i => i.installment_id == paymentData.installment_id) + 1}`
                                  : 'None Selected'
                                }
                              </span>
                            </div>

                            <div className="flex justify-between items-center text-slate-400 font-semibold border-t border-slate-800/80 pt-3">
                              <span>Loan Outstanding:</span>
                              <span className="text-white font-bold">Rs. {totalOutstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>

                            <div className="flex justify-between items-center text-slate-400 font-semibold">
                              <span>Selected Target Due:</span>
                              <span className="text-white font-bold">Rs. {selectedInstallmentRemaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>

                            <div className="flex justify-between items-center text-emerald-400 font-semibold bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10">
                              <span>Entered Payment:</span>
                              <span className="font-extrabold text-base">Rs. {parsedEnteredAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        </div>

                        {/* Updated balances box */}
                        <div className="bg-slate-950/80 border border-slate-800/60 rounded-2xl p-4.5 space-y-3 relative z-10">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">POST-TRANSACTION FORECAST</span>
                          
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400 font-semibold">Remaining Target Due:</span>
                            <span className="text-white font-extrabold">
                              Rs. {Math.max(0, selectedInstallmentRemaining - parsedEnteredAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          <div className="flex justify-between items-center border-t border-slate-900 pt-2 text-xs">
                            <span className="text-primary-400 font-black">Remaining Loan Debt:</span>
                            <span className="text-emerald-400 text-sm font-black">
                              Rs. {Math.max(0, totalOutstandingBalance - parsedEnteredAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>

                      </div>
                    </div>

                  </form>

                </div>

              </div>
            </div>
          ) : (
            <div className="glass-panel p-12 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-4 border border-slate-200/50">
                <Receipt className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-700">No Customer Account Selected</h3>
              <p className="text-sm text-slate-400 font-medium mt-1 max-w-sm">
                Please search name or Loan ID reference in the active accounts list, and select a client to open the repayment billing desk.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Complete Billing & Receipt Screen Redesign */}
      {showReceiptModal && lastPaymentDetails && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 z-50 overflow-y-auto animate-in fade-in duration-300 no-print-bg">
          <div className="bg-white border border-slate-100 rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            
            <style>{`
              @media print {
                body * {
                  visibility: hidden;
                  background: transparent !important;
                }
                #print-receipt-content, #print-receipt-content * {
                  visibility: visible;
                }
                #print-receipt-content {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100% !important;
                  max-width: 100% !important;
                  margin: 0 !important;
                  padding: 20px !important;
                  box-shadow: none !important;
                  border: none !important;
                  background: white !important;
                  color: black !important;
                }
                .no-print {
                  display: none !important;
                }
              }
            `}</style>

            {/* Split Screen Billing Voucher Layout */}
            <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-y-auto md:overflow-hidden md:max-h-[85vh]">
              
              {/* LEFT COLUMN: Success Banner & Actions (Hidden during print) */}
              <div className="md:w-5/12 bg-gradient-to-b from-slate-900 to-slate-800 p-8 text-white flex flex-col justify-between no-print relative overflow-hidden flex-shrink-0">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10" />
                
                <div className="space-y-6 relative z-10">
                  <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-center">
                    <Check className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-primary-400 uppercase tracking-widest block">Galle Credit Ledger</span>
                    <h3 className="text-2xl font-black tracking-tight mt-1 leading-tight">Repayment Log Successful</h3>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed font-medium">
                      This transaction is logged in the general ledger. An automated SMS transaction alert has been pushed to the client's registered mobile device.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 pt-8 md:pt-0 relative z-10">
                  <button 
                    type="button" 
                    onClick={() => window.print()} 
                    className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-bold rounded-xl shadow-lg shadow-primary-500/20 flex items-center justify-center gap-2 transition-all text-sm uppercase tracking-wider"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h8z" /></svg>
                    Print Repayment Receipt
                  </button>
                  
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowReceiptModal(false);
                      setSelectedLoanId('');
                      setSearchQuery('');
                    }} 
                    className="w-full py-3.5 bg-white/10 hover:bg-white/15 text-slate-300 font-bold rounded-xl flex items-center justify-center transition-all text-xs uppercase tracking-wider border border-white/5"
                  >
                    Complete & Exit
                  </button>
                </div>
              </div>

              {/* RIGHT COLUMN: Official Printable Receipt Voucher */}
              <div id="print-receipt-content" className="md:w-7/12 p-8 overflow-y-auto bg-slate-50/50 flex flex-col justify-between flex-1 min-h-0 flex-shrink-0 md:flex-shrink">
                
                {/* Print content header */}
                <div className="space-y-6">
                  {/* Company Logo Header */}
                  <div className="flex justify-between items-start pb-4 border-b border-dashed border-slate-200">
                    <div className="space-y-1">
                      <h3 className="text-base font-black text-slate-900 tracking-tight leading-none block uppercase">GALLE CREDIT (PVT) LTD</h3>
                      <p className="text-[9px] text-slate-500 font-black uppercase tracking-wider block mt-1">Official Repayment Receipt</p>
                      <p className="text-[9px] text-slate-400">Head Office: No. 42, Wackwella Road, Galle</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Voucher No</span>
                      <span className="text-xs font-black text-slate-900">REC-{String(lastPaymentDetails.payment_id).padStart(6, '0')}</span>
                    </div>
                  </div>

                  {/* Core Transaction Metadata Grid */}
                  <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 text-xs border-b border-slate-100 pb-5">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Receipt Date</span>
                      <span className="text-slate-800 font-bold">{new Date(lastPaymentDetails.payment_date).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Payment Channel</span>
                      <span className="text-slate-800 font-black capitalize">{lastPaymentDetails.method}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Client Name</span>
                      <span className="text-slate-800 font-black">{lastPaymentDetails.customerName}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">NIC Reference</span>
                      <span className="text-slate-800 font-bold">{lastPaymentDetails.customerNic}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Mobile Phone</span>
                      <span className="text-slate-800 font-semibold">{lastPaymentDetails.customerPhone}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Portfolio ID</span>
                      <span className="text-slate-800 font-black text-primary-600"># {lastPaymentDetails.loanId}</span>
                    </div>
                  </div>

                  {/* Financial Ledger Calculation Block */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-3.5 shadow-sm">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block border-b border-slate-100 pb-1.5">Installment Statement</span>
                    
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                      <span>Installment Target:</span>
                      <span className="font-bold text-slate-800">
                        Installment #{lastPaymentDetails.installmentIndex}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                      <span>Required Installment Value:</span>
                      <span>Rs. {lastPaymentDetails.installmentDue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                      <span>Paid Pre-repayment:</span>
                      <span>Rs. {lastPaymentDetails.installmentPaidBefore.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>

                    <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl flex justify-between items-center text-sm font-black text-emerald-800">
                      <span>AMOUNT RECEIVED:</span>
                      <span className="text-base text-emerald-700">Rs. {lastPaymentDetails.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs font-bold text-slate-800 border-t border-dashed border-slate-200 pt-3">
                      <span>Remaining Installment Balance:</span>
                      <span className={lastPaymentDetails.remainingInstallmentBalance <= 0 ? 'text-emerald-600 font-black' : 'text-slate-800'}>
                        Rs. {Math.max(0, lastPaymentDetails.remainingInstallmentBalance).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </span>
                    </div>
                  </div>

                  {/* HIGHLY EXPLICIT OUTSTANDING BALANCE (Shows exactly how much remaining to pay on the entire loan) */}
                  <div className="bg-slate-900 text-white rounded-2xl p-5 flex justify-between items-center shadow-lg">
                    <div>
                      <span className="text-[10px] font-bold text-primary-400 uppercase tracking-wider block">Remaining Loan Outstanding</span>
                      <p className="text-[9px] text-slate-400 font-medium">Aggregate outstanding after this repayment</p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-200">
                        Rs. {Math.max(0, lastPaymentDetails.newLoanOutstanding).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer and message */}
                <div className="text-center pt-6 mt-6 border-t border-dashed border-slate-200 space-y-1">
                  <p className="text-[9px] text-slate-400 italic block">Authorized by Galle Credit Teller Desk. System Custodian: {lastPaymentDetails.collectorName}.</p>
                  <p className="text-[9px] font-black text-primary-600 tracking-wider uppercase block">THANK YOU FOR YOUR VALUED PARTNERSHIP!</p>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
