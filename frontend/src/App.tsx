import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { POS } from './pages/POS';
import { Inventory } from './pages/Inventory';
import { Purchases } from './pages/Purchases';
import { Clients } from './pages/Clients';
import { Reports } from './pages/Reports';
import { AdminUsers } from './pages/AdminUsers';
import { AdminSettings } from './pages/AdminSettings';
import { Profile } from './pages/Profile';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isAuthenticated, isLoading, user, hasRole } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !hasRole(allowedRoles as any)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />

      {/* Protected routes with layout */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/pos" element={<ProtectedRoute allowedRoles={['OPERATOR', 'ADMIN']}><POS /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute allowedRoles={['OPERATOR', 'ADMIN']}><Inventory /></ProtectedRoute>} />
        <Route path="/purchases" element={<ProtectedRoute allowedRoles={['OPERATOR', 'ADMIN']}><Purchases /></ProtectedRoute>} />
        <Route path="/clients" element={<ProtectedRoute allowedRoles={['OPERATOR', 'ADMIN']}><Clients /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute allowedRoles={['OPERATOR', 'ADMIN']}><Reports /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

        {/* Admin only */}
        <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminUsers /></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminSettings /></ProtectedRoute>} />
      </Route>

      {/* Redirect root to dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return <AppRoutes />;
}