import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RootRoute from './components/RootRoute';
import RequireRole from './components/RequireRole';
import AdopterHome from './pages/AdopterHome';
import CenterDashboard from './pages/CenterDashboard';
import CenterAnimalsPage from './pages/CenterAnimalsPage';
import CenterAnimalFormPage from './pages/CenterAnimalFormPage';
import CenterProfilePage from './pages/CenterProfilePage';
import OwnerPanel from './pages/OwnerPanel';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* / → login page if logged out, role page if logged in */}
          <Route path="/" element={<RootRoute />} />

          {/* Adopter-only pages */}
          <Route
            path="/home"
            element={
              <RequireRole allowedRoles={['adopter']}>
                <AdopterHome />
              </RequireRole>
            }
          />

          {/* Center admin-only pages */}
          <Route
            path="/center"
            element={
              <RequireRole allowedRoles={['center_admin']}>
                <CenterDashboard />
              </RequireRole>
            }
          />
          <Route
            path="/center/animals"
            element={
              <RequireRole allowedRoles={['center_admin']}>
                <CenterAnimalsPage />
              </RequireRole>
            }
          />
          <Route
            path="/center/animals/new"
            element={
              <RequireRole allowedRoles={['center_admin']}>
                <CenterAnimalFormPage />
              </RequireRole>
            }
          />
          <Route
            path="/center/animals/:id/edit"
            element={
              <RequireRole allowedRoles={['center_admin']}>
                <CenterAnimalFormPage />
              </RequireRole>
            }
          />
          <Route
            path="/center/profile"
            element={
              <RequireRole allowedRoles={['center_admin']}>
                <CenterProfilePage />
              </RequireRole>
            }
          />

          {/* Owner-only pages */}
          <Route
            path="/owner"
            element={
              <RequireRole allowedRoles={['owner']}>
                <OwnerPanel />
              </RequireRole>
            }
          />

          {/* Catch-all: redirect any unknown URL back to / */}
          <Route path="*" element={<RootRoute />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
