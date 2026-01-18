import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const register = (data) => api.post('/auth/register', data);
export const login = (data) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');

// Vehicles
export const getVehicles = () => api.get('/vehicles');
export const getVehicle = (id) => api.get(`/vehicles/${id}`);
export const createVehicle = (data) => api.post('/vehicles', data);
export const updateVehicle = (id, data) => api.put(`/vehicles/${id}`, data);
export const deleteVehicle = (id) => api.delete(`/vehicles/${id}`);

// Fuel Entries
export const getFuelEntries = (vehicleId) => api.get(`/fuel-entries/vehicle/${vehicleId}`);
export const createFuelEntry = (data) => api.post('/fuel-entries', data);
export const updateFuelEntry = (id, data) => api.put(`/fuel-entries/${id}`, data);
export const deleteFuelEntry = (id) => api.delete(`/fuel-entries/${id}`);

// Maintenance Entries
export const createMaintenanceEntry = (data) => api.post('/maintenance-entries', data);
export const updateMaintenanceEntry = (id, data) => api.put(`/maintenance-entries/${id}`, data);
export const deleteMaintenanceEntry = (id) => api.delete(`/maintenance-entries/${id}`);

// Road Tax Entries
export const createRoadTaxEntry = (data) => api.post('/road-tax-entries', data);
export const updateRoadTaxEntry = (id, data) => api.put(`/road-tax-entries/${id}`, data);
export const deleteRoadTaxEntry = (id) => api.delete(`/road-tax-entries/${id}`);

// Insurance Entries
export const createInsuranceEntry = (data) => api.post('/insurance-entries', data);
export const updateInsuranceEntry = (id, data) => api.put(`/insurance-entries/${id}`, data);
export const deleteInsuranceEntry = (id) => api.delete(`/insurance-entries/${id}`);

// Dashboard
export const getDashboardStats = () => api.get('/dashboard/stats');

// Recent Activity
export const getRecentActivity = (limit = 50, type = null) => {
  const params = new URLSearchParams({ limit });
  if (type) params.append('type', type);
  return api.get(`/recent-activity?${params}`);
};

export default api;
