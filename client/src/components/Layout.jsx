import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Navigation - minimal top bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-primary)]/80 backdrop-blur-xl border-b border-[var(--border-color)]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex justify-between items-center h-14">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)] flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-base font-semibold text-[var(--text-primary)]" style={{ fontFamily: 'Syne, sans-serif' }}>
                Mileage<span className="text-[var(--accent-secondary)]">Tracker</span>
              </span>
            </Link>

            {/* Nav Links */}
            {user && (
              <div className="flex items-center gap-1">
                <Link
                  to="/"
                  className={`nav-link flex items-center gap-2 ${isActive('/') && location.pathname === '/' ? 'active' : ''}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                  <span>Dashboard</span>
                </Link>
                <Link
                  to="/vehicles"
                  className={`nav-link flex items-center gap-2 ${isActive('/vehicles') ? 'active' : ''}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                  </svg>
                  <span>Vehicles</span>
                </Link>
              </div>
            )}

            {/* User Menu */}
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <Link
                    to="/settings"
                    className={`flex items-center gap-2 text-sm ${
                      isActive('/settings')
                        ? 'text-[var(--accent-secondary)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    } transition-colors`}
                  >
                    <div className="w-7 h-7 rounded-full bg-[var(--accent-primary)] flex items-center justify-center text-white text-xs font-semibold">
                      {(user.name || user.email)[0].toUpperCase()}
                    </div>
                    <span className="hidden sm:block font-medium">
                      {user.name || user.email.split('@')[0]}
                    </span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors font-medium"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    to="/login"
                    className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium transition-colors"
                  >
                    Sign in
                  </Link>
                  <Link to="/register" className="btn-primary text-sm py-2 px-4">
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-20 pb-12 px-6">
        <div className="max-w-6xl mx-auto animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
