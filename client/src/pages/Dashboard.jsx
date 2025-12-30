import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getDashboardStats, getVehicles } from '../api/client';

function KPICard({ title, value, unit, icon, delay = 0 }) {
  return (
    <div
      className="kpi-card animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <p className="text-sm text-[var(--text-muted)] mb-1">{title}</p>
      <p className="kpi-value">
        {value}
        {unit && <span className="text-lg ml-1 text-[var(--text-muted)]">{unit}</span>}
      </p>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 text-sm">
        <p className="text-[var(--text-muted)] mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="font-medium">
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDashboardStats(), getVehicles()])
      .then(([statsRes, vehiclesRes]) => {
        setStats(statsRes.data);
        setVehicles(vehiclesRes.data);
      })
      .catch((err) => console.error('Failed to load dashboard:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--text-muted)]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const hasData = stats && stats.summary.vehicleCount > 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Dashboard</h1>
        <p className="text-[var(--text-secondary)]">Track your fuel consumption and costs</p>
      </div>

      {!hasData ? (
        <div className="glass-card p-12 text-center animate-fade-in">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">Welcome to MileageTracker!</h2>
          <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
            Start by adding your first vehicle and recording fuel entries to see your consumption analytics.
          </p>
          <Link to="/vehicles" className="btn-primary inline-flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Your First Vehicle</span>
          </Link>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <KPICard
              title="Total Distance"
              value={stats.summary.totalDistance.toLocaleString()}
              unit="km"
              delay={0}
              icon={<svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
            />
            <KPICard
              title="Total Fuel"
              value={stats.summary.totalFuel.toFixed(0)}
              unit="L"
              delay={50}
              icon={<svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>}
            />
            <KPICard
              title="Total Cost"
              value={`€${stats.summary.totalCost.toFixed(0)}`}
              delay={100}
              icon={<svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <KPICard
              title="Avg. Consumption"
              value={stats.summary.avgConsumption.toFixed(1)}
              unit="km/L"
              delay={150}
              icon={<svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
            />
            <KPICard
              title="Cost per km"
              value={`€${stats.summary.costPerKm.toFixed(2)}`}
              delay={200}
              icon={<svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>}
            />
            <KPICard
              title="Vehicles"
              value={stats.summary.vehicleCount}
              delay={250}
              icon={<svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Consumption Trend */}
            <div className="glass-card p-6 animate-fade-in" style={{ animationDelay: '300ms' }}>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Consumption Trend</h2>
              {stats.consumptionTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.consumptionTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                      tickLine={{ stroke: 'var(--border-color)' }}
                      axisLine={{ stroke: 'var(--border-color)' }}
                    />
                    <YAxis
                      domain={['auto', 'auto']}
                      tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                      tickLine={{ stroke: 'var(--border-color)' }}
                      axisLine={{ stroke: 'var(--border-color)' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="consumption"
                      name="km/L"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: '#60a5fa', strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-[var(--text-muted)]">
                  Add more fuel entries to see consumption trends
                </div>
              )}
            </div>

            {/* Monthly Costs */}
            <div className="glass-card p-6 animate-fade-in" style={{ animationDelay: '350ms' }}>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Monthly Fuel Costs</h2>
              {stats.monthly.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                      tickLine={{ stroke: 'var(--border-color)' }}
                      axisLine={{ stroke: 'var(--border-color)' }}
                    />
                    <YAxis
                      tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                      tickLine={{ stroke: 'var(--border-color)' }}
                      axisLine={{ stroke: 'var(--border-color)' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="cost"
                      name="Cost (€)"
                      fill="url(#barGradient)"
                      radius={[4, 4, 0, 0]}
                    />
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#1d4ed8" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-[var(--text-muted)]">
                  Add fuel entries to see monthly costs
                </div>
              )}
            </div>
          </div>

          {/* Vehicles Overview */}
          <div className="glass-card p-6 animate-fade-in" style={{ animationDelay: '400ms' }}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Your Vehicles</h2>
              <Link to="/vehicles" className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center space-x-1">
                <span>View all</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vehicles.map((vehicle, index) => (
                <Link
                  key={vehicle.id}
                  to={`/vehicles/${vehicle.id}`}
                  className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] hover:border-blue-500/50 transition-all hover:shadow-lg hover:shadow-blue-500/5 group"
                  style={{ animationDelay: `${450 + index * 50}ms` }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-blue-400 transition-colors">
                        {vehicle.name}
                      </h3>
                      <p className="text-sm text-[var(--text-muted)]">
                        {[vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'No details'}
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                  {vehicle.fuelEntries?.[0] && (
                    <p className="text-xs text-[var(--text-muted)] mt-3 pt-3 border-t border-[var(--border-color)]">
                      Last fill-up: {new Date(vehicle.fuelEntries[0].date).toLocaleDateString()}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
