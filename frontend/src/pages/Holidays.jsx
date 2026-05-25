import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Calendar, Trash2, Plus, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';

const Holidays = () => {
  const { user } = useAuth();
  
  // Guard access (Admin only)
  if (user?.role !== 'admin') {
    return <Navigate to="/" />;
  }

  // States
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ holiday_date: '', description: '', is_recurring: false });
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchHolidays = async () => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const config = {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      };
      const res = await axios.get(`\${"https://gallecredit-a9a2.vercel.app"}/api/holidays`, config);
      setHolidays(res.data);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load holidays list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.holiday_date || !form.description) {
      setErrorMsg('Date and description are required');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const config = {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      };
      await axios.post(`\${"https://gallecredit-a9a2.vercel.app"}/api/holidays`, form, config);
      setSuccessMsg('Holiday added/updated successfully!');
      setForm({ holiday_date: '', description: '', is_recurring: false });
      // Reload
      const res = await axios.get(`\${"https://gallecredit-a9a2.vercel.app"}/api/holidays`, config);
      setHolidays(res.data);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to register holiday');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this public holiday? This will affect future loan schedule generations.')) return;
    
    setDeletingId(id);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const config = {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      };
      await axios.delete(`\${"https://gallecredit-a9a2.vercel.app"}/api/holidays/${id}`, config);
      setSuccessMsg('Holiday deleted successfully!');
      // Reload
      const res = await axios.get(`\${"https://gallecredit-a9a2.vercel.app"}/api/holidays`, config);
      setHolidays(res.data);
    } catch (err) {
      setErrorMsg('Failed to delete holiday');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Messages */}
      {errorMsg && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-semibold">{errorMsg}</p>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 text-green-500 rounded-2xl">
          <Sparkles className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-semibold">{successMsg}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-bold uppercase tracking-wider text-slate-500">Calendar Settings</span>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Holiday Manager</h2>
        </div>
        <button
          onClick={fetchHolidays}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 hover:text-primary-600 hover:border-primary-200 hover:shadow-sm rounded-xl font-bold transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Add New Holiday Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Add Non-Collection Day</h3>
              <p className="text-xs text-slate-500 font-semibold">Installment schedules will skip these dates</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Holiday Date</label>
                <input
                  type="date"
                  value={form.holiday_date}
                  onChange={(e) => setForm(prev => ({ ...prev, holiday_date: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 rounded-xl font-semibold outline-none transition-all"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Christmas, New Year"
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 rounded-xl font-semibold outline-none transition-all"
                  disabled={submitting}
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="is_recurring"
                  checked={form.is_recurring}
                  onChange={(e) => setForm(prev => ({ ...prev, is_recurring: e.target.checked }))}
                  className="w-5 h-5 accent-primary-600 rounded border-slate-300 outline-none cursor-pointer"
                  disabled={submitting}
                />
                <label htmlFor="is_recurring" className="text-sm font-semibold text-slate-700 cursor-pointer">
                  Recurring Holiday Yearly
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting || !form.holiday_date || !form.description}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 disabled:from-slate-100 disabled:to-slate-100 text-white disabled:text-slate-400 font-bold rounded-xl shadow-lg shadow-primary-500/20 disabled:shadow-none transition-all duration-300"
              >
                <Plus className="w-4 h-4" />
                {submitting ? 'Registering...' : 'Register Holiday'}
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: List of Registered Holidays */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Registered Non-Collection Days</h3>
              <p className="text-xs text-slate-500 font-semibold">Active public holidays registered in the ledger database</p>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-500 font-semibold">
                <RefreshCw className="w-10 h-10 text-primary-500 mx-auto mb-3 animate-spin" />
                Loading holidays list...
              </div>
            ) : holidays.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-semibold">
                <Calendar className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                No custom holidays registered. Collections occur on all 7 days of the week by default.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Holiday Date</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Recurrence</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {holidays.map((hol) => (
                      <tr key={hol.holiday_id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-6 py-4 text-sm font-extrabold text-slate-900">
                          {new Date(hol.holiday_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-700">{hol.description}</td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            hol.is_recurring ? 'bg-primary-50 text-primary-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {hol.is_recurring ? 'Yearly Recurring' : 'One-Time'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDelete(hol.holiday_id)}
                            disabled={deletingId === hol.holiday_id}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all inline-flex items-center justify-center"
                          >
                            <Trash2 className={`w-4 h-4 ${deletingId === hol.holiday_id ? 'animate-pulse' : ''}`} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default Holidays;
