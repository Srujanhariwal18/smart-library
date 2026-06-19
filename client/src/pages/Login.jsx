import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { apiPost } from '../utils/api.js';
import { BookOpen, Mail, Lock, LogIn, AlertCircle } from 'lucide-react';
import { SignIn } from '@clerk/clerk-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const isClerkEnabled = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

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
      
      if (data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
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

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-900/20 rounded-full blur-3xl -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-900/10 rounded-full blur-3xl translate-y-1/2"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="bg-primary-600 p-3 rounded-2xl text-white shadow-xl shadow-primary-500/20">
            <BookOpen size={32} />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
          Sign in to your account
        </h2>
        {!isClerkEnabled && (
          <p className="mt-2 text-center text-sm text-slate-400">
            Or{' '}
            <Link to="/register" className="font-semibold text-primary-400 hover:text-primary-300 transition-colors">
              register a new student account
            </Link>
          </p>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {isClerkEnabled ? (
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
                  colorTextSecondary: '#94a3b8'
                },
                elements: {
                  card: 'bg-slate-800 border border-slate-700/50 shadow-2xl rounded-2xl',
                  headerTitle: 'text-white font-extrabold',
                  headerSubtitle: 'text-slate-400',
                  socialButtonsBlockButton: 'bg-slate-900 border-slate-700 hover:bg-slate-850 text-white',
                  socialButtonsBlockButtonText: 'text-slate-200',
                  dividerText: 'text-slate-500',
                  formFieldLabel: 'text-slate-300 font-semibold',
                  formFieldInput: 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500',
                  footerActionLink: 'text-indigo-400 hover:text-indigo-300 font-bold'
                }
              }}
            />
          </div>
        ) : (
          <div className="bg-slate-800/80 backdrop-blur-md py-8 px-4 shadow-2xl rounded-2xl border border-slate-700/50 sm:px-10">
            {/* Supabase / Clerk configuration notice */}
            <div className="mb-6 p-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl flex gap-2.5 items-start text-xs leading-relaxed">
              <AlertCircle size={18} className="shrink-0 text-amber-400 mt-0.5" />
              <div>
                <strong>Developer Mode:</strong> To connect Clerk authentication, add <code>VITE_CLERK_PUBLISHABLE_KEY</code> and <code>VITE_SUPABASE_URL</code> to <code>client/.env</code>. Currently running in local mock database mode.
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

              <div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-lg text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition shadow-lg shadow-primary-500/20"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <LogIn size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Test Accounts Assistant */}
            <div className="mt-8 pt-6 border-t border-slate-700/50">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Developer Demo Accounts
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => fillCredentials('student@library.com', 'studentpassword')}
                  className="px-2 py-2.5 text-[11px] font-bold rounded-lg border border-slate-700 bg-slate-900/40 hover:bg-slate-900/90 text-primary-400 text-center transition-all"
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials('librarian@library.com', 'librarianpassword')}
                  className="px-2 py-2.5 text-[11px] font-bold rounded-lg border border-slate-700 bg-slate-900/40 hover:bg-slate-900/90 text-emerald-400 text-center transition-all"
                >
                  Librarian
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials('admin@library.com', 'adminpassword')}
                  className="px-2 py-2.5 text-[11px] font-bold rounded-lg border border-slate-700 bg-slate-900/40 hover:bg-slate-900/90 text-amber-400 text-center transition-all"
                >
                  Admin
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
