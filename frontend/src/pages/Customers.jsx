import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [formData, setFormData] = useState({ name: '', nic: '', phone: '', address: '', kyc_status: 'pending' });
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewingDocs, setViewingDocs] = useState(false);
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (viewingDocs && selectedCustomerId) {
      fetchDocs();
    }
  }, [viewingDocs, selectedCustomerId]);

  const fetchDocs = async () => {
    try {
      const res = await axios.get(`\https://gallecredit-a9a2.vercel.app/api/customers/${selectedCustomerId}/documents`);
      setDocs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const type = prompt('Enter document type (e.g. NIC Front, NIC Back, Utility Bill):', 'NIC Front');
    if (!type) return;

    const formData = new FormData();
    formData.append('document', file);
    formData.append('document_type', type);

    setUploading(true);
    try {
      await axios.post(`\https://gallecredit-a9a2.vercel.app/api/customers/${selectedCustomerId}/documents`, formData);
      fetchDocs();
    } catch (err) {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         c.nic.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || c.kyc_status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const fetchCustomers = async () => {
    try {
      const res = await axios.get(`\https://gallecredit-a9a2.vercel.app/api/customers`);
      setCustomers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await axios.put(`\https://gallecredit-a9a2.vercel.app/api/customers/${selectedCustomerId}`, formData);
      } else {
        await axios.post(`\https://gallecredit-a9a2.vercel.app/api/customers`, formData);
      }
      closeModal();
      fetchCustomers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save customer');
    }
  };

  const handleEdit = (customer) => {
    setFormData({
      name: customer.name,
      nic: customer.nic,
      phone: customer.phone,
      address: customer.address,
      kyc_status: customer.kyc_status || 'pending'
    });
    setSelectedCustomerId(customer.customer_id);
    setEditMode(true);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditMode(false);
    setSelectedCustomerId(null);
    setFormData({ name: '', nic: '', phone: '', address: '', kyc_status: 'pending' });
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
        <button 
          onClick={() => setShowModal(true)}
          className="premium-btn"
        >
          <Plus className="w-5 h-5" /> Add Customer
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <input 
            type="text" 
            placeholder="Search by Name or NIC..." 
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
                  <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">NIC</th>
                  <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</th>
                  <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">KYC Status</th>
                  <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((c) => (
                  <tr key={c.customer_id} className="hover:bg-slate-50/50 transition-colors duration-200">
                    <td className="py-5 px-6 text-sm font-bold text-slate-800">{c.name}</td>
                    <td className="py-5 px-6 text-sm text-slate-600 font-medium">{c.nic}</td>
                    <td className="py-5 px-6 text-sm text-slate-600 font-medium">{c.phone}</td>
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
                    <td colSpan="5" className="py-12 text-center text-slate-400 font-medium">No customers found matching your criteria.</td>
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
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-full">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5">
              {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-xl font-medium">{error}</div>}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Name</label>
                <input required type="text" className="premium-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">NIC</label>
                <input required type="text" className="premium-input" value={formData.nic} onChange={e => setFormData({...formData, nic: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Phone</label>
                <input required type="text" className="premium-input" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">KYC Status</label>
                <select className="premium-input bg-white" value={formData.kyc_status} onChange={e => setFormData({...formData, kyc_status: e.target.value})}>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Address</label>
                <textarea required className="premium-input resize-none" rows="3" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}></textarea>
              </div>
              <div className="pt-2 flex gap-4">
                <button type="button" onClick={closeModal} className="flex-1 secondary-btn">Cancel</button>
                <button type="submit" className="flex-1 premium-btn">{editMode ? 'Update Changes' : 'Save Customer'}</button>
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
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Uploaded Files</h4>
                <label className="cursor-pointer premium-btn py-2 px-4 text-xs font-bold">
                  {uploading ? 'Uploading...' : 'Upload New'}
                  <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
                </label>
              </div>
              
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {docs.map(doc => (
                  <div key={doc.document_id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100/50 transition-colors">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{doc.document_type}</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{new Date(doc.uploaded_at).toLocaleDateString()}</p>
                    </div>
                    <a 
                      href={doc.file_path.startsWith('http') ? doc.file_path : `\https://gallecredit-a9a2.vercel.app/uploads/${doc.file_name}`} 
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
    </div>
  );
};

export default Customers;



