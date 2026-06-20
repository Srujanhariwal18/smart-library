import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  BookOpen, History, Heart, Calendar, 
  Settings, Users, BarChart3, ShieldAlert,
  FolderOpen, Bookmark, LogOut, ShieldCheck
} from 'lucide-react';
import { UserButton } from '@clerk/clerk-react';

const Sidebar = () => {
  const { user, logout, isClerk } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const isActive = (path) => location.pathname === path;

  const linkClass = (path) => `
    flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
    ${isActive(path) 
      ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' 
      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'}
  `;

  return (
    <aside className="w-64 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800/80 flex flex-col h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800/80 flex items-center gap-3">
        <div className="bg-primary-600 p-2 rounded-lg text-white">
          <BookOpen size={20} />
        </div>
        <div>
          <h1 className="font-bold text-base tracking-wide text-slate-800 dark:text-white leading-tight">Smart Library</h1>
          <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">College System</span>
        </div>
      </div>

      {/* Role Badge and User Profile Summary */}
      <div className="p-4 mx-4 my-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800/50 flex items-center gap-3">
        {isClerk ? (
          <UserButton afterSignOutUrl="/login" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 font-bold text-lg flex items-center justify-center shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold truncate text-slate-800 dark:text-slate-200">{user.name}</h3>
          <span className="inline-block mt-0.5 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-primary-100 text-primary-800 dark:bg-primary-950/50 dark:text-primary-400">
            {user.role}
          </span>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-4 py-3 space-y-1.5 overflow-y-auto">
        {/* STUDENT/TEACHER VIEWS */}
        {(user.role === 'student' || user.role === 'teacher') && (
          <>
            <Link to="/" className={linkClass('/')}>
              <BookOpen size={18} />
              <span>Catalog & Search</span>
            </Link>
            <Link to="/history" className={linkClass('/history')}>
              <History size={18} />
              <span>Borrow History</span>
            </Link>
            <Link to="/wishlist" className={linkClass('/wishlist')}>
              <Heart size={18} />
              <span>My Wishlist</span>
            </Link>
            <Link to="/reservations" className={linkClass('/reservations')}>
              <Calendar size={18} />
              <span>My Reservations</span>
            </Link>
          </>
        )}

        {/* LIBRARIAN VIEWS */}
        {user.role === 'librarian' && (
          <>
            <Link to="/" className={linkClass('/')}>
              <BookOpen size={18} />
              <span>Catalog Browser</span>
            </Link>
            <Link to="/librarian/books" className={linkClass('/librarian/books')}>
              <FolderOpen size={18} />
              <span>Manage Inventory</span>
            </Link>
            <Link to="/librarian/issue" className={linkClass('/librarian/issue')}>
              <Bookmark size={18} />
              <span>Issue & Return</span>
            </Link>
            <Link to="/librarian/reservations" className={linkClass('/librarian/reservations')}>
              <Calendar size={18} />
              <span>Reservations Queue</span>
            </Link>
          </>
        )}

        {/* ADMIN VIEWS */}
        {user.role === 'admin' && (
          <>
            <Link to="/admin" className={linkClass('/admin')}>
              <BarChart3 size={18} />
              <span>Admin Dashboard</span>
            </Link>
            <Link to="/" className={linkClass('/')}>
              <BookOpen size={18} />
              <span>Catalog Browser</span>
            </Link>
            <Link to="/admin/users" className={linkClass('/admin/users')}>
              <Users size={18} />
              <span>Manage Users</span>
            </Link>
            <Link to="/admin/reports" className={linkClass('/admin/reports')}>
              <ShieldCheck size={18} />
              <span>Borrow & Fine Reports</span>
            </Link>
            <Link to="/admin/logs" className={linkClass('/admin/logs')}>
              <ShieldAlert size={18} />
              <span>User Activity Logs</span>
            </Link>
          </>
        )}
        {/* Shared Profile Link */}
        <Link to="/profile" className={linkClass('/profile')}>
          <Settings size={18} />
          <span>My Profile</span>
        </Link>
      </nav>

      {/* Logout button */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800/80">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all duration-200"
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
