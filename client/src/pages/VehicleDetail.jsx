import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getVehicle,
  createFuelEntry, updateFuelEntry, deleteFuelEntry,
  updateVehicle,
  createMaintenanceEntry, updateMaintenanceEntry, deleteMaintenanceEntry,
  createRoadTaxEntry, updateRoadTaxEntry, deleteRoadTaxEntry,
  createInsuranceEntry, updateInsuranceEntry, deleteInsuranceEntry
} from '../api/client';

const MAINTENANCE_CATEGORIES = [
  { value: 'service', label: 'Service' },
  { value: 'repair', label: 'Repair' },
  { value: 'tires', label: 'Tires' },
  { value: 'brakes', label: 'Brakes' },
  { value: 'oil', label: 'Oil Change' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'bodywork', label: 'Bodywork' },
  { value: 'other', label: 'Other' }
];

const COVERAGE_TYPES = [
  { value: 'liability', label: 'Liability Only' },
  { value: 'comprehensive', label: 'Comprehensive' },
  { value: 'collision', label: 'Collision' },
  { value: 'full', label: 'Full Coverage' }
];

export default function VehicleDetail() {
  const { id } = useParams();
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showEditVehicle, setShowEditVehicle] = useState(false);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [showRoadTaxForm, setShowRoadTaxForm] = useState(false);
  const [showInsuranceForm, setShowInsuranceForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editingMaintenance, setEditingMaintenance] = useState(null);
  const [editingRoadTax, setEditingRoadTax] = useState(null);
  const [editingInsurance, setEditingInsurance] = useState(null);
  const [activeTab, setActiveTab] = useState('fuel');

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
    initialOdometer: '',
    purchasePrice: '',
    purchaseDate: '',
    registrationCost: '',
    otherInitialCosts: '',
    insuranceCostYearly: '',
    roadTaxYearly: '',
    depreciationYearly: '',
    financingMonthlyPayment: '',
    financingInterestRate: '',
    financingStartDate: '',
    financingEndDate: '',
    financingTotalAmount: '',
    soldDate: '',
    soldPrice: ''
  });

  const [maintenanceFormData, setMaintenanceFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    odometer: '',
    description: '',
    cost: '',
    category: 'service',
    invoiceNumber: '',
    serviceProvider: '',
    notes: ''
  });

  const [roadTaxFormData, setRoadTaxFormData] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    cost: '',
    notes: ''
  });

  const [insuranceFormData, setInsuranceFormData] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    cost: '',
    provider: '',
    policyNumber: '',
    coverage: 'comprehensive',
    notes: ''
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
        initialOdometer: res.data.initialOdometer || '',
        purchasePrice: res.data.purchasePrice || '',
        purchaseDate: res.data.purchaseDate ? res.data.purchaseDate.split('T')[0] : '',
        registrationCost: res.data.registrationCost || '',
        otherInitialCosts: res.data.otherInitialCosts || '',
        insuranceCostYearly: res.data.insuranceCostYearly || '',
        roadTaxYearly: res.data.roadTaxYearly || '',
        depreciationYearly: res.data.depreciationYearly || '',
        financingMonthlyPayment: res.data.financingMonthlyPayment || '',
        financingInterestRate: res.data.financingInterestRate || '',
        financingStartDate: res.data.financingStartDate ? res.data.financingStartDate.split('T')[0] : '',
        financingEndDate: res.data.financingEndDate ? res.data.financingEndDate.split('T')[0] : '',
        financingTotalAmount: res.data.financingTotalAmount || '',
        soldDate: res.data.soldDate ? res.data.soldDate.split('T')[0] : '',
        soldPrice: res.data.soldPrice || ''
      });
    } catch (err) {
      console.error('Failed to load vehicle:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fuel entry handlers
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (editingEntry) {
        await updateFuelEntry(editingEntry.id, formData);
        setEditingEntry(null);
      } else {
        await createFuelEntry({ ...formData, vehicleId: id });
      }
      resetFuelForm();
      setShowForm(false);
      loadVehicle();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  const resetFuelForm = () => {
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
    resetFuelForm();
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

  // Maintenance entry handlers
  const handleMaintenanceSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (editingMaintenance) {
        await updateMaintenanceEntry(editingMaintenance.id, maintenanceFormData);
        setEditingMaintenance(null);
      } else {
        await createMaintenanceEntry({ ...maintenanceFormData, vehicleId: id });
      }
      resetMaintenanceForm();
      setShowMaintenanceForm(false);
      loadVehicle();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save maintenance entry');
    } finally {
      setSaving(false);
    }
  };

  const resetMaintenanceForm = () => {
    setMaintenanceFormData({
      date: new Date().toISOString().split('T')[0],
      odometer: '',
      description: '',
      cost: '',
      category: 'service',
      invoiceNumber: '',
      serviceProvider: '',
      notes: ''
    });
  };

  const handleEditMaintenance = (entry) => {
    setEditingMaintenance(entry);
    setMaintenanceFormData({
      date: entry.date.split('T')[0],
      odometer: entry.odometer || '',
      description: entry.description,
      cost: entry.cost,
      category: entry.category,
      invoiceNumber: entry.invoiceNumber || '',
      serviceProvider: entry.serviceProvider || '',
      notes: entry.notes || ''
    });
    setShowMaintenanceForm(true);
  };

  const handleCancelMaintenanceEdit = () => {
    setEditingMaintenance(null);
    resetMaintenanceForm();
    setShowMaintenanceForm(false);
  };

  const handleDeleteMaintenance = async (entryId) => {
    if (!confirm('Delete this maintenance entry?')) return;
    try {
      await deleteMaintenanceEntry(entryId);
      loadVehicle();
    } catch (err) {
      console.error('Failed to delete maintenance entry:', err);
    }
  };

  // Road Tax entry handlers
  const handleRoadTaxSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (editingRoadTax) {
        await updateRoadTaxEntry(editingRoadTax.id, roadTaxFormData);
        setEditingRoadTax(null);
      } else {
        await createRoadTaxEntry({ ...roadTaxFormData, vehicleId: id });
      }
      resetRoadTaxForm();
      setShowRoadTaxForm(false);
      loadVehicle();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save road tax entry');
    } finally {
      setSaving(false);
    }
  };

  const resetRoadTaxForm = () => {
    setRoadTaxFormData({
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      cost: '',
      notes: ''
    });
  };

  const handleEditRoadTax = (entry) => {
    setEditingRoadTax(entry);
    setRoadTaxFormData({
      startDate: entry.startDate.split('T')[0],
      endDate: entry.endDate.split('T')[0],
      cost: entry.cost,
      notes: entry.notes || ''
    });
    setShowRoadTaxForm(true);
  };

  const handleCancelRoadTaxEdit = () => {
    setEditingRoadTax(null);
    resetRoadTaxForm();
    setShowRoadTaxForm(false);
  };

  const handleDeleteRoadTax = async (entryId) => {
    if (!confirm('Delete this road tax entry?')) return;
    try {
      await deleteRoadTaxEntry(entryId);
      loadVehicle();
    } catch (err) {
      console.error('Failed to delete road tax entry:', err);
    }
  };

  // Insurance entry handlers
  const handleInsuranceSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (editingInsurance) {
        await updateInsuranceEntry(editingInsurance.id, insuranceFormData);
        setEditingInsurance(null);
      } else {
        await createInsuranceEntry({ ...insuranceFormData, vehicleId: id });
      }
      resetInsuranceForm();
      setShowInsuranceForm(false);
      loadVehicle();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save insurance entry');
    } finally {
      setSaving(false);
    }
  };

  const resetInsuranceForm = () => {
    setInsuranceFormData({
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      cost: '',
      provider: '',
      policyNumber: '',
      coverage: 'comprehensive',
      notes: ''
    });
  };

  const handleEditInsurance = (entry) => {
    setEditingInsurance(entry);
    setInsuranceFormData({
      startDate: entry.startDate.split('T')[0],
      endDate: entry.endDate.split('T')[0],
      cost: entry.cost,
      provider: entry.provider || '',
      policyNumber: entry.policyNumber || '',
      coverage: entry.coverage || 'comprehensive',
      notes: entry.notes || ''
    });
    setShowInsuranceForm(true);
  };

  const handleCancelInsuranceEdit = () => {
    setEditingInsurance(null);
    resetInsuranceForm();
    setShowInsuranceForm(false);
  };

  const handleDeleteInsurance = async (entryId) => {
    if (!confirm('Delete this insurance entry?')) return;
    try {
      await deleteInsuranceEntry(entryId);
      loadVehicle();
    } catch (err) {
      console.error('Failed to delete insurance entry:', err);
    }
  };

  // Vehicle update handler
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

  // Get current form visibility and toggle function based on active tab
  const getAddButtonProps = () => {
    switch (activeTab) {
      case 'fuel':
        return {
          show: showForm,
          toggle: () => showForm ? handleCancelEdit() : setShowForm(true),
          label: 'Fuel'
        };
      case 'maintenance':
        return {
          show: showMaintenanceForm,
          toggle: () => showMaintenanceForm ? handleCancelMaintenanceEdit() : setShowMaintenanceForm(true),
          label: 'Maintenance'
        };
      case 'roadtax':
        return {
          show: showRoadTaxForm,
          toggle: () => showRoadTaxForm ? handleCancelRoadTaxEdit() : setShowRoadTaxForm(true),
          label: 'Road Tax'
        };
      case 'insurance':
        return {
          show: showInsuranceForm,
          toggle: () => showInsuranceForm ? handleCancelInsuranceEdit() : setShowInsuranceForm(true),
          label: 'Insurance'
        };
      default:
        return { show: false, toggle: () => {}, label: '' };
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
  const addButtonProps = getAddButtonProps();

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
              {vehicle.status === 'inactive' ? (
                <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-[var(--text-muted)]/20 text-[var(--text-muted)]">Sold</span>
              ) : (
                <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-[var(--success)]/20 text-[var(--success)]">Active</span>
              )}
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
          onClick={addButtonProps.toggle}
          className={addButtonProps.show ? 'btn-secondary' : 'btn-primary'}
        >
          {addButtonProps.show ? (
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
              <span>Add {addButtonProps.label}</span>
            </>
          )}
        </button>
      </div>

      {/* Edit Vehicle Form */}
      {showEditVehicle && (
        <div className="glass-card p-6 mb-8 animate-fade-in">
          <h2 className="section-header mb-6">Edit Vehicle</h2>
          <form onSubmit={handleUpdateVehicle} className="space-y-6">
            {/* Basic Info */}
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="input-label">Vehicle Name *</label>
                  <input type="text" value={vehicleFormData.name} onChange={(e) => setVehicleFormData({ ...vehicleFormData, name: e.target.value })} className="input-field" required />
                </div>
                <div>
                  <label className="input-label">Make</label>
                  <input type="text" value={vehicleFormData.make} onChange={(e) => setVehicleFormData({ ...vehicleFormData, make: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="input-label">Model</label>
                  <input type="text" value={vehicleFormData.model} onChange={(e) => setVehicleFormData({ ...vehicleFormData, model: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="input-label">Year</label>
                  <input type="number" value={vehicleFormData.year} onChange={(e) => setVehicleFormData({ ...vehicleFormData, year: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="input-label">Initial Odometer (km)</label>
                  <input type="number" value={vehicleFormData.initialOdometer} onChange={(e) => setVehicleFormData({ ...vehicleFormData, initialOdometer: e.target.value })} className="input-field" />
                </div>
              </div>
            </div>

            {/* Purchase & Initial Costs */}
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Purchase & Initial Costs</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="input-label">Purchase Price (EUR)</label>
                  <input type="number" value={vehicleFormData.purchasePrice} onChange={(e) => setVehicleFormData({ ...vehicleFormData, purchasePrice: e.target.value })} className="input-field" step="0.01" placeholder="0.00" />
                </div>
                <div>
                  <label className="input-label">Purchase Date</label>
                  <input type="date" value={vehicleFormData.purchaseDate} onChange={(e) => setVehicleFormData({ ...vehicleFormData, purchaseDate: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="input-label">Registration Cost (EUR)</label>
                  <input type="number" value={vehicleFormData.registrationCost} onChange={(e) => setVehicleFormData({ ...vehicleFormData, registrationCost: e.target.value })} className="input-field" step="0.01" placeholder="0.00" />
                </div>
                <div>
                  <label className="input-label">Other Initial Costs (EUR)</label>
                  <input type="number" value={vehicleFormData.otherInitialCosts} onChange={(e) => setVehicleFormData({ ...vehicleFormData, otherInitialCosts: e.target.value })} className="input-field" step="0.01" placeholder="0.00" />
                </div>
              </div>
            </div>

            {/* Expected Depreciation */}
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Expected Depreciation</h3>
              <p className="text-xs text-[var(--text-muted)] mb-4">Set the expected yearly depreciation. When you sell the vehicle, the actual depreciation will be calculated automatically.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="input-label">Expected Depreciation (EUR/year)</label>
                  <input type="number" value={vehicleFormData.depreciationYearly} onChange={(e) => setVehicleFormData({ ...vehicleFormData, depreciationYearly: e.target.value })} className="input-field" step="0.01" placeholder="0.00" />
                </div>
              </div>
            </div>

            {/* Financing */}
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Financing</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="input-label">Monthly Payment (EUR)</label>
                  <input type="number" value={vehicleFormData.financingMonthlyPayment} onChange={(e) => setVehicleFormData({ ...vehicleFormData, financingMonthlyPayment: e.target.value })} className="input-field" step="0.01" placeholder="0.00" />
                </div>
                <div>
                  <label className="input-label">Interest Rate (%)</label>
                  <input type="number" value={vehicleFormData.financingInterestRate} onChange={(e) => setVehicleFormData({ ...vehicleFormData, financingInterestRate: e.target.value })} className="input-field" step="0.01" placeholder="0.00" />
                </div>
                <div>
                  <label className="input-label">Start Date</label>
                  <input type="date" value={vehicleFormData.financingStartDate} onChange={(e) => setVehicleFormData({ ...vehicleFormData, financingStartDate: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="input-label">End Date</label>
                  <input type="date" value={vehicleFormData.financingEndDate} onChange={(e) => setVehicleFormData({ ...vehicleFormData, financingEndDate: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="input-label">Total Amount (EUR)</label>
                  <input type="number" value={vehicleFormData.financingTotalAmount} onChange={(e) => setVehicleFormData({ ...vehicleFormData, financingTotalAmount: e.target.value })} className="input-field" step="0.01" placeholder="0.00" />
                </div>
              </div>
            </div>

            {/* Sale/Disposal */}
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Sale / Disposal</h3>
              <p className="text-xs text-[var(--text-muted)] mb-4">When you sell or dispose of this vehicle, enter the details below. This will mark the vehicle as inactive and calculate the actual depreciation.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="input-label">Sale Date</label>
                  <input type="date" value={vehicleFormData.soldDate} onChange={(e) => setVehicleFormData({ ...vehicleFormData, soldDate: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="input-label">Sale Price (EUR)</label>
                  <input type="number" value={vehicleFormData.soldPrice} onChange={(e) => setVehicleFormData({ ...vehicleFormData, soldPrice: e.target.value })} className="input-field" step="0.01" placeholder="0.00" />
                </div>
                {vehicleFormData.soldDate && vehicleFormData.purchasePrice && (
                  <div className="flex items-end">
                    <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                      <p className="text-xs text-[var(--text-muted)] mb-1">Actual Depreciation</p>
                      <p className="text-lg font-semibold text-[var(--text-primary)]">
                        {(parseFloat(vehicleFormData.purchasePrice) - (parseFloat(vehicleFormData.soldPrice) || 0)).toFixed(2)} EUR
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-color)]">
              <button type="button" onClick={() => setShowEditVehicle(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Stats - Row 1: Fuel */}
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Fuel Consumption</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="kpi-card">
            <p className="kpi-label mb-1">Total Distance</p>
            <p className="kpi-value text-xl">{stats.totalDistance.toLocaleString()} <span className="text-sm text-[var(--text-muted)] font-normal">km</span></p>
          </div>
          <div className="kpi-card">
            <p className="kpi-label mb-1">Fuel Cost</p>
            <p className="kpi-value text-xl">{stats.totalFuelCost.toFixed(2)} <span className="text-sm text-[var(--text-muted)] font-normal">EUR</span></p>
          </div>
          <div className="kpi-card">
            <p className="kpi-label mb-1">Avg Consumption</p>
            <p className="kpi-value text-xl">{stats.avgConsumption.toFixed(1)} <span className="text-sm text-[var(--text-muted)] font-normal">km/L</span></p>
          </div>
          <div className="kpi-card">
            <p className="kpi-label mb-1">Fuel Cost/km</p>
            <p className="kpi-value text-xl">{stats.fuelCostPerKm.toFixed(3)} <span className="text-sm text-[var(--text-muted)] font-normal">EUR</span></p>
          </div>
        </div>
      </div>

      {/* Stats - Row 2: Other Costs */}
      <div className="mb-8">
        <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Other Costs</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="kpi-card">
            <p className="kpi-label mb-1">Maintenance</p>
            <p className="kpi-value text-xl">{stats.totalMaintenanceCost.toFixed(2)} <span className="text-sm text-[var(--text-muted)] font-normal">EUR</span></p>
          </div>
          <div className="kpi-card">
            <p className="kpi-label mb-1">{stats.actualDepreciation > 0 ? 'Actual Depreciation' : 'Est. Depreciation'}</p>
            <p className="kpi-value text-xl">{stats.totalDepreciationToDate.toFixed(2)} <span className="text-sm text-[var(--text-muted)] font-normal">EUR</span></p>
          </div>
          <div className="kpi-card">
            <p className="kpi-label mb-1">Running Costs</p>
            <p className="kpi-value text-xl">{stats.runningCosts.toFixed(2)} <span className="text-sm text-[var(--text-muted)] font-normal">EUR</span></p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Tax, Insurance, Financing</p>
          </div>
          <div className={`kpi-card ${vehicle.soldPrice ? 'border-[var(--success)]/30' : ''}`}>
            <p className="kpi-label mb-1">{vehicle.soldPrice ? 'Net Cost' : 'Total Cost'}</p>
            <p className="kpi-value text-xl">{stats.netCost.toFixed(2)} <span className="text-sm text-[var(--text-muted)] font-normal">EUR</span></p>
            {vehicle.soldPrice && <p className="text-xs text-[var(--text-muted)] mt-1">After {vehicle.soldPrice.toFixed(0)} EUR sale</p>}
          </div>
          <div className="kpi-card">
            <p className="kpi-label mb-1">Total Cost/km</p>
            <p className="kpi-value text-xl">{stats.totalCostPerKm.toFixed(3)} <span className="text-sm text-[var(--text-muted)] font-normal">EUR</span></p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-[var(--bg-secondary)] rounded-lg w-fit flex-wrap">
        <button onClick={() => setActiveTab('fuel')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'fuel' ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>
          Fuel ({vehicle.fuelEntries.length})
        </button>
        <button onClick={() => setActiveTab('maintenance')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'maintenance' ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>
          Maintenance ({vehicle.maintenanceEntries?.length || 0})
        </button>
        <button onClick={() => setActiveTab('roadtax')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'roadtax' ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>
          Road Tax ({vehicle.roadTaxEntries?.length || 0})
        </button>
        <button onClick={() => setActiveTab('insurance')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'insurance' ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>
          Insurance ({vehicle.insuranceEntries?.length || 0})
        </button>
      </div>

      {/* Fuel Entry Form */}
      {activeTab === 'fuel' && showForm && (
        <div className="glass-card p-6 mb-8 animate-fade-in">
          <h2 className="section-header mb-6">{editingEntry ? 'Edit Fuel Entry' : 'Add Fuel Entry'}</h2>
          {error && <div className="mb-6 p-3 rounded-lg bg-[var(--danger-muted)] border border-[var(--danger)]/20 text-[var(--danger)] text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div><label className="input-label">Date</label><input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="input-field" required /></div>
            <div><label className="input-label">Odometer (km)</label><input type="number" value={formData.odometer} onChange={(e) => setFormData({ ...formData, odometer: e.target.value })} className="input-field" required step="0.1" /></div>
            <div><label className="input-label">Fuel Amount (L)</label><input type="number" value={formData.fuelAmount} onChange={(e) => setFormData({ ...formData, fuelAmount: e.target.value })} className="input-field" required step="0.01" /></div>
            <div><label className="input-label">Cost (EUR)</label><input type="number" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: e.target.value })} className="input-field" required step="0.01" /></div>
            <div><label className="input-label">Gas Station</label><input type="text" value={formData.gasStation} onChange={(e) => setFormData({ ...formData, gasStation: e.target.value })} className="input-field" /></div>
            <div><label className="input-label">Trip Distance (km)</label><input type="number" value={formData.tripDistance} onChange={(e) => setFormData({ ...formData, tripDistance: e.target.value })} className="input-field" step="0.1" /></div>
            <div><label className="input-label">Price/Liter</label><input type="number" value={formData.pricePerLiter} onChange={(e) => setFormData({ ...formData, pricePerLiter: e.target.value })} className="input-field" step="0.001" /></div>
            <div><label className="input-label">Tyres</label><input type="text" value={formData.tyres} onChange={(e) => setFormData({ ...formData, tyres: e.target.value })} className="input-field" /></div>
            <div className="md:col-span-2"><label className="input-label">Notes</label><input type="text" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="input-field" /></div>
            <div className="flex items-end gap-4 md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.fullTank} onChange={(e) => setFormData({ ...formData, fullTank: e.target.checked })} /><span className="text-[var(--text-secondary)] text-sm">Full tank</span></label>
              <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : (editingEntry ? 'Update Entry' : 'Save Entry')}</button>
            </div>
          </form>
        </div>
      )}

      {/* Maintenance Entry Form */}
      {activeTab === 'maintenance' && showMaintenanceForm && (
        <div className="glass-card p-6 mb-8 animate-fade-in">
          <h2 className="section-header mb-6">{editingMaintenance ? 'Edit Maintenance Entry' : 'Add Maintenance Entry'}</h2>
          {error && <div className="mb-6 p-3 rounded-lg bg-[var(--danger-muted)] border border-[var(--danger)]/20 text-[var(--danger)] text-sm">{error}</div>}
          <form onSubmit={handleMaintenanceSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div><label className="input-label">Date *</label><input type="date" value={maintenanceFormData.date} onChange={(e) => setMaintenanceFormData({ ...maintenanceFormData, date: e.target.value })} className="input-field" required /></div>
            <div><label className="input-label">Category *</label><select value={maintenanceFormData.category} onChange={(e) => setMaintenanceFormData({ ...maintenanceFormData, category: e.target.value })} className="input-field" required>{MAINTENANCE_CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}</select></div>
            <div><label className="input-label">Cost (EUR) *</label><input type="number" value={maintenanceFormData.cost} onChange={(e) => setMaintenanceFormData({ ...maintenanceFormData, cost: e.target.value })} className="input-field" required step="0.01" /></div>
            <div><label className="input-label">Odometer (km)</label><input type="number" value={maintenanceFormData.odometer} onChange={(e) => setMaintenanceFormData({ ...maintenanceFormData, odometer: e.target.value })} className="input-field" step="0.1" /></div>
            <div className="md:col-span-2"><label className="input-label">Description *</label><input type="text" value={maintenanceFormData.description} onChange={(e) => setMaintenanceFormData({ ...maintenanceFormData, description: e.target.value })} className="input-field" required /></div>
            <div><label className="input-label">Service Provider</label><input type="text" value={maintenanceFormData.serviceProvider} onChange={(e) => setMaintenanceFormData({ ...maintenanceFormData, serviceProvider: e.target.value })} className="input-field" /></div>
            <div><label className="input-label">Invoice Number</label><input type="text" value={maintenanceFormData.invoiceNumber} onChange={(e) => setMaintenanceFormData({ ...maintenanceFormData, invoiceNumber: e.target.value })} className="input-field" /></div>
            <div className="md:col-span-3"><label className="input-label">Notes</label><input type="text" value={maintenanceFormData.notes} onChange={(e) => setMaintenanceFormData({ ...maintenanceFormData, notes: e.target.value })} className="input-field" /></div>
            <div className="flex items-end"><button type="submit" disabled={saving} className="btn-primary w-full">{saving ? 'Saving...' : (editingMaintenance ? 'Update Entry' : 'Save Entry')}</button></div>
          </form>
        </div>
      )}

      {/* Road Tax Entry Form */}
      {activeTab === 'roadtax' && showRoadTaxForm && (
        <div className="glass-card p-6 mb-8 animate-fade-in">
          <h2 className="section-header mb-6">{editingRoadTax ? 'Edit Road Tax Entry' : 'Add Road Tax Entry'}</h2>
          {error && <div className="mb-6 p-3 rounded-lg bg-[var(--danger-muted)] border border-[var(--danger)]/20 text-[var(--danger)] text-sm">{error}</div>}
          <form onSubmit={handleRoadTaxSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div><label className="input-label">Start Date *</label><input type="date" value={roadTaxFormData.startDate} onChange={(e) => setRoadTaxFormData({ ...roadTaxFormData, startDate: e.target.value })} className="input-field" required /></div>
            <div><label className="input-label">End Date *</label><input type="date" value={roadTaxFormData.endDate} onChange={(e) => setRoadTaxFormData({ ...roadTaxFormData, endDate: e.target.value })} className="input-field" required /></div>
            <div><label className="input-label">Cost (EUR) *</label><input type="number" value={roadTaxFormData.cost} onChange={(e) => setRoadTaxFormData({ ...roadTaxFormData, cost: e.target.value })} className="input-field" required step="0.01" /></div>
            <div><label className="input-label">Notes</label><input type="text" value={roadTaxFormData.notes} onChange={(e) => setRoadTaxFormData({ ...roadTaxFormData, notes: e.target.value })} className="input-field" /></div>
            <div className="flex items-end"><button type="submit" disabled={saving} className="btn-primary w-full">{saving ? 'Saving...' : (editingRoadTax ? 'Update Entry' : 'Save Entry')}</button></div>
          </form>
        </div>
      )}

      {/* Insurance Entry Form */}
      {activeTab === 'insurance' && showInsuranceForm && (
        <div className="glass-card p-6 mb-8 animate-fade-in">
          <h2 className="section-header mb-6">{editingInsurance ? 'Edit Insurance Entry' : 'Add Insurance Entry'}</h2>
          {error && <div className="mb-6 p-3 rounded-lg bg-[var(--danger-muted)] border border-[var(--danger)]/20 text-[var(--danger)] text-sm">{error}</div>}
          <form onSubmit={handleInsuranceSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div><label className="input-label">Start Date *</label><input type="date" value={insuranceFormData.startDate} onChange={(e) => setInsuranceFormData({ ...insuranceFormData, startDate: e.target.value })} className="input-field" required /></div>
            <div><label className="input-label">End Date *</label><input type="date" value={insuranceFormData.endDate} onChange={(e) => setInsuranceFormData({ ...insuranceFormData, endDate: e.target.value })} className="input-field" required /></div>
            <div><label className="input-label">Cost (EUR) *</label><input type="number" value={insuranceFormData.cost} onChange={(e) => setInsuranceFormData({ ...insuranceFormData, cost: e.target.value })} className="input-field" required step="0.01" /></div>
            <div><label className="input-label">Coverage</label><select value={insuranceFormData.coverage} onChange={(e) => setInsuranceFormData({ ...insuranceFormData, coverage: e.target.value })} className="input-field">{COVERAGE_TYPES.map(cov => <option key={cov.value} value={cov.value}>{cov.label}</option>)}</select></div>
            <div><label className="input-label">Provider</label><input type="text" value={insuranceFormData.provider} onChange={(e) => setInsuranceFormData({ ...insuranceFormData, provider: e.target.value })} className="input-field" /></div>
            <div><label className="input-label">Policy Number</label><input type="text" value={insuranceFormData.policyNumber} onChange={(e) => setInsuranceFormData({ ...insuranceFormData, policyNumber: e.target.value })} className="input-field" /></div>
            <div><label className="input-label">Notes</label><input type="text" value={insuranceFormData.notes} onChange={(e) => setInsuranceFormData({ ...insuranceFormData, notes: e.target.value })} className="input-field" /></div>
            <div className="flex items-end"><button type="submit" disabled={saving} className="btn-primary w-full">{saving ? 'Saving...' : (editingInsurance ? 'Update Entry' : 'Save Entry')}</button></div>
          </form>
        </div>
      )}

      {/* Fuel Entries Table */}
      {activeTab === 'fuel' && (
        <div className="glass-card overflow-hidden">
          <div className="p-5 border-b border-[var(--border-color)]"><h2 className="section-header">Fuel History</h2></div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Date</th><th>Odometer</th><th>Trip</th><th>Fuel</th><th>Cost</th><th>km/L</th><th>Station</th><th>Price/L</th><th>Tyres</th><th></th></tr></thead>
              <tbody>
                {vehicle.fuelEntries.length === 0 ? (
                  <tr><td colSpan="10" className="text-center py-12"><div className="text-[var(--text-muted)]"><p className="text-sm">No fuel entries yet</p></div></td></tr>
                ) : (
                  [...vehicle.fuelEntries].reverse().map((entry, index, arr) => {
                    const prevEntry = arr[index + 1];
                    let consumption = null;
                    if (entry.tripDistance && entry.tripDistance > 0 && entry.fuelAmount > 0) {
                      consumption = entry.tripDistance / entry.fuelAmount;
                    } else if (prevEntry && entry.fullTank) {
                      const distance = entry.odometer - prevEntry.odometer;
                      if (distance > 0 && entry.fuelAmount > 0) consumption = distance / entry.fuelAmount;
                    }
                    return (
                      <tr key={entry.id}>
                        <td>{new Date(entry.date).toLocaleDateString()}</td>
                        <td>{entry.odometer.toLocaleString()} km</td>
                        <td className="text-[var(--text-muted)]">{entry.tripDistance ? `${entry.tripDistance.toFixed(1)} km` : '-'}</td>
                        <td>{entry.fuelAmount.toFixed(2)} L</td>
                        <td>{entry.cost.toFixed(2)} EUR</td>
                        <td>{consumption ? <span className={consumption < 10 ? 'text-[var(--warning)]' : 'text-[var(--success)]'}>{consumption.toFixed(1)}</span> : <span className="text-[var(--text-muted)]">-</span>}</td>
                        <td className="text-[var(--text-muted)]">{entry.gasStation || '-'}</td>
                        <td className="text-[var(--text-muted)]">{entry.pricePerLiter ? `${entry.pricePerLiter.toFixed(3)}` : '-'}</td>
                        <td className="text-[var(--text-muted)]">{entry.tyres || '-'}</td>
                        <td><div className="flex gap-1"><button onClick={() => handleEditEntry(entry)} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent-secondary)] transition-colors" title="Edit"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button><button onClick={() => handleDelete(entry.id)} className="btn-danger p-1.5" title="Delete"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Maintenance Entries Table */}
      {activeTab === 'maintenance' && (
        <div className="glass-card overflow-hidden">
          <div className="p-5 border-b border-[var(--border-color)]"><h2 className="section-header">Maintenance History</h2></div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Cost</th><th>Odometer</th><th>Provider</th><th>Invoice</th><th></th></tr></thead>
              <tbody>
                {(!vehicle.maintenanceEntries || vehicle.maintenanceEntries.length === 0) ? (
                  <tr><td colSpan="8" className="text-center py-12"><div className="text-[var(--text-muted)]"><p className="text-sm">No maintenance entries yet</p></div></td></tr>
                ) : (
                  vehicle.maintenanceEntries.map((entry) => {
                    const category = MAINTENANCE_CATEGORIES.find(c => c.value === entry.category);
                    return (
                      <tr key={entry.id}>
                        <td>{new Date(entry.date).toLocaleDateString()}</td>
                        <td><span className="px-2 py-1 rounded-md text-xs font-medium bg-[var(--accent-subtle)] text-[var(--accent-secondary)]">{category?.label || entry.category}</span></td>
                        <td>{entry.description}</td>
                        <td>{entry.cost.toFixed(2)} EUR</td>
                        <td className="text-[var(--text-muted)]">{entry.odometer ? `${entry.odometer.toLocaleString()} km` : '-'}</td>
                        <td className="text-[var(--text-muted)]">{entry.serviceProvider || '-'}</td>
                        <td className="text-[var(--text-muted)]">{entry.invoiceNumber || '-'}</td>
                        <td><div className="flex gap-1"><button onClick={() => handleEditMaintenance(entry)} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent-secondary)] transition-colors" title="Edit"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button><button onClick={() => handleDeleteMaintenance(entry.id)} className="btn-danger p-1.5" title="Delete"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Road Tax Entries Table */}
      {activeTab === 'roadtax' && (
        <div className="glass-card overflow-hidden">
          <div className="p-5 border-b border-[var(--border-color)]"><h2 className="section-header">Road Tax History</h2></div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Period</th><th>Cost</th><th>Notes</th><th></th></tr></thead>
              <tbody>
                {(!vehicle.roadTaxEntries || vehicle.roadTaxEntries.length === 0) ? (
                  <tr><td colSpan="4" className="text-center py-12"><div className="text-[var(--text-muted)]"><p className="text-sm">No road tax entries yet</p></div></td></tr>
                ) : (
                  vehicle.roadTaxEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{new Date(entry.startDate).toLocaleDateString()} - {new Date(entry.endDate).toLocaleDateString()}</td>
                      <td>{entry.cost.toFixed(2)} EUR</td>
                      <td className="text-[var(--text-muted)]">{entry.notes || '-'}</td>
                      <td><div className="flex gap-1"><button onClick={() => handleEditRoadTax(entry)} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent-secondary)] transition-colors" title="Edit"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button><button onClick={() => handleDeleteRoadTax(entry.id)} className="btn-danger p-1.5" title="Delete"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Insurance Entries Table */}
      {activeTab === 'insurance' && (
        <div className="glass-card overflow-hidden">
          <div className="p-5 border-b border-[var(--border-color)]"><h2 className="section-header">Insurance History</h2></div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Period</th><th>Cost</th><th>Coverage</th><th>Provider</th><th>Policy #</th><th>Notes</th><th></th></tr></thead>
              <tbody>
                {(!vehicle.insuranceEntries || vehicle.insuranceEntries.length === 0) ? (
                  <tr><td colSpan="7" className="text-center py-12"><div className="text-[var(--text-muted)]"><p className="text-sm">No insurance entries yet</p></div></td></tr>
                ) : (
                  vehicle.insuranceEntries.map((entry) => {
                    const coverage = COVERAGE_TYPES.find(c => c.value === entry.coverage);
                    return (
                      <tr key={entry.id}>
                        <td>{new Date(entry.startDate).toLocaleDateString()} - {new Date(entry.endDate).toLocaleDateString()}</td>
                        <td>{entry.cost.toFixed(2)} EUR</td>
                        <td><span className="px-2 py-1 rounded-md text-xs font-medium bg-[var(--accent-subtle)] text-[var(--accent-secondary)]">{coverage?.label || entry.coverage || '-'}</span></td>
                        <td className="text-[var(--text-muted)]">{entry.provider || '-'}</td>
                        <td className="text-[var(--text-muted)]">{entry.policyNumber || '-'}</td>
                        <td className="text-[var(--text-muted)]">{entry.notes || '-'}</td>
                        <td><div className="flex gap-1"><button onClick={() => handleEditInsurance(entry)} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent-secondary)] transition-colors" title="Edit"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button><button onClick={() => handleDeleteInsurance(entry.id)} className="btn-danger p-1.5" title="Delete"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
