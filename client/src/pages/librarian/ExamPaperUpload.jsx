import React, { useState } from 'react';
import { apiUpload, apiGet } from '../../utils/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { GraduationCap, UploadCloud, X, CheckCircle } from 'lucide-react';

const BRANCHES = ['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Information Technology', 'Electrical', 'Chemical'];
const SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Programming', 'Data Structures', 'Networks', 'DBMS', 'OS', 'English'];

const ExamPaperUpload = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [papers, setPapers] = useState([]);
  const [loadingPapers, setLoadingPapers] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [branch, setBranch] = useState(BRANCHES[0]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [pdfFile, setPdfFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchPapers = async () => {
    setLoadingPapers(true);
    try {
      const data = await apiGet('/exam-papers');
      setPapers(data || []);
    } catch (err) {
      addToast(err.message || 'Failed to load papers', 'error');
    } finally {
      setLoadingPapers(false);
    }
  };

  React.useEffect(() => { fetchPapers(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pdfFile) { addToast('Please select a PDF file', 'error'); return; }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('subject', subject);
    formData.append('branch', branch);
    formData.append('year', year);
    formData.append('uploaded_by', user.id);
    formData.append('paper', pdfFile);

    setSubmitting(true);
    try {
      await apiUpload('/exam-papers', formData, 'POST');
      addToast('Exam paper uploaded successfully!', 'success');
      setTitle(''); setSubject(SUBJECTS[0]); setBranch(BRANCHES[0]);
      setYear(new Date().getFullYear()); setPdfFile(null);
      setShowForm(false);
      fetchPapers();
    } catch (err) {
      addToast(err.message || 'Upload failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <GraduationCap className="text-primary-500" size={22} />
            Exam Paper Archive — Manage
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Upload past exam papers for students to download and prepare.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-500/20 self-start transition"
        >
          <UploadCloud size={16} />
          Upload Paper
        </button>
      </div>

      {/* Upload Form Modal */}
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
              <UploadCloud className="text-primary-500" size={18} />
              Upload Exam Paper
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Paper Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. B.Tech CS Sem 5 — Data Structures 2024"
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Branch</label>
                  <select
                    value={branch}
                    onChange={e => setBranch(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-primary-500"
                  >
                    {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Subject</label>
                  <select
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-primary-500"
                  >
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Year</label>
                <input
                  type="number"
                  required
                  min="2000"
                  max={new Date().getFullYear()}
                  value={year}
                  onChange={e => setYear(parseInt(e.target.value))}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">PDF File</label>
                <input
                  type="file"
                  accept="application/pdf"
                  required
                  onChange={e => setPdfFile(e.target.files[0])}
                  className="w-full text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 dark:border-slate-700 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-white font-bold text-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <UploadCloud size={14} />}
                  Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Papers List */}
      {loadingPapers ? (
        <div className="min-h-[200px] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : papers.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <GraduationCap size={40} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-semibold">No exam papers uploaded yet</p>
          <p className="text-xs text-slate-400 mt-1">Click "Upload Paper" to add the first one.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-400 text-xs font-bold uppercase border-b border-slate-200 dark:border-slate-800">
                  <th className="p-4">Title</th>
                  <th className="p-4">Branch</th>
                  <th className="p-4">Subject</th>
                  <th className="p-4">Year</th>
                  <th className="p-4 text-center">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {papers.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                    <td className="p-4 font-semibold text-slate-800 dark:text-slate-200 max-w-[220px] truncate">{p.title}</td>
                    <td className="p-4 text-slate-500">{p.branch}</td>
                    <td className="p-4 text-slate-500">{p.subject}</td>
                    <td className="p-4 text-slate-500">{p.year}</td>
                    <td className="p-4 text-center">
                      <a
                        href={p.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 dark:text-primary-400 dark:bg-primary-950/30 dark:hover:bg-primary-950/50 transition"
                      >
                        <CheckCircle size={12} /> View PDF
                      </a>
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

export default ExamPaperUpload;
