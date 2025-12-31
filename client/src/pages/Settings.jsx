import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export default function Settings() {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleProfileChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await api.put('/auth/profile', {
        name: profileData.name,
        email: profileData.email
      });
      setUser(response.data);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to update profile'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      setLoading(false);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      setLoading(false);
      return;
    }

    try {
      await api.put('/auth/profile', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage({ type: 'success', text: 'Password changed successfully!' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to change password'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-10">
        <h1 className="page-header">Settings</h1>
        <p className="page-subtitle">Manage your account and preferences</p>
      </div>

      {message.text && (
        <div className={`mb-6 p-3 rounded-lg text-sm flex items-center gap-2 animate-fade-in ${
          message.type === 'success'
            ? 'bg-[var(--success-muted)] text-[var(--success)] border border-[var(--success)]/20'
            : 'bg-[var(--danger-muted)] text-[var(--danger)] border border-[var(--danger)]/20'
        }`}>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {message.type === 'success' ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            )}
          </svg>
          {message.text}
        </div>
      )}

      {/* Profile Settings */}
      <div className="glass-card p-6 mb-6">
        <h2 className="section-header mb-6">Profile Information</h2>
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <label className="input-label">Name</label>
            <input
              type="text"
              name="name"
              value={profileData.name}
              onChange={handleProfileChange}
              className="input-field"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="input-label">Email</label>
            <input
              type="email"
              name="email"
              value={profileData.email}
              onChange={handleProfileChange}
              className="input-field"
              placeholder="your@email.com"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>

      {/* Password Settings */}
      <div className="glass-card p-6">
        <h2 className="section-header mb-6">Change Password</h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="input-label">Current Password</label>
            <input
              type="password"
              name="currentPassword"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              className="input-field"
              placeholder="Enter current password"
              required
            />
          </div>
          <div>
            <label className="input-label">New Password</label>
            <input
              type="password"
              name="newPassword"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              className="input-field"
              placeholder="Enter new password"
              required
            />
          </div>
          <div>
            <label className="input-label">Confirm New Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              className="input-field"
              placeholder="Confirm new password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
