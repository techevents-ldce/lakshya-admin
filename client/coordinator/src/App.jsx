import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Participants from './pages/Participants';
import QRScanner from './pages/QRScanner';

export default function App() {
  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { borderRadius: '10px', background: '#134e4a', color: '#f0fdfa' } }} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="events/:id/participants" element={<Participants />} />
          <Route path="events/:id/scan" element={<QRScanner />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}
