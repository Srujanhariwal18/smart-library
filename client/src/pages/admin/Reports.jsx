import React, { useState, useEffect } from 'react';
import { apiGet } from '../../utils/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { BarChart3, Calendar, ClipboardList, DollarSign, Download, Filter } from 'lucide-react';

const AdminReports = () => {
  const [activeTab, setActiveTab] = useState('borrows'); // 'borrows' or 'fines'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const fetchReport = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'borrows' 
        ? `/admin/reports/borrows?startDate=${startDate}&endDate=${endDate}`
        : `/admin/reports/fines?startDate=${startDate}&endDate=${endDate}`;
        
      const data = await apiGet(endpoint);
      setReportData(data);
    } catch (err) {
      addToast(err.message || 'Failed to fetch reports data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeTab]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchReport();
  };

  // Computations
  const totalFineCollected = reportData.reduce((acc, row) => acc + (row.fine_amount || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
          <BarChart3 className="text-primary-500" />
          Financial & Circulation Reports
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Analyze library checkout frequency, aggregate fine balances, and filter activity logs by date parameters.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => { setActiveTab('borrows'); setReportData([]); }}
          className={`flex items-center gap-2 px-6 py-3.5 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'borrows'
              ? 'border-primary-600 text-primary-650 dark:text-primary-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <ClipboardList size={16} />
          Borrowing reports
        </button>
        
        <button
          onClick={() => { setActiveTab('fines'); setReportData([]); }}
          className={`flex items-center gap-2 px-6 py-3.5 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'fines'
              ? 'border-primary-600 text-primary-650 dark:text-primary-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <DollarSign size={16} />
          Fine collection reports
        </button>
      </div>

      {/* Date Filter Panel */}
      <form onSubmit={handleFilterSubmit} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow flex flex-wrap gap-4 items-end text-sm">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-850 dark:text-slate-100 outline-none focus:border-primary-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-850 dark:text-slate-100 outline-none focus:border-primary-500"
          />
        </div>
        
        <button
          type="submit"
          className="flex items-center gap-1.5 px-5 py-3 rounded-lg text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-md transition"
        >
          <Filter size={14} />
          Apply Filter
        </button>
      </form>

      {/* Report Summary Cards */}
      {!loading && reportData.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-500 rounded-lg">
              <ClipboardList size={20} />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-semibold block">Total Log entries</span>
              <span className="text-xl font-bold text-slate-800 dark:text-white">{reportData.length} records</span>
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-4">
            <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-lg">
              <DollarSign size={20} />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-semibold block">Total Fines in Period</span>
              <span className="text-xl font-bold text-slate-800 dark:text-white">${totalFineCollected.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Report Table */}
      {loading ? (
        <div className="min-h-[200px] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : reportData.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl">
          <Calendar size={48} className="mx-auto text-slate-350 dark:text-slate-700 mb-4" />
          <h3 className="text-base font-bold text-slate-750 dark:text-slate-300">No report records</h3>
          <p className="text-xs text-slate-400 mt-1">Select date bounds and trigger filter options.</p>
        </div>
      ) : activeTab === 'borrows' ? (
        // Borrowing reports table
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase border-b border-slate-200 dark:border-slate-800">
                  <th className="p-4">Student</th>
                  <th className="p-4">Book Title</th>
                  <th className="p-4">ISBN</th>
                  <th className="p-4">Borrow Date</th>
                  <th className="p-4">Due Date</th>
                  <th className="p-4">Return Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Fine ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {reportData.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                    <td className="p-4">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{row.user_name}</p>
                      <span className="text-xs text-slate-400">{row.user_email}</span>
                    </td>
                    <td className="p-4 font-semibold text-slate-850 dark:text-slate-250 truncate max-w-[200px]">{row.title}</td>
                    <td className="p-4 text-xs text-slate-400 font-bold">{row.isbn}</td>
                    <td className="p-4 text-slate-550 dark:text-slate-400 font-semibold">
                      {new Date(row.borrow_date).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-slate-550 dark:text-slate-400 font-semibold">
                      {new Date(row.due_date).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-slate-500 font-medium">
                      {row.return_date ? new Date(row.return_date).toLocaleDateString() : 'Active'}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                        row.status === 'returned'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400'
                          : row.status === 'overdue'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/20 dark:text-rose-400'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950/20 dark:text-blue-400'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-slate-700 dark:text-slate-350">
                      {row.fine_amount > 0 ? `$${row.fine_amount.toFixed(2)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // Fine reports table
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase border-b border-slate-200 dark:border-slate-800">
                  <th className="p-4">Student</th>
                  <th className="p-4">Book Title</th>
                  <th className="p-4">Return Date</th>
                  <th className="p-4">Fine Collected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {reportData.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                    <td className="p-4">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{row.user_name}</p>
                      <span className="text-xs text-slate-400">{row.user_email}</span>
                    </td>
                    <td className="p-4 font-semibold text-slate-850 dark:text-slate-200">{row.title}</td>
                    <td className="p-4 text-slate-550 dark:text-slate-400 font-semibold">
                      {new Date(row.return_date).toLocaleDateString()}
                    </td>
                    <td className="p-4 font-extrabold text-rose-550 dark:text-rose-400">
                      ${row.fine_amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReports;
