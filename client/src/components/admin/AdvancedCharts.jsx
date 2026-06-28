import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { TrendingUp, BookMarked, Clock } from 'lucide-react';

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, Title, Tooltip, Legend, Filler
);

// ─── Monthly Borrow Trend (Line Chart) ─────────────────────────────────────
const MonthlyBorrowTrend = ({ data }) => {
  const chartData = {
    labels: data.map(d => d.month),
    datasets: [
      {
        label: 'Borrows',
        data: data.map(d => d.count),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointBackgroundColor: 'rgb(99, 102, 241)',
        pointRadius: 4,
        pointHoverRadius: 6,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      y: {
        beginAtZero: true,
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
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow lg:col-span-2">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={16} className="text-indigo-500" />
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          Monthly Borrow Trend (Last 12 Months)
        </h3>
      </div>
      <div className="h-64 relative">
        {data.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
            No trend data available yet.
          </div>
        ) : (
          <Line data={chartData} options={options} />
        )}
      </div>
    </div>
  );
};

// ─── Top 10 Borrowed Books (Horizontal Bar) ─────────────────────────────────
const TopBorrowedBooks = ({ data }) => {
  const colors = [
    'rgba(99,102,241,0.8)', 'rgba(168,85,247,0.8)', 'rgba(236,72,153,0.8)',
    'rgba(239,68,68,0.8)',  'rgba(249,115,22,0.8)', 'rgba(234,179,8,0.8)',
    'rgba(34,197,94,0.8)',  'rgba(20,184,166,0.8)', 'rgba(59,130,246,0.8)',
    'rgba(14,165,233,0.8)'
  ];

  const top10 = data.slice(0, 10);
  const chartData = {
    labels: top10.map(b => b.title.length > 28 ? b.title.substring(0, 28) + '…' : b.title),
    datasets: [{
      label: 'Borrows',
      data: top10.map(b => b.borrow_count),
      backgroundColor: top10.map((_, i) => colors[i % colors.length]),
      borderRadius: 6,
      borderWidth: 0,
    }]
  };

  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: 'currentColor', stepSize: 1 },
        grid: { color: 'rgba(156, 163, 175, 0.15)' }
      },
      y: {
        ticks: { color: 'currentColor', font: { size: 11 } },
        grid: { display: false }
      }
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow lg:col-span-3">
      <div className="flex items-center gap-2 mb-4">
        <BookMarked size={16} className="text-purple-500" />
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          Top 10 Most Borrowed Books
        </h3>
      </div>
      <div className="h-72 relative">
        {top10.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
            No borrowing data available yet.
          </div>
        ) : (
          <Bar data={chartData} options={options} />
        )}
      </div>
    </div>
  );
};

// ─── Peak Hour Heatmap (Custom CSS Grid) ────────────────────────────────────
const PeakHourHeatmap = ({ data }) => {
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const HOURS = Array.from({ length: 24 }, (_, i) => i);

  // Build lookup: data[day][hour] = count
  const lookup = {};
  for (const entry of data) {
    if (!lookup[entry.day]) lookup[entry.day] = {};
    lookup[entry.day][entry.hour] = entry.count;
  }

  const maxCount = Math.max(1, ...data.map(d => d.count));

  const getColor = (count) => {
    if (!count) return 'bg-slate-100 dark:bg-slate-800/60';
    const intensity = count / maxCount;
    if (intensity < 0.2) return 'bg-indigo-100 dark:bg-indigo-950/40';
    if (intensity < 0.4) return 'bg-indigo-200 dark:bg-indigo-900/60';
    if (intensity < 0.6) return 'bg-indigo-400 dark:bg-indigo-700/80';
    if (intensity < 0.8) return 'bg-indigo-500 dark:bg-indigo-600';
    return 'bg-indigo-700 dark:bg-indigo-500';
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow lg:col-span-3">
      <div className="flex items-center gap-2 mb-4">
        <Clock size={16} className="text-teal-500" />
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          Peak Borrow Hours Heatmap (Day × Hour)
        </h3>
      </div>

      {data.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-slate-400 text-sm">
          No peak hour data available yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Hour labels */}
            <div className="flex mb-1 ml-9">
              {HOURS.map(h => (
                <div key={h} className="flex-1 text-center text-[9px] text-slate-400 font-semibold">
                  {h % 3 === 0 ? `${h}h` : ''}
                </div>
              ))}
            </div>

            {/* Rows: Day × Hour */}
            {DAYS.map((day, dayIdx) => (
              <div key={day} className="flex items-center gap-0.5 mb-0.5">
                <span className="w-8 text-xs text-slate-400 font-semibold shrink-0">{day}</span>
                {HOURS.map(hour => {
                  const count = lookup[dayIdx]?.[hour] || 0;
                  return (
                    <div
                      key={hour}
                      className={`flex-1 aspect-square rounded-sm ${getColor(count)} transition-colors`}
                      title={`${day} ${hour}:00 — ${count} borrows`}
                    />
                  );
                })}
              </div>
            ))}

            {/* Legend */}
            <div className="flex items-center gap-1.5 mt-3 justify-end">
              <span className="text-[10px] text-slate-400 font-semibold">Less</span>
              {['bg-slate-100', 'bg-indigo-100', 'bg-indigo-200', 'bg-indigo-400', 'bg-indigo-500', 'bg-indigo-700'].map(c => (
                <div key={c} className={`w-3 h-3 rounded-sm ${c}`} />
              ))}
              <span className="text-[10px] text-slate-400 font-semibold">More</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Wrapper Component ───────────────────────────────────────────────────────
const AdvancedCharts = ({ analytics }) => {
  if (!analytics) return null;
  const { monthlyTrend = [], topBooks = [], peakHours = [] } = analytics;

  return (
    <div className="space-y-4">
      <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
        <h2 className="text-sm font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-5">
          Advanced Analytics
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <MonthlyBorrowTrend data={monthlyTrend} />
          <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={15} className="text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Quick Stats</h3>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl">
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">Peak Month</p>
                <p className="text-sm font-bold text-slate-800 dark:text-white mt-0.5">
                  {monthlyTrend.length > 0
                    ? monthlyTrend.reduce((a, b) => a.count > b.count ? a : b, { month: 'N/A', count: 0 }).month
                    : 'No data'}
                </p>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-xl">
                <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold">Most Borrowed</p>
                <p className="text-sm font-bold text-slate-800 dark:text-white mt-0.5 truncate">
                  {topBooks[0]?.title || 'No data'}
                </p>
              </div>
              <div className="p-3 bg-teal-50 dark:bg-teal-950/20 rounded-xl">
                <p className="text-xs text-teal-600 dark:text-teal-400 font-semibold">Avg Monthly Borrows</p>
                <p className="text-sm font-bold text-slate-800 dark:text-white mt-0.5">
                  {monthlyTrend.length > 0
                    ? Math.round(monthlyTrend.reduce((sum, d) => sum + d.count, 0) / monthlyTrend.length)
                    : 0}
                </p>
              </div>
            </div>
          </div>
          <TopBorrowedBooks data={topBooks} />
          <PeakHourHeatmap data={peakHours} />
        </div>
      </div>
    </div>
  );
};

export default AdvancedCharts;
