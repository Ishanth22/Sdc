import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MetricsForm from './pages/MetricsForm';
import History from './pages/History';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import AdminStartupDetail from './pages/AdminStartupDetail';

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={
        <ProtectedRoute requiredRole="founder"><Dashboard /></ProtectedRoute>
      } />
      <Route path="/metrics/new" element={
        <ProtectedRoute requiredRole="founder"><MetricsForm /></ProtectedRoute>
      } />
      <Route path="/history" element={
        <ProtectedRoute requiredRole="founder"><History /></ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute requiredRole="founder"><Profile /></ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>
      } />
      <Route path="/admin/startup/:id" element={
        <ProtectedRoute requiredRole="admin"><AdminStartupDetail /></ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
