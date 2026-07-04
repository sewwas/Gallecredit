import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Phone, MapPin, AlertCircle, FileText, CheckCircle, Activity, Banknote } from 'lucide-react';

const CustomerAuditModal = ({ customerId, isOpen, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);

  useEffect(() => {
    if (isOpen && customerId) {
      setLoading(true);
      axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/customers/${customerId}/audit`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      .then(res => {
        setData(res.data);
        setError(null);
      })
      .catch(err => {
        console.error("Failed to fetch customer audit:", err);
        setError("Failed to load customer audit data.");
      })
      .finally(() => {
        setLoading(false);
      });
    } else {
      setData(null);
    }
  }, [isOpen, customerId]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/customers/${customerId}/notes`, { note: newNote }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setNewNote('');
      // Reload audit data
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/customers/${customerId}/audit`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setData(res.data);
    } catch (err) {
      console.error(err);
      alert('Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const handleSendReminder = async () => {
    if (!window.confirm(`Send SMS reminder for Rs.${data.audit_summary.total_overdue_amount}?`)) return;
    setSendingSms(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/customers/${customerId}/remind`, { overdue_amount: data.audit_summary.total_overdue_amount }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert('SMS Reminder sent successfully!');
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/customers/${customerId}/audit`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setData(res.data);
    } catch (err) {
      console.error(err);
      alert('Failed to send SMS reminder');
    } finally {
      setSendingSms(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col">
        
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xl">
              {data?.customer?.name?.charAt(0) || 'C'}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-slate-800">
                  {data?.customer?.name || 'Loading...'}
                </h2>
                {data?.audit_summary?.trust_score && (
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-black
                    ${data.audit_summary.trust_score === 'A' ? 'bg-emerald-100 text-emerald-800' :
                      data.audit_summary.trust_score === 'B' ? 'bg-blue-100 text-blue-800' :
                      data.audit_summary.trust_score === 'C' ? 'bg-amber-100 text-amber-800' :
                      data.audit_summary.trust_score === 'D' ? 'bg-rose-100 text-rose-800' :
                      'bg-slate-100 text-slate-800'}`}>
                    Score: {data.audit_summary.trust_score}
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-slate-500">
                NIC: {data?.customer?.nic || '...'} • KYC: {data?.customer?.kyc_status?.toUpperCase() || '...'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="p-6 bg-rose-50 text-rose-700 rounded-xl font-medium flex items-center gap-3">
              <AlertCircle size={24} /> {error}
            </div>
          ) : (
            <div className="space-y-8">
              
              {/* Top Row: Contact & Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Contact Card */}
                <div className="glass-panel p-5 border border-slate-200/60 bg-slate-50/50 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <Phone size={100} />
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Phone size={16} className="text-blue-500" /> Urgent Contact Info
                  </h3>
                  <div className="space-y-4 relative z-10">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase">Phone Number</p>
                      <a href={`tel:${data.customer.phone}`} className="text-xl font-bold text-blue-600 hover:underline inline-flex items-center gap-2">
                        {data.customer.phone}
                      </a>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase">Registered Address</p>
                      <p className="text-sm font-medium text-slate-700">{data.customer.address}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase">Branch / Location</p>
                      <p className="text-sm font-medium text-slate-700 flex items-center gap-1">
                        <MapPin size={14} className="text-slate-400"/> {data.customer.location} ({data.customer.location_code})
                      </p>
                    </div>
                  </div>
                </div>

                {/* Audit Summary Card */}
                <div className="glass-panel p-5 border border-slate-200/60 bg-slate-50/50 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <Activity size={100} />
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Activity size={16} className="text-emerald-500" /> Audit Summary
                  </h3>
                  <div className="grid grid-cols-2 gap-4 relative z-10">
                    <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                      <p className="text-xs font-bold text-slate-400 uppercase">Total Loans</p>
                      <p className="text-2xl font-black text-slate-800">{data.audit_summary.total_loans}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                      <p className="text-xs font-bold text-slate-400 uppercase">Active Loans</p>
                      <p className="text-2xl font-black text-emerald-600">{data.audit_summary.active_loans}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm col-span-2 flex flex-col justify-center items-center relative">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">Total Overdue Arrears</p>
                      <p className={`text-3xl font-black ${data.audit_summary.total_overdue_amount > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                        Rs. {parseFloat(data.audit_summary.total_overdue_amount).toLocaleString()}
                      </p>
                      {data.audit_summary.total_overdue_amount > 0 && (
                        <button 
                          onClick={handleSendReminder}
                          disabled={sendingSms}
                          className="mt-3 w-full py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                        >
                          {sendingSms ? 'Sending...' : 'Send SMS Reminder'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Loan History Grid */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Banknote size={20} className="text-primary-500" /> Past & Active Loans History
                </h3>
                
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          <th className="py-3 px-4">Loan Code</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4">Amount</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Outstanding</th>
                          <th className="py-3 px-4 text-right">Overdue Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.loans.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="py-8 text-center text-slate-500 font-medium">No loans found for this customer.</td>
                          </tr>
                        ) : (
                          data.loans.map((loan) => (
                            <tr key={loan.loan_id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-4 text-sm font-bold text-slate-800">{loan.loan_code || `L-${loan.loan_id}`}</td>
                              <td className="py-3 px-4 text-sm font-semibold text-slate-600 capitalize">{loan.loan_type}</td>
                              <td className="py-3 px-4 text-sm font-medium text-slate-700">Rs. {parseFloat(loan.total_amount).toLocaleString()}</td>
                              <td className="py-3 px-4">
                                <span className={`px-2.5 py-1 inline-flex text-[10px] leading-5 font-bold rounded-full capitalize
                                  ${loan.status === 'disbursed' ? 'bg-emerald-100 text-emerald-800' : 
                                    loan.status === 'completed' ? 'bg-blue-100 text-blue-800' : 
                                    loan.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                                  {loan.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-sm font-bold text-slate-700">
                                {loan.status === 'disbursed' ? `Rs. ${parseFloat(loan.outstanding_balance).toLocaleString()}` : '-'}
                              </td>
                              <td className="py-3 px-4 text-right text-sm">
                                {loan.status === 'disbursed' ? (
                                  loan.overdue_amount > 0 ? (
                                    <div className="flex flex-col items-end">
                                      <span className="font-black text-rose-600">Rs. {parseFloat(loan.overdue_amount).toLocaleString()}</span>
                                      <span className="text-[10px] font-bold text-rose-500 uppercase">{loan.overdue_days} Days Past Due</span>
                                      {loan.guarantor_phone && (
                                        <div className="mt-1 pt-1 border-t border-rose-100 flex flex-col items-end">
                                          <span className="text-[10px] font-semibold text-slate-500">Guarantor: {loan.guarantor_name}</span>
                                          <a href={`tel:${loan.guarantor_phone}`} className="text-xs font-bold text-blue-600 hover:underline">{loan.guarantor_phone}</a>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="font-bold text-emerald-600 flex items-center justify-end gap-1"><CheckCircle size={14}/> On Track</span>
                                  )
                                ) : (
                                  <span className="text-slate-400 font-medium">-</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Follow-up Notes Section */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <FileText size={20} className="text-primary-500" /> Follow-Up Notes
                </h3>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <form onSubmit={handleAddNote} className="flex gap-2 mb-4">
                    <input 
                      type="text" 
                      placeholder="Add a new note..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="flex-1 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    />
                    <button 
                      type="submit" 
                      disabled={addingNote || !newNote.trim()}
                      className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50 transition-colors"
                    >
                      {addingNote ? 'Saving...' : 'Add Note'}
                    </button>
                  </form>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {data.notes?.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-4">No notes for this customer yet.</p>
                    ) : (
                      data.notes?.map(note => (
                        <div key={note.note_id} className="bg-white border border-slate-100 rounded-lg p-3 shadow-sm">
                          <p className="text-sm text-slate-700 mb-2">{note.note}</p>
                          <div className="flex justify-between items-center text-xs text-slate-400 font-medium">
                            <span>{new Date(note.created_at).toLocaleString()}</span>
                            <span>{note.created_by || 'System'}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerAuditModal;
