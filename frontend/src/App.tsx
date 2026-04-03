import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { AppLayout } from '@/components/layout/AppLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ProtectedRoute, AdminRoute } from '@/components/layout/ProtectedRoute';

import { LoginPage } from '@/pages/LoginPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { SitesListPage } from '@/pages/SitesListPage';
import { SiteDetailPage } from '@/pages/SiteDetailPage';
import { AlertsPage } from '@/pages/AlertsPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { CamerasPage } from '@/pages/CamerasPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { AdminSitesPage } from '@/pages/admin/AdminSitesPage';
import { AdminCamerasPage } from '@/pages/admin/AdminCamerasPage';
import { AdminSettingsPage } from '@/pages/admin/AdminSettingsPage';
import { AdminSystemPage } from '@/pages/admin/AdminSystemPage';
import { AdminAuditLogPage } from '@/pages/admin/AdminAuditLogPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 20000 },
  },
});

function AppInit({ children }: { children: React.ReactNode }) {
  const init = useAuthStore(s => s.init);
  useEffect(() => { init(); }, [init]);
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppInit>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

            {/* Protected */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/sites" element={<SitesListPage />} />
                <Route path="/sites/:id" element={<SiteDetailPage />} />
                <Route path="/alerts" element={<AlertsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/cameras" element={<CamerasPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/profile" element={<SettingsPage />} />

                {/* Admin */}
                <Route element={<AdminRoute />}>
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="users" element={<AdminUsersPage />} />
                    <Route path="sites" element={<AdminSitesPage />} />
                    <Route path="cameras" element={<AdminCamerasPage />} />
                    <Route path="settings" element={<AdminSettingsPage />} />
                    <Route path="system" element={<AdminSystemPage />} />
                    <Route path="audit-log" element={<AdminAuditLogPage />} />
                  </Route>
                </Route>
              </Route>
            </Route>

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AppInit>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
