import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * AdminLayout — wraps approved center-admin pages with a persistent sidebar.
 * The sidebar collapses into a hamburger menu on mobile.
 *
 * Props:
 *   children — page content
 *   centerName — displayed in the sidebar header
 */
export default function AdminLayout({ children, centerName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navItems = [
    { to: '/center/animals', label: 'Animals', icon: '🐾' },
    { to: '/center/profile', label: 'Center Profile', icon: '🏢' },
    // No Applications link — Phase 5
  ];

  const linkClass = ({ isActive }) =>
    [
      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors w-full',
      isActive
        ? 'bg-admin-bg text-admin-accent border border-admin-accent/20'
        : 'text-muted hover:text-main hover:bg-admin-bg/60',
    ].join(' ');

  return (
    <div className="min-h-screen bg-admin-bg text-main flex flex-col md:flex-row font-sans">
      {/* ── Mobile top bar ────────────────────────────────────────────────── */}
      <header className="md:hidden bg-white border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden="true">🐾</span>
          <span className="font-heading font-extrabold text-admin-accent tracking-tight text-lg">
            Furry Tales
          </span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          id="admin-mobile-menu-btn"
          className="p-2 rounded-md hover:bg-admin-bg border border-border text-main focus:outline-none"
          aria-label="Toggle navigation"
        >
          {sidebarOpen ? '✕' : '☰'}
        </button>
      </header>

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside
        className={[
          'fixed md:static inset-y-0 left-0 z-30',
          'w-64 bg-white border-r border-border flex flex-col justify-between',
          'transform transition-transform duration-200 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        <div>
          {/* Logo */}
          <div className="p-6 border-b border-border hidden md:flex items-center gap-2">
            <span className="text-2xl" aria-hidden="true">🐾</span>
            <div>
              <p className="font-heading font-extrabold text-admin-accent text-lg leading-tight">
                Furry Tales
              </p>
              <p className="text-[11px] text-muted font-mono uppercase tracking-wider">
                Center Admin
              </p>
            </div>
          </div>

          {/* Center name */}
          {centerName && (
            <div className="px-4 pt-4 pb-2">
              <p className="text-xs text-muted uppercase tracking-wider font-semibold">Your center</p>
              <p className="text-sm font-bold text-main truncate mt-0.5">{centerName}</p>
            </div>
          )}

          {/* Nav */}
          <nav className="p-4 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={linkClass}
                onClick={() => setSidebarOpen(false)}
                id={`sidebar-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}-link`}
              >
                <span aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* User info + logout */}
        <div className="p-4 border-t border-border bg-admin-bg/40">
          <p className="text-xs text-muted">Signed in as</p>
          <p className="text-sm font-bold truncate text-main">{user?.name}</p>
          <p className="text-[11px] text-muted truncate mb-3">{user?.email}</p>
          <button
            onClick={handleLogout}
            id="admin-sidebar-logout-btn"
            className="w-full py-2 px-3 rounded-lg border border-border bg-white text-xs font-semibold text-main hover:bg-admin-bg hover:text-error transition-colors"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
