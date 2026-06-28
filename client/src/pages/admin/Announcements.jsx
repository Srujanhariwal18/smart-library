import React, { useState, useEffect } from 'react';
import { apiGet, apiPost, apiDelete } from '../../utils/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Megaphone, Plus, Trash2, X, Clock, Users } from 'lucide-react';

const ROLE_OPTIONS = [
  { value: 'all', label: 'All Users' },
  { value: 'student', label: 'Students Only' },
  { value: 'teacher', label: 'Teachers Only' },
  { value: 'librarian', label: 'Librarians Only' },
  { value: 'admin', label: 'Admins Only' },
];

const ROLE_BADGE = {
  all:       'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  student:   'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  teacher:   'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
  librarian: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  admin:     'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
};

const AdminAnnouncements = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [message, setMessage] = useState('');
  const [targetRole, setTargetRole] = useState('all');
  const [expiresAt, setExpiresAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const data = await apiGet('/announcements/all');
      setAnnouncements(data || []);
    } catch (err) {
      addToast(err.message || 'Failed to load announcements', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!message.trim()) { addToast('Message cannot be empty', 'error'); return; }

    setSubmitting(true);
    try {
      await apiPost('/announcements', {
        message: message.trim(),
        target_role: targetRole,
        expires_at: expiresAt || null,
        created_by: user.id
      });
      addToast('Announcement created!', 'success');
      setMessage(''); setTargetRole('all'); setExpiresAt('');
      setShowForm(false);
      fetchAnnouncements();
    } catch (err) {
      addToast(err.message || 'Failed to create announcement', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    setDeletingId(id);
    try {
      await apiDelete(`/announcements/${id}`);
      addToast('Announcement deleted', 'success');
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      addToast(err.message || 'Failed to delete', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const isExpired = (expiresAt) => expiresAt && new Date(expiresAt) < new Date();

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <Megaphone className="text-primary-500" />
            In-App Announcements
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Broadcast messages to specific user groups. Banners appear on their dashboards.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-500/20 self-start transition"
        >
          <Plus size={16} />
          New Announcement
        </button>
      </div>

      {/* Create Announcement Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-toast">
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X size={20} />
            </button>

            <h3 className="text-lg font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-5 flex items-center gap-2">
              <Megaphone className="text-primary-500" size={18} />
              Create Announcement
            </h3>

            <form onSubmit={handleCreate} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Message</label>
                <textarea
                  required
                  rows={3}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Enter announcement message..."
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-primary-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Target Audience</label>
                <select
                  value={targetRole}
                  onChange={e => setTargetRole(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-primary-500"
                >
                  {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Expires At (optional)</label>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={e => setExpiresAt(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-primary-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-white font-bold disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus size={14} />}
                  Publish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Announcements List */}
      {loading ? (
        <div className="min-h-[200px] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <Megaphone size={40} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
          <p className="text-slate-500 font-semibold">No announcements yet</p>
          <p className="text-xs text-slate-400 mt-1">Create one to broadcast a message to users.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map(a => (
            <div
              key={a.id}
              className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow transition-all ${
                isExpired(a.expires_at) ? 'opacity-50 border-slate-200 dark:border-slate-800' : 'border-primary-200/50 dark:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${ROLE_BADGE[a.target_role]}`}>
                      {ROLE_OPTIONS.find(r => r.value === a.target_role)?.label || a.target_role}
                    </span>
                    {isExpired(a.expires_at) && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-500 dark:bg-slate-800">
                        Expired
                      </span>
                    )}
                  </div>
                  <p className="text-slate-800 dark:text-slate-200 font-medium text-sm leading-relaxed">{a.message}</p>
                  <div className="flex items-center gap-4 mt-2.5 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      Created: {new Date(a.created_at).toLocaleString()}
                    </span>
                    {a.expires_at && (
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        Expires: {new Date(a.expires_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(a.id)}
                  disabled={deletingId === a.id}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition shrink-0"
                >
                  {deletingId === a.id
                    ? <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                    : <Trash2 size={16} />
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminAnnouncements;
