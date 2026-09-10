import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, CheckCircle, Clock, AlertCircle, User, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CustomerAuditModal from '../components/CustomerAuditModal';

const PREDEFINED_LOCATIONS = [
  { name: 'Galle', code: 'GL' },
  { name: 'Karapitiya', code: 'KP' },
  { name: 'Hikkaduwa', code: 'HK' },
  { name: 'Unawatuna', code: 'UN' }
];

const Customers = () => {
  const { user } = useAuth();
  const isStaff = user?.role === 'staff';

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    nic: '', 
    phone: '', 
    address: '', 
    kyc_status: 'pending',
    location: 'Galle',
    location_code: 'GL',
    application_id: ''
  });
  const [error, setError] = useState('');
  const [fetchError, setFetchError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewingDocs, setViewingDocs] = useState(false);
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCustomLoc, setIsCustomLoc] = useState(false);
  const [auditCustomerId, setAuditCustomerId] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    if (viewingDocs && selectedCustomerId) {
      fetchDocs();
    }
  }, [viewingDocs, selectedCustomerId]);

  const fetchDocs = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/customers/${selectedCustomerId}/documents`,
        { headers: getAuthHeaders() }
      );
      setDocs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  };

  const handleUpload = async (e, predefinedType = null) => {
    const file = e.target.files[0];
    if (!file) return;

    const type = predefinedType || prompt('Enter document type (e.g. NIC Front, NIC Back, Utility Bill):', 'NIC Front');
    if (!type) return;

    const formDataObj = new FormData();
    formDataObj.append('document', file);
    formDataObj.append('document_type', type);

    setUploading(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/customers/${selectedCustomerId}/documents`,
        formDataObj,
        { headers: getAuthHeaders() }
      );
      fetchDocs();
    } catch (err) {
      alert('Upload failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
    }
  };

  const filteredCustomers = customers.filter(c => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch = !q ||
      (c.name || '').toLowerCase().includes(q) || 
      (c.nic || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q) ||
      (c.application_id || '').toLowerCase().includes(q);
    const matchesStatus = filterStatus === 'all' || c.kyc_status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const fetchCustomers = async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/customers`,
        { headers: getAuthHeaders() }
      );
      setCustomers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
      const msg = err.response?.data?.error || err.message || 'Failed to load customers';
      setFetchError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleLocationDropdownChange = (val) => {
    if (val === 'custom') {
      setIsCustomLoc(true);
      setFormData(prev => ({ ...prev, location: '', location_code: '' }));
    } else {
      setIsCustomLoc(false);
      const matched = PREDEFINED_LOCATIONS.find(l => l.name === val);
      if (matched) {
        setFormData(prev => ({ ...prev, location: matched.name, location_code: matched.code }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!/^([0-9]{9}[vVxX]|[0-9]{12})$/.test(formData.nic)) {
      setError('Invalid Sri Lankan NIC format. Must be 9 digits + V/X or 12 digits.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const config = { headers: getAuthHeaders() };
      if (editMode) {
        await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/customers/${selectedCustomerId}`, formData, config);
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/customers`, formData, config);
      }
      closeModal();
      fetchCustomers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (customer) => {
    const isPredefined = PREDEFINED_LOCATIONS.some(l => l.name === customer.location);
    setIsCustomLoc(!isPredefined && customer.location !== 'Galle');
    setFormData({
      name: customer.name,
      nic: customer.nic,
      phone: customer.phone,
      address: customer.address,
      kyc_status: customer.kyc_status || 'pending',
      location: customer.location || 'Galle',
      location_code: customer.location_code || 'GL',
      application_id: customer.application_id || ''
    });
    setSelectedCustomerId(customer.customer_id);
    setEditMode(true);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditMode(false);
    setSelectedCustomerId(null);
    setFormData({ 
      name: '', 
      nic: '', 
      phone: '', 
      address: '', 
      kyc_status: 'pending',
      location: 'Galle',
      location_code: 'GL',
      application_id: ''
    });
    setIsCustomLoc(false);
    setError('');
  };

  const getKYCBadge = (status) => {
    switch (status) {
      case 'verified':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700"><CheckCircle className="w-3 h-3" /> Verified</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700"><AlertCircle className="w-3 h-3" /> Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700"><Clock className="w-3 h-3" /> Pending</span>;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Customers</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Manage your customer database and KYC status</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchCustomers}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 font-semibold text-sm transition-all shadow-xs"
            title="Refresh customer list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary-500' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="premium-btn"
          >
            <Plus className="w-5 h-5" /> Add Customer
          </button>
        </div>
      </div>

      {fetchError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-bold">Failed to load customers</p>
              <p className="text-xs text-red-600 mt-0.5">{fetchError}</p>
            </div>
          </div>
          <button 
            onClick={fetchCustomers}
            className="text-xs bg-red-600 text-white font-bold px-3.5 py-1.5 rounded-xl hover:bg-red-700 transition-colors shadow-xs"
          >
            Try Again
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <input 
            type="text" 
            placeholder="Search by Name, NIC, Phone, or App ID..." 
            className="premium-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="w-full md:w-48">
          <select 
            className="premium-input bg-white"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">App ID</th>
                  <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">NIC</th>
                  <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</th>
                  <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Location</th>
                  <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">KYC Status</th>
                  <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((c) => (
                  <tr key={c.customer_id} className="hover:bg-slate-50/50 transition-colors duration-200">
                    <td className="py-5 px-6 text-sm font-bold text-primary-700">{c.application_id || '-'}</td>
                    <td className="py-5 px-6 text-sm font-bold text-slate-800">{c.name}</td>
                    <td className="py-5 px-6 text-sm text-slate-600 font-medium">{c.nic}</td>
                    <td className="py-5 px-6 text-sm text-slate-600 font-medium">{c.phone}</td>
                    <td className="py-5 px-6 text-sm text-slate-600 font-semibold">{c.location || 'Galle'} ({c.location_code || 'GL'})</td>
                    <td className="py-5 px-6 text-sm">{getKYCBadge(c.kyc_status)}</td>
                    <td className="py-5 px-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => {
                            setSelectedCustomerId(c.customer_id);
                            setViewingDocs(true);
                          }}
                          className="flex items-center gap-1 text-slate-600 hover:text-primary-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-primary-200 bg-white hover:bg-primary-50 transition-all font-medium text-xs"
                          title="Documents"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          Docs
                        </button>
                        <button 
                          onClick={() => setAuditCustomerId(c.customer_id)}
                          className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-200 hover:border-emerald-300 bg-emerald-50 hover:bg-emerald-100 transition-all font-medium text-xs"
                          title="Full Audit Profile"
                        >
                          <User className="w-3 h-3" /> Profile
                        </button>
                        <button 
                          onClick={() => handleEdit(c)}
                          className="flex items-center gap-1 text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition-all font-medium text-xs"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400 font-medium">
                      {customers.length === 0 
                        ? (fetchError ? "Could not retrieve customers. Please check connection and try again." : "No customers registered yet. Click '+ Add Customer' to register your first customer.")
                        : `No customers found matching "${searchTerm || filterStatus}".`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-300 p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{editMode ? 'Edit Customer' : 'Add New Customer'}</h3>
                <p className="text-sm text-slate-500 font-medium mt-1">Fill in the customer details below.</p>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-full" disabled={isSubmitting}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5">
              {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-xl font-medium">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Application ID (Optional)</label>
                  <input disabled={isSubmitting} type="text" className="premium-input" placeholder="e.g. APP-001" value={formData.application_id} onChange={e => setFormData({...formData, application_id: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Name</label>
                  <input required disabled={isSubmitting} type="text" className="premium-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">NIC</label>
                <input required disabled={isSubmitting} type="text" className="premium-input" value={formData.nic} onChange={e => setFormData({...formData, nic: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Phone</label>
                <input required disabled={isSubmitting} type="text" className="premium-input" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">KYC Status</label>
                <select 
                  disabled={isStaff || isSubmitting} 
                  className={`premium-input bg-white ${(isStaff || isSubmitting) ? 'opacity-75 cursor-not-allowed bg-slate-50' : ''}`}
                  value={formData.kyc_status} 
                  onChange={e => setFormData({...formData, kyc_status: e.target.value})}
                >
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Location</label>
                <select 
                  required
                  disabled={isSubmitting}
                  className="premium-input bg-white"
                  value={isCustomLoc ? 'custom' : formData.location}
                  onChange={e => handleLocationDropdownChange(e.target.value)}
                >
                  {PREDEFINED_LOCATIONS.map(l => (
                    <option key={l.name} value={l.name}>{l.name} ({l.code})</option>
                  ))}
                  <option value="custom">Other (Custom)</option>
                </select>
              </div>

              {isCustomLoc && (
                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-5 duration-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Custom Location</label>
                    <input 
                      required 
                      disabled={isSubmitting}
                      type="text" 
                      placeholder="e.g. Matara"
                      className="premium-input py-2 text-sm" 
                      value={formData.location} 
                      onChange={e => setFormData({...formData, location: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Custom Code (2-3 Chars)</label>
                    <input 
                      required 
                      disabled={isSubmitting}
                      type="text" 
                      placeholder="e.g. MT"
                      maxLength={5}
                      className="premium-input py-2 text-sm uppercase" 
                      value={formData.location_code} 
                      onChange={e => setFormData({...formData, location_code: e.target.value.toUpperCase()})} 
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Address</label>
                <textarea required disabled={isSubmitting} className="premium-input resize-none" rows="3" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}></textarea>
              </div>
              <div className="pt-2 flex gap-4">
                <button type="button" onClick={closeModal} className="flex-1 secondary-btn" disabled={isSubmitting}>Cancel</button>
                <button type="submit" className="flex-1 premium-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : editMode ? 'Update Changes' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Documents Modal */}
      {viewingDocs && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-300 p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Customer Documents</h3>
                <p className="text-sm text-slate-500 font-medium mt-1">Manage uploaded documents for this customer.</p>
              </div>
              <button onClick={() => setViewingDocs(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-full">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider shrink-0">Uploaded Files</h4>
                <div className="flex gap-2 flex-wrap justify-end">
                  {['NIC Front', 'Copy B/R', 'Address Proof', 'Utility Bill'].map(type => {
                    const isUploaded = docs.some(d => d.document_type === type);
                    return (
                      <label key={type} className={`cursor-pointer premium-btn py-1.5 px-3 text-[10px] font-bold shadow-sm border-0 ${isUploaded ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-800 text-white hover:bg-slate-700'}`}>
                        {isUploaded ? <><CheckCircle className="w-3 h-3 inline mr-1" /> {type} Done</> : `+ ${type}`}
                        <input type="file" className="hidden" onChange={(e) => handleUpload(e, type)} disabled={uploading} />
                      </label>
                    );
                  })}
                  <label className="cursor-pointer premium-btn py-1.5 px-3 text-[10px] font-bold shadow-sm">
                    + Custom
                    <input type="file" className="hidden" onChange={(e) => handleUpload(e, null)} disabled={uploading} />
                  </label>
                </div>
              </div>
              
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {docs.map(doc => (
                  <div key={doc.document_id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100/50 transition-colors">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{doc.document_type}</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{new Date(doc.uploaded_at).toLocaleDateString()}</p>
                    </div>
                    <a 
                      href={doc.file_path.startsWith('http') ? doc.file_path : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/uploads/${doc.file_name}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700 text-sm font-bold hover:underline"
                    >
                      View File
                    </a>
                  </div>
                ))}
                {docs.length === 0 && (
                  <div className="text-center py-12 text-slate-400 font-medium italic text-sm">
                    No documents uploaded yet.
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button 
                  onClick={() => setViewingDocs(false)} 
                  className="w-full secondary-btn"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Audit Profile Modal */}
      <CustomerAuditModal 
        isOpen={!!auditCustomerId} 
        customerId={auditCustomerId} 
        onClose={() => setAuditCustomerId(null)} 
      />

    </div>
  );
};

export default Customers;
