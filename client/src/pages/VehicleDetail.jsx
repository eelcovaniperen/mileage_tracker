import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getVehicle, createFuelEntry, updateFuelEntry, deleteFuelEntry, updateVehicle } from '../api/client';

export default function VehicleDetail() {
  const { id } = useParams();
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showEditVehicle, setShowEditVehicle] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    odometer: '',
    fuelAmount: '',
    cost: '',
    fullTank: true,
    notes: '',
    gasStation: '',
    tripDistance: '',
    pricePerLiter: '',
    tyres: ''
  });
  const [vehicleFormData, setVehicleFormData] = useState({
    name: '',
    make: '',
    model: '',
    year: '',
    initialOdometer: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadVehicle();
  }, [id]);

  const loadVehicle = async () => {
    try {
      const res = await getVehicle(id);
      setVehicle(res.data);
      setVehicleFormData({
        name: res.data.name || '',
        make: res.data.make || '',
        model: res.data.model || '',
        year: res.data.year || '',
        initialOdometer: res.data.initialOdometer || ''
      });
    } catch (err) {
      console.error('Failed to load vehicle:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (editingEntry) {
        await updateFuelEntry(editingEntry.id, formData);
        setEditingEntry(null);
      } else {
        await createFuelEntry({
          ...formData,
          vehicleId: id
        });
      }
      setFormData({
        date: new Date().toISOString().split('T')[0],
        odometer: '',
        fuelAmount: '',
        cost: '',
        fullTank: true,
        notes: '',
        gasStation: '',
        tripDistance: '',
        pricePerLiter: '',
        tyres: ''
      });
      setShowForm(false);
      loadVehicle();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    setFormData({
      date: entry.date.split('T')[0],
      odometer: entry.odometer,
      fuelAmount: entry.fuelAmount,
      cost: entry.cost,
      fullTank: entry.fullTank,
      notes: entry.notes || '',
      gasStation: entry.gasStation || '',
      tripDistance: entry.tripDistance || '',
      pricePerLiter: entry.pricePerLiter || '',
      tyres: entry.tyres || ''
    });
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      odometer: '',
      fuelAmount: '',
      cost: '',
      fullTank: true,
      notes: '',
      gasStation: '',
      tripDistance: '',
      pricePerLiter: '',
      tyres: ''
    });
    setShowForm(false);
  };

  const handleDelete = async (entryId) => {
    if (!confirm('Delete this fuel entry?')) return;
    try {
      await deleteFuelEntry(entryId);
      loadVehicle();
    } catch (err) {
      console.error('Failed to delete entry:', err);
    }
  };

  const handleUpdateVehicle = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateVehicle(id, vehicleFormData);
      setShowEditVehicle(false);
      loadVehicle();
    } catch (err) {
      console.error('Failed to update vehicle:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-[var(--text-muted)] text-sm">Loading vehicle...</p>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="glass-card p-16 text-center">
        <p className="text-[var(--text-secondary)] mb-4">Vehicle not found</p>
        <Link to="/vehicles" className="text-[var(--accent-secondary)] hover:text-[var(--text-primary)]">
          Back to vehicles
        </Link>
      </div>
    );
  }

  const { stats } = vehicle;

  return (
    <div>
      {/* Back Link */}
      <Link
        to="/vehicles"
        className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--accent-secondary)] transition-colors text-sm mb-6"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span>Back to vehicles</span>
      </Link>

      {/* Header */}
      <div className="flex justify-between items-start mb-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-[var(--accent-subtle)] flex items-center justify-center">
            <svg className="w-7 h-7 text-[var(--accent-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="page-header" style={{ marginBottom: 0 }}>{vehicle.name}</h1>
              <button
                onClick={() => setShowEditVehicle(!showEditVehicle)}
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent-secondary)] transition-colors"
                title="Edit vehicle"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
            <p className="text-[var(--text-muted)] text-sm">
              {[vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ') || 'No details'}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            if (showForm && !editingEntry) {
              setShowForm(false);
            } else {
              handleCancelEdit();
              setShowForm(true);
            }
          }}
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
              <span>Add Entry</span>
            </>
          )}
        </button>
      </div>

      {/* Edit Vehicle Form */}
      {showEditVehicle && (
        <div className="glass-card p-6 mb-8 animate-fade-in">
          <h2 className="section-header mb-6">Edit Vehicle</h2>
          <form onSubmit={handleUpdateVehicle} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="input-label">Vehicle Name *</label>
              <input
                type="text"
                value={vehicleFormData.name}
                onChange={(e) => setVehicleFormData({ ...vehicleFormData, name: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="input-label">Make</label>
              <input
                type="text"
                value={vehicleFormData.make}
                onChange={(e) => setVehicleFormData({ ...vehicleFormData, make: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="input-label">Model</label>
              <input
                type="text"
                value={vehicleFormData.model}
                onChange={(e) => setVehicleFormData({ ...vehicleFormData, model: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="input-label">Year</label>
              <input
                type="number"
                value={vehicleFormData.year}
                onChange={(e) => setVehicleFormData({ ...vehicleFormData, year: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="input-label">Initial Odometer (km)</label>
              <input
                type="number"
                value={vehicleFormData.initialOdometer}
                onChange={(e) => setVehicleFormData({ ...vehicleFormData, initialOdometer: e.target.value })}
                className="input-field"
              />
            </div>
            <div className="flex items-end gap-2">
              <button type="button" onClick={() => setShowEditVehicle(false)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        <div className="kpi-card">
          <p className="kpi-label mb-1">Total Distance</p>
          <p className="kpi-value text-xl">{stats.totalDistance.toLocaleString()} <span className="text-sm text-[var(--text-muted)] font-normal">km</span></p>
        </div>
        <div className="kpi-card">
          <p className="kpi-label mb-1">Total Fuel</p>
          <p className="kpi-value text-xl">{stats.totalFuel.toFixed(1)} <span className="text-sm text-[var(--text-muted)] font-normal">L</span></p>
        </div>
        <div className="kpi-card">
          <p className="kpi-label mb-1">Total Cost</p>
          <p className="kpi-value text-xl">{stats.totalCost.toFixed(2)} <span className="text-sm text-[var(--text-muted)] font-normal">EUR</span></p>
        </div>
        <div className="kpi-card">
          <p className="kpi-label mb-1">Avg Consumption</p>
          <p className="kpi-value text-xl">{stats.avgConsumption.toFixed(1)} <span className="text-sm text-[var(--text-muted)] font-normal">km/L</span></p>
        </div>
        <div className="kpi-card">
          <p className="kpi-label mb-1">Cost per km</p>
          <p className="kpi-value text-xl">{stats.costPerKm.toFixed(3)} <span className="text-sm text-[var(--text-muted)] font-normal">EUR</span></p>
        </div>
      </div>

      {/* Add/Edit Entry Form */}
      {showForm && (
        <div className="glass-card p-6 mb-8 animate-fade-in">
          <h2 className="section-header mb-6">
            {editingEntry ? 'Edit Fuel Entry' : 'Add Fuel Entry'}
          </h2>
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-[var(--danger-muted)] border border-[var(--danger)]/20 text-[var(--danger)] text-sm flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="input-label">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="input-label">Odometer (km)</label>
              <input
                type="number"
                value={formData.odometer}
                onChange={(e) => setFormData({ ...formData, odometer: e.target.value })}
                className="input-field"
                placeholder="Current reading"
                required
                step="0.1"
              />
            </div>
            <div>
              <label className="input-label">Fuel Amount (L)</label>
              <input
                type="number"
                value={formData.fuelAmount}
                onChange={(e) => setFormData({ ...formData, fuelAmount: e.target.value })}
                className="input-field"
                placeholder="Liters filled"
                required
                step="0.01"
              />
            </div>
            <div>
              <label className="input-label">Cost (EUR)</label>
              <input
                type="number"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                className="input-field"
                placeholder="Total cost"
                required
                step="0.01"
              />
            </div>
            <div>
              <label className="input-label">Gas Station</label>
              <input
                type="text"
                value={formData.gasStation}
                onChange={(e) => setFormData({ ...formData, gasStation: e.target.value })}
                className="input-field"
                placeholder="Station name"
              />
            </div>
            <div>
              <label className="input-label">Trip Distance (km)</label>
              <input
                type="number"
                value={formData.tripDistance}
                onChange={(e) => setFormData({ ...formData, tripDistance: e.target.value })}
                className="input-field"
                placeholder="Trip distance"
                step="0.1"
              />
            </div>
            <div>
              <label className="input-label">Price/Liter</label>
              <input
                type="number"
                value={formData.pricePerLiter}
                onChange={(e) => setFormData({ ...formData, pricePerLiter: e.target.value })}
                className="input-field"
                placeholder="Price per liter"
                step="0.001"
              />
            </div>
            <div>
              <label className="input-label">Tyres</label>
              <input
                type="text"
                value={formData.tyres}
                onChange={(e) => setFormData({ ...formData, tyres: e.target.value })}
                className="input-field"
                placeholder="Tyre type (S/W)"
              />
            </div>
            <div className="md:col-span-2">
              <label className="input-label">Notes</label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="input-field"
                placeholder="Any notes..."
              />
            </div>
            <div className="flex items-end gap-4 md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.fullTank}
                  onChange={(e) => setFormData({ ...formData, fullTank: e.target.checked })}
                />
                <span className="text-[var(--text-secondary)] text-sm">Full tank</span>
              </label>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary flex-1"
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
                  <span>{editingEntry ? 'Update Entry' : 'Save Entry'}</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Fuel Entries Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-5 border-b border-[var(--border-color)]">
          <h2 className="section-header">Fuel History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Odometer</th>
                <th>Trip</th>
                <th>Fuel</th>
                <th>Cost</th>
                <th>km/L</th>
                <th>Station</th>
                <th>Price/L</th>
                <th>Tyres</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {vehicle.fuelEntries.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center py-12">
                    <div className="text-[var(--text-muted)]">
                      <svg className="w-10 h-10 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                      <p className="text-sm">No fuel entries yet</p>
                      <p className="text-xs mt-1">Add your first entry to start tracking</p>
                    </div>
                  </td>
                </tr>
              ) : (
                [...vehicle.fuelEntries].reverse().map((entry, index, arr) => {
                  const prevEntry = arr[index + 1];
                  let consumption = null;
                  if (entry.tripDistance && entry.tripDistance > 0 && entry.fuelAmount > 0) {
                    consumption = entry.tripDistance / entry.fuelAmount;
                  } else if (prevEntry && entry.fullTank) {
                    const distance = entry.odometer - prevEntry.odometer;
                    if (distance > 0 && entry.fuelAmount > 0) {
                      consumption = distance / entry.fuelAmount;
                    }
                  }
                  return (
                    <tr key={entry.id}>
                      <td>{new Date(entry.date).toLocaleDateString()}</td>
                      <td>{entry.odometer.toLocaleString()} km</td>
                      <td className="text-[var(--text-muted)]">{entry.tripDistance ? `${entry.tripDistance.toFixed(1)} km` : '-'}</td>
                      <td>{entry.fuelAmount.toFixed(2)} L</td>
                      <td>{entry.cost.toFixed(2)} EUR</td>
                      <td>
                        {consumption ? (
                          <span className={consumption < 10 ? 'text-[var(--warning)]' : 'text-[var(--success)]'}>
                            {consumption.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)]">-</span>
                        )}
                      </td>
                      <td className="text-[var(--text-muted)]">{entry.gasStation || '-'}</td>
                      <td className="text-[var(--text-muted)]">{entry.pricePerLiter ? `${entry.pricePerLiter.toFixed(3)}` : '-'}</td>
                      <td className="text-[var(--text-muted)]">{entry.tyres || '-'}</td>
                      <td>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditEntry(entry)}
                            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent-secondary)] transition-colors"
                            title="Edit entry"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="btn-danger p-1.5"
                            title="Delete entry"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
