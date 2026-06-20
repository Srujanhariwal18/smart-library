import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { apiPut } from '../utils/api.js';
import { 
  User, Mail, Shield, Award, 
  Calendar, Edit3, Settings2, Save, Sparkles, Lock
} from 'lucide-react';

// -------------------------------------------------------
// ClerkSecuritySection: Only rendered when isClerk = true
// We lazy-import useClerk inside this sub-component so
// it never executes in mock (non-Clerk) mode.
// -------------------------------------------------------
const ClerkSecuritySection = React.lazy(async () => {
  const { useClerk } = await import('@clerk/clerk-react');
  
  const Component = () => {
    const clerk = useClerk();

    const handleOpenClerkProfile = () => {
      if (clerk) clerk.openUserProfile();
    };

    return (
      <div className="bg-slate-900 border border-indigo-900/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 bottom-0 w-32 h-32 bg-primary-500/10 rounded-full blur-2xl pointer-events-none"></div>
        
        <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
          <Sparkles size={18} className="text-primary-400" />
          Account Security Settings
        </h3>
        
        <p className="text-xs text-slate-400 leading-relaxed mb-4">
          Your credentials and authentication checks are fully secured through Clerk. 
          Update your password, link Gmail accounts, set up 2FA, or check session history.
        </p>

        <button
          onClick={handleOpenClerkProfile}
          className="px-5 py-2.5 rounded-lg text-xs font-bold text-primary-200 bg-primary-950/50 hover:bg-primary-900/40 border border-primary-800/40 transition flex items-center gap-2"
        >
          <Settings2 size={14} />
          Manage Clerk Security Dashboard
        </button>
      </div>
    );
  };

  return { default: Component };
});

// -------------------------------------------------------
// Profile Page
// -------------------------------------------------------
const Profile = () => {
  const { user, isClerk, login } = useAuth();
  const { addToast } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [role, setRole] = useState(user?.role || 'student');
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('Name cannot be empty', 'error');
      return;
    }

    setSaving(true);
    try {
      const data = await apiPut('/auth/profile', { name: name.trim(), role });

      if (!isClerk) {
        login(localStorage.getItem('lib_token'), data.user);
      } else {
        window.location.reload();
      }

      addToast('Profile updated successfully!', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const canChangeRole = ['student', 'teacher'].includes(user.role);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
          <Settings2 className="text-primary-500" />
          My Profile Dashboard
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Manage your personal details, role, and account security.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Identity Card */}
        <div className="md:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden h-fit flex flex-col items-center text-center">
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-primary-500 via-indigo-500 to-purple-500"></div>

          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary-100 to-indigo-100 dark:from-primary-950/30 dark:to-indigo-950/30 text-primary-600 dark:text-primary-400 font-extrabold text-4xl flex items-center justify-center border-4 border-slate-100 dark:border-slate-800 shadow-md mt-4">
            {user.name.charAt(0).toUpperCase()}
          </div>

          <h2 className="text-lg font-bold text-slate-800 dark:text-white mt-4 leading-tight">{user.name}</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">{user.email}</p>

          <span className={`inline-block mt-3 text-[10px] font-extrabold uppercase px-3 py-1 rounded-full ${
            user.role === 'admin'
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/30'
              : user.role === 'librarian'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/30'
              : user.role === 'teacher'
              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200/30'
              : 'bg-primary-100 text-primary-800 dark:bg-primary-950/40 dark:text-primary-400 border border-primary-200/30'
          }`}>
            {user.role}
          </span>

          <div className="w-full border-t border-slate-100 dark:border-slate-800/80 mt-6 pt-4 text-xs space-y-3 text-left">
            <div className="flex justify-between items-center text-slate-500">
              <span className="flex items-center gap-1.5"><Calendar size={13} /> Registered</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {new Date(user.created_at || Date.now()).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-500">
              <span className="flex items-center gap-1.5"><Shield size={13} /> Status</span>
              <span className="font-bold text-emerald-500 uppercase tracking-wide">
                {user.status || 'Active'}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-500">
              <span className="flex items-center gap-1.5"><Lock size={13} /> Auth</span>
              <span className="font-bold text-primary-500 uppercase tracking-wide">
                {isClerk ? 'Clerk SSO' : 'Local'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Edit + Security */}
        <div className="md:col-span-2 space-y-6">
          {/* Edit Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <Edit3 size={18} className="text-primary-500" />
              General Details
            </h3>

            <form onSubmit={handleUpdateProfile} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 pl-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-primary-500 focus:bg-white dark:focus:bg-slate-700 transition"
                    placeholder="John Doe"
                  />
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full p-2.5 pl-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 text-slate-400 outline-none cursor-not-allowed"
                  />
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {canChangeRole ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">System Role</label>
                  <div className="relative">
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full p-2.5 pl-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-primary-500 transition"
                    >
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                    </select>
                    <Award size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">System Role (Staff — restricted)</label>
                  <div className="relative">
                    <input
                      type="text"
                      disabled
                      value={user.role.toUpperCase()}
                      className="w-full p-2.5 pl-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 text-slate-400 outline-none cursor-not-allowed font-semibold"
                    />
                    <Award size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 transition shadow-lg shadow-primary-500/10"
                >
                  <Save size={16} />
                  {saving ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Clerk Security Section — only render when Clerk is active */}
          {isClerk && (
            <React.Suspense fallback={<div className="rounded-2xl bg-slate-900 p-6 text-slate-500 text-sm animate-pulse">Loading security settings...</div>}>
              <ClerkSecuritySection />
            </React.Suspense>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
