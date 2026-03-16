import { useAuth } from '../context/AuthContext';
import AdminDashboard from '@admin/pages/Dashboard';
import CoordinatorDashboard from '@coordinator/pages/Dashboard';

/**
 * RoleDashboard – Renders the correct dashboard based on selectedRole.
 * Admin dashboard shows analytics/charts, coordinator dashboard shows assigned events.
 */
export default function RoleDashboard() {
  const { selectedRole } = useAuth();
  if (selectedRole === 'admin') return <AdminDashboard />;
  return <CoordinatorDashboard />;
}
