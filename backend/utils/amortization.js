/**
 * Utility for Loan Amortization Schedule Calculation
 * Supports Flat Rate and Reducing Balance methods.
 * Ensures exact rounding offset handling on the final installment.
 */

function calculateSchedule({
  loan_amount,
  interest_rate,
  no_of_installments,
  loan_type = 'monthly',
  interest_method = 'flat',
  issue_date = new Date(),
  holidaySet = new Set()
}) {
  const P = parseFloat(loan_amount);
  const R = parseFloat(interest_rate);
  const n = parseInt(no_of_installments, 10);

  if (isNaN(P) || P <= 0 || isNaN(n) || n <= 0) {
    throw new Error('Invalid loan amount or number of installments');
  }

  let installments = [];
  let total_amount = 0;
  let total_interest = 0;

  function isWorkingDay(date) {
    const dateString = date.toISOString().split('T')[0];
    if (holidaySet.has(dateString)) return false;
    return true;
  }

  function getNextWorkingDate(startDate) {
    let nextDate = new Date(startDate);
    if (loan_type === 'daily') {
      do { nextDate.setDate(nextDate.getDate() + 1); } while (!isWorkingDay(nextDate));
    } else if (loan_type === 'weekly') {
      do { nextDate.setDate(nextDate.getDate() + 7); } while (!isWorkingDay(nextDate));
    } else if (loan_type === 'monthly') {
      do { nextDate.setMonth(nextDate.getMonth() + 1); } while (!isWorkingDay(nextDate));
    } else if (loan_type === 'yearly') {
      do { nextDate.setFullYear(nextDate.getFullYear() + 1); } while (!isWorkingDay(nextDate));
    }
    return nextDate;
  }

  let currentDueDate = new Date(issue_date);

  if (interest_method === 'reducing') {
    // REDUCING BALANCE METHOD
    let r = 0;
    if (R > 0) {
      if (loan_type === 'monthly') {
        r = (R / 12) / 100;
      } else if (loan_type === 'weekly') {
        r = (R / 52) / 100;
      } else if (loan_type === 'daily') {
        r = (R / 365) / 100;
      } else if (loan_type === 'yearly') {
        r = R / 100;
      } else {
        r = R / 100;
      }
    }

    let emi = 0;
    if (r === 0) {
      emi = P / n;
    } else {
      emi = P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    }
    const regularEmi = Math.round(emi * 100) / 100;

    let remainingPrincipal = P;

    for (let i = 1; i <= n; i++) {
      currentDueDate = getNextWorkingDate(currentDueDate);
      const dueDateStr = currentDueDate.toISOString().split('T')[0];

      let interestPortion = Math.round(remainingPrincipal * r * 100) / 100;
      let principalPortion = 0;
      let installmentAmount = 0;

      if (i === n) {
        principalPortion = Math.round(remainingPrincipal * 100) / 100;
        installmentAmount = Math.round((principalPortion + interestPortion) * 100) / 100;
        remainingPrincipal = 0.00;
      } else {
        principalPortion = Math.round((regularEmi - interestPortion) * 100) / 100;
        installmentAmount = regularEmi;
        remainingPrincipal = Math.round((remainingPrincipal - principalPortion) * 100) / 100;
      }

      total_amount += installmentAmount;
      total_interest += interestPortion;

      installments.push({
        installment_no: i,
        due_date: dueDateStr,
        amount: installmentAmount.toFixed(2),
        principal_amount: principalPortion.toFixed(2),
        interest_amount: interestPortion.toFixed(2)
      });
    }
  } else if (interest_method === 'fixed_daily') {
    // FIXED DAILY FEE METHOD (Fixed Rupee amount charged per day/installment)
    const fixedFeePerPeriod = Math.round(R * 100) / 100;
    const principalPerPeriod = Math.round((P / n) * 100) / 100;
    const regularInstallment = Math.round((principalPerPeriod + fixedFeePerPeriod) * 100) / 100;

    let remainingPrincipal = P;

    for (let i = 1; i <= n; i++) {
      currentDueDate = getNextWorkingDate(currentDueDate);
      const dueDateStr = currentDueDate.toISOString().split('T')[0];

      let interestPortion = fixedFeePerPeriod;
      let principalPortion = 0;
      let installmentAmount = 0;

      if (i === n) {
        principalPortion = Math.round(remainingPrincipal * 100) / 100;
        installmentAmount = Math.round((principalPortion + interestPortion) * 100) / 100;
        remainingPrincipal = 0.00;
      } else {
        principalPortion = principalPerPeriod;
        installmentAmount = regularInstallment;
        remainingPrincipal = Math.round((remainingPrincipal - principalPortion) * 100) / 100;
      }

      total_amount += installmentAmount;
      total_interest += interestPortion;

      installments.push({
        installment_no: i,
        due_date: dueDateStr,
        amount: installmentAmount.toFixed(2),
        principal_amount: principalPortion.toFixed(2),
        interest_amount: interestPortion.toFixed(2)
      });
    }
  } else if (interest_method === 'daily_flat') {
    // DAILY FLAT PERCENTAGE METHOD (Direct R% per day/period on original Principal)
    const r = R > 0 ? R / 100 : 0;
    const interestPerPeriod = Math.round(P * r * 100) / 100;
    const principalPerPeriod = Math.round((P / n) * 100) / 100;
    const regularInstallment = Math.round((principalPerPeriod + interestPerPeriod) * 100) / 100;

    let remainingPrincipal = P;

    for (let i = 1; i <= n; i++) {
      currentDueDate = getNextWorkingDate(currentDueDate);
      const dueDateStr = currentDueDate.toISOString().split('T')[0];

      let interestPortion = interestPerPeriod;
      let principalPortion = 0;
      let installmentAmount = 0;

      if (i === n) {
        principalPortion = Math.round(remainingPrincipal * 100) / 100;
        installmentAmount = Math.round((principalPortion + interestPortion) * 100) / 100;
        remainingPrincipal = 0.00;
      } else {
        principalPortion = principalPerPeriod;
        installmentAmount = regularInstallment;
        remainingPrincipal = Math.round((remainingPrincipal - principalPortion) * 100) / 100;
      }

      total_amount += installmentAmount;
      total_interest += interestPortion;

      installments.push({
        installment_no: i,
        due_date: dueDateStr,
        amount: installmentAmount.toFixed(2),
        principal_amount: principalPortion.toFixed(2),
        interest_amount: interestPortion.toFixed(2)
      });
    }
  } else {
    // FLAT RATE METHOD (Rate scaled per loan_type: monthly = R%, daily = R/30%, weekly = R/4%)
    let r = 0;
    if (R > 0) {
      if (loan_type === 'monthly') {
        r = R / 100;
      } else if (loan_type === 'weekly') {
        r = (R / 4) / 100;
      } else if (loan_type === 'daily') {
        r = (R / 30) / 100;
      } else if (loan_type === 'yearly') {
        r = (R * 12) / 100;
      } else {
        r = R / 100;
      }
    }
    const interestPerPeriod = Math.round(P * r * 100) / 100;
    const principalPerPeriod = Math.round((P / n) * 100) / 100;
    const regularInstallment = Math.round((principalPerPeriod + interestPerPeriod) * 100) / 100;

    let remainingPrincipal = P;

    for (let i = 1; i <= n; i++) {
      currentDueDate = getNextWorkingDate(currentDueDate);
      const dueDateStr = currentDueDate.toISOString().split('T')[0];

      let interestPortion = interestPerPeriod;
      let principalPortion = 0;
      let installmentAmount = 0;

      if (i === n) {
        principalPortion = Math.round(remainingPrincipal * 100) / 100;
        installmentAmount = Math.round((principalPortion + interestPortion) * 100) / 100;
        remainingPrincipal = 0.00;
      } else {
        principalPortion = principalPerPeriod;
        installmentAmount = regularInstallment;
        remainingPrincipal = Math.round((remainingPrincipal - principalPortion) * 100) / 100;
      }

      total_amount += installmentAmount;
      total_interest += interestPortion;

      installments.push({
        installment_no: i,
        due_date: dueDateStr,
        amount: installmentAmount.toFixed(2),
        principal_amount: principalPortion.toFixed(2),
        interest_amount: interestPortion.toFixed(2)
      });
    }
  }

  return {
    total_amount: Math.round(total_amount * 100) / 100,
    total_interest: Math.round(total_interest * 100) / 100,
    installments,
    final_due_date: installments.length > 0 ? installments[installments.length - 1].due_date : null
  };
}

module.exports = { calculateSchedule };
