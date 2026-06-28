import React, { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../../utils/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Bookmark, ClipboardList, Send, RotateCcw, AlertCircle, CheckCircle, UserCheck, XCircle, ScanLine } from 'lucide-react';
import BarcodeScannerModal from '../../components/BarcodeScannerModal.jsx';

const LibrarianIssue = () => {
  const [activeTab, setActiveTab] = useState('issue'); // 'issue', 'history', or 'requests'
  const [books, setBooks] = useState([]);
  const [borrows, setBorrows] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const { addToast } = useToast();

  // Issue Book Form State
  const [studentEmail, setStudentEmail] = useState('');
  const [selectedBookId, setSelectedBookId] = useState('');
  const [submittingIssue, setSubmittingIssue] = useState(false);

  // Return Book Action State
  const [returningId, setReturningId] = useState(null);

  // Scanner States (Feature 7)
  const [scannerMode, setScannerMode] = useState(null); // 'student' or 'book'
  const [showScanner, setShowScanner] = useState(false);

  const openScanner = (mode) => {
    setScannerMode(mode);
    setShowScanner(true);
  };

  const handleScanResult = (result) => {
    if (scannerMode === 'student') {
      try {
        const parsed = JSON.parse(result);
        if (parsed.email) {
          setStudentEmail(parsed.email);
          addToast(`Scanned library card for student: ${parsed.name}`, 'success');
        } else {
          setStudentEmail(result);
        }
      } catch {
        setStudentEmail(result);
      }
    } else if (scannerMode === 'book') {
      const cleanIsbn = result.trim().replace(/[-\s]/g, '');
      const matched = books.find(b => b.isbn.trim().replace(/[-\s]/g, '') === cleanIsbn);
      if (matched) {
        if (matched.available_copies <= 0) {
          addToast(`Book "${matched.title}" is currently out of stock`, 'warning');
        } else {
          setSelectedBookId(matched.id.toString());
          addToast(`Auto-selected book: ${matched.title}`, 'success');
        }
      } else {
        addToast(`ISBN code "${result}" not found in current inventory`, 'error');
      }
    }
  };

  const fetchBooks = async () => {
    try {
      // Get all books to list in issue dropdown
      const data = await apiGet('/books?limit=100');
      setBooks(data.books);
    } catch (err) {
      console.error(err.message);
    }
  };

  const fetchActiveBorrows = async () => {
    setLoading(true);
    try {
      const data = await apiGet('/borrows/history');
      setBorrows(data);
    } catch (err) {
      addToast(err.message || 'Failed to load borrows history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    setRequestsLoading(true);
    try {
      const data = await apiGet('/borrows/requests');
      setRequests(data);
    } catch (err) {
      addToast(err.message || 'Failed to load requests', 'error');
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
    fetchActiveBorrows();
    fetchRequests();
  }, []);

  const handleApprove = async (id) => {
    setProcessingId(id);
    try {
      const data = await apiPost(`/borrows/approve/${id}`);
      addToast(data.message || 'Request approved successfully', 'success');
      fetchRequests();
      fetchActiveBorrows();
      fetchBooks();
    } catch (err) {
      addToast(err.message || 'Failed to approve request', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id) => {
    setProcessingId(id);
    try {
      const data = await apiPost(`/borrows/reject/${id}`);
      addToast(data.message || 'Request rejected successfully', 'success');
      fetchRequests();
      fetchActiveBorrows();
      fetchBooks();
    } catch (err) {
      addToast(err.message || 'Failed to reject request', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    if (!studentEmail || !selectedBookId) {
      addToast('Please provide both student email and a book', 'error');
      return;
    }

    setSubmittingIssue(true);
    try {
      await apiPost('/borrows/issue', {
        email: studentEmail,
        bookId: selectedBookId
      });
      addToast('Book issued successfully!', 'success');
      setStudentEmail('');
      setSelectedBookId('');
      fetchActiveBorrows(); // Reload borrows history
      fetchBooks();         // Reload books stock availability
    } catch (err) {
      addToast(err.message || 'Failed to issue book', 'error');
    } finally {
      setSubmittingIssue(false);
    }
  };

  const handleReturn = async (borrowId) => {
    setReturningId(borrowId);
    try {
      const data = await apiPost(`/borrows/return/${borrowId}`);
      if (data.fineAmount > 0) {
        addToast(`Book returned successfully! Overdue fine of $${data.fineAmount.toFixed(2)} recorded.`, 'warning');
      } else {
        addToast('Book returned successfully (No fines)!', 'success');
      }
      fetchActiveBorrows();
      fetchBooks();
    } catch (err) {
      addToast(err.message || 'Failed to return book', 'error');
    } finally {
      setReturningId(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
          <Bookmark className="text-primary-500" />
          Book Circulation Manager
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Issue academic books to registered students and process catalog returns with auto-fines calculations.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('issue')}
          className={`flex items-center gap-2 px-6 py-3.5 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'issue'
              ? 'border-primary-600 text-primary-650 dark:text-primary-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Send size={16} />
          Issue Book
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-6 py-3.5 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'history'
              ? 'border-primary-600 text-primary-650 dark:text-primary-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <ClipboardList size={16} />
          Check Active Borrows & Returns
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-2 px-6 py-3.5 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'requests'
              ? 'border-primary-600 text-primary-650 dark:text-primary-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <UserCheck size={16} />
          Teacher Requests
        </button>
      </div>

      {/* TAB CONTENT: ISSUE BOOK */}
      {activeTab === 'issue' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 md:p-8 shadow-xl max-w-xl">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white border-b pb-3 mb-6">
            Issue Book to Student
          </h2>

          <form onSubmit={handleIssueSubmit} className="space-y-5 text-sm">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Student Email Address
              </label>
              <div className="flex gap-2">
                <input
                  id="email"
                  type="email"
                  required
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  placeholder="student@library.com"
                  className="flex-1 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 outline-none focus:border-primary-500 transition"
                />
                <button
                  type="button"
                  onClick={() => openScanner('student')}
                  className="px-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350 rounded-xl flex items-center justify-center transition-colors shrink-0"
                  title="Scan Student Card"
                >
                  <ScanLine size={16} />
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="book" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Select Book
              </label>
              <div className="flex gap-2">
                <select
                  id="book"
                  required
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value)}
                  className="flex-1 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 outline-none focus:border-primary-500 transition"
                >
                  <option value="">Choose a book from inventory...</option>
                  {books.map((b) => (
                    <option key={b.id} value={b.id} disabled={b.available_copies <= 0}>
                      {b.title} ({b.available_copies} of {b.total_copies} available)
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => openScanner('book')}
                  className="px-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350 rounded-xl flex items-center justify-center transition-colors shrink-0"
                  title="Scan Book ISBN"
                >
                  <ScanLine size={16} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingIssue}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {submittingIssue ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Send size={16} />
                  <span>Issue Book Copy</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* TAB CONTENT: BORROW RECORD / RETURN */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg overflow-hidden">
          <div className="p-4 border-b bg-slate-50/50 dark:bg-slate-850/50 dark:bg-slate-900/50">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Active Borrow Log</h3>
          </div>
          
          {loading ? (
            <div className="min-h-[250px] flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : borrows.length === 0 ? (
            <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
              No borrow logs recorded.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase border-b border-slate-200 dark:border-slate-850">
                    <th className="p-4">Student</th>
                    <th className="p-4">Book Title</th>
                    <th className="p-4">Borrow Date</th>
                    <th className="p-4">Due Date</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Circulation Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                  {borrows.map((b) => {
                    const isReturned = b.status === 'returned';
                    
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
                    }

                    return (
                      <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                        <td className="p-4">
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{b.user_name}</p>
                          <span className="text-xs text-slate-400 font-medium">{b.user_email}</span>
                        </td>
                        <td className="p-4 font-semibold text-slate-850 dark:text-slate-200">{b.title}</td>
                        <td className="p-4 text-slate-500 font-medium">{new Date(b.borrow_date).toLocaleDateString()}</td>
                        <td className="p-4 text-slate-500 font-medium">{new Date(b.due_date).toLocaleDateString()}</td>
                        <td className="p-4">{statusBadge}</td>
                        <td className="p-4 text-center">
                          {!isReturned ? (
                            <button
                              onClick={() => handleReturn(b.id)}
                              disabled={returningId === b.id}
                              className="flex items-center gap-1.5 mx-auto px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 transition"
                            >
                              <RotateCcw size={12} className={returningId === b.id ? 'animate-spin' : ''} />
                              Mark Return
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 font-bold flex items-center gap-1 justify-center text-emerald-500">
                              <CheckCircle size={12} />
                              Processed
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: TEACHER REQUESTS */}
      {activeTab === 'requests' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg overflow-hidden">
          <div className="p-4 border-b bg-slate-50/50 dark:bg-slate-850/50 dark:bg-slate-900/50">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Pending Teacher Requests</h3>
          </div>

          {requestsLoading ? (
            <div className="min-h-[250px] flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
              No pending teacher requests found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase border-b border-slate-200 dark:border-slate-850">
                    <th className="p-4">Teacher</th>
                    <th className="p-4">Book Title</th>
                    <th className="p-4">Request Type</th>
                    <th className="p-4">Request Date</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                  {requests.map((r) => {
                    let typeBadge = (
                      <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400">
                        Borrow Request
                      </span>
                    );
                    if (r.status === 'pending_renewal') {
                      typeBadge = (
                        <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                          Renewal Request
                        </span>
                      );
                    } else if (r.status === 'pending_return') {
                      typeBadge = (
                        <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/30 dark:text-purple-400">
                          Return Request
                        </span>
                      );
                    }

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                        <td className="p-4">
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{r.user_name}</p>
                          <span className="text-xs text-slate-400 font-medium">{r.user_email}</span>
                        </td>
                        <td className="p-4 font-semibold text-slate-850 dark:text-slate-200">{r.title}</td>
                        <td className="p-4">{typeBadge}</td>
                        <td className="p-4 text-slate-500 font-medium">{new Date(r.borrow_date).toLocaleDateString()}</td>
                        <td className="p-4 text-center">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleApprove(r.id)}
                              disabled={processingId === r.id}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition"
                            >
                              <UserCheck size={12} />
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(r.id)}
                              disabled={processingId === r.id}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition"
                            >
                              <XCircle size={12} />
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {showScanner && (
        <BarcodeScannerModal
          onScan={handleScanResult}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
};

export default LibrarianIssue;
