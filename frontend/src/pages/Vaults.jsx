import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Wallet, Landmark, ArrowRightLeft, Check, X, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';

const Vaults = () => {
  const { user } = useAuth();
  
  // States
  const [vaults, setVaults] = useState([]);
  const [myDrawer, setMyDrawer] = useState(null);
  const [pendingHandovers, setPendingHandovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [handoverAmount, setHandoverAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actioning, setActioning] = useState(null); // stores id being actioned
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Access check
  const isAdminOrAccountant = user?.role === 'admin' || user?.role === 'accountant';

  const fetchVaultsData = async () => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      // Configure axios authorization token header
      const config = {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      };

      if (isAdminOrAccountant) {
        const [vaultsRes, pendingRes] = await Promise.all([
          axios.get(`\https://gallecredit-a9a2.vercel.app/api/vaults`, config),
          axios.get(`\https://gallecredit-a9a2.vercel.app/api/vaults/handovers/pending`, config)
        ]);
        setVaults(vaultsRes.data);
        setPendingHandovers(pendingRes.data);
      }

      // Always fetch personal drawer
      const drawerRes = await axios.get(`\https://gallecredit-a9a2.vercel.app/api/vaults/my-drawer`, config);
      setMyDrawer(drawerRes.data);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load vaults data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVaultsData();
  }, []);

  const handleHandoverSubmit = async (e) => {
    e.preventDefault();
    if (!handoverAmount || parseFloat(handoverAmount) <= 0) {
      setErrorMsg('Please specify a positive amount');
      return;
    }
    if (parseFloat(handoverAmount) > parseFloat(myDrawer?.current_balance || 0)) {
      setErrorMsg('Cannot handover more than your current drawer balance');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const config = {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      };
      await axios.post(`\https://gallecredit-a9a2.vercel.app/api/vaults/handover`, { amount: handoverAmount }, config);
      setSuccessMsg('Handover request submitted successfully!');
      setHandoverAmount('');
      // Refresh personal drawer
      const drawerRes = await axios.get(`\https://gallecredit-a9a2.vercel.app/api/vaults/my-drawer`, config);
      setMyDrawer(drawerRes.data);
      if (isAdminOrAccountant) {
        const pendingRes = await axios.get(`\https://gallecredit-a9a2.vercel.app/api/vaults/handovers/pending`, config);
        setPendingHandovers(pendingRes.data);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to submit handover request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveHandover = async (id, action) => {
    setActioning(id);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const config = {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      };
      await axios.post(`\https://gallecredit-a9a2.vercel.app/api/vaults/handovers/${id}/resolve`, { action }, config);
      setSuccessMsg(`Handover request ${action === 'approved' ? 'approved' : 'rejected'} successfully!`);
      // Reload
      await fetchVaultsData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || `Failed to ${action} handover`);
    } finally {
      setActioning(null);
    }
  };

  // Calculations for Admin / Accountant Dashboard
  const centralVault = vaults.find(v => v.type === 'MAIN');
  const staffVaults = vaults.filter(v => v.type === 'STAFF');
  const totalCentral = parseFloat(centralVault?.current_balance || 0);
  const totalStaff = staffVaults.reduce((sum, v) => sum + parseFloat(v.current_balance || 0), 0);
  const grandTotal = totalCentral + totalStaff;

  return (
    <div className="space-y-8 pb-12">
      {/* Messages */}
      {errorMsg && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl animate-fade-in">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-semibold">{errorMsg}</p>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 text-green-500 rounded-2xl animate-fade-in">
          <Sparkles className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-semibold">{successMsg}</p>
        </div>
      )}

      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-bold uppercase tracking-wider text-slate-500">Liquidity & Vaults</span>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Branch Cash Vaults</h2>
        </div>
        <button
          onClick={fetchVaultsData}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 hover:text-primary-600 hover:border-primary-200 hover:shadow-sm rounded-xl font-bold transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Admin/Accountant Overview Cards */}
      {isAdminOrAccountant && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Central Branch Safe */}
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-3xl text-white shadow-xl shadow-slate-900/15">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold tracking-wide text-slate-400">Central Branch Safe</span>
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <Landmark className="w-5 h-5 text-primary-400" />
              </div>
            </div>
            <h3 className="text-3xl font-extrabold tracking-tight">Rs. {totalCentral.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p className="text-xs text-slate-500 font-semibold mt-2">Locked Branch Capital Pool</p>
          </div>

          {/* Combined Staff Drawers */}
          <div className="relative overflow-hidden bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold tracking-wide text-slate-500">Staff Drawers (In-Hand)</span>
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-slate-600" />
              </div>
            </div>
            <h3 className="text-3xl font-extrabold tracking-tight text-slate-900">Rs. {totalStaff.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p className="text-xs text-slate-500 font-semibold mt-2">Held by {staffVaults.length} Active Field Collectors</p>
          </div>

          {/* Total Liquid Cash */}
          <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 to-accent-600 p-6 rounded-3xl text-white shadow-xl shadow-primary-500/20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold tracking-wide text-primary-200">Total Liquid Liquidity</span>
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            </div>
            <h3 className="text-3xl font-extrabold tracking-tight">Rs. {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p className="text-xs text-primary-100 font-semibold mt-2">Combined Branch Balance Pool</p>
          </div>
        </div>
      )}

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Personal Drawer and Handover Submission */}
        <div className="lg:col-span-1 space-y-6">
          {/* My Drawer Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Your Cash Drawer</h3>
              <p className="text-xs text-slate-500 font-semibold">Current cash in-hand held by you</p>
            </div>
            
            <div className="p-5 bg-gradient-to-tr from-slate-50 to-slate-100/50 rounded-2xl border border-slate-200/50 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase">Cash Balance</span>
                <p className="text-2xl font-extrabold text-slate-900">
                  Rs. {myDrawer ? parseFloat(myDrawer.current_balance).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                </p>
              </div>
            </div>

            {/* Handover Form */}
            <form onSubmit={handleHandoverSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Handover Amount (Rs.)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={handoverAmount}
                  onChange={(e) => setHandoverAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 rounded-xl font-semibold outline-none transition-all"
                  disabled={submitting}
                />
              </div>
              <button
                type="submit"
                disabled={submitting || !handoverAmount || parseFloat(handoverAmount) <= 0}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 disabled:from-slate-100 disabled:to-slate-100 text-white disabled:text-slate-400 font-bold rounded-xl shadow-lg shadow-primary-500/20 disabled:shadow-none transition-all duration-300"
              >
                <ArrowRightLeft className="w-4 h-4" />
                {submitting ? 'Submitting...' : 'Request Cash Handover'}
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: Handovers & Vault List (Only visible/relevant for Admins, but showing pending list makes sense) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Pending Handovers Approvals */}
          {isAdminOrAccountant && (
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Pending Handover Approvals</h3>
                <p className="text-xs text-slate-500 font-semibold">Verify cash totals before approving handover</p>
              </div>

              {pendingHandovers.length === 0 ? (
                <div className="p-8 text-center text-slate-500 font-semibold">
                  <Check className="w-10 h-10 text-green-500 mx-auto mb-3" />
                  No pending cash handovers. Everything is balanced!
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pendingHandovers.map((item) => (
                    <div key={item.handover_id} className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-full">{item.from_vault_name}</span>
                        <h4 className="text-base font-extrabold text-slate-900 mt-2">Rs. {parseFloat(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</h4>
                        <p className="text-xs text-slate-500 font-semibold mt-1">Submitted by: {item.submitter_name} | {new Date(item.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                          onClick={() => handleResolveHandover(item.handover_id, 'approved')}
                          disabled={actioning === item.handover_id}
                          className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-sm hover:shadow transition-all"
                        >
                          <Check className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleResolveHandover(item.handover_id, 'rejected')}
                          disabled={actioning === item.handover_id}
                          className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-sm hover:shadow transition-all"
                        >
                          <X className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* List of All Vaults */}
          {isAdminOrAccountant && (
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Branch Vault Breakdown</h3>
                <p className="text-xs text-slate-500 font-semibold">Active cash drawers and branch vaults ledger</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Vault Name</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Custodian / Staff</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider text-right">Current Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vaults.map((vault) => (
                      <tr key={vault.vault_id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-6 py-4 text-sm font-extrabold text-slate-900">{vault.name}</td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            vault.type === 'MAIN' ? 'bg-primary-50 text-primary-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {vault.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-500">{vault.staff_name || 'System Central'}</td>
                        <td className="px-6 py-4 text-sm font-extrabold text-slate-950 text-right">
                          Rs. {parseFloat(vault.current_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
  );
};

export default Vaults;
