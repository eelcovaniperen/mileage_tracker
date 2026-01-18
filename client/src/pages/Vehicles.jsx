import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getVehicles, createVehicle, deleteVehicle, updateVehicle, getDashboardStats, getRecentActivity } from '../api/client';

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
    initialOdometer: '',
    photo: ''
  });
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(null);
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('vehicles');
  const [recentActivity, setRecentActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityFilter, setActivityFilter] = useState(null); // null = all, 'fuel', 'maintenance'

  useEffect(() => {
    loadVehicles();
  }, []);

  useEffect(() => {
    if (activeTab === 'activity') {
      loadRecentActivity();
    }
  }, [activeTab, activityFilter]);

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

  const loadRecentActivity = async () => {
    setActivityLoading(true);
    try {
      const res = await getRecentActivity(50, activityFilter);
      setRecentActivity(res.data);
    } catch (err) {
      console.error('Failed to load recent activity:', err);
    } finally {
      setActivityLoading(false);
    }
  };

  const getStats = (vehicleId) => {
    return vehicleStats.find(v => v.id === vehicleId) || {
      totalDistance: 0,
      avgConsumption: 0,
      costPerKm: 0,
      totalCost: 0,
      totalCostPerKm: 0
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createVehicle(formData);
      setFormData({ name: '', make: '', model: '', year: '', initialOdometer: '', photo: '' });
      setShowForm(false);
      loadVehicles();
    } catch (err) {
      console.error('Failed to create vehicle:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this vehicle? All entries will be lost.')) return;
    try {
      await deleteVehicle(id);
      loadVehicles();
    } catch (err) {
      console.error('Failed to delete vehicle:', err);
    }
  };

  const handlePhotoUpload = async (vehicleId, file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 500KB for base64 storage)
    if (file.size > 500 * 1024) {
      alert('Image must be less than 500KB');
      return;
    }

    setUploadingPhoto(vehicleId);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result;
        await updateVehicle(vehicleId, { photo: base64 });
        loadVehicles();
        setUploadingPhoto(null);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Failed to upload photo:', err);
      setUploadingPhoto(null);
    }
  };

  const handleFormPhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 500 * 1024) {
      alert('Image must be less than 500KB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, photo: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const formatCurrency = (value) => {
    if (!value && value !== 0) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
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

  const getActivityIcon = (type) => {
    switch (type) {
      case 'fuel':
        return (
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        );
      case 'maintenance':
        return (
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        );
      case 'roadtax':
        return (
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        );
      case 'insurance':
        return (
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  const getActivityLabel = (type) => {
    switch (type) {
      case 'fuel': return 'Fuel';
      case 'maintenance': return 'Maintenance';
      case 'roadtax': return 'Road Tax';
      case 'insurance': return 'Insurance';
      default: return type;
    }
  };

  const formatRelativeTime = (date) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now - then;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight" style={{ fontFamily: 'Syne, sans-serif' }}>
            Vehicles
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} tracked
          </p>
        </div>
        {activeTab === 'vehicles' && (
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
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 mb-6 bg-[var(--bg-secondary)] rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('vehicles')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'vehicles'
              ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          Vehicles
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'activity'
              ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          Recent Activity
        </button>
      </div>

      {/* Vehicles Tab Content */}
      {activeTab === 'vehicles' && (
        <>
          {/* Add Vehicle Form */}
          {showForm && (
        <div className="glass-card p-6 mb-8 animate-fade-in">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6" style={{ fontFamily: 'Syne, sans-serif' }}>
            Add New Vehicle
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              <div>
                <label className="input-label">Photo</label>
                <div className="flex items-center gap-3">
                  {formData.photo && (
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-[var(--bg-secondary)] flex-shrink-0">
                      <img src={formData.photo} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-muted)] text-sm cursor-pointer hover:border-[var(--accent-primary)] hover:text-[var(--accent-secondary)] transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{formData.photo ? 'Change' : 'Upload'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFormPhotoChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary"
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

      {/* Vehicles List */}
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
        <div className="space-y-3">
          {/* Table Header */}
          <div className="hidden lg:grid gap-3 px-4 py-2 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider" style={{ gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr 1fr 100px' }}>
            <div>Vehicle</div>
            <div className="text-right">Distance</div>
            <div className="text-right">km/L</div>
            <div className="text-right">Fuel/km</div>
            <div className="text-right">Total Cost</div>
            <div className="text-right">Cost/km</div>
            <div></div>
          </div>

          {/* Vehicle Rows */}
          {vehicles.map((vehicle, index) => {
            const stats = getStats(vehicle.id);
            const isActive = !vehicle.soldDate;

            return (
              <div
                key={vehicle.id}
                className="glass-card group animate-fade-in hover:border-[var(--border-hover)] transition-all duration-200"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                {/* Desktop Layout */}
                <div className="hidden lg:grid gap-3 p-4 items-center" style={{ gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr 1fr 100px' }}>
                  {/* Vehicle Info */}
                  <div className="flex items-center gap-4">
                    {/* Photo */}
                    <div className="relative group/photo flex-shrink-0">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                        {vehicle.photo ? (
                          <img src={vehicle.photo} alt={vehicle.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover/photo:opacity-100 rounded-xl cursor-pointer transition-opacity">
                        {uploadingPhoto === vehicle.id ? (
                          <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(vehicle.id, e.target.files[0])} />
                      </label>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[var(--text-primary)] truncate">{vehicle.name}</h3>
                        {!isActive && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-[var(--text-muted)]/20 text-[var(--text-muted)]">SOLD</span>
                        )}
                      </div>
                      <p className="text-sm text-[var(--text-muted)] truncate">
                        {[vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ') || 'No details'}
                      </p>
                    </div>
                  </div>

                  {/* Distance */}
                  <div className="text-right">
                    <span className="text-sm font-medium text-[var(--text-primary)] tabular-nums">
                      {stats.totalDistance > 0 ? `${stats.totalDistance.toLocaleString()}` : '-'}
                    </span>
                  </div>

                  {/* km/L */}
                  <div className="text-right">
                    <span className="text-sm font-medium text-[var(--text-primary)] tabular-nums">
                      {stats.avgConsumption > 0 ? stats.avgConsumption.toFixed(1) : '-'}
                    </span>
                  </div>

                  {/* Fuel/km */}
                  <div className="text-right">
                    <span className="text-sm font-medium text-[var(--text-muted)] tabular-nums">
                      {stats.costPerKm > 0 ? `€${stats.costPerKm.toFixed(3)}` : '-'}
                    </span>
                  </div>

                  {/* Total Cost */}
                  <div className="text-right">
                    <span className="text-sm font-medium text-[var(--text-primary)] tabular-nums">
                      {stats.totalCost > 0 ? formatCurrency(stats.totalCost) : '-'}
                    </span>
                  </div>

                  {/* Cost/km */}
                  <div className="text-right">
                    <span className="text-sm font-medium text-[var(--accent-secondary)] tabular-nums">
                      {stats.totalCostPerKm > 0 ? `€${stats.totalCostPerKm.toFixed(3)}` : '-'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2">
                    <Link to={`/vehicles/${vehicle.id}`} className="flex items-center gap-1 px-2 py-1 text-sm font-medium text-[var(--accent-secondary)] hover:text-[var(--accent-primary)] transition-colors">
                      <span>Details</span>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                    <button onClick={() => handleDelete(vehicle.id)} className="p-1.5 text-[var(--text-muted)] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all" title="Delete vehicle">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Mobile Layout */}
                <div className="lg:hidden p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    {/* Photo */}
                    <div className="relative group/photo flex-shrink-0">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                        {vehicle.photo ? (
                          <img src={vehicle.photo} alt={vehicle.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover/photo:opacity-100 rounded-xl cursor-pointer transition-opacity">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(vehicle.id, e.target.files[0])} />
                      </label>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[var(--text-primary)] truncate">{vehicle.name}</h3>
                        {!isActive && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-[var(--text-muted)]/20 text-[var(--text-muted)]">SOLD</span>
                        )}
                      </div>
                      <p className="text-sm text-[var(--text-muted)] truncate">
                        {[vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ') || 'No details'}
                      </p>
                    </div>
                    <Link to={`/vehicles/${vehicle.id}`} className="flex items-center gap-1 px-2 py-1 text-sm font-medium text-[var(--accent-secondary)]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-5 gap-2 py-2 px-3 bg-[var(--bg-secondary)] rounded-lg text-xs">
                    <div>
                      <span className="text-[var(--text-muted)] block mb-0.5">Distance</span>
                      <span className="text-[var(--text-primary)] font-medium tabular-nums">
                        {stats.totalDistance > 0 ? `${(stats.totalDistance / 1000).toFixed(1)}k` : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)] block mb-0.5">km/L</span>
                      <span className="text-[var(--text-primary)] font-medium tabular-nums">
                        {stats.avgConsumption > 0 ? stats.avgConsumption.toFixed(1) : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)] block mb-0.5">Fuel/km</span>
                      <span className="text-[var(--text-muted)] font-medium tabular-nums">
                        {stats.costPerKm > 0 ? `€${stats.costPerKm.toFixed(2)}` : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)] block mb-0.5">Total</span>
                      <span className="text-[var(--text-primary)] font-medium tabular-nums">
                        {stats.totalCost > 0 ? `€${(stats.totalCost / 1000).toFixed(1)}k` : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)] block mb-0.5">Cost/km</span>
                      <span className="text-[var(--accent-secondary)] font-medium tabular-nums">
                        {stats.totalCostPerKm > 0 ? `€${stats.totalCostPerKm.toFixed(2)}` : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
        </>
      )}

      {/* Recent Activity Tab Content */}
      {activeTab === 'activity' && (
        <div className="space-y-4">
          {/* Filter buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setActivityFilter(null)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activityFilter === null
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActivityFilter('fuel')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                activityFilter === 'fuel'
                  ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Fuel
            </button>
            <button
              onClick={() => setActivityFilter('maintenance')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                activityFilter === 'maintenance'
                  ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Maintenance
            </button>
          </div>

          {/* Activity list */}
          {activityLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="spinner mx-auto mb-4"></div>
                <p className="text-[var(--text-muted)] text-sm">Loading activity...</p>
              </div>
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-[var(--accent-subtle)] flex items-center justify-center">
                <svg className="w-6 h-6 text-[var(--accent-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No activity yet</h3>
              <p className="text-[var(--text-muted)] text-sm">Start adding entries to your vehicles to see activity here.</p>
            </div>
          ) : (
            <>
              {recentActivity.map((activity, index) => (
                <div
                  key={`${activity.type}-${activity.id}`}
                  className="glass-card p-4 animate-fade-in hover:border-[var(--border-hover)] transition-all"
                  style={{ animationDelay: `${index * 20}ms` }}
                >
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    {getActivityIcon(activity.type)}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                          {getActivityLabel(activity.type)}
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">
                          {formatRelativeTime(activity.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--text-primary)] truncate">
                        {activity.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {activity.vehicle?.photo ? (
                          <img src={activity.vehicle.photo} alt="" className="w-4 h-4 rounded object-cover" />
                        ) : (
                          <div className="w-4 h-4 rounded bg-[var(--bg-tertiary)] flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </div>
                        )}
                        <Link
                          to={`/vehicles/${activity.vehicle?.id}`}
                          className="text-xs text-[var(--text-muted)] hover:text-[var(--accent-secondary)] transition-colors"
                        >
                          {activity.vehicle?.name || 'Unknown vehicle'}
                        </Link>
                      </div>
                    </div>

                    {/* Cost */}
                    <div className="text-right">
                      <span className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
                        {formatCurrency(activity.cost)}
                      </span>
                      <p className="text-xs text-[var(--text-muted)]">
                        {new Date(activity.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
