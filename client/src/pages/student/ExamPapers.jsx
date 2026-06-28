import React, { useState, useEffect } from 'react';
import { apiGet } from '../../utils/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { BookOpen, Download, Search, Filter, FileText, GraduationCap, Calendar } from 'lucide-react';

const BRANCHES = ['All Branches', 'Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Information Technology', 'Electrical', 'Chemical'];
const SUBJECTS = ['All Subjects', 'Mathematics', 'Physics', 'Chemistry', 'Programming', 'Data Structures', 'Networks', 'DBMS', 'OS', 'English'];
const YEARS_LIST = ['All Years', ...Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() - i))];

const ExamPapers = () => {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  // Client-side filters
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('All Branches');
  const [subject, setSubject] = useState('All Subjects');
  const [year, setYear] = useState('All Years');

  useEffect(() => {
    const fetchPapers = async () => {
      setLoading(true);
      try {
        const data = await apiGet('/exam-papers');
        setPapers(data || []);
      } catch (err) {
        addToast(err.message || 'Failed to load exam papers', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchPapers();
  }, []);

  const filtered = papers.filter(p => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.subject.toLowerCase().includes(search.toLowerCase());
    const matchBranch = branch === 'All Branches' || p.branch === branch;
    const matchSubject = subject === 'All Subjects' || p.subject === subject;
    const matchYear = year === 'All Years' || String(p.year) === year;
    return matchSearch && matchBranch && matchSubject && matchYear;
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
          <GraduationCap className="text-primary-500" />
          Past Exam Paper Archive
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Browse, filter, and download previous year question papers across all branches and subjects.
        </p>
      </div>

      {/* Filters */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <input
            type="text"
            placeholder="Search by title or subject..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-primary-500 outline-none text-slate-700 dark:text-slate-200"
          />
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        <select
          value={branch}
          onChange={e => setBranch(e.target.value)}
          className="px-3 py-2.5 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-primary-500 outline-none text-slate-700 dark:text-slate-300"
        >
          {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
        </select>

        <select
          value={subject}
          onChange={e => setSubject(e.target.value)}
          className="px-3 py-2.5 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-primary-500 outline-none text-slate-700 dark:text-slate-300"
        >
          {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={year}
          onChange={e => setYear(e.target.value)}
          className="px-3 py-2.5 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-primary-500 outline-none text-slate-700 dark:text-slate-300"
        >
          {YEARS_LIST.map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        {(branch !== 'All Branches' || subject !== 'All Subjects' || year !== 'All Years' || search) && (
          <button
            onClick={() => { setSearch(''); setBranch('All Branches'); setSubject('All Subjects'); setYear('All Years'); }}
            className="text-xs font-bold text-rose-500 hover:text-rose-600 px-2"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Results Count */}
      {!loading && (
        <p className="text-xs text-slate-400 font-semibold">
          {filtered.length} paper{filtered.length !== 1 ? 's' : ''} found
        </p>
      )}

      {/* Papers Grid */}
      {loading ? (
        <div className="min-h-[300px] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <FileText size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No papers found</h3>
          <p className="text-sm text-slate-400 mt-1">Try adjusting your filters or search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(paper => (
            <div
              key={paper.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow hover:shadow-lg transition-all group"
            >
              {/* Header */}
              <div className="flex items-start gap-3 mb-4">
                <div className="p-3 bg-primary-50 dark:bg-primary-950/30 text-primary-500 rounded-xl shrink-0 group-hover:bg-primary-100 dark:group-hover:bg-primary-950/50 transition">
                  <FileText size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-slate-800 dark:text-white line-clamp-2 leading-snug">{paper.title}</h3>
                  <p className="text-xs text-primary-500 font-bold mt-0.5">{paper.subject}</p>
                </div>
              </div>

              {/* Metadata */}
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <BookOpen size={12} className="shrink-0" />
                  <span className="font-medium">{paper.branch}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Calendar size={12} className="shrink-0" />
                  <span className="font-medium">Year: {paper.year}</span>
                </div>
              </div>

              {/* Download */}
              <a
                href={paper.file_url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-md shadow-primary-500/20 transition"
              >
                <Download size={14} />
                Download PDF
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExamPapers;
