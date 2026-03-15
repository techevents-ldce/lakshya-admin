import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import EventForm from './pages/EventForm';
import Coordinators from './pages/Coordinators';
import CoordinatorForm from './pages/CoordinatorForm';
import Users from './pages/Users';
import Registrations from './pages/Registrations';
import Payments from './pages/Payments';
import AuditLogs from './pages/AuditLogs';
import Export from './pages/Export';

export default function App() {
  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { borderRadius: '10px', background: '#1e293b', color: '#f1f5f9' } }} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="events" element={<Events />} />
          <Route path="events/new" element={<EventForm />} />
          <Route path="events/:id/edit" element={<EventForm />} />
          <Route path="coordinators" element={<Coordinators />} />
          <Route path="coordinators/new" element={<CoordinatorForm />} />
          <Route path="users" element={<Users />} />
          <Route path="registrations" element={<Registrations />} />
          <Route path="payments" element={<Payments />} />
          <Route path="audit-logs" element={<AuditLogs />} />
          <Route path="export" element={<Export />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}
