import React, { useState, useContext } from 'react';
import { Shield, BookMarked, ChevronRight, Sparkles } from 'lucide-react';
import { AuthContext } from '../context/AuthContext.jsx';

/**
 * RolePickerModal
 * Shown to srujanhariwal464@gmail.com after Clerk authentication
 * so they can choose between Admin and Librarian before entering the app.
 */
const RolePickerModal = () => {
  // Use context directly (not the hook) so we can safely handle null during
  // provider initialization / HMR reloads without throwing.
  const ctx = useContext(AuthContext);
  const [selected, setSelected]   = useState(null);
  const [confirming, setConfirming] = useState(false);

  // Not mounted inside provider yet, or role pick not needed
  if (!ctx || !ctx.pendingRolePick || !ctx.pendingClerkData) return null;

  const { pendingClerkData, confirmRolePick } = ctx;

  const roles = [
    {
      key: 'admin',
      label: 'Administrator',
      tagline: 'Full system access',
      description: 'Manage users, view reports, configure the library system, and oversee all operations.',
      icon: Shield,
      gradient: 'from-amber-500/20 to-orange-500/10',
      border: 'border-amber-500/50',
      badge: 'bg-amber-500/20 text-amber-300',
      ring: 'ring-amber-500',
    },
    {
      key: 'librarian',
      label: 'Librarian',
      tagline: 'Library operations',
      description: 'Issue books, manage reservations, add new titles, and maintain the library catalog.',
      icon: BookMarked,
      gradient: 'from-emerald-500/20 to-teal-500/10',
      border: 'border-emerald-500/50',
      badge: 'bg-emerald-500/20 text-emerald-300',
      ring: 'ring-emerald-500',
    },
  ];

  const handleConfirm = async () => {
    if (!selected) return;
    setConfirming(true);
    await confirmRolePick(selected);
    setConfirming(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      {/* Ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-900/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-900/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/60 rounded-3xl shadow-2xl overflow-hidden">
        {/* Top gradient strip */}
        <div className="h-1.5 bg-gradient-to-r from-amber-500 via-primary-500 to-emerald-500" />

        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-600/20 border border-primary-500/30 mb-4">
              <Sparkles className="text-primary-400" size={26} />
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Welcome, {pendingClerkData.name}!
            </h2>
            <p className="text-slate-400 text-sm mt-1.5 leading-relaxed">
              Your account{' '}
              <span className="text-primary-400 font-semibold">{pendingClerkData.email}</span>
              {' '}has elevated access.
              <br />
              Choose the role you want for this account.
            </p>
          </div>

          {/* Role Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {roles.map((r) => {
              const Icon = r.icon;
              const isSelected = selected === r.key;
              return (
                <button
                  key={r.key}
                  onClick={() => setSelected(r.key)}
                  className={`
                    relative text-left p-5 rounded-2xl border-2 transition-all duration-200
                    bg-gradient-to-br ${r.gradient}
                    ${isSelected
                      ? `${r.border} ring-2 ${r.ring} ring-offset-2 ring-offset-slate-900 scale-[1.02]`
                      : 'border-slate-700/50 hover:border-slate-600 hover:scale-[1.01]'
                    }
                  `}
                >
                  {isSelected && (
                    <div className={`absolute top-3 right-3 w-5 h-5 rounded-full ${r.badge} flex items-center justify-center`}>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}

                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${r.badge} mb-3`}>
                    <Icon size={20} />
                  </div>

                  <div className="mb-1">
                    <span className="text-base font-bold text-white">{r.label}</span>
                    <span className={`ml-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${r.badge}`}>
                      {r.tagline}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">{r.description}</p>
                </button>
              );
            })}
          </div>

          {/* Confirm Button */}
          <button
            onClick={handleConfirm}
            disabled={!selected || confirming}
            className={`
              w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold
              transition-all duration-200 disabled:opacity-60
              ${selected
                ? 'bg-primary-600 hover:bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }
            `}
          >
            {confirming ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>
                  {selected
                    ? `Continue as ${roles.find((r) => r.key === selected)?.label}`
                    : 'Select a role to continue'}
                </span>
                {selected && <ChevronRight size={16} />}
              </>
            )}
          </button>

          <p className="text-center text-[11px] text-slate-600 mt-4">
            This choice is permanently saved to your account.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RolePickerModal;
