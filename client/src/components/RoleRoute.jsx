import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * RoleRoute – Guards individual routes behind a specific role.
 * If the user's selectedRole doesn't match, redirects to /login.
 */
export default function RoleRoute({ role, requireSuperadmin = false, children }) {
  const { user, selectedRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user || !selectedRole) return <Navigate to="/login" replace />;

  // If the user's selected role doesn't match what this route expects, redirect
  if (selectedRole !== role) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireSuperadmin && user.role !== 'superadmin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
