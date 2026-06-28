import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { apiPost } from '../utils/api.js';
import { BookOpen, Mail, Lock, LogIn, AlertCircle, Shield, BookMarked, GraduationCap, User, Info } from 'lucide-react';
import { SignIn } from '@clerk/clerk-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, isSignedIn, syncError, retrySync, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const isClerkEnabled = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  // If already signed in via Clerk, and no sync error, redirect to home page
  React.useEffect(() => {
    if (isClerkEnabled && isSignedIn && !syncError) {
      navigate('/', { replace: true });
    }
  }, [isSignedIn, syncError, isClerkEnabled, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      addToast('Please enter both email and password', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const data = await apiPost('/auth/login', { email, password });
      login(data.token, data.user);
      addToast(`Welcome back, ${data.user.name}!`, 'success');

      if (data.user.role === 'admin') navigate('/admin');
      else if (data.user.role === 'librarian') navigate('/librarian/books');
      else navigate('/');
    } catch (err) {
      addToast(err.message || 'Login failed. Please check credentials.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const fillCredentials = (roleEmail, rolePass) => {
    setEmail(roleEmail);
    setPassword(rolePass);
  };

  // Role hint cards for the Clerk login page
  const roleHints = [
    {
      icon: Shield,
      label: 'Admin / Librarian',
      email: 'srujanhariwal464@gmail.com',
      note: 'You\'ll pick your role after sign-in',
      color: 'amber',
      iconBg: 'bg-amber-500/20',
      iconColor: 'text-amber-400',
      borderColor: 'border-amber-500/20',
      bg: 'bg-amber-500/5',
    },
    {
      icon: GraduationCap,
      label: 'Teacher',
      email: 'srujanhariwal18@gmail.com',
      note: 'Automatically assigned Teacher role',
      color: 'purple',
      iconBg: 'bg-purple-500/20',
      iconColor: 'text-purple-400',
      borderColor: 'border-purple-500/20',
      bg: 'bg-purple-500/5',
    },
    {
      icon: User,
      label: 'Student',
      email: 'Any other Gmail',
      note: 'Open registration for all students',
      color: 'primary',
      iconBg: 'bg-primary-500/20',
      iconColor: 'text-primary-400',
      borderColor: 'border-primary-500/20',
      bg: 'bg-primary-500/5',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-900/20 rounded-full blur-3xl -translate-y-1/2" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-900/10 rounded-full blur-3xl translate-y-1/2" />

      <div className="sm:mx-auto sm:w-full sm:max-w-xl relative z-10">
        <div className="flex justify-center">
          <div className="bg-primary-600 p-3 rounded-2xl text-white shadow-xl shadow-primary-500/20">
            <BookOpen size={32} />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
          Smart Library Sign In
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          {isClerkEnabled ? (
            'Use your Google account or email to access the system'
          ) : (
            <>
              Or{' '}
              <Link to="/register" className="font-semibold text-primary-400 hover:text-primary-300 transition-colors">
                register a new account
              </Link>
            </>
          )}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl relative z-10 space-y-6">
        {isClerkEnabled ? (
          syncError ? (
            <div className="bg-slate-800/80 border border-red-500/30 rounded-2xl p-6 shadow-2xl space-y-4 max-w-md mx-auto">
              <div className="flex items-center gap-3 border-b border-red-500/20 pb-3">
                <div className="bg-red-500/20 p-2 rounded-xl text-red-400">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Database Sync Failed</h3>
                  <p className="text-[10px] text-red-400 font-semibold uppercase">Authentication Error</p>
                </div>
              </div>
              
              <p className="text-xs text-slate-300 leading-relaxed">
                We successfully authenticated your Clerk account, but failed to synchronize your details with our college database.
              </p>
              <div className="bg-red-950/40 border border-red-900/30 rounded-lg p-3 text-[11px] font-mono text-red-300 break-words">
                {syncError}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={retrySync}
                  className="flex-1 py-2.5 rounded-lg text-xs font-bold text-white bg-primary-600 hover:bg-primary-500 transition shadow-lg shadow-primary-500/20"
                >
                  Retry Connection
                </button>
                <button
                  onClick={logout}
                  className="flex-1 py-2.5 rounded-lg text-xs font-bold text-slate-300 bg-slate-900/60 hover:bg-slate-900 border border-slate-700/60 transition"
                >
                  Sign Out & Reset
                </button>
              </div>
            </div>
          ) : isSignedIn ? (
            <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl p-8 text-center max-w-sm mx-auto shadow-2xl">
              <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h3 className="text-sm font-bold text-white mb-1">Finalizing Authentication...</h3>
              <p className="text-[11px] text-slate-400">Connecting your Google account to your library workspace.</p>
            </div>
          ) : (
            <>
              {/* Role Access Guide */}
              <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Info size={14} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Account Access Guide
                  </span>
                </div>
                <div className="space-y-2.5">
                  {roleHints.map((hint) => {
                    const Icon = hint.icon;
                    return (
                      <div
                        key={hint.label}
                        className={`flex items-center gap-3 p-3 rounded-xl ${hint.bg} border ${hint.borderColor}`}
                      >
                        <div className={`shrink-0 w-8 h-8 rounded-lg ${hint.iconBg} flex items-center justify-center`}>
                          <Icon size={15} className={hint.iconColor} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-white">{hint.label}</span>
                            <span className="text-[10px] font-mono text-slate-400 truncate">{hint.email}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">{hint.note}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Clerk Sign In Component */}
              <div className="flex justify-center">
                <SignIn
                  signUpUrl="/register"
                  fallbackRedirectUrl="/"
                  appearance={{
                    variables: {
                      colorPrimary: '#6366f1',
                      colorBackground: '#1e293b',
                      colorText: '#f8fafc',
                      colorInputBackground: '#0f172a',
                      colorInputText: '#ffffff',
                      colorTextSecondary: '#94a3b8',
                    },
                    elements: {
                      card: 'bg-slate-800 border border-slate-700/50 shadow-2xl rounded-2xl',
                      headerTitle: 'text-white font-extrabold',
                      headerSubtitle: 'text-slate-400',
                      socialButtonsBlockButton: 'bg-slate-900 border-slate-700 hover:bg-slate-800 text-white',
                      socialButtonsBlockButtonText: 'text-slate-200',
                      dividerText: 'text-slate-500',
                      formFieldLabel: 'text-slate-300 font-semibold',
                      formFieldInput: 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500',
                      footerActionLink: 'text-indigo-400 hover:text-indigo-300 font-bold',
                    },
                  }}
                />
              </div>
            </>
          )
        ) : (
          <div className="bg-slate-800/80 backdrop-blur-md py-8 px-4 shadow-2xl rounded-2xl border border-slate-700/50 sm:px-10">
            {/* Dev mode banner */}
            <div className="mb-6 p-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl flex gap-2.5 items-start text-xs leading-relaxed">
              <AlertCircle size={18} className="shrink-0 text-amber-400 mt-0.5" />
              <div>
                <strong>Developer Mode:</strong> Add <code>VITE_CLERK_PUBLISHABLE_KEY</code> and <code>VITE_SUPABASE_URL</code> to <code>client/.env</code> to enable Clerk auth. Currently using local mock database.
              </div>
            </div>

            <form className="space-y-6" onSubmit={handleLogin}>
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-300">
                  Email Address
                </label>
                <div className="mt-1 relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-900/50 border border-slate-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition text-white text-sm"
                    placeholder="name@college.edu"
                  />
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-300">
                  Password
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-900/50 border border-slate-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition text-white text-sm"
                    placeholder="••••••••"
                  />
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-lg text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition shadow-lg shadow-primary-500/20"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <LogIn size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Test Accounts */}
            <div className="mt-8 pt-6 border-t border-slate-700/50">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Developer Demo Accounts
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: 'Student', email: 'student@library.com', pass: 'studentpassword', color: 'text-primary-400' },
                  { label: 'Teacher', email: 'teacher@library.com', pass: 'teacherpassword', color: 'text-purple-400' },
                  { label: 'Librarian', email: 'librarian@library.com', pass: 'librarianpassword', color: 'text-emerald-400' },
                  { label: 'Admin', email: 'admin@library.com', pass: 'adminpassword', color: 'text-amber-400' },
                ].map((a) => (
                  <button
                    key={a.label}
                    type="button"
                    onClick={() => fillCredentials(a.email, a.pass)}
                    className={`px-2 py-2.5 text-[11px] font-bold rounded-lg border border-slate-700 bg-slate-900/40 hover:bg-slate-900/90 ${a.color} text-center transition-all`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
