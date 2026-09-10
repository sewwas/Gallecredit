import React, { useState } from 'react';
import { Download, X, Smartphone, Share2, PlusSquare, CheckCircle2 } from 'lucide-react';
import { usePWA } from '../context/PWAContext';

const PWAInstallPrompt = () => {
  const { isInstalled, canInstall, isIOS, isMobile, isDismissed, triggerInstall, dismissPrompt } = usePWA();
  const [showIOSModal, setShowIOSModal] = useState(false);

  // Do not show if already running inside installed standalone PWA or dismissed or cannot install
  if (isInstalled || isDismissed || (!canInstall && !isMobile)) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
    } else {
      const outcome = await triggerInstall();
      if (!outcome) {
        // Fallback for browsers that don't trigger prompt
        alert('To install Galle Credit PWA, open your browser menu (⋮) and tap "Install app" or "Add to Home Screen".');
      }
    }
  };

  return (
    <>
      {/* Floating Modern Mobile Install Banner */}
      <div className="fixed bottom-20 inset-x-3 sm:inset-x-6 z-50 animate-in slide-in-from-bottom-5 duration-300 pointer-events-auto">
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-700/80 flex items-center justify-between gap-3 max-w-lg mx-auto">
          <div className="flex items-center gap-3 min-w-0">
            <img 
              src="/logo.jpg" 
              alt="Galle Credit" 
              className="w-10 h-10 rounded-xl object-cover border border-slate-700 shadow-md flex-shrink-0" 
            />
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-extrabold text-white tracking-tight leading-snug flex items-center gap-1.5">
                Install Galle Credit App
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  PWA
                </span>
              </h4>
              <p className="text-[10px] sm:text-xs text-slate-300 font-medium leading-tight mt-0.5 truncate">
                {isIOS ? 'Add to your iPhone Home Screen' : 'Download app for fast offline field work'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>

            <button
              onClick={dismissPrompt}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Safari Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom-8 duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src="/logo.jpg" className="w-8 h-8 rounded-lg object-cover" />
                <span className="font-extrabold text-slate-900 text-sm">Install on iOS (iPhone/iPad)</span>
              </div>
              <button 
                onClick={() => setShowIOSModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Follow these simple steps in Safari to install Galle Credit as a standalone home screen app:
            </p>

            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center font-black flex-shrink-0 text-xs">
                  1
                </div>
                <p className="text-slate-700 mt-0.5">
                  Tap the <strong className="inline-flex items-center text-primary-600 mx-1"><Share2 className="w-3.5 h-3.5 inline mr-0.5" /> Share</strong> button at the bottom of Safari.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center font-black flex-shrink-0 text-xs">
                  2
                </div>
                <p className="text-slate-700 mt-0.5">
                  Scroll down and tap <strong className="inline-flex items-center text-slate-900 mx-1"><PlusSquare className="w-3.5 h-3.5 inline mr-0.5" /> Add to Home Screen</strong>.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-black flex-shrink-0 text-xs">
                  3
                </div>
                <p className="text-slate-700 mt-0.5">
                  Tap <strong>Add</strong> at top right. Galle Credit icon will appear on your phone home screen!
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setShowIOSModal(false);
                dismissPrompt();
              }}
              className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PWAInstallPrompt;
