import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Check, Share2, Printer, AlertCircle, WifiOff, CheckCircle2, DollarSign } from 'lucide-react';
import { saveOfflinePayment } from '../../utils/offlineQueue';

const QuickCollectModal = ({ item, isOpen, onClose, onSuccess }) => {
  if (!isOpen || !item) return null;

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const defaultDue = parseFloat(item.remaining_installment || item.installment_amount || 0);

  const [enteredAmount, setEnteredAmount] = useState(defaultDue.toFixed(2));
  const [method, setMethod] = useState('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successReceipt, setSuccessReceipt] = useState(null);

  useEffect(() => {
    setEnteredAmount(defaultDue.toFixed(2));
    setError('');
    setSuccessReceipt(null);
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

    // Check if offline
    if (!navigator.onLine) {
      try {
        const offlineRecord = saveOfflinePayment(paymentPayload);
        const remainingLoanDebt = Math.max(0, parseFloat(item.total_remaining_balance || 0) - parsedAmount);

        setSuccessReceipt({
          receiptNo: offlineRecord.payment_id,
          amount: parsedAmount,
          method,
          isOffline: true,
          date: new Date().toLocaleString(),
          customerName: item.customer_name,
          customerPhone: item.customer_phone,
          loanCode: item.loan_code || `LN-${item.loan_id}`,
          remainingBalance: remainingLoanDebt
        });

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

      const remainingLoanDebt = Math.max(0, parseFloat(item.total_remaining_balance || 0) - parsedAmount);

      setSuccessReceipt({
        receiptNo: res.data.payment_id || `RCP-${Date.now()}`,
        amount: parsedAmount,
        method,
        isOffline: false,
        date: new Date().toLocaleString(),
        customerName: item.customer_name,
        customerPhone: item.customer_phone,
        loanCode: item.loan_code || `LN-${item.loan_id}`,
        remainingBalance: remainingLoanDebt
      });

      if (onSuccess) onSuccess({ isOffline: false, amount: parsedAmount });
    } catch (err) {
      console.warn('Online collection failed, offering offline queue:', err);
      // If network fails midway, fallback to saving offline
      try {
        const offlineRecord = saveOfflinePayment(paymentPayload);
        const remainingLoanDebt = Math.max(0, parseFloat(item.total_remaining_balance || 0) - parsedAmount);

        setSuccessReceipt({
          receiptNo: offlineRecord.payment_id,
          amount: parsedAmount,
          method,
          isOffline: true,
          date: new Date().toLocaleString(),
          customerName: item.customer_name,
          customerPhone: item.customer_phone,
          loanCode: item.loan_code || `LN-${item.loan_id}`,
          remainingBalance: remainingLoanDebt
        });

        if (onSuccess) onSuccess({ isOffline: true, amount: parsedAmount });
      } catch (saveErr) {
        setError(err.response?.data?.error || 'Server error and failed to save offline.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsAppReceipt = () => {
    if (!successReceipt) return;
    const msg = `*Galle Credit - Payment Receipt* 🧾\n\n` +
      `• *Receipt No:* #${successReceipt.receiptNo}\n` +
      `• *Customer:* ${successReceipt.customerName}\n` +
      `• *Loan Code:* ${successReceipt.loanCode}\n` +
      `• *Amount Paid:* Rs. ${Number(successReceipt.amount).toLocaleString()}\n` +
      `• *Remaining Balance:* Rs. ${Number(successReceipt.remainingBalance).toLocaleString()}\n` +
      `• *Payment Date:* ${successReceipt.date}\n` +
      (successReceipt.isOffline ? `• _Note: Recorded in offline field mode_\n` : '') +
      `\n_Thank you for your repayment! • Galle Credit MMS_`;

    let url = 'https://wa.me/';
    if (successReceipt.customerPhone) {
      const cleanPhone = successReceipt.customerPhone.replace(/\D/g, '');
      const formatted = cleanPhone.startsWith('0') ? `94${cleanPhone.slice(1)}` : cleanPhone;
      url += `${formatted}?text=${encodeURIComponent(msg)}`;
    } else {
      url += `?text=${encodeURIComponent(msg)}`;
    }
    window.open(url, '_blank');
  };

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

        {/* Content with iPhone Safe Bottom Inset */}
        <div 
          className="p-4 sm:p-5 overflow-y-auto space-y-4"
          style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))' }}
        >
          
          {/* Success Receipt State */}
          {successReceipt ? (
            <div className="text-center py-4 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <h4 className="text-xl font-black text-slate-900">Collection Recorded!</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Receipt #{successReceipt.receiptNo}
                </p>
                {successReceipt.isOffline && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold mt-2 border border-amber-200">
                    <WifiOff className="w-3.5 h-3.5" />
                    Saved in Offline Queue (Will auto-sync)
                  </div>
                )}
              </div>

              {/* Receipt Summary Box */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-left space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount Collected:</span>
                  <span className="font-bold text-slate-900 text-sm font-mono text-emerald-600">
                    Rs. {Number(successReceipt.amount).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Method:</span>
                  <span className="font-bold uppercase text-slate-700">{successReceipt.method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Remaining Balance:</span>
                  <span className="font-bold text-slate-900">
                    Rs. {Number(successReceipt.remainingBalance).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleWhatsAppReceipt}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <Share2 className="w-4 h-4" />
                  Send WhatsApp Receipt
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <Printer className="w-4 h-4" />
                  Print Thermal Slip (58mm)
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm transition-all"
                >
                  Done & Continue Route
                </button>
              </div>
            </div>
          ) : (
            /* Collection Form State */
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
          )}

        </div>
      </div>
    </div>
  );
};

export default QuickCollectModal;
