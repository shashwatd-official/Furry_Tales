import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function OwnerPanel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-admin-bg flex flex-col items-center justify-center p-6">
      <div className="bg-card rounded-card shadow-soft border border-border p-10 max-w-md w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-admin-accent mb-1">
              Platform Owner
            </p>
            <h1 className="text-2xl font-extrabold font-heading text-main">Owner Panel</h1>
          </div>
          <span className="text-4xl" aria-hidden="true">🔑</span>
        </div>

        <div className="rounded-xl border border-border bg-admin-bg p-5 text-sm text-muted mb-6 space-y-1.5">
          <p>Signed in as <strong className="text-main">{user?.name || user?.email}</strong></p>
          <p>Center approvals and store management arrive in Phase 2 and Phase 7.</p>
        </div>

        <button
          onClick={handleLogout}
          id="owner-logout-btn"
          className="
            w-full py-2.5 px-4 rounded-lg border border-admin-accent
            bg-white text-sm font-semibold text-admin-accent
            hover:bg-admin-accent hover:text-white transition-colors
            focus:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent/40
          "
        >
          Log out
        </button>
      </div>
    </div>
  );
}
