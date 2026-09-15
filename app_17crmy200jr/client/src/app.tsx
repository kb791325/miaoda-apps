import React, { lazy, Suspense } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';

import Layout from './components/Layout';
import PageLoader from './components/PageLoader';

const InventoryDashboardPage = lazy(() => import('./pages/InventoryDashboard/InventoryDashboardPage'));
const ExpensesPage = lazy(() => import('./pages/Expenses/ExpensesPage'));
const FixedAssetsPage = lazy(() => import('./pages/FixedAssets/FixedAssetsPage'));
const InventoryChecksPage = lazy(() => import('./pages/InventoryChecks/InventoryChecksPage'));
const CategoriesPage = lazy(() => import('./pages/Categories/CategoriesPage'));
const ReportsPage = lazy(() => import('./pages/Reports/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/Settings/SettingsPage'));
const BudgetPage = lazy(() => import('./pages/Budget/BudgetPage'));
const RolesPage = lazy(() => import('./pages/Roles/RolesPage'));
const NotificationsPage = lazy(() => import('./pages/Notifications/NotificationsPage'));
const AuditLogListPage = lazy(() => import('./pages/AuditLog/AuditLogListPage'));
const AuditLogDetailPage = lazy(() => import('./pages/AuditLog/AuditLogDetailPage'));
const AuditLogStatsPage = lazy(() => import('./pages/AuditLog/AuditStatsPage'));
const MonitoringDashboard = lazy(() => import('./pages/Monitoring/MonitoringDashboard'));
const AssetScanPage = lazy(() => import('./pages/AssetScan/AssetScanPage'));
const ReservationListPage = lazy(() => import('./pages/AssetReservations/ReservationListPage'));
const ReservationCreatePage = lazy(() => import('./pages/AssetReservations/ReservationCreatePage'));
const ReservationDetailPage = lazy(() => import('./pages/AssetReservations/ReservationDetailPage'));
const AttachmentManagePage = lazy(() => import('./pages/Attachments/AttachmentManagePage'));
const DashboardPage = lazy(() => import('./pages/Dashboard/DashboardPage'));
const SuppliersPage = lazy(() => import('./pages/Suppliers/SuppliersPage'));
const WorkOrdersPage = lazy(() => import('./pages/WorkOrders/WorkOrdersPage'));
const LicensesPage = lazy(() => import('./pages/Licenses/LicensesPage'));
const NotFound = lazy(() => import('./pages/NotFound/NotFound'));

const RoutesComponent = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />
        <Route path="inventory-dashboard" element={<Suspense fallback={<PageLoader />}><InventoryDashboardPage /></Suspense>} />
        <Route path="expenses" element={<Suspense fallback={<PageLoader />}><ExpensesPage /></Suspense>} />
        <Route path="fixed-assets" element={<Suspense fallback={<PageLoader />}><FixedAssetsPage /></Suspense>} />
        <Route path="fixed-assets/:id" element={<Suspense fallback={<PageLoader />}><FixedAssetsPage /></Suspense>} />
        <Route path="inventory-checks" element={<Suspense fallback={<PageLoader />}><InventoryChecksPage /></Suspense>} />
        <Route path="categories" element={<Suspense fallback={<PageLoader />}><CategoriesPage /></Suspense>} />
        <Route path="reports" element={<Suspense fallback={<PageLoader />}><ReportsPage /></Suspense>} />
        <Route path="settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
        <Route path="budget" element={<Suspense fallback={<PageLoader />}><BudgetPage /></Suspense>} />
        <Route path="roles" element={<Suspense fallback={<PageLoader />}><RolesPage /></Suspense>} />
        <Route path="notifications" element={<Suspense fallback={<PageLoader />}><NotificationsPage /></Suspense>} />
        <Route path="audit-logs" element={<Suspense fallback={<PageLoader />}><AuditLogListPage /></Suspense>} />
        <Route path="audit-logs/stats" element={<Suspense fallback={<PageLoader />}><AuditLogStatsPage /></Suspense>} />
        <Route path="audit-logs/:id" element={<Suspense fallback={<PageLoader />}><AuditLogDetailPage /></Suspense>} />
        <Route path="monitoring" element={<Suspense fallback={<PageLoader />}><MonitoringDashboard /></Suspense>} />
        <Route path="asset-scan" element={<Suspense fallback={<PageLoader />}><AssetScanPage /></Suspense>} />
        <Route path="asset-reservations" element={<Suspense fallback={<PageLoader />}><ReservationListPage /></Suspense>} />
        <Route path="asset-reservations/create" element={<Suspense fallback={<PageLoader />}><ReservationCreatePage /></Suspense>} />
        <Route path="asset-reservations/:id" element={<Suspense fallback={<PageLoader />}><ReservationDetailPage /></Suspense>} />
        <Route path="attachments" element={<Suspense fallback={<PageLoader />}><AttachmentManagePage /></Suspense>} />
        <Route path="suppliers" element={<Suspense fallback={<PageLoader />}><SuppliersPage /></Suspense>} />
        <Route path="work-orders" element={<Suspense fallback={<PageLoader />}><WorkOrdersPage /></Suspense>} />
        <Route path="licenses" element={<Suspense fallback={<PageLoader />}><LicensesPage /></Suspense>} />
      </Route>
      <Route path="*" element={<Suspense fallback={<PageLoader />}><NotFound /></Suspense>} />
    </Routes>
  );
};

export default RoutesComponent;
