import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { AuthProvider } from '@lark-apaas/client-toolkit/auth';
import type { AuthSdkConfig } from '@lark-apaas/client-toolkit/auth';

import { PAGE_ROLE_MAP } from '@shared/roles';

import Layout from './components/Layout';
import ErrorFallback from './components/ErrorFallback';
import AuthGate from './components/AuthGate';
import ProtectedRoute from './components/ProtectedRoute';
import NotFound from './pages/NotFound/NotFound';
import UnauthorizedPage from './pages/unauthorized/UnauthorizedPage';
import WorkbenchPage from './pages/workbench/WorkbenchPage';
import ContentCenterPage from './pages/content-center/ContentCenterPage';
import ConsultationPage from './pages/consultation/ConsultationPage';
import CourseListPage from './pages/courses/CourseListPage';
import CourseDetailPage from './pages/courses/CourseDetailPage';
import StudentsPage from './pages/students/StudentsPage';
import PermissionsPage from './pages/permissions/PermissionsPage';
import SchedulesPage from './pages/schedules/SchedulesPage';
import LeadsPage from './pages/leads/LeadsPage';
import ReportsPage from './pages/reports/ReportsPage';

const CLIENT_BASE = process.env.CLIENT_BASE_PATH || '/';
const PERMISSION_API_URL = `${
  CLIENT_BASE.endsWith('/') ? CLIENT_BASE : `${CLIENT_BASE}/`
}api/auth/my-roles`;

const AUTH_SDK_CONFIG: AuthSdkConfig = {
  permissionApi: { url: PERMISSION_API_URL, timeout: 8000 },
  enable: true,
};

const RoutesComponent = () => {
  return (
    <AuthProvider config={AUTH_SDK_CONFIG}>
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <ErrorFallback
          error={error as Error}
          resetErrorBoundary={resetErrorBoundary}
        />
      )}
    >
    <Routes>
      <Route element={<Layout />}>
        <Route
          index
          element={
            <AuthGate requiredRoles={PAGE_ROLE_MAP['/']} redirectWhenDenied>
              <WorkbenchPage />
            </AuthGate>
          }
        />
        <Route
          path="reports"
          element={
            <ProtectedRoute requiredRoles={PAGE_ROLE_MAP['/reports']}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="content-center"
          element={
            <ProtectedRoute
              requiredRoles={PAGE_ROLE_MAP['/content-center']}
            >
              <ContentCenterPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="leads"
          element={
            <ProtectedRoute requiredRoles={PAGE_ROLE_MAP['/leads']}>
              <LeadsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="consultation"
          element={
            <ProtectedRoute requiredRoles={PAGE_ROLE_MAP['/consultation']}>
              <ConsultationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="courses"
          element={
            <ProtectedRoute requiredRoles={PAGE_ROLE_MAP['/courses']}>
              <CourseListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="courses/:id"
          element={
            <ProtectedRoute requiredRoles={PAGE_ROLE_MAP['/courses/:id']}>
              <CourseDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="students"
          element={
            <ProtectedRoute requiredRoles={PAGE_ROLE_MAP['/students']}>
              <StudentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="schedules"
          element={
            <ProtectedRoute requiredRoles={PAGE_ROLE_MAP['/schedules']}>
              <SchedulesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="permissions"
          element={
            <ProtectedRoute requiredRoles={PAGE_ROLE_MAP['/permissions']}>
              <PermissionsPage />
            </ProtectedRoute>
          }
        />
        <Route path="unauthorized" element={<UnauthorizedPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
    </ErrorBoundary>
    </AuthProvider>
  );
};

export default RoutesComponent;
