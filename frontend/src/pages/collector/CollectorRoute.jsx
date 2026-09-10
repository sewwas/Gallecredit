import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Search, Phone, Check, AlertCircle, Clock, CheckCircle2, Filter, RefreshCw, UserCheck, MapPin, DollarSign, Wallet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import QuickCollectModal from './QuickCollectModal';
import { getOfflineDrawerTally } from '../../utils/offlineQueue';

const CollectorRoute = () => {
  const { user } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const [routeItems, setRouteItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'overdue' | 'paid_today' | 'all'
  const [selectedCollector, setSelectedCollector] = useState('all');
  const [collectorsList, setCollectorsList] = useState([]);
  const [selectedItemForPayment, setSelectedItemForPayment] = useState(null);
  const [offlineCash, setOfflineCash] = useState(getOfflineDrawerTally());

  // Listen for offline queue changes
  useEffect(() => {
    const handleOfflineUpdate = () => setOfflineCash(getOfflineDrawerTally());
    window.addEventListener('gallecredit_offline_updated', handleOfflineUpdate);
    return () => window.removeEventListener('gallecredit_offline_updated', handleOfflineUpdate);
  }, []);

  const fetchRoute = async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setRefreshing(true);
    try {
      const config = {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        params: {}
      };

      if (user.role === 'admin' || user.role === 'accountant') {
        if (selectedCollector !== 'all') {
          config.params.collector_id = selectedCollector;
        }
      } else if (user.role === 'staff') {
        // Staff view default: can filter by own ID if needed, or get assigned route
        config.params.collector_id = user.userId;
      }

      let res = await axios.get(`${API_URL}/api/payments/collector-route`, config);
      if (Array.isArray(res.data) && res.data.length === 0 && user.role === 'staff' && config.params.collector_id) {
        // Fallback: If no loans were registered under this specific staff collector, show all active routes
        delete config.params.collector_id;
        res = await axios.get(`${API_URL}/api/payments/collector-route`, config);
      }
      if (Array.isArray(res.data)) {
        setRouteItems(res.data);
      }
    } catch (err) {
      console.error('Failed to load collector route:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch users list for Admin/Accountant to filter by collector
  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'accountant') {
      axios.get(`${API_URL}/api/users`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      .then(res => {
        if (Array.isArray(res.data)) {
          setCollectorsList(res.data.filter(u => u.role === 'staff' || u.role === 'admin'));
        }
      })
      .catch(err => console.warn('Could not fetch collectors list', err));
    }
  }, [user]);

  useEffect(() => {
    fetchRoute();
  }, [selectedCollector]);

  // Aggregate Top Bar Metrics
  const metrics = useMemo(() => {
    let totalPaidToday = 0;
    let totalPendingCount = 0;
    let totalOverdueCount = 0;

    routeItems.forEach(item => {
      const paid = parseFloat(item.paid_today || 0);
      if (paid > 0) {
        totalPaidToday += paid;
      } else {
        totalPendingCount++;
        if (item.due_urgency === 'overdue') {
          totalOverdueCount++;
        }
      }
    });

    return {
      totalPaidToday: totalPaidToday + offlineCash,
      totalPendingCount,
      totalOverdueCount,
      totalCount: routeItems.length
    };
  }, [routeItems, offlineCash]);

  // Filtered Route Items
  const filteredItems = useMemo(() => {
    return routeItems.filter(item => {
      const paidToday = parseFloat(item.paid_today || 0) > 0;

      // Tab filter
      if (activeTab === 'pending' && paidToday) return false;
      if (activeTab === 'overdue' && (item.due_urgency !== 'overdue' || paidToday)) return false;
      if (activeTab === 'paid_today' && !paidToday) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = item.customer_name?.toLowerCase().includes(query);
        const matchesPhone = item.customer_phone?.includes(query);
        const matchesNic = item.customer_nic?.toLowerCase().includes(query);
        const matchesLocation = item.customer_location?.toLowerCase().includes(query);
        const matchesCode = item.loan_code?.toLowerCase().includes(query);

        return matchesName || matchesPhone || matchesNic || matchesLocation || matchesCode;
      }

      return true;
    });
  }, [routeItems, activeTab, searchQuery]);

  const handlePaymentSuccess = () => {
    fetchRoute();
  };

  return (
    <div className="space-y-4 pb-24 max-w-2xl mx-auto">
      
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        <div className="bg-white p-2 sm:p-3 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-500 block truncate">Collected</span>
          <span className="text-xs sm:text-sm md:text-base font-black text-emerald-600 font-mono block mt-0.5 truncate">
            Rs. {metrics.totalPaidToday.toLocaleString()}
          </span>
        </div>

        <div className="bg-white p-2 sm:p-3 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-500 block truncate">Pending</span>
          <span className="text-xs sm:text-sm md:text-base font-black text-slate-900 font-mono block mt-0.5 truncate">
            {metrics.totalPendingCount} Clients
          </span>
        </div>

        <div className="bg-white p-2 sm:p-3 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-500 block truncate">Overdue</span>
          <span className="text-xs sm:text-sm md:text-base font-black text-red-600 font-mono block mt-0.5 truncate">
            {metrics.totalOverdueCount} Overdue
          </span>
        </div>
      </div>

      {/* Admin / Accountant Supervisor Filter */}
      {(user?.role === 'admin' || user?.role === 'accountant') && (
        <div className="bg-primary-50/70 border border-primary-200/80 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 min-w-0">
            <UserCheck className="w-4 h-4 text-primary-600 flex-shrink-0" />
            <span className="text-[11px] sm:text-xs font-bold text-primary-900 truncate">Filter Route:</span>
          </div>
          <select
            value={selectedCollector}
            onChange={(e) => setSelectedCollector(e.target.value)}
            className="bg-white border border-primary-300 rounded-xl px-2 py-1.5 text-xs font-bold text-primary-900 focus:ring-2 focus:ring-primary-500 max-w-[170px] sm:max-w-none truncate"
          >
            <option value="all">🌐 All Field Officers</option>
            {collectorsList.map((c) => (
              <option key={c.user_id} value={c.user_id}>
                👤 {c.name} ({c.role})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Search & Refresh Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search Name, NIC, Mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-primary-500 shadow-xs"
          />
        </div>
        <button
          type="button"
          onClick={() => fetchRoute(true)}
          disabled={refreshing}
          className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-xs active:scale-95 flex-shrink-0"
          title="Refresh Route"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-primary-600' : ''}`} />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-slate-200/60 p-1 rounded-xl gap-0.5 sm:gap-1 text-[11px] sm:text-xs font-bold">
        {[
          { id: 'pending', label: 'Pending', count: metrics.totalPendingCount },
          { id: 'overdue', label: 'Overdue', count: metrics.totalOverdueCount },
          { id: 'paid_today', label: 'Paid' },
          { id: 'all', label: 'All', count: metrics.totalCount }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-1.5 sm:py-2 rounded-lg transition-all text-center ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`ml-1 px-1 py-0.2 rounded-full text-[9px] sm:text-[10px] ${
                activeTab === tab.id ? 'bg-slate-100 text-slate-700' : 'bg-slate-300/60 text-slate-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Route List */}
      {loading ? (
        <div className="text-center py-12 space-y-2">
          <div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Loading today's collection route...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-70" />
          <h4 className="font-bold text-slate-800 text-sm">No Customers Found</h4>
          <p className="text-xs text-slate-500">
            {searchQuery ? 'No match for your search criteria.' : 'All collections in this view are completed!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const isPaidToday = parseFloat(item.paid_today || 0) > 0;
            const isOverdue = item.due_urgency === 'overdue' && !isPaidToday;
            const isDueToday = item.due_urgency === 'due_today' && !isPaidToday;
            const remainingDue = parseFloat(item.remaining_installment || item.installment_amount || 0);

            return (
              <div
                key={`${item.loan_id}-${item.installment_id}`}
                className={`bg-white rounded-2xl border transition-all p-4 shadow-xs relative overflow-hidden ${
                  isPaidToday
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : isOverdue
                    ? 'border-red-200'
                    : 'border-slate-200/90'
                }`}
              >
                {/* Status Indicator Bar on Left */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                    isPaidToday ? 'bg-emerald-500' : isOverdue ? 'bg-red-500' : isDueToday ? 'bg-amber-500' : 'bg-slate-300'
                  }`}
                />

                <div className="flex items-start justify-between gap-2">
                  
                  {/* Customer Info */}
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-black text-slate-900 text-sm truncate">
                        {item.customer_name}
                      </h4>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {item.loan_code || `LN-${item.loan_id}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      {item.customer_location && (
                        <span className="flex items-center gap-1 truncate text-slate-600 font-medium">
                          <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          {item.customer_location}
                        </span>
                      )}
                      <span className="capitalize text-[11px] font-bold text-slate-400">
                        {item.loan_type} Plan
                      </span>
                    </div>
                  </div>

                  {/* Urgency Badge */}
                  <div className="text-right flex-shrink-0">
                    {isPaidToday ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                        ✓ Paid Rs. {Number(item.paid_today).toLocaleString()}
                      </span>
                    ) : isOverdue ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-extrabold animate-pulse">
                        ⚠️ Overdue
                      </span>
                    ) : isDueToday ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold">
                        Due Today
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium">
                        Upcoming
                      </span>
                    )}
                  </div>
                </div>

                {/* Amount & Due Row */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Installment Due
                    </span>
                    <span className="text-base font-black text-slate-900 font-mono">
                      Rs. {remainingDue.toLocaleString()}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Remaining Total
                    </span>
                    <span className="text-xs font-bold text-slate-500 font-mono">
                      Rs. {Number(item.total_remaining_balance || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Actions Row */}
                <div className="mt-3 flex items-center gap-2">
                  {item.customer_phone && (
                    <a
                      href={`tel:${item.customer_phone}`}
                      className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center justify-center flex-shrink-0 active:scale-95 shadow-xs"
                      title="Call Client"
                    >
                      <Phone className="w-4 h-4 text-slate-600" />
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedItemForPayment(item)}
                    className={`flex-1 h-11 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-98 ${
                      isPaidToday
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>{isPaidToday ? 'Log Another Payment' : 'Collect Installment'}</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Quick Collect Modal */}
      {selectedItemForPayment && (
        <QuickCollectModal
          item={selectedItemForPayment}
          isOpen={Boolean(selectedItemForPayment)}
          onClose={() => setSelectedItemForPayment(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}

    </div>
  );
};

export default CollectorRoute;
