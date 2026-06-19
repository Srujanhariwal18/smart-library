import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext.jsx';
import { apiPost } from '../utils/api.js';
import { BookOpen, User, Mail, Lock, UserPlus, AlertCircle } from 'lucide-react';
import { SignUp } from '@clerk/clerk-react';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();
  const navigate = useNavigate();

  const isClerkEnabled = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      addToast('All fields are required', 'error');
      return;
    }

    if (password !== confirmPassword) {
      addToast('Passwords do not match', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await apiPost('/auth/register', { name, email, password });
      addToast('Registration successful! Please log in.', 'success');
      navigate('/login');
    } catch (err) {
      addToast(err.message || 'Registration failed.', 'error');
    } finally {
      setSubmitting(false);
    }
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
          Create student account
        </h2>
        {!isClerkEnabled && (
          <p className="mt-2 text-center text-sm text-slate-400">
            Or{' '}
            <Link to="/login" className="font-semibold text-primary-400 hover:text-primary-300 transition-colors">
              sign in to your existing account
            </Link>
          </p>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {isClerkEnabled ? (
          <div className="flex justify-center">
            <SignUp 
              signInUrl="/login"
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
            <div className="mb-6 p-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl flex gap-2.5 items-start text-xs leading-relaxed">
              <AlertCircle size={18} className="shrink-0 text-amber-400 mt-0.5" />
              <div>
                <strong>Developer Mode:</strong> To connect Clerk authentication, add <code>VITE_CLERK_PUBLISHABLE_KEY</code> and <code>VITE_SUPABASE_URL</code> to <code>client/.env</code>. Currently running in local mock database mode.
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleRegister}>
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-slate-300">
                  Full Name
                </label>
                <div className="mt-1 relative">
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-900/50 border border-slate-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition text-white text-sm"
                    placeholder="John Smith"
                  />
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-300">
                  Email Address
                </label>
                <div className="mt-1 relative">
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-900/50 border border-slate-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition text-white text-sm"
                    placeholder="john@college.edu"
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
                    type="password"
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
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-300">
                  Confirm Password
                </label>
                <div className="mt-1 relative">
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                      <span>Create Account</span>
                      <UserPlus size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Register;
