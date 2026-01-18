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
  ComposedChart,
} from 'recharts';
import { getDashboardStats, getVehicles } from '../api/client';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-lg p-3 text-sm">
        <p className="text-[var(--text-muted)] mb-1 text-xs">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-mono font-medium" style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

function CollapsibleSection({ title, defaultOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-[var(--bg-secondary)]/50 transition-colors"
      >
        <span className="font-semibold text-[var(--text-primary)]" style={{ fontFamily: 'Syne, sans-serif' }}>
          {title}
        </span>
        <svg
          className={`w-5 h-5 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-5 pb-5 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}

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

  const getVehicleStats = (vehicleId) => {
    if (!stats?.vehicleStats) return { avgConsumption: 0, costPerKm: 0, totalDistance: 0, totalCost: 0 };
    return stats.vehicleStats.find(v => v.id === vehicleId) || { avgConsumption: 0, costPerKm: 0, totalDistance: 0, totalCost: 0 };
  };

  const formatCurrency = (value) => {
    if (!value && value !== 0) return '-';
    return `€${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
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
            Welcome to DriveTotal
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
        <div className="space-y-6">
          {/* Hero: LTM Key Metrics */}
          <div className="animate-fade-in">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-3">
              Last 12 Months
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card p-5 border-l-4 border-l-[var(--accent-primary)]">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Distance</p>
                <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums" style={{ fontFamily: 'Syne, sans-serif' }}>
                  {stats.t12m?.totalDistance?.toLocaleString() || '0'}
                  <span className="text-sm font-normal text-[var(--text-muted)] ml-1">km</span>
                </p>
              </div>
              <div className="glass-card p-5 border-l-4 border-l-emerald-500">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Total Spend</p>
                <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums" style={{ fontFamily: 'Syne, sans-serif' }}>
                  {formatCurrency(stats.t12m?.totalCost || 0)}
                </p>
              </div>
              <div className="glass-card p-5 border-l-4 border-l-blue-500">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Avg Efficiency</p>
                <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums" style={{ fontFamily: 'Syne, sans-serif' }}>
                  {stats.t12m?.avgConsumption?.toFixed(1) || '0'}
                  <span className="text-sm font-normal text-[var(--text-muted)] ml-1">km/L</span>
                </p>
              </div>
              <div className="glass-card p-5 border-l-4 border-l-amber-500">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Cost per km</p>
                <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums" style={{ fontFamily: 'Syne, sans-serif' }}>
                  €{stats.t12m?.costPerKm?.toFixed(3) || '0.000'}
                </p>
              </div>
            </div>
          </div>

          {/* Vehicle Summary Table */}
          <div className="glass-card animate-fade-in" style={{ animationDelay: '50ms' }}>
            <div className="px-5 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
              <h2 className="font-semibold text-[var(--text-primary)]" style={{ fontFamily: 'Syne, sans-serif' }}>
                Vehicles
              </h2>
              <Link to="/vehicles" className="text-xs text-[var(--accent-secondary)] hover:text-[var(--text-primary)] font-medium flex items-center gap-1">
                View all
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border-color)]">
                    <th className="text-left px-5 py-3 font-medium">Vehicle</th>
                    <th className="text-right px-5 py-3 font-medium">Distance</th>
                    <th className="text-right px-5 py-3 font-medium">km/L</th>
                    <th className="text-right px-5 py-3 font-medium">Cost/km</th>
                    <th className="text-right px-5 py-3 font-medium">Total Cost</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((vehicle, index) => {
                    const vStats = getVehicleStats(vehicle.id);
                    const isActive = !vehicle.soldDate;
                    return (
                      <tr
                        key={vehicle.id}
                        className="border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--bg-secondary)]/50 transition-colors animate-fade-in"
                        style={{ animationDelay: `${100 + index * 30}ms` }}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {vehicle.photo ? (
                              <img src={vehicle.photo} alt={vehicle.name} className="w-9 h-9 rounded-lg object-cover" />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center">
                                <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-[var(--text-primary)]">{vehicle.name}</span>
                                {!isActive && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--text-muted)]/20 text-[var(--text-muted)]">SOLD</span>
                                )}
                              </div>
                              <span className="text-xs text-[var(--text-muted)]">
                                {[vehicle.make, vehicle.model].filter(Boolean).join(' ') || '-'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="text-sm tabular-nums text-[var(--text-primary)]">
                            {vStats.totalDistance > 0 ? `${vStats.totalDistance.toLocaleString()} km` : '-'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="text-sm tabular-nums text-[var(--text-primary)] font-medium">
                            {vStats.avgConsumption > 0 ? vStats.avgConsumption.toFixed(1) : '-'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="text-sm tabular-nums text-[var(--accent-secondary)] font-medium">
                            {vStats.totalCostPerKm > 0 ? `€${vStats.totalCostPerKm.toFixed(3)}` : '-'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="text-sm tabular-nums text-[var(--text-primary)]">
                            {vStats.totalCost > 0 ? formatCurrency(vStats.totalCost) : '-'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link
                            to={`/vehicles/${vehicle.id}`}
                            className="text-[var(--text-muted)] hover:text-[var(--accent-secondary)] transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Collapsible: Year-over-Year */}
          {stats.yearOverYear && (stats.yearOverYear.currentYear.entries > 0 || stats.yearOverYear.previousYear.entries > 0) && (
            <CollapsibleSection title="Year-over-Year Comparison">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Current Year */}
                <div className="p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-[var(--text-primary)]">{stats.yearOverYear.currentYear.year}</h3>
                    <span className="text-xs px-2 py-1 rounded bg-[var(--accent-subtle)] text-[var(--accent-secondary)]">Current</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-[var(--text-muted)] block text-xs">Distance</span>
                      <span className="text-[var(--text-primary)] font-medium tabular-nums">
                        {stats.yearOverYear.currentYear.distance.toLocaleString()} km
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)] block text-xs">Fuel Cost</span>
                      <span className="text-[var(--text-primary)] font-medium tabular-nums">
                        €{stats.yearOverYear.currentYear.cost.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)] block text-xs">Avg km/L</span>
                      <span className="text-[var(--text-primary)] font-medium tabular-nums">
                        {stats.yearOverYear.currentYear.avgConsumption || '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Previous Year */}
                <div className="p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-[var(--text-primary)]">{stats.yearOverYear.previousYear.year}</h3>
                    <span className="text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)]">Previous</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-[var(--text-muted)] block text-xs">Distance</span>
                      <span className="text-[var(--text-primary)] font-medium tabular-nums">
                        {stats.yearOverYear.previousYear.distance.toLocaleString()} km
                      </span>
                      {stats.yearOverYear.changes.distance !== null && (
                        <span className={`text-xs block ${stats.yearOverYear.changes.distance >= 0 ? 'text-[var(--success)]' : 'text-red-400'}`}>
                          {stats.yearOverYear.changes.distance >= 0 ? '+' : ''}{stats.yearOverYear.changes.distance}%
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)] block text-xs">Fuel Cost</span>
                      <span className="text-[var(--text-primary)] font-medium tabular-nums">
                        €{stats.yearOverYear.previousYear.cost.toLocaleString()}
                      </span>
                      {stats.yearOverYear.changes.cost !== null && (
                        <span className={`text-xs block ${stats.yearOverYear.changes.cost <= 0 ? 'text-[var(--success)]' : 'text-red-400'}`}>
                          {stats.yearOverYear.changes.cost >= 0 ? '+' : ''}{stats.yearOverYear.changes.cost}%
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)] block text-xs">Avg km/L</span>
                      <span className="text-[var(--text-primary)] font-medium tabular-nums">
                        {stats.yearOverYear.previousYear.avgConsumption || '-'}
                      </span>
                      {stats.yearOverYear.changes.consumption !== null && (
                        <span className={`text-xs block ${stats.yearOverYear.changes.consumption >= 0 ? 'text-[var(--success)]' : 'text-red-400'}`}>
                          {stats.yearOverYear.changes.consumption >= 0 ? '+' : ''}{stats.yearOverYear.changes.consumption}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          )}

          {/* Collapsible: Trends & Charts */}
          <CollapsibleSection title="Trends & Charts">
            <div className="space-y-6">
              {/* T12M Consumption & Cost Trend */}
              <div>
                <h3 className="text-sm font-medium text-[var(--text-muted)] mb-4">12-Month Consumption & Cost Trend</h3>
                {stats.t12mTrend && stats.t12mTrend.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={250}>
                      <ComposedChart data={stats.t12mTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                        <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={{ stroke: 'var(--border-color)' }} tickFormatter={(value) => value.slice(5)} />
                        <YAxis yAxisId="left" domain={['auto', 'auto']} tick={{ fill: 'var(--accent-primary)', fontSize: 10 }} tickLine={false} axisLine={false} width={35} tickFormatter={(value) => value.toFixed(0)} />
                        <YAxis yAxisId="right" orientation="right" domain={['auto', 'auto']} tick={{ fill: 'var(--success)', fontSize: 10 }} tickLine={false} axisLine={false} width={40} tickFormatter={(value) => value.toFixed(2)} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line yAxisId="left" type="monotone" dataKey="avgConsumption" name="Avg km/L" stroke="var(--accent-primary)" strokeWidth={2} dot={{ r: 3, fill: 'var(--accent-primary)', strokeWidth: 0 }} />
                        <Line yAxisId="right" type="monotone" dataKey="costPerKm" name="Cost/km (EUR)" stroke="var(--success)" strokeWidth={2} dot={{ r: 3, fill: 'var(--success)', strokeWidth: 0 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-6 mt-2 text-xs">
                      <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[var(--accent-primary)]"></span><span className="text-[var(--text-muted)]">km/L (left)</span></span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[var(--success)]"></span><span className="text-[var(--text-muted)]">Cost/km (right)</span></span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-[var(--text-muted)] text-sm">
                    Add more fuel entries to see trends
                  </div>
                )}
              </div>

              {/* Monthly Costs */}
              <div>
                <h3 className="text-sm font-medium text-[var(--text-muted)] mb-4">Monthly Fuel Costs</h3>
                {stats.monthly.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={stats.monthly.slice(-12)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={{ stroke: 'var(--border-color)' }} tickFormatter={(value) => value.slice(5)} />
                      <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="cost" name="Cost (EUR)" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[180px] text-[var(--text-muted)] text-sm">
                    Add fuel entries to see monthly costs
                  </div>
                )}
              </div>

              {/* Fuel Price Trend */}
              {stats.fuelPriceTrend && stats.fuelPriceTrend.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-[var(--text-muted)] mb-4">Fuel Price Trend</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={stats.fuelPriceTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={{ stroke: 'var(--border-color)' }} tickFormatter={(value) => value.slice(5)} />
                      <YAxis domain={['auto', 'auto']} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} width={45} tickFormatter={(value) => `€${value}`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="price" name="Price/L (EUR)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Collapsible: All Time Statistics */}
          <CollapsibleSection title="All Time Statistics">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3 rounded-lg bg-[var(--bg-secondary)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">Total Distance</p>
                <p className="text-lg font-semibold text-[var(--text-primary)] tabular-nums">
                  {stats.summary.totalDistance.toLocaleString()}
                  <span className="text-xs font-normal text-[var(--text-muted)] ml-1">km</span>
                </p>
              </div>
              <div className="p-3 rounded-lg bg-[var(--bg-secondary)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">Total Fuel</p>
                <p className="text-lg font-semibold text-[var(--text-primary)] tabular-nums">
                  {stats.summary.totalFuel.toFixed(0)}
                  <span className="text-xs font-normal text-[var(--text-muted)] ml-1">L</span>
                </p>
              </div>
              <div className="p-3 rounded-lg bg-[var(--bg-secondary)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">Total Cost</p>
                <p className="text-lg font-semibold text-[var(--text-primary)] tabular-nums">
                  {formatCurrency(stats.summary.totalCost)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-[var(--bg-secondary)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">Avg km/L</p>
                <p className="text-lg font-semibold text-[var(--text-primary)] tabular-nums">
                  {stats.summary.avgConsumption.toFixed(1)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-[var(--bg-secondary)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">Cost/km</p>
                <p className="text-lg font-semibold text-[var(--text-primary)] tabular-nums">
                  €{stats.summary.costPerKm.toFixed(3)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-[var(--bg-secondary)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">Vehicles</p>
                <p className="text-lg font-semibold text-[var(--text-primary)] tabular-nums">
                  {stats.summary.vehicleCount}
                </p>
              </div>
            </div>
          </CollapsibleSection>
        </div>
      )}
    </div>
  );
}
