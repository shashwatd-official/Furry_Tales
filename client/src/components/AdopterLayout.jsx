import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * AdopterLayout — Warm, airy layout for adopters (/home and /animals).
 * Adopter-only navigation with "Home" and "Find a Friend".
 * Mobile menu toggle, account dropdown with logout, skip-to-content link, and footer.
 */
export default function AdopterLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navLinks = [
    { to: '/home', label: 'Home', id: 'nav-home-link' },
    { to: '/animals', label: 'Find a Friend', id: 'nav-animals-link' },
  ];

  return (
    <div className="min-h-screen bg-background text-main flex flex-col font-sans">
      {/* Skip to main content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-md focus:shadow-md focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Top navigation */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-border sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <NavLink
            to="/home"
            className="flex items-center gap-2 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1"
            aria-label="Furry Tales Home"
          >
            <span className="text-2xl transition-transform duration-200 group-hover:scale-110 motion-reduce:group-hover:scale-100" aria-hidden="true">
              🐾
            </span>
            <span className="font-heading font-extrabold text-xl text-primary tracking-tight">
              Furry Tales
            </span>
          </NavLink>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                id={link.id}
                className={({ isActive }) =>
                  [
                    'text-sm font-semibold transition-colors py-1 border-b-2',
                    isActive
                      ? 'text-primary border-primary'
                      : 'text-muted border-transparent hover:text-main hover:border-border',
                  ].join(' ')
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* User menu (Desktop) */}
          <div className="hidden md:flex items-center gap-4">
            <span className="text-sm font-medium text-muted">
              Hi, <span className="text-main font-semibold">{user?.name}</span>
            </span>
            <button
              onClick={handleLogout}
              id="adopter-logout-btn"
              className="py-1.5 px-3.5 rounded-lg border border-border bg-card text-xs font-semibold text-main hover:bg-background hover:text-error hover:border-error/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Log out
            </button>
          </div>

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            id="adopter-mobile-menu-btn"
            className="md:hidden p-2 rounded-lg border border-border text-main hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
          >
            <span className="text-lg leading-none" aria-hidden="true">
              {menuOpen ? '✕' : '☰'}
            </span>
          </button>
        </div>

        {/* Mobile menu dropdown */}
        {menuOpen && (
          <div className="md:hidden border-t border-border bg-white px-4 py-4 space-y-3">
            <nav className="flex flex-col space-y-2" aria-label="Mobile main navigation">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  id={`mobile-${link.id}`}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    [
                      'px-3 py-2 rounded-lg text-base font-semibold transition-colors',
                      isActive
                        ? 'bg-accent-blush/40 text-primary font-bold'
                        : 'text-muted hover:text-main hover:bg-background',
                    ].join(' ')
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
            <div className="pt-3 border-t border-border flex items-center justify-between">
              <span className="text-sm font-medium text-main">
                {user?.name}
              </span>
              <button
                onClick={handleLogout}
                id="mobile-adopter-logout-btn"
                className="py-1.5 px-3.5 rounded-lg border border-border bg-card text-xs font-semibold text-main hover:bg-background hover:text-error hover:border-error/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Log out
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main content body */}
      <main id="main-content" className="flex-1 min-w-0">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-white/50 py-8 px-4 text-center mt-16">
        <p className="font-heading font-extrabold text-main text-base mb-1">
          🐾 Furry Tales
        </p>
        <p className="text-sm text-muted">
          Every pet deserves a loving home. Connecting rescue animals with caring adopters.
        </p>
      </footer>
    </div>
  );
}
