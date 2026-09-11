import React, { useState, useEffect } from 'react';
import { Check, Printer, Share2, X, WifiOff, Receipt, ShieldCheck } from 'lucide-react';

const ReceiptModal = ({ isOpen, onClose, paymentDetails, allInstallments = [] }) => {
  if (!isOpen || !paymentDetails) return null;

  const [printFormat, setPrintFormat] = useState(() => {
    return localStorage.getItem('gallecredit_print_format') || 'thermal80';
  });

  const handleFormatChange = (fmt) => {
    setPrintFormat(fmt);
    try {
      localStorage.setItem('gallecredit_print_format', fmt);
    } catch (e) {
      console.warn('Could not save print format preference', e);
    }
  };

  const handleWhatsAppReceipt = () => {
    if (!paymentDetails) return;
    const voucherNum = typeof paymentDetails.payment_id === 'number' || (!isNaN(Number(paymentDetails.payment_id)) && !String(paymentDetails.payment_id).startsWith('OFF'))
      ? `REC-${String(paymentDetails.payment_id).padStart(6, '0')}`
      : `${paymentDetails.payment_id}`;

    const formattedAmount = Number(paymentDetails.amount || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    const formattedRemaining = Number(paymentDetails.newLoanOutstanding || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    const msg = `*GALLE CREDIT (PVT) LTD* 🧾\n` +
      `*Official Repayment Receipt*\n\n` +
      `• *Receipt No:* #${voucherNum}\n` +
      `• *Customer:* ${paymentDetails.customerName || 'Customer'}\n` +
      `• *NIC Reference:* ${paymentDetails.customerNic || 'N/A'}\n` +
      `• *Loan Reference:* ${paymentDetails.loanCode || `#${paymentDetails.loanId}`}\n` +
      `• *Amount Received:* Rs. ${formattedAmount}\n` +
      `• *Payment Method:* ${String(paymentDetails.method || 'cash').toUpperCase()}\n` +
      `• *Remaining Loan Balance:* Rs. ${formattedRemaining}\n` +
      `• *Date & Time:* ${new Date(paymentDetails.payment_date || Date.now()).toLocaleString()}\n` +
      `• *Collector / Teller:* ${paymentDetails.collectorName || 'Galle Credit'}\n` +
      (paymentDetails.isOffline ? `• _Note: Recorded in offline field mode (will sync)_\n` : '') +
      `\n_Thank you for your repayment! • Galle Credit MMS_`;

    let url = 'https://wa.me/';
    if (paymentDetails.customerPhone) {
      const cleanPhone = String(paymentDetails.customerPhone).replace(/\D/g, '');
      const formatted = cleanPhone.startsWith('0') ? `94${cleanPhone.slice(1)}` : cleanPhone;
      url += `${formatted}?text=${encodeURIComponent(msg)}`;
    } else {
      url += `?text=${encodeURIComponent(msg)}`;
    }
    window.open(url, '_blank');
  };

  const voucherNumber = typeof paymentDetails.payment_id === 'number' || (!isNaN(Number(paymentDetails.payment_id)) && !String(paymentDetails.payment_id).startsWith('OFF'))
    ? `REC-${String(paymentDetails.payment_id).padStart(6, '0')}`
    : `${paymentDetails.payment_id}`;

  const amountReceived = parseFloat(paymentDetails.amount || 0);
  const installmentDue = parseFloat(paymentDetails.installmentDue || 0);
  const installmentPaidBefore = parseFloat(paymentDetails.installmentPaidBefore || 0);
  const remainingInstallment = parseFloat(paymentDetails.remainingInstallmentBalance || 0);
  const newOutstanding = parseFloat(paymentDetails.newLoanOutstanding || 0);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 z-50 overflow-y-auto animate-in fade-in duration-300 no-print-bg">
      <div className={`bg-white border border-slate-100 rounded-2xl sm:rounded-[32px] shadow-2xl w-full max-w-3xl max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 print-format-${printFormat} relative`}>
        
        {/* Mobile quick close button in top right */}
        <button
          type="button"
          onClick={onClose}
          className="no-print absolute top-3 right-3 z-30 w-8 h-8 rounded-full bg-slate-800/60 hover:bg-slate-800 text-white flex md:hidden items-center justify-center transition-colors"
          title="Close Receipt"
        >
          <X className="w-4 h-4" />
        </button>

        <style>{`
          @media print {
            body * {
              visibility: hidden;
              background: transparent !important;
            }
            #print-receipt-content, #print-receipt-content * {
              visibility: visible;
            }
            
            /* Base Print Rules */
            #print-receipt-content {
              position: absolute;
              left: 0;
              top: 0;
              margin: 0 !important;
              box-shadow: none !important;
              border: none !important;
              background: white !important;
              color: black !important;
            }
            .no-print, .no-print * {
              display: none !important;
            }

            /* A4 Format */
            .print-format-a4 #print-receipt-content {
              width: 100% !important;
              max-width: 100% !important;
              padding: 20px !important;
            }

            /* Thermal 80mm Format */
            .print-format-thermal80 #print-receipt-content {
              width: 100% !important;
              max-width: 100% !important;
              padding: 2mm !important;
              font-size: 12px !important;
              box-sizing: border-box !important;
            }
            @page {
              margin: 0;
            }

            /* Thermal 58mm Format */
            .print-format-thermal58 #print-receipt-content {
              width: 100% !important;
              max-width: 100% !important;
              padding: 1mm !important;
              font-size: 11px !important;
              box-sizing: border-box !important;
            }
            
            /* Utility for thermal to strip padding/margins and force compact layout */
            .print-format-thermal80 *, .print-format-thermal58 * {
              box-sizing: border-box !important;
            }
            .print-format-thermal80 .p-8, .print-format-thermal58 .p-8,
            .print-format-thermal80 .p-6, .print-format-thermal58 .p-6 { padding: 4px !important; }
            .print-format-thermal80 .p-5, .print-format-thermal58 .p-5 { padding: 2px !important; border-radius: 0 !important; }
            .print-format-thermal80 .p-3.5, .print-format-thermal58 .p-3.5 { padding: 2px !important; }
            .print-format-thermal80 .pb-4, .print-format-thermal58 .pb-4 { padding-bottom: 4px !important; }
            .print-format-thermal80 .pt-6, .print-format-thermal58 .pt-6 { padding-top: 4px !important; }
            .print-format-thermal80 .mt-6, .print-format-thermal58 .mt-6 { margin-top: 4px !important; }
            
            /* Extremely aggressive vertical space reduction */
            .print-format-thermal80 .space-y-6 > :not([hidden]) ~ :not([hidden]), .print-format-thermal58 .space-y-6 > :not([hidden]) ~ :not([hidden]) { margin-top: 4px !important; }
            .print-format-thermal80 .space-y-3.5 > :not([hidden]) ~ :not([hidden]), .print-format-thermal58 .space-y-3.5 > :not([hidden]) ~ :not([hidden]) { margin-top: 0 !important; }
            .print-format-thermal80 .space-y-2 > :not([hidden]) ~ :not([hidden]), .print-format-thermal58 .space-y-2 > :not([hidden]) ~ :not([hidden]) { margin-top: 0 !important; }
            .print-format-thermal80 .space-y-1.5 > :not([hidden]) ~ :not([hidden]), .print-format-thermal58 .space-y-1.5 > :not([hidden]) ~ :not([hidden]) { margin-top: 0 !important; }
            .print-format-thermal80 .pt-3, .print-format-thermal58 .pt-3 { padding-top: 1px !important; border-top-width: 1px !important; }
            .print-format-thermal80 .pb-1.5, .print-format-thermal58 .pb-1.5 { padding-bottom: 0 !important; border-bottom-width: 0 !important; }
            
            /* Compress line heights in installment section */
            .print-format-thermal80 .installment-row, .print-format-thermal58 .installment-row {
              line-height: 1.1 !important;
              margin-top: 1px !important;
            }
            
            /* Center logo for thermal */
            .print-format-thermal80 .print-logo, .print-format-thermal58 .print-logo {
              margin: 0 auto 4px auto !important;
            }
            .print-format-thermal80 .header-block, .print-format-thermal58 .header-block {
              text-align: center !important;
              display: block !important;
            }
            .print-format-thermal80 .header-block > div, .print-format-thermal58 .header-block > div {
              text-align: center !important;
              justify-content: center !important;
              width: 100% !important;
            }
            
            /* Force logo visibility during print (browsers strip backgrounds) */
            .print-logo {
              background: transparent !important;
            }
            .print-logo img {
              filter: grayscale(100%) brightness(1.4) contrast(0.8);
            }
            
            /* Make fonts bigger globally for thermal to improve legibility */
            .print-format-thermal80 .text-base, .print-format-thermal58 .text-base { font-size: 14px !important; }
            .print-format-thermal80 .text-lg, .print-format-thermal58 .text-lg { font-size: 16px !important; }
            .print-format-thermal80 .text-xs, .print-format-thermal58 .text-xs { font-size: 11px !important; }
            .print-format-thermal80 .text-[10px], .print-format-thermal58 .text-[10px] { font-size: 11px !important; }
            .print-format-thermal80 .text-[9px], .print-format-thermal58 .text-[9px] { font-size: 10px !important; }
            .print-format-thermal80 .text-sm, .print-format-thermal58 .text-sm { font-size: 12px !important; }
            
            /* Make grid single column for narrow thermal paper */
            .print-format-thermal80 .grid-cols-2, .print-format-thermal58 .grid-cols-2 { 
              grid-template-columns: 1fr !important; 
              gap: 2px !important; 
            }
            .print-format-thermal80 .grid-cols-2 > div, .print-format-thermal58 .grid-cols-2 > div { 
              display: flex; 
              flex-wrap: wrap;
              justify-content: space-between; 
              align-items: flex-start;
              border-bottom: 1px dashed #e2e8f0; 
              padding-bottom: 2px; 
              word-break: break-word;
            }
            .print-format-thermal80 .grid-cols-2 > div > span:first-child, .print-format-thermal58 .grid-cols-2 > div > span:first-child {
              margin-bottom: 0 !important;
              flex: 1 1 40%;
            }
            .print-format-thermal80 .grid-cols-2 > div > span:last-child, .print-format-thermal58 .grid-cols-2 > div > span:last-child {
              flex: 1 1 60%;
              text-align: right;
            }
          }
        `}</style>

        {/* Split Screen Billing Voucher Layout */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-y-auto md:overflow-hidden md:max-h-[85vh]">
          
          {/* LEFT COLUMN: Success Banner & Actions (Hidden during print) */}
          <div className="md:w-5/12 bg-gradient-to-b from-slate-900 to-slate-800 p-6 sm:p-8 text-white flex flex-col justify-between no-print relative overflow-hidden flex-shrink-0">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10" />
            
            <div className="space-y-4 sm:space-y-6 relative z-10">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-center shadow-inner">
                  <Check className="w-6 h-6" />
                </div>
                {paymentDetails.isOffline && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-bold">
                    <WifiOff className="w-3.5 h-3.5" />
                    Offline Record
                  </span>
                )}
              </div>

              <div>
                <span className="text-[10px] font-bold text-primary-400 uppercase tracking-widest block">Galle Credit Ledger</span>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight mt-1 leading-tight">Repayment Log Successful</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed font-medium">
                  {paymentDetails.isOffline 
                    ? 'Saved to device offline queue. Will auto-sync when network connection is restored.'
                    : 'This transaction is logged in the general ledger and client accounts have been updated.'}
                </p>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4 pt-6 md:pt-0 relative z-10">
              {/* Thermal / Paper Format Selector */}
              <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Print Format</label>
                <div className="flex gap-1.5 sm:gap-2">
                  <button 
                    type="button" 
                    onClick={() => handleFormatChange('thermal80')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${printFormat === 'thermal80' ? 'bg-primary-500 text-white shadow-xs' : 'bg-slate-700/70 text-slate-300 hover:bg-slate-700'}`}
                  >
                    80mm
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleFormatChange('thermal58')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${printFormat === 'thermal58' ? 'bg-primary-500 text-white shadow-xs' : 'bg-slate-700/70 text-slate-300 hover:bg-slate-700'}`}
                  >
                    58mm
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleFormatChange('a4')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${printFormat === 'a4' ? 'bg-primary-500 text-white shadow-xs' : 'bg-slate-700/70 text-slate-300 hover:bg-slate-700'}`}
                  >
                    A4
                  </button>
                </div>
              </div>

              {/* Print Receipt Button */}
              <button 
                type="button" 
                onClick={() => window.print()} 
                className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 active:scale-98 text-white font-bold rounded-xl shadow-lg shadow-primary-500/20 flex items-center justify-center gap-2 transition-all text-xs sm:text-sm uppercase tracking-wider cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Print Repayment Receipt
              </button>

              {/* WhatsApp Share Button */}
              <button 
                type="button" 
                onClick={handleWhatsAppReceipt} 
                className="w-full py-2.5 sm:py-3 bg-emerald-600/90 hover:bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all text-xs uppercase tracking-wider border border-emerald-500/30 active:scale-98 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                Send WhatsApp Receipt
              </button>
              
              {/* Complete & Exit */}
              <button 
                type="button" 
                onClick={onClose} 
                className="w-full py-3 bg-white/10 hover:bg-white/15 text-slate-300 font-bold rounded-xl flex items-center justify-center transition-all text-xs uppercase tracking-wider border border-white/5 cursor-pointer active:scale-98"
              >
                Complete & Exit
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Official Printable Receipt Voucher */}
          <div id="print-receipt-content" className="md:w-7/12 p-6 sm:p-8 overflow-y-auto bg-slate-50/50 flex flex-col justify-between flex-1 min-h-0 flex-shrink-0 md:flex-shrink">
            
            {/* Print content header */}
            <div className="space-y-5 sm:space-y-6">
              {/* Company Logo Header */}
              <div className="header-block flex justify-between items-start pb-4 border-b border-dashed border-slate-200">
                <div className="flex flex-col">
                  <div className="w-14 h-14 flex items-center justify-center mb-2 print-logo mx-auto md:mx-0">
                    <img src="/logo.jpg" alt="Galle Credit Logo" className="w-full h-full object-contain" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-black text-slate-900 tracking-tight leading-none block uppercase">GALLE CREDIT (PVT) LTD</h3>
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-wider block mt-1">Official Repayment Receipt</p>
                    <p className="text-[9px] text-slate-400">Head Office: No. 42, Wackwella Road, Galle</p>
                  </div>
                </div>
                <div className="text-right flex flex-col justify-end h-full">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block mt-2">Voucher No</span>
                  <span className="text-xs font-black text-slate-900">{voucherNumber}</span>
                  {paymentDetails.isOffline && (
                    <span className="text-[9px] font-bold text-amber-600 uppercase block mt-0.5">Offline Field Slip</span>
                  )}
                </div>
              </div>

              {/* Core Transaction Metadata Grid */}
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs border-b border-slate-100 pb-5">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Receipt Date</span>
                  <span className="text-slate-800 font-bold">{new Date(paymentDetails.payment_date || Date.now()).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Payment Channel</span>
                  <span className="text-slate-800 font-black capitalize">{paymentDetails.method || 'cash'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Client Name</span>
                  <span className="text-slate-800 font-black">{paymentDetails.customerName || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">NIC Reference</span>
                  <span className="text-slate-800 font-bold">{paymentDetails.customerNic || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Mobile Phone</span>
                  <span className="text-slate-800 font-semibold">{paymentDetails.customerPhone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Portfolio ID</span>
                  <span className="text-slate-800 font-black text-primary-600">
                    {paymentDetails.loanCode || `# ${paymentDetails.loanId}`}
                  </span>
                </div>
              </div>

              {/* Financial Ledger Calculation Block */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block border-b border-slate-100 pb-1.5 installment-row">Installment Statement</span>
                
                <div className="flex justify-between items-center text-xs font-semibold text-slate-500 installment-row">
                  <span>Installment Target:</span>
                  <span className="font-bold text-slate-800">
                    {paymentDetails.installmentIndex 
                      ? `Installment #${paymentDetails.installmentIndex}`
                      : (paymentDetails.installmentDueDate 
                          ? `Due ${new Date(paymentDetails.installmentDueDate).toLocaleDateString()}`
                          : (paymentDetails.installmentId ? `Installment #${paymentDetails.installmentId}` : 'Active Target'))}
                  </span>
                </div>

                {installmentDue > 0 && (
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-500 installment-row">
                    <span>Required Value:</span>
                    <span>Rs. {installmentDue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                )}

                {installmentPaidBefore > 0 && (
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-500 installment-row">
                    <span>Paid Pre-repayment:</span>
                    <span>Rs. {installmentPaidBefore.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                )}

                <div className="p-3 sm:p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl flex justify-between items-center text-sm font-black text-emerald-800 installment-row">
                  <span>RECEIVED:</span>
                  <span className="text-base text-emerald-700">Rs. {amountReceived.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>

                <div className="flex justify-between items-center text-xs font-bold text-slate-800 border-t border-dashed border-slate-200 pt-3 installment-row">
                  <span>Remaining Installment:</span>
                  <span className={remainingInstallment <= 0 ? 'text-emerald-600 font-black' : 'text-slate-800'}>
                    Rs. {Math.max(0, remainingInstallment).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </span>
                </div>

                {/* Multi-installment breakdown detail */}
                {paymentDetails.allocations && paymentDetails.allocations.length > 0 && (
                  <div className="border-t border-slate-100 pt-3 space-y-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Allocation Details</span>
                    <div className="space-y-1.5 text-slate-600">
                      {paymentDetails.allocations.map((alloc, idx) => {
                        const idxOverall = Array.isArray(allInstallments) && allInstallments.length > 0
                          ? allInstallments.findIndex(inst => inst.installment_id == alloc.installment_id) + 1
                          : 0;
                        const instNum = idxOverall > 0 
                          ? `#${idxOverall}` 
                          : (alloc.installment_number ? `#${alloc.installment_number}` : `ID ${alloc.installment_id}`);
                        return (
                          <div key={idx} className="flex justify-between items-center text-xs font-semibold text-slate-500 installment-row">
                            <span>Applied to {instNum}:</span>
                            <span className="font-extrabold text-slate-800">Rs. {parseFloat(alloc.amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* HIGHLY EXPLICIT OUTSTANDING BALANCE */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 flex justify-between items-center shadow-md">
                <div>
                  <span className="text-[10px] font-bold text-primary-400 uppercase tracking-wider block">Remaining Loan Outstanding</span>
                  <p className="text-[9px] text-slate-400 font-medium">Aggregate outstanding after this repayment</p>
                </div>
                <div className="text-right">
                  <span className="text-base sm:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-200">
                    Rs. {Math.max(0, newOutstanding).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer and message */}
            <div className="text-center pt-5 mt-5 border-t border-dashed border-slate-200 space-y-1">
              <p className="text-[9px] text-slate-400 italic block">
                Authorized by Galle Credit Teller Desk. System Custodian: {paymentDetails.collectorName || 'System Collector'}.
              </p>
              <p className="text-[9px] font-black text-primary-600 tracking-wider uppercase block">
                THANK YOU FOR YOUR VALUED PARTNERSHIP!
              </p>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default ReceiptModal;
