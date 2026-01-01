import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getVehicles, createVehicle, deleteVehicle, getDashboardStats } from '../api/client';

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [vehicleStats, setVehicleStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    make: '',
    model: '',
    year: '',
    initialOdometer: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      const [vehiclesRes, statsRes] = await Promise.all([
        getVehicles(),
        getDashboardStats()
      ]);
      setVehicles(vehiclesRes.data);
      setVehicleStats(statsRes.data.vehicleStats || []);
    } catch (err) {
      console.error('Failed to load vehicles:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStats = (vehicleId) => {
    return vehicleStats.find(v => v.id === vehicleId) || { totalDistance: 0, avgConsumption: 0, costPerKm: 0 };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createVehicle(formData);
      setFormData({ name: '', make: '', model: '', year: '', initialOdometer: '' });
      setShowForm(false);
      loadVehicles();
    } catch (err) {
      console.error('Failed to create vehicle:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this vehicle? All fuel entries will be lost.')) return;
    try {
      await deleteVehicle(id);
      loadVehicles();
    } catch (err) {
      console.error('Failed to delete vehicle:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-[var(--text-muted)] text-sm">Loading vehicles...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-10">
        <div>
          <h1 className="page-header">Vehicles</h1>
          <p className="page-subtitle">Manage your vehicles and track their performance</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={showForm ? 'btn-secondary' : 'btn-primary'}
        >
          {showForm ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Cancel</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Vehicle</span>
            </>
          )}
        </button>
      </div>

      {/* Add Vehicle Form */}
      {showForm && (
        <div className="glass-card p-6 mb-8 animate-fade-in">
          <h2 className="section-header mb-6">Add New Vehicle</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="input-label">Vehicle Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
                placeholder="e.g., My Daily Driver"
                required
              />
            </div>
            <div>
              <label className="input-label">Make</label>
              <input
                type="text"
                value={formData.make}
                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                className="input-field"
                placeholder="e.g., Toyota"
              />
            </div>
            <div>
              <label className="input-label">Model</label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="input-field"
                placeholder="e.g., Corolla"
              />
            </div>
            <div>
              <label className="input-label">Year</label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                className="input-field"
                placeholder="e.g., 2020"
              />
            </div>
            <div>
              <label className="input-label">Initial Odometer (km)</label>
              <input
                type="number"
                value={formData.initialOdometer}
                onChange={(e) => setFormData({ ...formData, initialOdometer: e.target.value })}
                className="input-field"
                placeholder="e.g., 50000"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary w-full"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Save Vehicle</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Vehicles Grid */}
      {vehicles.length === 0 ? (
        <div className="glass-card p-16 text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-6 rounded-xl bg-[var(--accent-subtle)] flex items-center justify-center">
            <svg className="w-8 h-8 text-[var(--accent-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3" style={{ fontFamily: 'Syne, sans-serif' }}>
            No vehicles yet
          </h2>
          <p className="text-[var(--text-secondary)] mb-8 max-w-md mx-auto">
            Add your first vehicle to start tracking fuel consumption and costs.
          </p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Your First Vehicle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((vehicle, index) => {
            const stats = getStats(vehicle.id);
            return (
              <div
                key={vehicle.id}
                className="glass-card p-5 animate-fade-in group"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--accent-subtle)] flex items-center justify-center">
                      <svg className="w-5 h-5 text-[var(--accent-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--text-primary)]">{vehicle.name}</h3>
                      <p className="text-sm text-[var(--text-muted)]">
                        {[vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ') || 'No details'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(vehicle.id)}
                    className="btn-danger opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete vehicle"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {/* Vehicle KPIs */}
                <div className="grid grid-cols-3 gap-2 text-xs mb-4 p-3 rounded-lg bg-[var(--bg-secondary)]">
                  <div>
                    <span className="text-[var(--text-muted)] block">Distance</span>
                    <span className="text-mono text-[var(--text-primary)] font-medium">
                      {stats.totalDistance > 0 ? `${stats.totalDistance.toLocaleString()} km` : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block">Avg</span>
                    <span className="text-mono text-[var(--text-primary)] font-medium">
                      {stats.avgConsumption > 0 ? `${stats.avgConsumption.toFixed(1)} km/L` : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block">Cost/km</span>
                    <span className="text-mono text-[var(--text-primary)] font-medium">
                      {stats.costPerKm > 0 ? `${stats.costPerKm.toFixed(3)}` : '-'}
                    </span>
                  </div>
                </div>

                {vehicle.fuelEntries?.[0] && (
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-4">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Last fill-up: {new Date(vehicle.fuelEntries[0].date).toLocaleDateString()}</span>
                  </div>
                )}

                <Link
                  to={`/vehicles/${vehicle.id}`}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--accent-secondary)] text-sm font-medium hover:border-[var(--accent-primary)] hover:bg-[var(--accent-subtle)] transition-all"
                >
                  <span>View Details</span>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
