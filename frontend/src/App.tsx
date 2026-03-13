import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MetricsForm from './pages/MetricsForm';
import History from './pages/History';
import Profile from './pages/Profile';
import Milestones from './pages/Milestones';
import AIAdvisor from './pages/AIAdvisor';
import Forecasting from './pages/Forecasting';
import Simulation from './pages/Simulation';
import CustomKPIs from './pages/CustomKPIs';
import Reports from './pages/Reports';
import Plans from './pages/Plans';
import InvestorDashboard from './pages/InvestorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminStartupDetail from './pages/AdminStartupDetail';
import AIRiskDashboard from './pages/AIRiskDashboard';
import AlertSettings from './pages/AlertSettings';

function AppRoutes() {

  return (
    <Routes>
      <Route path="/" element={<Login />} />

      {/* Founder Routes */}
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
      <Route path="/milestones" element={
        <ProtectedRoute requiredRole="founder"><Milestones /></ProtectedRoute>
      } />
      <Route path="/advisor" element={
        <ProtectedRoute requiredRole="founder"><AIAdvisor /></ProtectedRoute>
      } />
      <Route path="/forecasting" element={
        <ProtectedRoute requiredRole="founder"><Forecasting /></ProtectedRoute>
      } />
      <Route path="/simulation" element={
        <ProtectedRoute requiredRole="founder"><Simulation /></ProtectedRoute>
      } />
      <Route path="/custom-kpis" element={
        <ProtectedRoute requiredRole="founder"><CustomKPIs /></ProtectedRoute>
      } />
      <Route path="/reports" element={
        <ProtectedRoute requiredRole="founder"><Reports /></ProtectedRoute>
      } />
      <Route path="/plans" element={
        <ProtectedRoute requiredRole="founder"><Plans /></ProtectedRoute>
      } />
      <Route path="/ai-risk" element={
        <ProtectedRoute requiredRole="founder"><AIRiskDashboard /></ProtectedRoute>
      } />
      <Route path="/alert-settings" element={
        <ProtectedRoute requiredRole="founder"><AlertSettings /></ProtectedRoute>
      } />

      {/* Investor Routes */}
      <Route path="/investor" element={
        <ProtectedRoute requiredRole="investor"><InvestorDashboard /></ProtectedRoute>
      } />

      {/* Admin Routes */}
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
