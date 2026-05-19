import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ProjectsPage } from './pages/projects/ProjectsPage';
import { ProjectDetailPage } from './pages/projects/ProjectDetailPage';
import { TicketsPage } from './pages/tickets/TicketsPage';
import { TicketDetailPage } from './pages/tickets/TicketDetailPage';
import { BoardPage } from './pages/board/BoardPage';
import { GanttPage } from './pages/gantt/GanttPage';
import { UsersPage } from './pages/users/UsersPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { AdminRequestsPage } from './pages/profile/AdminRequestsPage';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({
  children, adminOnly,
}) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && user?.role !== 'ADMIN') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

export default function App() {
  const { token, fetchMe } = useAuthStore();

  useEffect(() => {
    if (token) { fetchMe(); }
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        <Route path="/tickets" element={<TicketsPage />} />
        <Route path="/tickets/:id" element={<TicketDetailPage />} />
        <Route path="/board" element={<BoardPage />} />
        <Route path="/gantt" element={<GanttPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/users" element={
          <ProtectedRoute adminOnly>
            <UsersPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/requests" element={
          <ProtectedRoute adminOnly>
            <AdminRequestsPage />
          </ProtectedRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
