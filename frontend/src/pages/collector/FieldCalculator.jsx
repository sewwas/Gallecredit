import React, { useState, useMemo } from 'react';
import { Calculator, Share2, DollarSign, Calendar, Clock, Percent, ArrowRight, CheckCircle2, Copy, Check } from 'lucide-react';

const FieldCalculator = () => {
  const [loanAmount, setLoanAmount] = useState(50000);
  const [loanType, setLoanType] = useState('daily'); // 'daily' | 'weekly' | 'monthly'
  const [duration, setDuration] = useState(50); // installments count
  const [interestRate, setInterestRate] = useState(15); // percentage
  const [interestMethod, setInterestMethod] = useState('flat'); // 'flat' | 'reducing' | 'daily_flat'
  const [docFeePercent, setDocFeePercent] = useState(2); // 2% doc/admin fee
  const [clientPhone, setClientPhone] = useState('');
  const [copied, setCopied] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  // Quick Amount Presets
  const amountPresets = [20000, 30000, 50000, 75000, 100000, 150000];

  // Default duration presets based on loan type
  const durationOptions = useMemo(() => {
    if (loanType === 'daily') return [30, 40, 50, 60, 80, 100];
    if (loanType === 'weekly') return [10, 12, 16, 20, 24];
    return [3, 6, 9, 12, 18, 24];
  }, [loanType]);

  // Handle loan type change
  const handleTypeChange = (newType) => {
    setLoanType(newType);
    if (newType === 'daily') setDuration(50);
    else if (newType === 'weekly') setDuration(12);
    else setDuration(6);
  };

  // Perform Amortization Calculations (Aligned with backend/utils/amortization.js)
  const calculation = useMemo(() => {
    const P = parseFloat(loanAmount) || 0;
    const R = parseFloat(interestRate) || 0;
    const n = parseInt(duration, 10) || 1;

    if (P <= 0 || n <= 0) {
      return {
        installmentAmount: 0,
        totalInterest: 0,
        totalPayable: 0,
        netDisbursed: 0,
        docFee: 0,
        schedule: []
      };
    }

    const docFee = Math.round(P * (parseFloat(docFeePercent) / 100));
    const netDisbursed = P - docFee;

    let totalInterest = 0;
    let installmentAmount = 0;
    let schedule = [];

    if (interestMethod === 'reducing') {
      let r = 0;
      if (R > 0) {
        if (loanType === 'monthly') r = (R / 12) / 100;
        else if (loanType === 'weekly') r = (R / 52) / 100;
        else if (loanType === 'daily') r = (R / 365) / 100;
        else r = R / 100;
      }

      let emi = 0;
      if (r === 0) {
        emi = P / n;
      } else {
        emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      }
      installmentAmount = Math.round(emi);
      let remainingPrincipal = P;

      for (let i = 1; i <= n; i++) {
        const interestPart = Math.round(remainingPrincipal * r);
        const principalPart = i === n ? remainingPrincipal : installmentAmount - interestPart;
        totalInterest += interestPart;
        remainingPrincipal -= principalPart;

        if (i <= 10 || i === n) {
          schedule.push({
            no: i,
            installment: installmentAmount,
            principal: principalPart,
            interest: interestPart,
            balance: Math.max(0, remainingPrincipal)
          });
        }
      }
    } else if (interestMethod === 'daily_flat') {
      const r = R > 0 ? R / 100 : 0;
      const interestPerDay = Math.round(P * r);
      totalInterest = interestPerDay * n;
      installmentAmount = Math.round((P + totalInterest) / n);

      for (let i = 1; i <= Math.min(n, 10); i++) {
        schedule.push({
          no: i,
          installment: installmentAmount,
          principal: Math.round(P / n),
          interest: interestPerDay,
          balance: Math.max(0, P - (Math.round(P / n) * i))
        });
      }
    } else {
      // Standard Flat Rate
      let r = 0;
      if (loanType === 'monthly') r = R / 100;
      else if (loanType === 'weekly') r = (R / 4) / 100;
      else if (loanType === 'daily') r = (R / 30) / 100;
      else r = R / 100;

      const interestPerPeriod = Math.round(P * r);
      totalInterest = interestPerPeriod * n;
      installmentAmount = Math.round((P + totalInterest) / n);

      for (let i = 1; i <= Math.min(n, 10); i++) {
        schedule.push({
          no: i,
          installment: installmentAmount,
          principal: Math.round(P / n),
          interest: interestPerPeriod,
          balance: Math.max(0, P - (Math.round(P / n) * i))
        });
      }
    }

    const totalPayable = P + totalInterest;

    return {
      installmentAmount,
      totalInterest,
      totalPayable,
      netDisbursed,
      docFee,
      schedule
    };
  }, [loanAmount, loanType, duration, interestRate, interestMethod, docFeePercent]);

  // WhatsApp Quotation Message
  const quoteMessage = `*Galle Credit - Loan Quotation* 📊\n\n` +
    `• *Loan Amount:* Rs. ${Number(loanAmount).toLocaleString()}\n` +
    `• *Plan:* ${duration} ${loanType === 'daily' ? 'Days (Daily)' : loanType === 'weekly' ? 'Weeks (Weekly)' : 'Months (Monthly)'}\n` +
    `• *Installment:* Rs. ${calculation.installmentAmount.toLocaleString()} per ${loanType === 'daily' ? 'day' : loanType === 'weekly' ? 'week' : 'month'}\n` +
    `• *Total Interest:* Rs. ${calculation.totalInterest.toLocaleString()}\n` +
    `• *Total Repayable:* Rs. ${calculation.totalPayable.toLocaleString()}\n` +
    (calculation.docFee > 0 ? `• *Doc/Processing Fee:* Rs. ${calculation.docFee.toLocaleString()}\n` : '') +
    `• *Net Cash in Hand:* Rs. ${calculation.netDisbursed.toLocaleString()}\n\n` +
    `_Fast Approval • Transparent Terms • Galle Credit MMS_`;

  const handleShareWhatsApp = () => {
    let url = `https://wa.me/`;
    if (clientPhone) {
      const cleanPhone = clientPhone.replace(/\D/g, '');
      const formatted = cleanPhone.startsWith('0') ? `94${cleanPhone.slice(1)}` : cleanPhone;
      url += `${formatted}?text=${encodeURIComponent(quoteMessage)}`;
    } else {
      url += `?text=${encodeURIComponent(quoteMessage)}`;
    }
    window.open(url, '_blank');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(quoteMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-20">
      
      {/* Header Badge */}
      <div className="bg-gradient-to-r from-slate-900 to-primary-950 p-5 rounded-2xl text-white shadow-xl border border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary-600/30 text-primary-400 border border-primary-500/20">
              <Calculator className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black tracking-tight">Field Loan Calculator</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">Instant financial quoting for client consultations</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Instant Quote
          </span>
        </div>
      </div>

      {/* Main Controls Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 space-y-5">
        
        {/* Loan Amount Input & Presets */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Loan Amount (LKR)</label>
            <span className="text-lg font-black text-primary-600 font-mono">
              Rs. {Number(loanAmount).toLocaleString()}
            </span>
          </div>

          <div className="relative mb-3">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold">
              Rs.
            </div>
            <input
              type="number"
              value={loanAmount}
              onChange={(e) => setLoanAmount(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-lg focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all font-mono"
            />
          </div>

          {/* Preset Chips */}
          <div className="flex flex-wrap gap-1.5">
            {amountPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setLoanAmount(preset)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  loanAmount === preset
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {preset >= 100000 ? `${preset / 1000}k` : `${preset / 1000}k`}
              </button>
            ))}
          </div>
        </div>

        {/* Loan Type Selector */}
        <div>
          <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">Collection Frequency</label>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {[
              { type: 'daily', label: 'Daily', desc: 'Working Days' },
              { type: 'weekly', label: 'Weekly', desc: 'Every 7 Days' },
              { type: 'monthly', label: 'Monthly', desc: 'Every Month' },
            ].map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => handleTypeChange(item.type)}
                className={`p-2 sm:p-3 rounded-xl border text-center transition-all ${
                  loanType === item.type
                    ? 'border-primary-500 bg-primary-50/70 text-primary-900 font-bold shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="text-xs sm:text-sm capitalize font-bold">{item.label}</div>
                <div className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Duration / Installments Count */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">
              Duration ({loanType === 'daily' ? 'Days' : loanType === 'weekly' ? 'Weeks' : 'Months'})
            </label>
            <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
              {duration} Installments
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {durationOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setDuration(opt)}
                className={`flex-1 py-1.5 sm:py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                  duration === opt
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Interest Rate & Scheme Dropdown */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-1">
          <div>
            <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-1.5">
              Interest Rate %
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                value={interestRate}
                onChange={(e) => setInterestRate(parseFloat(e.target.value) || 0)}
                className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-primary-500 text-xs sm:text-sm"
              />
              <span className="absolute right-3 top-2.5 text-slate-400 font-bold text-xs sm:text-sm">%</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-1.5">
              Method
            </label>
            <select
              value={interestMethod}
              onChange={(e) => setInterestMethod(e.target.value)}
              className="w-full px-2.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="flat">Standard Flat</option>
              <option value="daily_flat">Daily Flat %</option>
              <option value="reducing">Reducing Balance</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Highlight Card */}
      <div className="bg-gradient-to-br from-primary-600 to-indigo-700 rounded-2xl shadow-lg p-4 sm:p-5 text-white space-y-4">
        <div className="text-center py-1 sm:py-2 border-b border-white/15">
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-primary-200">
            Estimated {loanType === 'daily' ? 'Daily' : loanType === 'weekly' ? 'Weekly' : 'Monthly'} Installment
          </p>
          <h2 className="text-2xl sm:text-4xl font-black font-mono mt-1 text-white tracking-tight">
            Rs. {calculation.installmentAmount.toLocaleString()}
          </h2>
          <p className="text-[11px] sm:text-xs text-primary-100 mt-0.5">
            x {duration} {loanType === 'daily' ? 'days' : loanType === 'weekly' ? 'weeks' : 'months'}
          </p>
        </div>

        {/* 4-Box Summary Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-white/10 backdrop-blur-xs p-2.5 sm:p-3 rounded-xl">
            <span className="text-primary-200 block text-[10px] sm:text-[11px] font-medium">Principal</span>
            <span className="font-bold text-xs sm:text-sm font-mono text-white truncate block">
              Rs. {Number(loanAmount).toLocaleString()}
            </span>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-2.5 sm:p-3 rounded-xl">
            <span className="text-primary-200 block text-[10px] sm:text-[11px] font-medium">Total Interest</span>
            <span className="font-bold text-xs sm:text-sm font-mono text-amber-300 truncate block">
              + Rs. {calculation.totalInterest.toLocaleString()}
            </span>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-2.5 sm:p-3 rounded-xl">
            <span className="text-primary-200 block text-[10px] sm:text-[11px] font-medium">Total Repayment</span>
            <span className="font-bold text-xs sm:text-sm font-mono text-white truncate block">
              Rs. {calculation.totalPayable.toLocaleString()}
            </span>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-2.5 sm:p-3 rounded-xl">
            <span className="text-primary-200 block text-[10px] sm:text-[11px] font-medium">Net Disbursed</span>
            <span className="font-bold text-xs sm:text-sm font-mono text-emerald-300 truncate block">
              Rs. {calculation.netDisbursed.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* WhatsApp Sharing Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 sm:p-5 space-y-3">
        <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
          <Share2 className="w-4 h-4 text-primary-600" />
          Send Instant Quotation to Client
        </h3>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="tel"
            placeholder="Client Phone (e.g. 0771234567)"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 flex-shrink-0"
          >
            <Share2 className="w-4 h-4" />
            Send WhatsApp
          </button>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Quotation Copied to Clipboard!' : 'Copy Quotation Text'}
        </button>
      </div>

      {/* Toggle Schedule Breakdown */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowSchedule(!showSchedule)}
          className="w-full p-4 text-left font-bold text-sm text-slate-800 flex justify-between items-center hover:bg-slate-50 transition-colors"
        >
          <span>View Sample Amortization Schedule</span>
          <span className="text-xs text-primary-600 font-semibold">
            {showSchedule ? 'Hide' : 'Show First 10 Installments'}
          </span>
        </button>

        {showSchedule && (
          <div className="border-t border-slate-100 p-4 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase">
                  <th className="pb-2">#</th>
                  <th className="pb-2">Installment</th>
                  <th className="pb-2">Principal</th>
                  <th className="pb-2">Interest</th>
                  <th className="pb-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {calculation.schedule.map((row) => (
                  <tr key={row.no} className="hover:bg-slate-50/50">
                    <td className="py-2 font-bold text-slate-400">{row.no}</td>
                    <td className="py-2 font-bold text-slate-900 font-mono">Rs. {row.installment.toLocaleString()}</td>
                    <td className="py-2 text-slate-600 font-mono">Rs. {row.principal.toLocaleString()}</td>
                    <td className="py-2 text-amber-600 font-mono">Rs. {row.interest.toLocaleString()}</td>
                    <td className="py-2 text-right font-mono text-slate-500">Rs. {row.balance.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default FieldCalculator;
