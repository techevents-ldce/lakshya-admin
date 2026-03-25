import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import PrivateRoute from './components/PrivateRoute';
import RoleRoute from './components/RoleRoute';
import RoleLayout from './components/RoleLayout';
import Login from './pages/Login';
import RoleDashboard from './pages/RoleDashboard';

// ── Admin pages (imported directly from admin folder) ──
import Events from '@admin/pages/Events';
import EventForm from '@admin/pages/EventForm';
import Coordinators from '@admin/pages/Coordinators';
import CoordinatorForm from '@admin/pages/CoordinatorForm';
import Users from '@admin/pages/Users';
import Registrations from '@admin/pages/Registrations';
import Payments from '@admin/pages/Payments';
import AuditLogs from '@admin/pages/AuditLogs';
import Export from '@admin/pages/Export';
import BulkEmail from '@admin/pages/BulkEmail';
import BulkEmailJobs from '@admin/pages/BulkEmailJobs';
import BulkEmailJobDetail from '@admin/pages/BulkEmailJobDetail';
import Organizers from '@admin/pages/Organizers';
import OrganizerForm from '@admin/pages/OrganizerForm';
import Referrals from '@admin/pages/Referrals';

// ── Coordinator pages (imported directly from coordinator folder) ──
import Participants from '@coordinator/pages/Participants';
import Teams from '@coordinator/pages/Teams';
import Attendance from '@coordinator/pages/Attendance';
import QRScanner from '@coordinator/pages/QRScanner';

export default function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { borderRadius: '10px', background: '#1e293b', color: '#f1f5f9' },
        }}
      />
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Protected – RoleLayout renders admin sidebar or coordinator navbar */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <RoleLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<RoleDashboard />} />

          {/* ── Admin-only routes ── */}
          <Route path="events" element={<RoleRoute role="admin"><Events /></RoleRoute>} />
          <Route path="events/new" element={<RoleRoute role="admin"><EventForm /></RoleRoute>} />
          <Route path="events/:id/edit" element={<RoleRoute role="admin"><EventForm /></RoleRoute>} />
          <Route path="coordinators" element={<RoleRoute role="admin"><Coordinators /></RoleRoute>} />
          <Route path="coordinators/new" element={<RoleRoute role="admin"><CoordinatorForm /></RoleRoute>} />
          <Route path="organizers" element={<RoleRoute role="admin"><Organizers /></RoleRoute>} />
          <Route path="organizers/new" element={<RoleRoute role="admin"><OrganizerForm /></RoleRoute>} />
          <Route path="organizers/:id/edit" element={<RoleRoute role="admin"><OrganizerForm /></RoleRoute>} />
          <Route path="users" element={<RoleRoute role="admin"><Users /></RoleRoute>} />
          <Route path="registrations" element={<RoleRoute role="admin"><Registrations /></RoleRoute>} />
          <Route path="payments" element={<RoleRoute role="admin"><Payments /></RoleRoute>} />
          <Route path="audit-logs" element={<RoleRoute role="admin"><AuditLogs /></RoleRoute>} />
          <Route path="export" element={<RoleRoute role="admin"><Export /></RoleRoute>} />
          <Route path="bulk-email" element={<RoleRoute role="admin"><BulkEmail /></RoleRoute>} />
          <Route path="bulk-email/jobs" element={<RoleRoute role="admin"><BulkEmailJobs /></RoleRoute>} />
          <Route path="bulk-email/jobs/:jobId" element={<RoleRoute role="admin"><BulkEmailJobDetail /></RoleRoute>} />
          <Route path="referrals" element={<RoleRoute role="admin"><Referrals /></RoleRoute>} />

          {/* ── Coordinator-only routes ── */}
          <Route path="events/:id/participants" element={<RoleRoute role="coordinator"><Participants /></RoleRoute>} />
          <Route path="events/:id/teams" element={<RoleRoute role="coordinator"><Teams /></RoleRoute>} />
          <Route path="events/:id/attendance" element={<RoleRoute role="coordinator"><Attendance /></RoleRoute>} />
          <Route path="events/:id/scan" element={<RoleRoute role="coordinator"><QRScanner /></RoleRoute>} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}
