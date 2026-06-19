import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { apiGet } from '../utils/api.js';
import { Sun, Moon, Bell, Search, LogOut, CheckCheck, BookOpen, User } from 'lucide-react';

const Navbar = () => {
  const { darkMode, toggleDarkMode } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { logout } = useAuth();
  const navigate = useNavigate();

  // Search autocomplete state
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);

  // Notifications dropdown state
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  // Autocomplete hook
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        const data = await apiGet(`/books/autocomplete?query=${encodeURIComponent(searchQuery)}`);
        setSuggestions(data);
      } catch (err) {
        console.error(err.message);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Click outside handlers to close suggestion dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSuggestions(false);
      navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSuggestionClick = (item) => {
    setSearchQuery('');
    setShowSuggestions(false);
    if (item.type === 'book') {
      navigate(`/books/${item.id}`);
    } else {
      navigate(`/?search=${encodeURIComponent(item.title)}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 h-16 flex items-center justify-between px-6">
      
      {/* Search Input Box */}
      <form onSubmit={handleSearchSubmit} className="relative w-96" ref={searchRef}>
        <div className="relative">
          <input
            type="text"
            placeholder="Search books, authors, ISBN..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-full bg-slate-100 dark:bg-slate-800/50 border border-transparent focus:border-primary-500 dark:focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all text-slate-800 dark:text-slate-100"
          />
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        </div>

        {/* Search Suggestions Autocomplete */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-12 left-0 w-full bg-white dark:bg-slate-850 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            {suggestions.map((item) => (
              <button
                key={item.type + item.id}
                type="button"
                onClick={() => handleSuggestionClick(item)}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                {item.type === 'book' ? (
                  <BookOpen size={16} className="text-primary-500" />
                ) : (
                  <User size={16} className="text-amber-500" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate text-slate-700 dark:text-slate-200">{item.title}</p>
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    {item.type}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </form>

      {/* Action Tools */}
      <div className="flex items-center gap-4">
        
        {/* Dark Mode toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-white transition-colors"
          title="Toggle Theme"
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications Dropdown Panel */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-white transition-colors relative"
            title="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-rose-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Container */}
          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-[400px]">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900">
                <span className="text-sm font-bold text-slate-800 dark:text-white">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                  >
                    <CheckCheck size={14} />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 flex-1">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => n.is_read === 0 && markAsRead(n.id)}
                      className={`p-4 text-left transition-colors cursor-pointer ${
                        n.is_read === 0 
                          ? 'bg-slate-50/80 dark:bg-slate-800/20 font-medium' 
                          : 'hover:bg-slate-50/30 dark:hover:bg-slate-800/10'
                      }`}
                    >
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">{n.message}</p>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                        {new Date(n.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
