import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AdopterHome() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="bg-card rounded-card shadow-soft border border-border p-10 max-w-md w-full text-center">
        <div className="text-5xl mb-4" aria-hidden="true">🐾</div>
        <h1 className="text-3xl font-extrabold font-heading text-main mb-2">
          Welcome, {user?.name}!
        </h1>
        <p className="text-muted text-sm mb-8">
          You're signed in as an adopter. Animal browsing comes in Phase 4.
        </p>
        <button
          onClick={handleLogout}
          id="adopter-logout-btn"
          className="
            w-full py-3 px-4 rounded-lg border border-border bg-white
            text-sm font-semibold text-main
            hover:bg-background transition-colors
            focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30
          "
        >
          Log out
        </button>
      </div>
    </div>
  );
}
