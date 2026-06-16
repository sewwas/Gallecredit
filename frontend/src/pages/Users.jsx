import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, UserPlus, Edit2, Shield, UserCheck, RefreshCw, X, Check, Power } from 'lucide-react';

const Users = () => {
  const { user } = useAuth();
  
  // Guard access (Only Admins can see User Management)
  const isAdmin = user?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h3 className="text-xl font-bold text-slate-800">Access Denied</h3>
        <p className="text-sm text-slate-500 max-w-sm mt-2">Only administrators have authorization to manage system accounts, roles, and employee access keys.</p>
      </div>
    );
  }

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    role: 'staff',
    password: ''
  });

  const [selectedUser, setSelectedUser] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users`, config);
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load user directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!formData.name || !formData.username || !formData.role || !formData.password) {
      setErrorMsg('All fields are required');
      return;
    }

    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users`, formData, config);
      setSuccessMsg(`User account '${formData.username}' created successfully.`);
      setShowAddModal(false);
      setFormData({ name: '', username: '', role: 'staff', password: '' });
      fetchUsers();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || 'Failed to create user account');
    }
  };

  const handleEditUser = (u) => {
    setSelectedUser(u);
    setFormData({
      name: u.name,
      username: u.username,
      role: u.role,
      password: '' // Optional password
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
      const payload = {
        name: formData.name,
        username: formData.username,
        role: formData.role,
        is_active: selectedUser.is_active
      };
      
      if (formData.password && formData.password.trim() !== '') {
        payload.password = formData.password;
      }

      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/${selectedUser.user_id}`, payload, config);
      setSuccessMsg(`Employee profile for '${formData.username}' updated successfully.`);
      setShowEditModal(false);
      setSelectedUser(null);
      setFormData({ name: '', username: '', role: 'staff', password: '' });
      fetchUsers();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || 'Failed to update user profile');
    }
  };

  const handleToggleStatus = async (targetUser) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
      const res = await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/${targetUser.user_id}`, config);
      setSuccessMsg(res.data.message);
      fetchUsers();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || 'Failed to toggle account status');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <span className="text-sm font-bold uppercase tracking-wider text-slate-500">Administrative Desk</span>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">User & Role Management</h2>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchUsers}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 hover:text-primary-600 hover:border-primary-200 hover:shadow-sm rounded-xl font-bold transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => {
              setFormData({ name: '', username: '', role: 'staff', password: '' });
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-accent-500 hover:from-primary-700 hover:to-accent-600 text-white shadow-md shadow-primary-500/20 rounded-xl font-bold transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Create New Account
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="flex items-center justify-between p-4 bg-red-550/10 border border-red-500/20 text-red-500 rounded-2xl animate-bounce-short">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-semibold">{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg('')} className="p-1 hover:bg-red-500/10 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center justify-between p-4 bg-green-550/10 border border-green-550/20 text-green-700 rounded-2xl">
          <div className="flex items-center gap-3">
            <UserCheck className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-semibold">{successMsg}</p>
          </div>
          <button onClick={() => setSuccessMsg('')} className="p-1 hover:bg-green-500/10 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* User Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {users.map((u) => {
          const isCurrentUser = u.user_id === user.id;
          return (
            <div 
              key={u.user_id} 
              className={`bg-white border border-slate-200 rounded-3xl p-6 relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
                !u.is_active ? 'opacity-65 border-dashed bg-slate-50/50' : ''
              }`}
            >
              {/* Profile Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3.5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg text-white shadow-lg ${
                    u.role === 'admin' ? 'bg-gradient-to-tr from-rose-500 to-orange-500 shadow-rose-500/20' :
                    u.role === 'accountant' ? 'bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-indigo-500/20' :
                    'bg-gradient-to-tr from-emerald-500 to-teal-500 shadow-emerald-500/20'
                  }`}>
                    {u?.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-1.5">
                      {u.name}
                      {isCurrentUser && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                          YOU
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400 font-bold uppercase mt-0.5">@{u.username}</p>
                  </div>
                </div>

                {/* Role Badge */}
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${
                  u.role === 'admin' ? 'bg-rose-50 border-rose-200 text-rose-700' :
                  u.role === 'accountant' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' :
                  'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}>
                  {u.role}
                </span>
              </div>

              {/* Status Section */}
              <div className="flex items-center justify-between border-t border-slate-100 mt-6 pt-4">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${u.is_active ? 'bg-green-500 animate-pulse' : 'bg-slate-405'}`} />
                  <span className="text-xs font-bold text-slate-600">
                    {u.is_active ? 'Account Active' : 'Deactivated / Suspended'}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditUser(u)}
                    className="p-2 hover:bg-slate-100 text-slate-650 hover:text-primary-600 rounded-xl border border-slate-100 transition-colors"
                    title="Edit User Profile"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggleStatus(u)}
                    disabled={isCurrentUser}
                    className={`p-2 rounded-xl border transition-colors ${
                      isCurrentUser ? 'opacity-40 cursor-not-allowed text-slate-300 border-slate-100' :
                      u.is_active ? 'hover:bg-red-50 text-red-500 border-red-100' : 'hover:bg-green-50 text-green-550 border-green-100'
                    }`}
                    title={u.is_active ? 'Deactivate Account' : 'Activate Account'}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary-500" />
                Register New Employee
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-650">Employee Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Johnathan Doe"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-primary-400 focus:bg-white rounded-xl text-sm font-semibold outline-none transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-650">System Username</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="e.g. jdoe"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-primary-400 focus:bg-white rounded-xl text-sm font-semibold outline-none transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-650">Access Role Permissions</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-primary-400 focus:bg-white rounded-xl text-sm font-semibold outline-none transition-all"
                  required
                >
                  <option value="staff">Staff (Collector / Field Officer)</option>
                  <option value="accountant">Accountant (Credit Manager / GL Payer)</option>
                  <option value="admin">Administrator (Full Access Controller)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-650">System Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Min. 6 characters"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-primary-400 focus:bg-white rounded-xl text-sm font-semibold outline-none transition-all"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-primary-600 to-accent-500 text-white font-bold hover:shadow-lg hover:shadow-primary-500/10 rounded-xl transition-all text-sm"
                >
                  Register Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-500" />
                Edit System Account
              </h3>
              <button onClick={() => setShowEditModal(false)} className="p-1.5 hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-650">Employee Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Employee Full Name"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-primary-400 focus:bg-white rounded-xl text-sm font-semibold outline-none transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-650">System Username</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="Username"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-primary-400 focus:bg-white rounded-xl text-sm font-semibold outline-none transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-650">Access Role Permissions</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-primary-400 focus:bg-white rounded-xl text-sm font-semibold outline-none transition-all"
                  required
                >
                  <option value="staff">Staff (Collector / Field Officer)</option>
                  <option value="accountant">Accountant (Credit Manager / GL Payer)</option>
                  <option value="admin">Administrator (Full Access Controller)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <label className="text-xs font-bold text-slate-650">Reset Password (Optional)</label>
                  <span className="text-[10px] font-bold text-slate-400">Leave blank to keep unchanged</span>
                </div>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="New password (min. 6 characters)"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-primary-400 focus:bg-white rounded-xl text-sm font-semibold outline-none transition-all"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-primary-600 to-accent-500 text-white font-bold hover:shadow-lg hover:shadow-primary-500/10 rounded-xl transition-all text-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Users;
