import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe, logout as apiLogout } from '../api';

const AuthContext = createContext(null);

/**
 * Shared routing rule: where does each role land?
 *
 * Returns the URL path the given user should be redirected to.
 * This is the SINGLE source of truth used by RootRoute, RequireRole,
 * and LoginPage so the rules cannot drift apart.
 *
 *   adopter                         → /home
 *   owner                           → /owner
 *   center_admin (approved)         → /center/animals
 *   center_admin (pending/rejected/suspended or unknown status) → /center
 *
 * @param {object} user  - the user object from /api/auth/me
 * @returns {string}     - the route path
 */
export function homeRouteForUser(user) {
  if (!user) return '/';
  if (user.role === 'adopter') return '/home';
  if (user.role === 'owner') return '/owner';
  if (user.role === 'center_admin') {
    return user.center?.status === 'approved' ? '/center/animals' : '/center';
  }
  return '/';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading; null = logged out

  /**
   * refresh() calls GET /api/auth/me, stores the result in context,
   * and also RETURNS the fresh user (or null on failure).
   * Callers that need the user for navigation can use the return value
   * instead of a second network call.
   */
  const refresh = useCallback(async () => {
    try {
      const res = await getMe();
      const freshUser = res.data.user;
      setUser(freshUser);
      return freshUser;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  // Load once on mount (initial page load / refresh)
  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch { /* ignore */ }
    setUser(null);
  }, []);

  // loading is true while user is still undefined (initial fetch in flight)
  const loading = user === undefined;

  return (
    <AuthContext.Provider value={{ user, loading, setUser, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
