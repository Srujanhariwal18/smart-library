import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { apiGet } from '../utils/api.js';
import { X, Megaphone } from 'lucide-react';

const DISMISS_KEY = 'lib_dismissed_announcements';

const getDismissed = () => {
  try {
    return JSON.parse(localStorage.getItem(DISMISS_KEY) || '[]');
  } catch {
    return [];
  }
};

const addDismissed = (id) => {
  const dismissed = getDismissed();
  if (!dismissed.includes(id)) {
    dismissed.push(id);
    localStorage.setItem(DISMISS_KEY, JSON.stringify(dismissed));
  }
};

const BANNER_STYLES = {
  all:       'bg-indigo-600 border-indigo-700',
  student:   'bg-blue-600 border-blue-700',
  teacher:   'bg-purple-600 border-purple-700',
  librarian: 'bg-emerald-600 border-emerald-700',
  admin:     'bg-rose-600 border-rose-700',
};

const AnnouncementBanner = () => {
  const { user } = useAuth();
  const [banners, setBanners] = useState([]);
  const [dismissed, setDismissed] = useState(getDismissed);

  useEffect(() => {
    if (!user) return;
    const fetchAnnouncements = async () => {
      try {
        const data = await apiGet('/announcements');
        // Filter: target_role matches user's role or is 'all', not expired, not dismissed
        const now = new Date();
        const visible = (data || []).filter(a => {
          if (dismissed.includes(a.id)) return false;
          if (a.expires_at && new Date(a.expires_at) < now) return false;
          return a.target_role === 'all' || a.target_role === user.role;
        });
        setBanners(visible);
      } catch {
        // Silently fail — non-critical UI
      }
    };
    fetchAnnouncements();
  }, [user, dismissed]);

  const handleDismiss = (id) => {
    addDismissed(id);
    setDismissed(getDismissed());
    setBanners(prev => prev.filter(b => b.id !== id));
  };

  if (!banners.length) return null;

  return (
    <div className="space-y-1.5 mb-4">
      {banners.map(banner => (
        <div
          key={banner.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-white text-sm ${BANNER_STYLES[banner.target_role] || BANNER_STYLES.all} shadow-lg`}
        >
          <Megaphone size={16} className="shrink-0 text-white/80" />
          <p className="flex-1 font-medium leading-snug">{banner.message}</p>
          <button
            onClick={() => handleDismiss(banner.id)}
            className="shrink-0 p-1 rounded-md hover:bg-white/20 transition"
            title="Dismiss"
          >
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default AnnouncementBanner;
