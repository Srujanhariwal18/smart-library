import React, { useState, useEffect } from 'react';
import { apiGet } from '../../utils/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import AdvancedCharts from '../../components/admin/AdvancedCharts.jsx';
import { Bar, Doughnut } from 'react-chartjs-2';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, 
  Title, Tooltip, Legend, ArcElement 
} from 'chart.js';
import { BarChart3, BookOpen, Layers, Users, DollarSign, Activity } from 'lucide-react';

// Register ChartJS modules
ChartJS.register(
  CategoryScale, LinearScale, BarElement, 
  ArcElement, Title, Tooltip, Legend
);

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalBooks: 0,
    activeBorrows: 0,
    finesCollected: 0.0,
    registeredUsers: 0
  });
  const [charts, setCharts] = useState({
    categories: [],
    statusDist: [],
    popularBooks: []
  });
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const { addToast } = useToast();

  const fetchDashboardData = async () => {
    try {
      const data = await apiGet('/admin/dashboard');
      setStats(data.stats);
      setCharts(data.charts);
      setRecentLogs(data.recentLogs);

      // Fetch advanced analytics separately — non-blocking
      try {
        const analyticsData = await apiGet('/admin/analytics');
        setAnalytics(analyticsData);
      } catch {
        // Advanced analytics are optional — don't block the page
      }
    } catch (err) {
      addToast(err.message || 'Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // 1. Chart Configuration: Popular Books
  const popularBooksData = {
    labels: charts.popularBooks.map(b => b.title),
    datasets: [
      {
        label: 'Borrow Count',
        data: charts.popularBooks.map(b => b.borrow_count),
        backgroundColor: 'rgba(99, 102, 241, 0.75)', // Indigo
        borderColor: 'rgb(99, 102, 241)',
        borderWidth: 1,
        borderRadius: 6
      }
    ]
  };

  // 2. Chart Configuration: Borrows by Category
  const categoryData = {
    labels: charts.categories.map(c => c.category),
    datasets: [
      {
        label: 'Borrows',
        data: charts.categories.map(c => c.borrow_count),
        backgroundColor: 'rgba(16, 185, 129, 0.75)', // Emerald
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 1,
        borderRadius: 6
      }
    ]
  };

  // 3. Chart Configuration: Borrow Status Distribution
  const statusData = {
    labels: charts.statusDist.map(s => s.status.toUpperCase()),
    datasets: [
      {
        data: charts.statusDist.map(s => s.count),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)', // blue: borrowed
          'rgba(16, 185, 129, 0.8)', // emerald: returned
          'rgba(244, 63, 94, 0.8)'   // rose: overdue
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
          'rgb(244, 63, 94)'
        ],
        borderWidth: 1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: 'currentColor'
        }
      }
    },
    scales: {
      y: {
        ticks: { color: 'currentColor', stepSize: 1 },
        grid: { color: 'rgba(156, 163, 175, 0.15)' }
      },
      x: {
        ticks: { color: 'currentColor' },
        grid: { display: false }
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
          <BarChart3 className="text-primary-500" />
          Live Analytics Dashboard
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Real-time metrics, active borrows tracking, library collection value, and recent user actions logs.
        </p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Books */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400">
            <BookOpen size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-450 dark:text-slate-400 font-semibold block">Total Catalog Books</span>
            <span className="text-2xl font-extrabold text-slate-800 dark:text-white">{stats.totalBooks}</span>
          </div>
        </div>

        {/* Active Borrows */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
            <Layers size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-450 dark:text-slate-400 font-semibold block">Active Checked Out</span>
            <span className="text-2xl font-extrabold text-slate-800 dark:text-white">{stats.activeBorrows}</span>
          </div>
        </div>

        {/* Fines Collected */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400">
            <DollarSign size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-450 dark:text-slate-400 font-semibold block">Fines Issued</span>
            <span className="text-2xl font-extrabold text-slate-800 dark:text-white">${stats.finesCollected.toFixed(2)}</span>
          </div>
        </div>

        {/* Registered Users */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
            <Users size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-450 dark:text-slate-400 font-semibold block">Registered Users</span>
            <span className="text-2xl font-extrabold text-slate-800 dark:text-white">{stats.registeredUsers}</span>
          </div>
        </div>
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Popular Books Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 uppercase tracking-wider">
            Most Popular Books (Borrow Counts)
          </h3>
          <div className="h-64 relative">
            {charts.popularBooks.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                No borrowing data available yet.
              </div>
            ) : (
              <Bar data={popularBooksData} options={chartOptions} />
            )}
          </div>
        </div>

        {/* Borrow Status Doughnut */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 uppercase tracking-wider">
            Borrow Circulation Status
          </h3>
          <div className="h-64 relative">
            {charts.statusDist.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                No borrow records found.
              </div>
            ) : (
              <Doughnut 
                data={statusData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { color: 'currentColor' }
                    }
                  }
                }} 
              />
            )}
          </div>
        </div>

        {/* Category breakdown */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow lg:col-span-3">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 uppercase tracking-wider">
            Borrows Distributed by Category
          </h3>
          <div className="h-64 relative">
            {charts.categories.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                No records categorized yet.
              </div>
            ) : (
              <Bar data={categoryData} options={chartOptions} />
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Log section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-slate-50/50 dark:bg-slate-900/50">
          <Activity size={16} className="text-primary-500" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Recent User Actions</h3>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {recentLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No user activity logs recorded.
            </div>
          ) : (
            recentLogs.map((log) => (
              <div key={log.id} className="p-4 flex items-center justify-between text-xs sm:text-sm hover:bg-slate-50/20 dark:hover:bg-slate-800/10 transition">
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {log.user_name || 'System / Unregistered'}
                  </span>
                  <span className="inline-block mx-2 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                    {log.action}
                  </span>
                  <p className="text-xs text-slate-450 dark:text-slate-400 mt-0.5">{log.details}</p>
                </div>
                <span className="text-[10px] text-slate-400 ml-4 shrink-0 font-medium">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Advanced Analytics Section (Feature 10) */}
      {analytics && <AdvancedCharts analytics={analytics} />}
    </div>
  );
};

export default AdminDashboard;
