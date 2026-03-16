import { useAuth } from '../context/AuthContext';
import AdminLayout from '@admin/components/Layout';
import CoordinatorLayout from '@coordinator/components/Layout';
import { Navigate } from 'react-router-dom';

/**
 * RoleLayout – Renders the correct layout (admin sidebar or coordinator navbar)
 * based on the user's selected role at login.
 */
export default function RoleLayout() {
  const { selectedRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (selectedRole === 'admin') return <AdminLayout />;
  if (selectedRole === 'coordinator') return <CoordinatorLayout />;
  return <Navigate to="/login" replace />;
}
