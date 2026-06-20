import React, { useState, useEffect } from 'react';
import { apiGet, apiPost, getCoverUrl } from '../../utils/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { History, Calendar, RefreshCw, AlertCircle, BookOpen, RotateCcw } from 'lucide-react';

const StudentHistory = () => {
  const [borrows, setBorrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [renewingId, setRenewingId] = useState(null);
  const [returningId, setReturningId] = useState(null);
  const { user } = useAuth();
  const { addToast } = useToast();

  const fetchHistory = async () => {
    try {
      const data = await apiGet('/borrows/history');
      setBorrows(data);
    } catch (err) {
      addToast(err.message || 'Failed to load borrowing history', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleRequestRenewal = async (borrowId) => {
    setRenewingId(borrowId);
    try {
      const res = await apiPost(`/borrows/request-renewal/${borrowId}`);
      addToast(res.message, 'success');
      fetchHistory();
    } catch (err) {
      addToast(err.message || 'Renewal request failed', 'error');
    } finally {
      setRenewingId(null);
    }
  };

  const handleRequestReturn = async (borrowId) => {
    setReturningId(borrowId);
    try {
      const res = await apiPost(`/borrows/request-return/${borrowId}`);
      addToast(res.message, 'success');
      fetchHistory();
    } catch (err) {
      addToast(err.message || 'Return request failed', 'error');
    } finally {
      setReturningId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
          <History className="text-primary-500" />
          Borrowing History
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Track your borrowed books, upcoming due dates, fines, and renew items.
        </p>
      </div>

      {loading ? (
        <div className="min-h-[300px] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : borrows.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl">
          <BookOpen size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No borrows recorded</h3>
          <p className="text-sm text-slate-400 mt-1">You haven't checked out any books yet.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase border-b border-slate-200 dark:border-slate-800">
                  <th className="p-4">Book Details</th>
                  <th className="p-4">Borrow Date</th>
                  <th className="p-4">Due Date</th>
                  <th className="p-4">Return Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Fine Amount</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                {borrows.map((b) => {
                  const coverUrl = getCoverUrl(b.cover_image);

                  let statusBadge = (
                    <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
                      Returned
                    </span>
                  );
                  if (b.status === 'borrowed') {
                    statusBadge = (
                      <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400">
                        Borrowed
                      </span>
                    );
                  } else if (b.status === 'overdue') {
                    statusBadge = (
                      <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400">
                        Overdue
                      </span>
                    );
                  } else if (b.status === 'pending_borrow') {
                    statusBadge = (
                      <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 animate-pulse">
                        Pending Borrow
                      </span>
                    );
                  } else if (b.status === 'pending_renewal') {
                    statusBadge = (
                      <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 animate-pulse">
                        Pending Renewal
                      </span>
                    );
                  } else if (b.status === 'pending_return') {
                    statusBadge = (
                      <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 animate-pulse">
                        Pending Return
                      </span>
                    );
                  } else if (b.status === 'rejected') {
                    statusBadge = (
                      <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-slate-100 text-slate-500 dark:bg-slate-900/50 dark:text-slate-500">
                        Rejected
                      </span>
                    );
                  }

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                      <td className="p-4 flex items-center gap-3 min-w-[250px]">
                        <img
                          src={coverUrl}
                          alt={b.title}
                          onError={(e) => {
                            e.target.src = getCoverUrl(null);
                          }}
                          className="w-10 h-12 object-cover rounded bg-slate-100"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{b.title}</p>
                          <span className="text-[10px] text-slate-400 font-medium">Renewal Count: {b.renewal_count} / 2</span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400 font-medium">
                        {new Date(b.borrow_date).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400 font-medium">
                        {b.status === 'pending_borrow' ? '—' : new Date(b.due_date).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-slate-500">
                        {b.return_date ? new Date(b.return_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="p-4">{statusBadge}</td>
                      <td className="p-4 font-bold text-slate-700 dark:text-slate-350">
                        {b.fine_amount > 0 ? `$${b.fine_amount.toFixed(2)}` : '—'}
                      </td>
                      <td className="p-4 text-center">
                        {user && user.role === 'teacher' ? (
                          <div className="flex flex-col gap-1.5 items-center justify-center">
                            {['borrowed', 'overdue', 'pending_renewal'].includes(b.status) && (
                              <button
                                onClick={() => handleRequestReturn(b.id)}
                                disabled={returningId === b.id}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 transition w-36 justify-center"
                              >
                                <RotateCcw size={12} className={returningId === b.id ? 'animate-spin' : ''} />
                                Initiate Return
                              </button>
                            )}

                            {['borrowed', 'overdue'].includes(b.status) && b.renewal_count < 2 && (
                              <button
                                onClick={() => handleRequestRenewal(b.id)}
                                disabled={renewingId === b.id}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 transition w-36 justify-center"
                              >
                                <RefreshCw size={12} className={renewingId === b.id ? 'animate-spin' : ''} />
                                Request Renewal
                              </button>
                            )}

                            {['borrowed', 'overdue'].includes(b.status) && b.renewal_count >= 2 && (
                              <span className="text-xs text-rose-500 font-semibold flex items-center gap-1 justify-center">
                                <AlertCircle size={12} />
                                Max Renewals
                              </span>
                            )}

                            {!['borrowed', 'overdue', 'pending_renewal'].includes(b.status) && (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </div>
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

export default StudentHistory;
