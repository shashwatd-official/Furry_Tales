import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { homeRouteForUser } from '../context/AuthContext';

/**
 * RequireRole — route guard.
 *
 * - Auth still loading → spinner (never flash the wrong page)
 * - Not logged in      → back to / (login page)
 * - Wrong role         → redirect to the user's own home (homeRouteForUser)
 * - Correct role       → render children
 *
 * `allowedRoles` is an array, e.g. ['adopter'] or ['center_admin']
 *
 * homeRouteForUser is the single routing source of truth, so a
 * center_admin with an approved center is always sent to /center/animals,
 * not to /center, when they hit a page they can't access.
 */
export default function RequireRole({ allowedRoles, children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div
          className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  // Not logged in at all → back to login
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Logged in but wrong role → redirect to their own home
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={homeRouteForUser(user)} replace />;
  }

  return children;
}
