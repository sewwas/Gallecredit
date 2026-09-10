import axios from 'axios';

const QUEUE_STORAGE_KEY = 'gallecredit_offline_queue';

/**
 * Get all queued offline payments
 */
export const getOfflineQueue = () => {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error reading offline queue:', err);
    return [];
  }
};

/**
 * Save an offline payment to the local queue
 */
export const saveOfflinePayment = (paymentData) => {
  try {
    const queue = getOfflineQueue();
    const offlineRecord = {
      id: `OFFLINE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      payment_id: `OFF-${Date.now()}`,
      loan_id: paymentData.loan_id,
      installment_id: paymentData.installment_id,
      amount: parseFloat(paymentData.amount),
      method: paymentData.method || 'cash',
      customer_name: paymentData.customer_name || 'Customer',
      customer_phone: paymentData.customer_phone || '',
      customer_nic: paymentData.customer_nic || '',
      loan_code: paymentData.loan_code || `LN-${paymentData.loan_id}`,
      payment_date: new Date().toISOString(),
      is_offline: true,
      timestamp: Date.now()
    };

    queue.push(offlineRecord);
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));

    // Dispatch event so UI updates immediately
    window.dispatchEvent(new CustomEvent('gallecredit_offline_updated', { detail: { count: queue.length } }));

    return offlineRecord;
  } catch (err) {
    console.error('Error saving offline payment:', err);
    throw new Error('Failed to save payment locally');
  }
};

/**
 * Get total offline cash collected today (to add to live drawer balance)
 */
export const getOfflineDrawerTally = () => {
  const queue = getOfflineQueue();
  const todayStr = new Date().toISOString().split('T')[0];
  
  return queue
    .filter(item => item.method === 'cash' && item.payment_date.startsWith(todayStr))
    .reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
};

/**
 * Remove a single item from the queue after successful sync
 */
export const removeQueuedPayment = (offlineId) => {
  try {
    const queue = getOfflineQueue().filter(item => item.id !== offlineId);
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new CustomEvent('gallecredit_offline_updated', { detail: { count: queue.length } }));
  } catch (err) {
    console.error('Error removing queued payment:', err);
  }
};

/**
 * Synchronize all queued offline payments with the backend server
 */
export const syncOfflinePayments = async (apiUrl, token) => {
  const queue = getOfflineQueue();
  if (queue.length === 0) {
    return { syncedCount: 0, failedCount: 0 };
  }

  let syncedCount = 0;
  let failedCount = 0;
  const remainingQueue = [];

  const config = {
    headers: {
      Authorization: `Bearer ${token || localStorage.getItem('token')}`
    }
  };

  for (const item of queue) {
    try {
      await axios.post(`${apiUrl}/api/payments`, {
        loan_id: item.loan_id,
        installment_id: item.installment_id,
        amount: item.amount,
        method: item.method
      }, config);

      syncedCount++;
    } catch (err) {
      console.warn(`Failed to sync payment for loan ${item.loan_id}:`, err.message);
      failedCount++;
      remainingQueue.push(item);
    }
  }

  localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(remainingQueue));
  window.dispatchEvent(new CustomEvent('gallecredit_offline_updated', { detail: { count: remainingQueue.length } }));

  return { syncedCount, failedCount, remaining: remainingQueue.length };
};
