import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoginPage from '../pages/LoginPage';

/**
 * RootRoute:
 * - If auth is still loading → show spinner
 * - If logged in → redirect to role-appropriate page
 * - If not logged in → show LoginPage
 */
export default function RootRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" role="status" aria-label="Loading" />
      </div>
    );
  }

  if (user) {
    if (user.role === 'adopter') return <Navigate to="/home" replace />;
    if (user.role === 'center_admin') return <Navigate to="/center" replace />;
    if (user.role === 'owner') return <Navigate to="/owner" replace />;
  }

  return <LoginPage />;
}
