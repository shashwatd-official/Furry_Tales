import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { homeRouteForUser } from '../context/AuthContext';
import LoginPage from '../pages/LoginPage';

/**
 * RootRoute — handles "/":
 * - Auth still loading (user === undefined) → spinner (never show login briefly)
 * - Logged in                               → redirect to the role's home page
 * - Not logged in (user === null)           → show LoginPage
 *
 * homeRouteForUser is the single source of truth for routing rules.
 */
export default function RootRoute() {
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

  if (user) {
    return <Navigate to={homeRouteForUser(user)} replace />;
  }

  return <LoginPage />;
}
