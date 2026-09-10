import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Wallet, ArrowUpRight, CheckCircle2, Clock, Wifi, WifiOff, RefreshCw, ShieldAlert, Building2, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getOfflineQueue, getOfflineDrawerTally, syncOfflinePayments } from '../../utils/offlineQueue';

const CollectorDrawer = () => {
  const { user } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const [drawer, setDrawer] = useState(null);
  const [allVaults, setAllVaults] = useState([]);
  const [offlineQueue, setOfflineQueue] = useState(getOfflineQueue());
  const [offlineCash, setOfflineCash] = useState(getOfflineDrawerTally());
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  
  // Handover state
  const [handoverAmount, setHandoverAmount] = useState('');
  const [isSubmittingHandover, setIsSubmittingHandover] = useState(false);
  const [handoverSuccess, setHandoverSuccess] = useState(false);
  const [handoverError, setHandoverError] = useState('');

  const fetchDrawerData = async () => {
    try {
      const config = {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      };

      const res = await axios.get(`${API_URL}/api/vaults/my-drawer`, config);
      setDrawer(res.data);
      setHandoverAmount(parseFloat(res.data.current_balance || 0).toFixed(2));

      // If admin, also fetch all staff drawers
      if (user?.role === 'admin' || user?.role === 'accountant') {
        const vaultsRes = await axios.get(`${API_URL}/api/vaults`, config);
        if (Array.isArray(vaultsRes.data)) {
          setAllVaults(vaultsRes.data.filter(v => v.type === 'STAFF'));
        }
      }
    } catch (err) {
      console.error('Failed to load drawer data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrawerData();

    const handleQueueChange = () => {
      setOfflineQueue(getOfflineQueue());
      setOfflineCash(getOfflineDrawerTally());
    };
    window.addEventListener('gallecredit_offline_updated', handleQueueChange);
    return () => window.removeEventListener('gallecredit_offline_updated', handleQueueChange);
  }, []);

  const handleManualSync = async () => {
    if (!navigator.onLine) {
      setSyncStatus('Cannot sync: Device is offline');
      return;
    }

    setIsSyncing(true);
    setSyncStatus('Synchronizing offline collections...');

    try {
      const result = await syncOfflinePayments(API_URL, localStorage.getItem('token'));
      setSyncStatus(`Successfully synced ${result.syncedCount} collection(s)!`);
      fetchDrawerData();
    } catch (err) {
      setSyncStatus('Sync encountered an error.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus(''), 4000);
    }
  };

  const handleHandoverSubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(handoverAmount);
    if (isNaN(amount) || amount <= 0) {
      setHandoverError('Please enter a valid handover amount');
      return;
    }

    setIsSubmittingHandover(true);
    setHandoverError('');
    setHandoverSuccess(false);

    try {
      const config = {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      };

      await axios.post(`${API_URL}/api/vaults/handover`, { amount }, config);
      setHandoverSuccess(true);
      fetchDrawerData();
    } catch (err) {
      setHandoverError(err.response?.data?.error || 'Failed to submit handover request.');
    } finally {
      setIsSubmittingHandover(false);
    }
  };

  const serverCash = parseFloat(drawer?.current_balance || 0);
  const totalPhysicalCash = serverCash + offlineCash;

  return (
    <div className="space-y-4 pb-24 max-w-2xl mx-auto">
      
      {/* Cash in Hand Banner */}
      <div className="bg-gradient-to-br from-slate-900 to-primary-950 p-5 rounded-3xl text-white shadow-xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-white/10 text-primary-400">
              <Wallet className="w-5 h-5" />
            </span>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Total Physical Cash in Hand
              </span>
              <h2 className="text-3xl font-black font-mono text-emerald-400">
                Rs. {totalPhysicalCash.toLocaleString()}
              </h2>
            </div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-xs">
          <div className="bg-white/5 p-2.5 rounded-xl">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Server Verified</span>
            <span className="font-bold text-slate-200 font-mono text-sm">
              Rs. {serverCash.toLocaleString()}
            </span>
          </div>

          <div className="bg-white/5 p-2.5 rounded-xl">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Offline Queued</span>
            <span className="font-bold text-amber-300 font-mono text-sm">
              Rs. {offlineCash.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Offline Queue Sync Card */}
      {offlineQueue.length > 0 && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <WifiOff className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <h4 className="font-black text-amber-950 text-sm">
                  {offlineQueue.length} Collections Queued Offline
                </h4>
                <p className="text-xs text-amber-800">
                  Recorded without cellular signal. Safe on this phone.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {offlineQueue.map((item) => (
              <div key={item.id} className="bg-white p-2 rounded-xl border border-amber-200/60 text-xs flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-900 block">{item.customer_name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{item.loan_code}</span>
                </div>
                <span className="font-bold text-emerald-600 font-mono">
                  Rs. {Number(item.amount).toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync to Server Now'}</span>
          </button>

          {syncStatus && (
            <p className="text-center text-xs font-bold text-amber-900">{syncStatus}</p>
          )}
        </div>
      )}

      {/* End-of-Day Cash Handover Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
        <div>
          <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-primary-600" />
            End-of-Day Cash Handover to Branch
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Submit your collected cash to the branch manager for reconciliation.
          </p>
        </div>

        {handoverSuccess ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2 animate-in zoom-in-95">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h4 className="font-bold text-emerald-950 text-sm">Handover Request Submitted!</h4>
            <p className="text-xs text-emerald-800">
              Pending branch manager approval. Your drawer balance will update once approved.
            </p>
            <button
              type="button"
              onClick={() => setHandoverSuccess(false)}
              className="text-xs font-bold text-emerald-700 underline mt-1"
            >
              Submit another request
            </button>
          </div>
        ) : (
          <form onSubmit={handleHandoverSubmit} className="space-y-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Handover Amount (LKR)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-slate-400 font-bold text-sm">Rs.</span>
                <input
                  type="number"
                  step="any"
                  value={handoverAmount}
                  onChange={(e) => setHandoverAmount(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-lg font-mono focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {handoverError && (
              <p className="text-xs text-red-600 font-medium">{handoverError}</p>
            )}

            <button
              type="submit"
              disabled={isSubmittingHandover || parseFloat(handoverAmount) <= 0}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-all disabled:opacity-50"
            >
              {isSubmittingHandover ? 'Submitting...' : 'Submit Handover Request'}
            </button>
          </form>
        )}
      </div>

      {/* Admin Field Supervision Overview */}
      {(user?.role === 'admin' || user?.role === 'accountant') && allVaults.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-3">
          <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-primary-600" />
            Active Field Drawers (All Staff)
          </h3>
          <p className="text-xs text-slate-500">
            Real-time cash holding across all field recovery officers.
          </p>

          <div className="divide-y divide-slate-100">
            {allVaults.map((v) => (
              <div key={v.vault_id} className="py-2.5 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-800 block">{v.staff_name || v.name}</span>
                  <span className="text-[10px] text-slate-400">Drawer ID #{v.vault_id}</span>
                </div>
                <span className="font-black text-slate-900 font-mono text-sm">
                  Rs. {Number(v.current_balance || 0).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default CollectorDrawer;
