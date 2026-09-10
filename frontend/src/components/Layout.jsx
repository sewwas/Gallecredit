import React, { useState } from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Receipt, 
  PieChart, 
  LogOut, 
  BookOpen, 
  Wallet, 
  Calendar, 
  ShieldAlert,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Smartphone
} from 'lucide-react';

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === 'true');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Automatic Mobile Redirection: Auto-route mobile devices directly to Field Mobile Mode (/collector)
  const prefersDesktop = sessionStorage.getItem('prefers-desktop') === 'true';
  const isMobile = typeof window !== 'undefined' && (
    window.innerWidth <= 768 || 
    /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );

  if (isMobile && !prefersDesktop && !location.pathname.startsWith('/collector')) {
    return <Navigate to="/collector" replace />;
  }

  if (user.role === 'staff' && location.pathname === '/') {
    return <Navigate to="/payments" replace />;
  }

  const navItems = [];
  if (user.role === 'staff') {
    navItems.push({ name: 'Log Payments', path: '/payments', icon: Receipt });
    navItems.push({ name: 'Customers', path: '/customers', icon: Users });
    navItems.push({ name: 'My Cash Drawer', path: '/vaults', icon: Wallet });
  } else {
    navItems.push({ name: 'Dashboard', path: '/', icon: LayoutDashboard });
    navItems.push({ name: 'Customers', path: '/customers', icon: Users });
    navItems.push({ name: 'Loans', path: '/loans', icon: CreditCard });
    navItems.push({ name: 'Log Payments', path: '/payments', icon: Receipt });
    navItems.push({ name: 'Vaults', path: '/vaults', icon: Wallet });
  }

  if (user.role === 'admin' || user.role === 'accountant') {
    navItems.push({ name: 'Accounting', path: '/accounting', icon: BookOpen });
    navItems.push({ name: 'Reports', path: '/reports', icon: PieChart });
    navItems.push({ name: 'Asset Quality', path: '/portfolio-risk', icon: ShieldAlert });
  }

  if (user.role === 'admin') {
    navItems.push({ name: 'Holidays', path: '/holidays', icon: Calendar });
    navItems.push({ name: 'User Manager', path: '/users', icon: Users });
  }

  // Universal Field Mobile Mode for all roles (Staff, Admin, Accountant)
  navItems.push({ name: 'Field Mobile Mode', path: '/collector', icon: Smartphone });

  return (
    <div className="flex h-screen bg-slate-50/50 overflow-hidden relative">
      
      {/* Mobile Sidebar Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-25 lg:hidden transition-opacity duration-300 animate-in fade-in"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Collapsible & Mobile Drawer Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 lg:static bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col transition-all duration-300 z-30 shadow-2xl text-slate-300 print:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-72'} w-72`}
      >
        {/* Sidebar Header */}
        <div className="h-20 flex items-center px-6 border-b border-slate-700/50 justify-between">
          <div className="flex items-center overflow-hidden">
            <img src="/logo.jpg" className="w-11 h-11 rounded-xl shadow-lg border border-slate-700/40 mr-3 object-cover flex-shrink-0" />
            {!isCollapsed && (
              <div className="animate-in fade-in duration-300">
                <span className="text-lg font-black text-white tracking-tight leading-none block">Galle Credit</span>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Microfinance Core</p>
              </div>
            )}
          </div>
          
          {/* Collapse Icon on Desktop / Close Drawer on Mobile */}
          <div className="flex items-center">
            <button 
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            
            {!isCollapsed ? (
              <button 
                onClick={() => {
                  setIsCollapsed(true);
                  localStorage.setItem('sidebar-collapsed', 'true');
                }}
                className="hidden lg:flex p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Collapse Sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            ) : (
              <button 
                onClick={() => {
                  setIsCollapsed(false);
                  localStorage.setItem('sidebar-collapsed', 'false');
                }}
                className="hidden lg:flex p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors mx-auto"
                title="Expand Sidebar"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        
        {/* Nav Items Navigation */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 select-none">
          {!isCollapsed && (
            <p className="px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3 animate-in fade-in duration-300">
              Main Menu
            </p>
          )}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                  isActive 
                    ? 'bg-gradient-to-r from-primary-600/20 to-transparent text-primary-400 font-semibold border-l-4 border-primary-500' 
                    : 'text-slate-400 hover:bg-slate-800/70 hover:text-white'
                } ${isCollapsed ? 'lg:justify-center lg:px-2 lg:border-l-0' : ''}`}
                title={isCollapsed ? item.name : undefined}
              >
                <Icon className={`w-5 h-5 transition-colors duration-300 ${isActive ? 'text-primary-400' : 'text-slate-500 group-hover:text-primary-400'} flex-shrink-0`} />
                {!isCollapsed && (
                  <span className="truncate text-sm leading-snug animate-in fade-in duration-300">{item.name}</span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Sidebar Footer User profile */}
        <div className="p-4 border-t border-slate-700/50 bg-slate-900/50">
          <div className={`flex items-center gap-3 px-3 py-2 mb-3 ${isCollapsed ? 'lg:justify-center lg:px-0' : ''}`}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-500 to-accent-500 text-white flex items-center justify-center font-bold text-sm uppercase shadow-lg flex-shrink-0">
              {user?.name?.charAt(0) || '?'}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0 animate-in fade-in duration-300">
                <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                <p className="text-xs text-slate-500 font-medium capitalize">{user.role}</p>
              </div>
            )}
          </div>
          <button
            onClick={logout}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 ${
              isCollapsed ? 'lg:justify-center lg:px-2' : 'w-full'
            }`}
            title={isCollapsed ? "Log Out" : undefined}
          >
            <LogOut className="w-5 h-5 opacity-70 flex-shrink-0" />
            {!isCollapsed && <span className="text-sm font-semibold">Log Out</span>}
          </button>
        </div>
      </div>

      {/* Main Content Workspace Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-50/50">
        
        {/* Dynamic page content output */}
        <main className="flex-1 overflow-y-auto relative print:overflow-visible">
          
          {/* Top Header Navigation bar (Moved inside main to fix z-index with popups) */}
          <header className="h-20 bg-white/60 backdrop-blur-xl border-b border-slate-200/60 flex items-center justify-between px-6 lg:px-8 z-40 sticky top-0 print:hidden">
            <div className="flex items-center gap-4">
              {/* Hamburger button on mobile / tablet */}
              <button 
                onClick={() => setIsMobileOpen(true)}
                className="lg:hidden p-2 -ml-2 rounded-xl hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors"
                aria-label="Open Sidebar"
              >
                <Menu className="w-6 h-6" />
              </button>
              
              <h1 className="text-lg lg:text-xl font-extrabold text-slate-900 capitalize tracking-tight truncate max-w-[200px] sm:max-w-none">
                {location.pathname === '/' ? 'Dashboard' : (location.pathname.startsWith('/payments') ? 'Log Payments' : location.pathname.split('/')[1].replace('-', ' '))}
              </h1>
            </div>
            
            <div className="flex items-center gap-3">
              <Link
                to="/collector"
                onClick={() => sessionStorage.removeItem('prefers-desktop')}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-sm shadow-emerald-600/20 transition-all active:scale-95"
                title="Switch to Mobile Field Mode & Loan Calculator"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Field Mobile Mode</span>
              </Link>

              {/* Alerts notifications bell */}
              <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm text-slate-600 hover:text-primary-600 transition-colors cursor-pointer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H6" /></svg>
              </div>
            </div>
          </header>

          <div className="p-4 lg:p-8 print:p-0">
            {/* Removed animate-in transform which was trapping fixed modals */}
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
