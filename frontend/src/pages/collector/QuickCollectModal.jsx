import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { saveOfflinePayment } from '../../utils/offlineQueue';
import ReceiptModal from '../../components/ReceiptModal';

const QuickCollectModal = ({ item, isOpen, onClose, onSuccess }) => {
  if (!isOpen || !item) return null;

  const { user } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const defaultDue = parseFloat(item.remaining_installment || item.installment_amount || 0);

  const [enteredAmount, setEnteredAmount] = useState(defaultDue.toFixed(2));
  const [method, setMethod] = useState('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [receiptDetails, setReceiptDetails] = useState(null);

  useEffect(() => {
    setEnteredAmount(defaultDue.toFixed(2));
    setError('');
    setReceiptDetails(null);
  }, [item]);

  const parsedAmount = parseFloat(enteredAmount) || 0;

  // Preset chip increments
  const handleAddAmount = (addVal) => {
    const current = parseFloat(enteredAmount) || 0;
    setEnteredAmount((current + addVal).toFixed(2));
  };

  const handleSetExact = () => {
    setEnteredAmount(defaultDue.toFixed(2));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (parsedAmount <= 0) {
      setError('Please enter a valid collection amount');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const paymentPayload = {
      loan_id: item.loan_id,
      installment_id: item.installment_id,
      amount: parsedAmount,
      method,
      customer_name: item.customer_name,
      customer_phone: item.customer_phone,
      customer_nic: item.customer_nic,
      loan_code: item.loan_code
    };

    const remainingInstBalance = Math.max(0, parseFloat(item.remaining_installment || item.installment_amount || 0) - parsedAmount);
    const remainingLoanDebt = Math.max(0, parseFloat(item.total_remaining_balance || 0) - parsedAmount);

    // Check if offline
    if (!navigator.onLine) {
      try {
        const offlineRecord = saveOfflinePayment(paymentPayload);

        const details = {
          payment_id: offlineRecord.payment_id,
          amount: parsedAmount,
          method,
          payment_date: new Date().toISOString(),
          customerName: item.customer_name || 'Customer',
          customerPhone: item.customer_phone || 'N/A',
          customerNic: item.customer_nic || 'N/A',
          loanId: item.loan_id,
          loanCode: item.loan_code || `LN-${item.loan_id}`,
          installmentId: item.installment_id,
          installmentDueDate: item.installment_due_date,
          installmentIndex: null,
          installmentDue: parseFloat(item.installment_amount || item.remaining_installment || 0),
          installmentPaidBefore: parseFloat(item.installment_paid_amount || 0),
          remainingInstallmentBalance: remainingInstBalance,
          newLoanOutstanding: remainingLoanDebt,
          collectorName: user?.name || item.collector_name || 'Field Collector',
          allocations: [],
          isOffline: true
        };

        setReceiptDetails(details);
        if (onSuccess) onSuccess({ isOffline: true, amount: parsedAmount });
      } catch (err) {
        setError('Failed to record offline payment locally');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Online submission
    try {
      const config = {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      };

      const res = await axios.post(`${API_URL}/api/payments`, {
        loan_id: item.loan_id,
        installment_id: item.installment_id,
        amount: parsedAmount,
        method
      }, config);

      const paymentInfo = res.data;

      const details = {
        payment_id: paymentInfo.payment_id || `RCP-${Date.now()}`,
        amount: parsedAmount,
        method,
        payment_date: paymentInfo.payment_date || new Date().toISOString(),
        customerName: item.customer_name || 'Customer',
        customerPhone: item.customer_phone || 'N/A',
        customerNic: item.customer_nic || 'N/A',
        loanId: item.loan_id,
        loanCode: item.loan_code || `LN-${item.loan_id}`,
        installmentId: item.installment_id,
        installmentDueDate: item.installment_due_date,
        installmentIndex: null,
        installmentDue: parseFloat(item.installment_amount || item.remaining_installment || 0),
        installmentPaidBefore: parseFloat(item.installment_paid_amount || 0),
        remainingInstallmentBalance: remainingInstBalance,
        newLoanOutstanding: remainingLoanDebt,
        collectorName: user?.name || item.collector_name || 'Field Collector',
        allocations: paymentInfo.allocations || [],
        isOffline: false
      };

      setReceiptDetails(details);
      if (onSuccess) onSuccess({ isOffline: false, amount: parsedAmount });
    } catch (err) {
      console.warn('Online collection failed, offering offline queue:', err);
      // If network fails midway, fallback to saving offline
      try {
        const offlineRecord = saveOfflinePayment(paymentPayload);

        const details = {
          payment_id: offlineRecord.payment_id,
          amount: parsedAmount,
          method,
          payment_date: new Date().toISOString(),
          customerName: item.customer_name || 'Customer',
          customerPhone: item.customer_phone || 'N/A',
          customerNic: item.customer_nic || 'N/A',
          loanId: item.loan_id,
          loanCode: item.loan_code || `LN-${item.loan_id}`,
          installmentId: item.installment_id,
          installmentDueDate: item.installment_due_date,
          installmentIndex: null,
          installmentDue: parseFloat(item.installment_amount || item.remaining_installment || 0),
          installmentPaidBefore: parseFloat(item.installment_paid_amount || 0),
          remainingInstallmentBalance: remainingInstBalance,
          newLoanOutstanding: remainingLoanDebt,
          collectorName: user?.name || item.collector_name || 'Field Collector',
          allocations: [],
          isOffline: true
        };

        setReceiptDetails(details);
        if (onSuccess) onSuccess({ isOffline: true, amount: parsedAmount });
      } catch (saveErr) {
        setError(err.response?.data?.error || 'Server error and failed to save offline.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // If receipt is ready, show the exact same official Billing & Receipt Modal as the web
  if (receiptDetails) {
    return (
      <ReceiptModal
        isOpen={Boolean(receiptDetails)}
        onClose={() => {
          setReceiptDetails(null);
          onClose();
        }}
        paymentDetails={receiptDetails}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">Record Collection</h3>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate max-w-[220px] sm:max-w-[260px]">
              {item.customer_name} • {item.loan_code || `Loan #${item.loan_id}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors active:scale-90"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content with Safe Area Bottom Inset */}
        <div 
          className="p-4 sm:p-5 overflow-y-auto space-y-4"
          style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))' }}
        >
          {/* Collection Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Customer Due Banner */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Installment Due
                </span>
                <span className="text-lg font-black text-slate-900 font-mono">
                  Rs. {defaultDue.toLocaleString()}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Total Balance
                </span>
                <span className="text-xs font-bold text-slate-600 font-mono">
                  Rs. {Number(item.total_remaining_balance || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Amount Input */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                Collection Amount (LKR)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold">
                  Rs.
                </div>
                <input
                  type="number"
                  step="any"
                  value={enteredAmount}
                  onChange={(e) => setEnteredAmount(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-900 text-2xl font-mono focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={handleSetExact}
                className="flex-1 py-1.5 px-2.5 rounded-lg bg-primary-50 border border-primary-200 text-primary-700 text-xs font-bold hover:bg-primary-100 transition-all"
              >
                Exact Due
              </button>
              <button
                type="button"
                onClick={() => handleAddAmount(500)}
                className="py-1.5 px-3 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
              >
                +500
              </button>
              <button
                type="button"
                onClick={() => handleAddAmount(1000)}
                className="py-1.5 px-3 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
              >
                +1,000
              </button>
              <button
                type="button"
                onClick={() => handleAddAmount(2000)}
                className="py-1.5 px-3 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
              >
                +2,000
              </button>
            </div>

            {/* Payment Method Toggle */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                Payment Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['cash', 'bank'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`py-2 rounded-xl border text-xs font-bold capitalize transition-all ${
                      method === m
                        ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    {m === 'cash' ? '💵 Cash in Hand' : '🏦 Bank Transfer'}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || parsedAmount <= 0}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 disabled:opacity-50 text-white rounded-xl font-bold text-base shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all mt-3"
            >
              {isSubmitting ? (
                <span>Recording...</span>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>Confirm Rs. {parsedAmount.toLocaleString()} Collection</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default QuickCollectModal;
