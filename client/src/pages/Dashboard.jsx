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
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { getDashboardStats, getVehicles } from '../api/client';

function KPICard({ label, value, unit, delay = 0, highlight = false, change = null }) {
  return (
    <div
      className={`kpi-card animate-fade-in ${highlight ? 'border-[var(--accent-primary)]/30' : ''}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="kpi-label mb-2">{label}</p>
      <p className="kpi-value">
        {value}
        {unit && <span className="text-base ml-1 text-[var(--text-muted)] font-normal">{unit}</span>}
      </p>
      {change !== null && (
        <p className={`text-xs mt-1 ${change >= 0 ? 'text-[var(--success)]' : 'text-red-400'}`}>
          {change >= 0 ? '+' : ''}{change}% vs last year
        </p>
      )}
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
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const PieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-lg p-3 text-sm">
        <p className="font-medium" style={{ color: payload[0].payload.color }}>
          {payload[0].name}: €{payload[0].value.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

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
    if (!stats?.vehicleStats) return { avgConsumption: 0, costPerKm: 0 };
    return stats.vehicleStats.find(v => v.id === vehicleId) || { avgConsumption: 0, costPerKm: 0 };
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'costs', label: 'Cost Analysis' },
    { id: 'compare', label: 'Compare Vehicles' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
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
          {/* Tab Navigation */}
          <div className="flex gap-1 p-1 bg-[var(--bg-secondary)] rounded-lg mb-6 w-fit">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  activeTab === tab.id
                    ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Year-over-Year Comparison */}
              {stats.yearOverYear && (stats.yearOverYear.currentYear.entries > 0 || stats.yearOverYear.previousYear.entries > 0) && (
                <div className="mb-6">
                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-3">
                    Year-over-Year Comparison
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Current Year */}
                    <div className="glass-card p-4 animate-fade-in">
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
                    <div className="glass-card p-4 animate-fade-in" style={{ animationDelay: '40ms' }}>
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
                </div>
              )}

              {/* T12M KPI Cards */}
              {stats.t12m && stats.t12m.totalDistance > 0 && (
                <div className="mb-6">
                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-3">Trailing 12 Months</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <KPICard label="T12M Distance" value={stats.t12m.totalDistance.toLocaleString()} unit="km" delay={0} highlight />
                    <KPICard label="T12M Total Spend" value={stats.t12m.totalCost.toFixed(0)} unit="EUR" delay={40} highlight />
                    <KPICard label="T12M Avg Consumption" value={stats.t12m.avgConsumption.toFixed(1)} unit="km/L" delay={80} highlight />
                    <KPICard label="T12M Cost/km" value={stats.t12m.costPerKm.toFixed(3)} unit="EUR" delay={120} highlight />
                  </div>
                </div>
              )}

              {/* Projected Annual Costs */}
              {stats.projectedAnnualCosts && stats.projectedAnnualCosts.fuel > 0 && (
                <div className="mb-6">
                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-3">Projected Annual (Based on YTD)</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <KPICard label="Projected Fuel Cost" value={`€${stats.projectedAnnualCosts.fuel.toLocaleString()}`} delay={0} />
                    <KPICard label="Projected Distance" value={stats.projectedAnnualCosts.distance.toLocaleString()} unit="km" delay={40} />
                    {stats.projectedAnnualCosts.basedOnT12M && (
                      <KPICard label="T12M Cost (Actual)" value={`€${stats.projectedAnnualCosts.basedOnT12M.cost.toLocaleString()}`} delay={80} />
                    )}
                  </div>
                </div>
              )}

              {/* All Time KPI Cards */}
              <div className="mb-10">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-3">All Time</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <KPICard label="Total Distance" value={stats.summary.totalDistance.toLocaleString()} unit="km" delay={0} />
                  <KPICard label="Total Fuel" value={stats.summary.totalFuel.toFixed(0)} unit="L" delay={40} />
                  <KPICard label="Total Cost" value={`${stats.summary.totalCost.toFixed(0)}`} unit="EUR" delay={80} />
                  <KPICard label="Avg Consumption" value={stats.summary.avgConsumption.toFixed(1)} unit="km/L" delay={120} />
                  <KPICard label="Cost per km" value={stats.summary.costPerKm.toFixed(3)} unit="EUR" delay={160} />
                  <KPICard label="Vehicles" value={stats.summary.vehicleCount} delay={200} />
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                {/* T12M Consumption & Cost Trend */}
                <div className="glass-card p-6 animate-fade-in" style={{ animationDelay: '240ms' }}>
                  <h2 className="section-header mb-6">T12M Consumption & Cost Trend</h2>
                  {stats.t12mTrend && stats.t12mTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <ComposedChart data={stats.t12mTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                        <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={{ stroke: 'var(--border-color)' }} tickFormatter={(value) => value.slice(5)} />
                        <YAxis yAxisId="left" domain={['auto', 'auto']} tick={{ fill: 'var(--accent-primary)', fontSize: 10 }} tickLine={false} axisLine={false} width={35} tickFormatter={(value) => value.toFixed(0)} />
                        <YAxis yAxisId="right" orientation="right" domain={['auto', 'auto']} tick={{ fill: 'var(--success)', fontSize: 10 }} tickLine={false} axisLine={false} width={40} tickFormatter={(value) => value.toFixed(2)} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line yAxisId="left" type="monotone" dataKey="avgConsumption" name="Avg km/L" stroke="var(--accent-primary)" strokeWidth={2} dot={{ r: 3, fill: 'var(--accent-primary)', strokeWidth: 0 }} activeDot={{ r: 5, fill: 'var(--accent-secondary)', strokeWidth: 0 }} />
                        <Line yAxisId="right" type="monotone" dataKey="costPerKm" name="Cost/km (EUR)" stroke="var(--success)" strokeWidth={2} dot={{ r: 3, fill: 'var(--success)', strokeWidth: 0 }} activeDot={{ r: 5, fill: 'var(--success)', strokeWidth: 0 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[280px] text-[var(--text-muted)] text-sm">
                      Add more fuel entries to see T12M trends
                    </div>
                  )}
                  <div className="flex justify-center gap-6 mt-3 text-xs">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[var(--accent-primary)]"></span><span className="text-[var(--text-muted)]">Avg km/L (left)</span></span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[var(--success)]"></span><span className="text-[var(--text-muted)]">Cost/km (right)</span></span>
                  </div>
                </div>

                {/* Fuel Price Trend */}
                <div className="glass-card p-6 animate-fade-in" style={{ animationDelay: '280ms' }}>
                  <h2 className="section-header mb-6">Fuel Price Trend</h2>
                  {stats.fuelPriceTrend && stats.fuelPriceTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={stats.fuelPriceTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                        <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={{ stroke: 'var(--border-color)' }} tickFormatter={(value) => value.slice(5)} />
                        <YAxis domain={['auto', 'auto']} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} width={45} tickFormatter={(value) => `€${value}`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="price" name="Price/L (EUR)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#fbbf24', strokeWidth: 0 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[280px] text-[var(--text-muted)] text-sm">
                      Record price per liter in fuel entries to see price trends
                    </div>
                  )}
                </div>
              </div>

              {/* Monthly Costs Chart */}
              <div className="glass-card p-6 mb-6 animate-fade-in" style={{ animationDelay: '320ms' }}>
                <h2 className="section-header mb-6">Monthly Fuel Costs</h2>
                {stats.monthly.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={stats.monthly.slice(-12)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={{ stroke: 'var(--border-color)' }} tickFormatter={(value) => value.slice(5)} />
                      <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="cost" name="Cost (EUR)" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-[var(--text-muted)] text-sm">
                    Add fuel entries to see monthly costs
                  </div>
                )}
              </div>

              {/* Vehicles Overview */}
              <div className="glass-card p-6 animate-fade-in" style={{ animationDelay: '360ms' }}>
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
                  {vehicles.map((vehicle, index) => {
                    const vStats = getVehicleStats(vehicle.id);
                    return (
                      <Link key={vehicle.id} to={`/vehicles/${vehicle.id}`} className="p-4 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)] hover:border-[var(--accent-primary)] transition-all group animate-fade-in" style={{ animationDelay: `${400 + index * 40}ms` }}>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-secondary)] transition-colors">{vehicle.name}</h3>
                            <p className="text-sm text-[var(--text-muted)]">{[vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'No details'}</p>
                          </div>
                          <svg className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent-secondary)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs pt-3 border-t border-[var(--border-color)]">
                          <div>
                            <span className="text-[var(--text-muted)] block">Distance</span>
                            <span className="text-mono text-[var(--text-primary)] font-medium">{vStats.totalDistance > 0 ? `${vStats.totalDistance.toLocaleString()} km` : '-'}</span>
                          </div>
                          <div>
                            <span className="text-[var(--text-muted)] block">Avg</span>
                            <span className="text-mono text-[var(--text-primary)] font-medium">{vStats.avgConsumption > 0 ? `${vStats.avgConsumption.toFixed(1)} km/L` : '-'}</span>
                          </div>
                          <div>
                            <span className="text-[var(--text-muted)] block">Cost/km</span>
                            <span className="text-mono text-[var(--text-primary)] font-medium">{vStats.costPerKm > 0 ? `${vStats.costPerKm.toFixed(3)}` : '-'}</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Cost Analysis Tab */}
          {activeTab === 'costs' && (
            <>
              {/* Cost Breakdown Pie Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <div className="glass-card p-6 animate-fade-in">
                  <h2 className="section-header mb-6">Cost Breakdown (All Time)</h2>
                  {stats.costBreakdown && stats.costBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={stats.costBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          nameKey="name"
                        >
                          {stats.costBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                        <Legend
                          layout="vertical"
                          align="right"
                          verticalAlign="middle"
                          formatter={(value, entry) => (
                            <span className="text-[var(--text-primary)] text-sm">{value}</span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-[var(--text-muted)] text-sm">
                      No cost data available
                    </div>
                  )}
                </div>

                {/* Cost Breakdown Table */}
                <div className="glass-card p-6 animate-fade-in" style={{ animationDelay: '40ms' }}>
                  <h2 className="section-header mb-6">Cost Details</h2>
                  {stats.costBreakdown && stats.costBreakdown.length > 0 ? (
                    <div className="space-y-3">
                      {stats.costBreakdown.map((item, index) => {
                        const total = stats.costBreakdown.reduce((sum, i) => sum + i.value, 0);
                        const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
                        return (
                          <div key={item.name} className="animate-fade-in" style={{ animationDelay: `${index * 40}ms` }}>
                            <div className="flex justify-between items-center mb-1">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                <span className="text-sm text-[var(--text-primary)]">{item.name}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-medium text-[var(--text-primary)] tabular-nums">€{item.value.toLocaleString()}</span>
                                <span className="text-xs text-[var(--text-muted)] ml-2">({percentage}%)</span>
                              </div>
                            </div>
                            <div className="h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${percentage}%`, backgroundColor: item.color }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                      <div className="pt-3 mt-3 border-t border-[var(--border-color)]">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-[var(--text-primary)]">Total</span>
                          <span className="font-semibold text-[var(--text-primary)] tabular-nums">
                            €{stats.costBreakdown.reduce((sum, i) => sum + i.value, 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-[var(--text-muted)] text-sm">
                      No cost data available
                    </div>
                  )}
                </div>
              </div>

              {/* Consumption per Fill-up */}
              <div className="glass-card p-6 animate-fade-in" style={{ animationDelay: '80ms' }}>
                <h2 className="section-header mb-6">Consumption per Fill-up</h2>
                {stats.consumptionTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={stats.consumptionTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={{ stroke: 'var(--border-color)' }} tickFormatter={(value) => value.slice(5)} />
                      <YAxis domain={['auto', 'auto']} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} width={35} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="consumption" name="km/L" stroke="var(--accent-primary)" strokeWidth={2} dot={{ r: 3, fill: 'var(--accent-primary)', strokeWidth: 0 }} activeDot={{ r: 5, fill: 'var(--accent-secondary)', strokeWidth: 0 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-[var(--text-muted)] text-sm">
                    Add more fuel entries to see consumption trends
                  </div>
                )}
              </div>
            </>
          )}

          {/* Compare Vehicles Tab */}
          {activeTab === 'compare' && (
            <>
              {stats.vehicleComparison && stats.vehicleComparison.length > 0 ? (
                <div className="glass-card p-6 animate-fade-in">
                  <h2 className="section-header mb-6">Vehicle Comparison</h2>

                  {/* Comparison Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-xs text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border-color)]">
                          <th className="pb-3 font-medium">Vehicle</th>
                          <th className="pb-3 font-medium text-right">Distance</th>
                          <th className="pb-3 font-medium text-right">km/L</th>
                          <th className="pb-3 font-medium text-right">Fuel/km</th>
                          <th className="pb-3 font-medium text-right">Total Cost</th>
                          <th className="pb-3 font-medium text-right">Cost/km</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.vehicleComparison.map((v, index) => (
                          <tr
                            key={v.id}
                            className="border-b border-[var(--border-color)] last:border-0 animate-fade-in"
                            style={{ animationDelay: `${index * 40}ms` }}
                          >
                            <td className="py-4">
                              <div className="flex items-center gap-3">
                                {v.photo ? (
                                  <img src={v.photo} alt={v.name} className="w-10 h-10 rounded-lg object-cover" />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center">
                                    <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                  </div>
                                )}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-[var(--text-primary)]">{v.name}</span>
                                    {v.status === 'sold' && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--text-muted)]/20 text-[var(--text-muted)]">SOLD</span>
                                    )}
                                  </div>
                                  <span className="text-xs text-[var(--text-muted)]">
                                    {[v.make, v.model, v.year].filter(Boolean).join(' ') || 'No details'}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 text-right tabular-nums text-sm text-[var(--text-primary)]">
                              {v.stats.totalDistance > 0 ? `${v.stats.totalDistance.toLocaleString()} km` : '-'}
                            </td>
                            <td className="py-4 text-right tabular-nums text-sm text-[var(--text-primary)]">
                              {v.stats.avgConsumption > 0 ? v.stats.avgConsumption.toFixed(1) : '-'}
                            </td>
                            <td className="py-4 text-right tabular-nums text-sm text-[var(--text-muted)]">
                              {v.stats.fuelCostPerKm > 0 ? `€${v.stats.fuelCostPerKm.toFixed(3)}` : '-'}
                            </td>
                            <td className="py-4 text-right tabular-nums text-sm text-[var(--text-primary)]">
                              {v.stats.totalCost > 0 ? `€${v.stats.totalCost.toLocaleString()}` : '-'}
                            </td>
                            <td className="py-4 text-right tabular-nums text-sm font-medium text-[var(--accent-secondary)]">
                              {v.stats.totalCostPerKm > 0 ? `€${v.stats.totalCostPerKm.toFixed(3)}` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Comparison Charts */}
                  {stats.vehicleComparison.filter(v => v.stats.totalDistance > 0).length > 1 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                      {/* Distance Comparison */}
                      <div>
                        <h3 className="text-sm font-medium text-[var(--text-muted)] mb-4">Total Distance</h3>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={stats.vehicleComparison.filter(v => v.stats.totalDistance > 0)} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                            <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={{ stroke: 'var(--border-color)' }} />
                            <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} width={80} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="stats.totalDistance" name="Distance (km)" fill="var(--accent-primary)" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Efficiency Comparison */}
                      <div>
                        <h3 className="text-sm font-medium text-[var(--text-muted)] mb-4">Fuel Efficiency (km/L)</h3>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={stats.vehicleComparison.filter(v => v.stats.avgConsumption > 0)} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                            <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={{ stroke: 'var(--border-color)' }} />
                            <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} width={80} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="stats.avgConsumption" name="km/L" fill="#10b981" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="glass-card p-16 text-center animate-fade-in">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-xl bg-[var(--accent-subtle)] flex items-center justify-center">
                    <svg className="w-8 h-8 text-[var(--accent-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3" style={{ fontFamily: 'Syne, sans-serif' }}>
                    Add More Vehicles to Compare
                  </h2>
                  <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
                    Add at least two vehicles with fuel entries to compare their performance and costs.
                  </p>
                  <Link to="/vehicles" className="btn-primary">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Manage Vehicles
                  </Link>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
