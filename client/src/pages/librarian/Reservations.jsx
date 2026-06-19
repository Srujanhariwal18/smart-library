import React, { useState, useEffect } from 'react';
import { apiGet, apiPost, getCoverUrl } from '../../utils/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Calendar, Trash2, BookOpen, AlertCircle, CheckCircle } from 'lucide-react';

const LibrarianReservations = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const { addToast } = useToast();

  const fetchReservations = async () => {
    try {
      const data = await apiGet('/reservations');
      setReservations(data);
    } catch (err) {
      addToast(err.message || 'Failed to load reservations queue', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this reservation? The waitlist queue will automatically shift up.')) return;
    
    setCancellingId(id);
    try {
      const res = await apiPost(`/reservations/cancel/${id}`);
      addToast(res.message, 'success');
      fetchReservations();
    } catch (err) {
      addToast(err.message || 'Failed to cancel reservation', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
          <Calendar className="text-primary-500" />
          Waitlist & Reservations Queue
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Track reservations requested by students for checked-out books. Monitor waitlist position sequences.
        </p>
      </div>

      {loading ? (
        <div className="min-h-[300px] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : reservations.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <Calendar size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-350">Queue is empty</h3>
          <p className="text-sm text-slate-400 mt-1">No active reservations exist in the library system.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase border-b border-slate-200 dark:border-slate-800">
                  <th className="p-4">Student</th>
                  <th className="p-4">Book Reserved</th>
                  <th className="p-4">Reservation Date</th>
                  <th className="p-4">Queue Position</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                {reservations.map((r) => {
                  const coverUrl = getCoverUrl(r.cover_image);

                  let statusBadge = (
                    <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                      Pending
                    </span>
                  );
                  if (r.status === 'fulfilled') {
                    statusBadge = (
                      <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
                        Fulfilled
                      </span>
                    );
                  } else if (r.status === 'cancelled') {
                    statusBadge = (
                      <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-slate-100 text-slate-800 dark:bg-slate-950/30 dark:text-slate-400">
                        Cancelled
                      </span>
                    );
                  }

                  const canCancel = r.status === 'pending';

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                      <td className="p-4">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{r.user_name}</p>
                        <span className="text-xs text-slate-400 font-medium">{r.user_email}</span>
                      </td>
                      <td className="p-4 flex items-center gap-3">
                        <img
                          src={coverUrl}
                          alt={r.title}
                          onError={(e) => {
                            e.target.src = getCoverUrl(null);
                          }}
                          className="w-8 h-10 object-cover rounded bg-slate-100 shrink-0"
                        />
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{r.title}</p>
                      </td>
                      <td className="p-4 text-slate-550 dark:text-slate-400 font-medium">
                        {new Date(r.reservation_date).toLocaleDateString()}
                      </td>
                      <td className="p-4 font-bold text-slate-700 dark:text-slate-350">
                        {r.status === 'pending' ? `#${r.waitlist_position}` : '—'}
                      </td>
                      <td className="p-4">{statusBadge}</td>
                      <td className="p-4 text-center">
                        {canCancel ? (
                          <button
                            onClick={() => handleCancel(r.id)}
                            disabled={cancellingId === r.id}
                            className="flex items-center gap-1 mx-auto px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition"
                          >
                            <Trash2 size={12} />
                            Cancel
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-bold flex items-center justify-center gap-1 text-emerald-500">
                            <CheckCircle size={12} />
                            Completed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibrarianReservations;
