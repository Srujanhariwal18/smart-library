import React, { useState, useEffect } from 'react';
import { apiGet } from '../../utils/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Activity, ShieldAlert, Search, Download, FileText } from 'lucide-react';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const AdminLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { addToast } = useToast();

  const fetchLogs = async () => {
    try {
      const data = await apiGet('/admin/logs');
      setLogs(data);
    } catch (err) {
      addToast(err.message || 'Failed to load activity logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const term = searchTerm.toLowerCase();
    return (
      (log.user_name && log.user_name.toLowerCase().includes(term)) ||
      (log.user_email && log.user_email.toLowerCase().includes(term)) ||
      log.action.toLowerCase().includes(term) ||
      (log.details && log.details.toLowerCase().includes(term))
    );
  });

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) { addToast('No logs to export', 'warning'); return; }
    const csv = Papa.unparse(filteredLogs.map(log => ({
      'User Name': log.user_name || 'System Auto',
      'User Email': log.user_email || '',
      'Role': log.user_role || 'Guest',
      'Action': log.action,
      'Details': log.details || '',
      'Timestamp': new Date(log.timestamp).toLocaleString(),
    })));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `library-activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    addToast('Logs CSV exported successfully!', 'success');
  };

  const handleExportPDF = () => {
    if (filteredLogs.length === 0) { addToast('No logs to export', 'warning'); return; }
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('Smart Library — Full System Activity Logs', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

    autoTable(doc, {
      startY: 34,
      head: [['User Account', 'Role', 'Action', 'Description', 'Timestamp']],
      body: filteredLogs.map(log => [
        `${log.user_name || 'System Auto'} (${log.user_email || ''})`,
        log.user_role || 'Guest',
        log.action,
        log.details || '',
        new Date(log.timestamp).toLocaleString(),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [99, 102, 241] }
    });

    doc.save(`library-activity-logs-${new Date().toISOString().split('T')[0]}.pdf`);
    addToast('Logs PDF exported successfully!', 'success');
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <Activity className="text-primary-500" />
            Full System Activity Logs
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Audit database modifications, check user logins, and track actions taken by students and librarians.
          </p>
        </div>
        {/* Export Buttons — Feature 8 */}
        <div className="flex gap-2 self-start">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/40 transition"
          >
            <FileText size={14} />
            Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 dark:text-rose-400 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-900/40 transition"
          >
            <Download size={14} />
            Export PDF
          </button>
        </div>
      </div>

      {/* Search filter */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <div className="relative">
          <input
            type="text"
            placeholder="Filter logs by user name, action, or log details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-primary-500 outline-none text-slate-750 dark:text-slate-150"
          />
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="min-h-[300px] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <ShieldAlert size={48} className="mx-auto text-slate-350 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-bold text-slate-755 dark:text-slate-300">No logs found</h3>
          <p className="text-sm text-slate-400 mt-1">No activities match your filtering keywords.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase border-b border-slate-200 dark:border-slate-850">
                  <th className="p-4 w-1/4">User Account</th>
                  <th className="p-4 w-1/6">System Role</th>
                  <th className="p-4 w-1/6">Action Triggered</th>
                  <th className="p-4 w-1/3">Detailed Description</th>
                  <th className="p-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredLogs.map((log) => {
                  let roleBadge = (
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      Guest
                    </span>
                  );
                  if (log.user_role === 'student') {
                    roleBadge = (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-primary-100 text-primary-800 dark:bg-primary-950/40 dark:text-primary-400">
                        {log.user_role}
                      </span>
                    );
                  } else if (log.user_role === 'teacher') {
                    roleBadge = (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-400">
                        {log.user_role}
                      </span>
                    );
                  } else if (log.user_role === 'librarian') {
                    roleBadge = (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                        {log.user_role}
                      </span>
                    );
                  } else if (log.user_role === 'admin') {
                    roleBadge = (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                        {log.user_role}
                      </span>
                    );
                  }

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                      <td className="p-4">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {log.user_name || 'System Auto'}
                        </p>
                        {log.user_email && (
                          <span className="text-xs text-slate-400 font-medium">{log.user_email}</span>
                        )}
                      </td>
                      <td className="p-4">{roleBadge}</td>
                      <td className="p-4">
                        <span className="inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-500 dark:text-slate-400 font-medium max-w-sm leading-relaxed">
                        {log.details}
                      </td>
                      <td className="p-4 text-xs text-slate-400 font-semibold">
                        {new Date(log.timestamp).toLocaleString()}
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

export default AdminLogs;
