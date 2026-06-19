import React, { useState, useEffect } from 'react';
import { apiGet, apiPost, getCoverUrl } from '../../utils/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Calendar, Trash2, BookOpen, AlertCircle } from 'lucide-react';

const StudentReservations = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const { addToast } = useToast();

  const fetchReservations = async () => {
    try {
      const data = await apiGet('/reservations');
      setReservations(data);
    } catch (err) {
      addToast(err.message || 'Failed to load reservations', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const handleCancel = async (id) => {
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
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
          <Calendar className="text-amber-500" />
          My Reservations Queue
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Track books you reserved while they were unavailable, and monitor your place in the waitlist.
        </p>
      </div>

      {loading ? (
        <div className="min-h-[300px] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : reservations.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl">
          <Calendar size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No reservations found</h3>
          <p className="text-sm text-slate-400 mt-1">You haven't reserved any books yet.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase border-b border-slate-200 dark:border-slate-800">
                  <th className="p-4">Book Details</th>
                  <th className="p-4">Reservation Date</th>
                  <th className="p-4">Waitlist Position</th>
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
                        Ready (Fulfilled)
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
                      <td className="p-4 flex items-center gap-3 min-w-[250px]">
                        <img
                          src={coverUrl}
                          alt={r.title}
                          onError={(e) => {
                            e.target.src = getCoverUrl(null);
                          }}
                          className="w-10 h-12 object-cover rounded bg-slate-100"
                        />
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{r.title}</p>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400 font-medium">
                        {new Date(r.reservation_date).toLocaleDateString()}
                      </td>
                      <td className="p-4 font-bold text-slate-700 dark:text-slate-300">
                        {r.status === 'pending' ? `#${r.waitlist_position}` : '—'}
                      </td>
                      <td className="p-4">{statusBadge}</td>
                      <td className="p-4 text-center">
                        {canCancel ? (
                          <button
                            onClick={() => handleCancel(r.id)}
                            disabled={cancellingId === r.id}
                            className="flex items-center gap-1 mx-auto px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition"
                          >
                            <Trash2 size={12} />
                            Cancel
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
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

export default StudentReservations;
