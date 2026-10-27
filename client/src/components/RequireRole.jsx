import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Redirects based on the user's ACTUAL role from the server.
 * - Logged-out users → /  (login page)
 * - Wrong role → their own page
 * - Right role → renders children
 *
 * `allowedRoles` is an array, e.g. ['adopter'] or ['center_admin']
 */
export default function RequireRole({ allowedRoles, children }) {
  const { user, loading } = useAuth();

  if (loading) {
    // Show a neutral loading state while /api/auth/me is in-flight
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" role="status" aria-label="Loading" />
      </div>
    );
  }

  // Not logged in at all → back to login
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Logged in but wrong role → redirect to their actual page
  if (!allowedRoles.includes(user.role)) {
    if (user.role === 'adopter') return <Navigate to="/home" replace />;
    if (user.role === 'center_admin') return <Navigate to="/center" replace />;
    if (user.role === 'owner') return <Navigate to="/owner" replace />;
  }

  return children;
}
