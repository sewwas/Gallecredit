import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  ClipboardList, 
  Calculator, 
  Wallet, 
  Monitor, 
  Wifi, 
  WifiOff, 
  LogOut, 
  Zap,
  RotateCcw,
  Download
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePWA } from '../context/PWAContext';
import { getOfflineQueue, getOfflineDrawerTally, syncOfflinePayments } from '../utils/offlineQueue';

const CollectorLayout = () => {
  const { user, logout } = useAuth();
  const { isInstalled, triggerInstall } = usePWA();
  const location = useLocation();
  const navigate = useNavigate();

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineCount, setOfflineCount] = useState(getOfflineQueue().length);
  const [offlineCash, setOfflineCash] = useState(getOfflineDrawerTally());

  // Listen for online/offline events & queue updates
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      syncOfflinePayments(API_URL, localStorage.getItem('token')).then(() => {
        setOfflineCount(getOfflineQueue().length);
        setOfflineCash(getOfflineDrawerTally());
      });
    };

    const handleOffline = () => setIsOnline(false);

    const handleQueueUpdate = () => {
      setOfflineCount(getOfflineQueue().length);
      setOfflineCash(getOfflineDrawerTally());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('gallecredit_offline_updated', handleQueueUpdate);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('gallecredit_offline_updated', handleQueueUpdate);
    };
  }, []);

  if (!user) {
    navigate('/login');
    return null;
  }

  const navItems = [
    { name: 'Route Sheet', path: '/collector', icon: ClipboardList },
    { name: 'Calculator', path: '/collector/calculator', icon: Calculator },
    { name: 'Cash Drawer', path: '/collector/drawer', icon: Wallet }
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col antialiased text-slate-900 select-none pb-28">
      
      {/* Top Mobile App Header with Safe Area Notch Support */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-slate-800 shadow-md" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))' }}>
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          
          {/* Logo & User Info */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <img 
              src="/logo.jpg" 
              alt="Logo" 
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover border border-slate-700 shadow-xs flex-shrink-0" 
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-white text-xs sm:text-sm tracking-tight leading-none truncate">
                  Galle Credit
                </span>
                <span className={`px-1.5 py-0.2 rounded-md text-[8px] sm:text-[9px] font-black uppercase tracking-wider flex-shrink-0 ${
                  user.role === 'admin' 
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                    : user.role === 'accountant'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {user.role}
                </span>
              </div>
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium leading-tight mt-0.5 truncate max-w-[80px] xs:max-w-[120px]">
                {user.name}
              </p>
            </div>
          </div>

          {/* Right Header Badges & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            
            {/* Online / Offline Live Indicator */}
            <div 
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-[9px] sm:text-[10px] font-bold transition-all ${
                isOnline 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
              }`}
              title={isOnline ? 'Online' : 'Offline'}
            >
              {isOnline ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="hidden xs:inline">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-amber-400" />
                  <span>Offline ({offlineCount})</span>
                </>
              )}
            </div>

            {/* Install / Download PWA Button */}
            {!isInstalled && (
              <button
                type="button"
                onClick={triggerInstall}
                className="p-1.5 px-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white transition-all flex items-center gap-1 text-xs font-bold shadow-xs active:scale-95 border border-emerald-500/30"
                title="Download / Install PWA App"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="text-[10px] hidden xs:inline">Install</span>
              </button>
            )}

            {/* Switch to Desktop Button */}
            <button
              type="button"
              onClick={() => {
                sessionStorage.setItem('prefers-desktop', 'true');
                navigate('/');
              }}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors flex items-center gap-1 text-xs font-semibold active:scale-95"
              title="Switch to Full Desktop View"
            >
              <Monitor className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden md:inline text-[11px]">Desktop</span>
            </button>

            {/* Logout */}
            <button
              type="button"
              onClick={logout}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors active:scale-95"
              title="Log Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>

          </div>
        </div>

        {/* Offline Alert Strip if items queued */}
        {offlineCount > 0 && (
          <div className="mt-2 py-1 px-3 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center justify-between text-[10px] sm:text-[11px] text-amber-300">
            <span className="font-medium truncate">
              ⚡ {offlineCount} offline payment(s) saved
            </span>
            <span className="font-bold font-mono ml-2">
              +Rs. {offlineCash.toLocaleString()}
            </span>
          </div>
        )}
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 p-3 sm:p-4 max-w-2xl mx-auto w-full">
        <Outlet />
      </main>

      {/* Sticky Bottom Mobile Navigation Bar with iPhone Home Bar Padding */}
      <nav 
        className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-lg border-t border-slate-200 z-40 px-2 sm:px-4 shadow-lg"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))', paddingTop: '0.375rem' }}
      >
        <div className="max-w-md mx-auto flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
              (item.path === '/collector' && (location.pathname === '/collector' || location.pathname === '/collector/route'));

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex flex-col items-center py-1 px-2.5 sm:px-3 rounded-xl transition-all duration-200 active:scale-95 ${
                  isActive 
                    ? 'text-primary-600 font-extrabold scale-105' 
                    : 'text-slate-500 hover:text-slate-900 font-medium'
                }`}
              >
                <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-primary-600 stroke-[2.5]' : 'stroke-[1.8]'}`} />
                <span className="text-[10px] sm:text-[11px] tracking-tight">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

    </div>
  );
};

export default CollectorLayout;
