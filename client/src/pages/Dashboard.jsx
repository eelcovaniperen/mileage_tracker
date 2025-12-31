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

function KPICard({ label, value, unit, delay = 0 }) {
  return (
    <div
      className="kpi-card animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="kpi-label mb-2">{label}</p>
      <p className="kpi-value">
        {value}
        {unit && <span className="text-base ml-1 text-[var(--text-muted)] font-normal">{unit}</span>}
      </p>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-lg p-3 text-sm">
        <p className="text-[var(--text-muted)] mb-1 text-xs">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-mono font-medium" style={{ color: entry.color }}>
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
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-[var(--text-muted)] text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const hasData = stats && stats.summary.vehicleCount > 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <h1 className="page-header">Dashboard</h1>
        <p className="page-subtitle">Track your fuel consumption and costs</p>
      </div>

      {!hasData ? (
        <div className="glass-card p-16 text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-6 rounded-xl bg-[var(--accent-subtle)] flex items-center justify-center">
            <svg className="w-8 h-8 text-[var(--accent-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3" style={{ fontFamily: 'Syne, sans-serif' }}>
            Welcome to MileageTracker
          </h2>
          <p className="text-[var(--text-secondary)] mb-8 max-w-md mx-auto">
            Start by adding your first vehicle and recording fuel entries to see your consumption analytics.
          </p>
          <Link to="/vehicles" className="btn-primary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Your First Vehicle
          </Link>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
            <KPICard
              label="Total Distance"
              value={stats.summary.totalDistance.toLocaleString()}
              unit="km"
              delay={0}
            />
            <KPICard
              label="Total Fuel"
              value={stats.summary.totalFuel.toFixed(0)}
              unit="L"
              delay={40}
            />
            <KPICard
              label="Total Cost"
              value={`${stats.summary.totalCost.toFixed(0)}`}
              unit="EUR"
              delay={80}
            />
            <KPICard
              label="Avg Consumption"
              value={stats.summary.avgConsumption.toFixed(1)}
              unit="km/L"
              delay={120}
            />
            <KPICard
              label="Cost per km"
              value={stats.summary.costPerKm.toFixed(2)}
              unit="EUR"
              delay={160}
            />
            <KPICard
              label="Vehicles"
              value={stats.summary.vehicleCount}
              delay={200}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-10">
            {/* Consumption Trend */}
            <div className="glass-card p-6 animate-fade-in" style={{ animationDelay: '240ms' }}>
              <h2 className="section-header mb-6">Consumption Trend</h2>
              {stats.consumptionTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={stats.consumptionTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: 'var(--border-color)' }}
                    />
                    <YAxis
                      domain={['auto', 'auto']}
                      tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={40}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="consumption"
                      name="km/L"
                      stroke="var(--accent-primary)"
                      strokeWidth={2}
                      dot={{ r: 3, fill: 'var(--accent-primary)', strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: 'var(--accent-secondary)', strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-[var(--text-muted)] text-sm">
                  Add more fuel entries to see consumption trends
                </div>
              )}
            </div>

            {/* Monthly Costs */}
            <div className="glass-card p-6 animate-fade-in" style={{ animationDelay: '280ms' }}>
              <h2 className="section-header mb-6">Monthly Fuel Costs</h2>
              {stats.monthly.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={stats.monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: 'var(--border-color)' }}
                    />
                    <YAxis
                      tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={40}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="cost"
                      name="Cost (EUR)"
                      fill="var(--accent-primary)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-[var(--text-muted)] text-sm">
                  Add fuel entries to see monthly costs
                </div>
              )}
            </div>
          </div>

          {/* Vehicles Overview */}
          <div className="glass-card p-6 animate-fade-in" style={{ animationDelay: '320ms' }}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="section-header">Your Vehicles</h2>
              <Link to="/vehicles" className="text-[var(--accent-secondary)] hover:text-[var(--text-primary)] text-sm font-medium flex items-center gap-1">
                <span>View all</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {vehicles.map((vehicle, index) => (
                <Link
                  key={vehicle.id}
                  to={`/vehicles/${vehicle.id}`}
                  className="p-4 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)] hover:border-[var(--accent-primary)] transition-all group animate-fade-in"
                  style={{ animationDelay: `${360 + index * 40}ms` }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-secondary)] transition-colors">
                        {vehicle.name}
                      </h3>
                      <p className="text-sm text-[var(--text-muted)]">
                        {[vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'No details'}
                      </p>
                    </div>
                    <svg className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent-secondary)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
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
