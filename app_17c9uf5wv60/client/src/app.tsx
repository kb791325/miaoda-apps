import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RoleProvider, useRoles } from '@client/src/hooks/useRoles';

import Layout from './components/Layout';
import NotFound from './pages/NotFound/NotFound';
import DashboardPage from './pages/Dashboard/DashboardPage';
import OperationsPage from './pages/Operations/OperationsPage';
import AiToolsPage from './pages/AiTools/AiToolsPage';
import RecordsPage from './pages/Records/RecordsPage';
import AddProductPage from './pages/AddProduct/AddProductPage';
import ProductsPage from './pages/Products/ProductsPage';
import SyncSettingsPage from './pages/SyncSettings/SyncSettingsPage';
import SuppliersPage from './pages/Suppliers/SuppliersPage';
import SalesOrdersPage from './pages/SalesOrders/SalesOrdersPage';
import PurchaseOrdersPage from './pages/PurchaseOrders/PurchaseOrdersPage';
import AuditLogsPage from './pages/AuditLogs/AuditLogsPage';
import UsersPage from './pages/UserManagement/UsersPage';
import RolesPage from './pages/UserManagement/RolesPage';
import BackupPage from './pages/Backup/BackupPage';

const PageSkeleton = () => (
  <div className="space-y-4 p-6">
    <div className="h-8 w-48 rounded-sm bg-muted animate-pulse" />
    <div className="grid grid-cols-3 gap-4">
      <div className="h-32 rounded-sm bg-muted animate-pulse" />
      <div className="h-32 rounded-sm bg-muted animate-pulse" />
      <div className="h-32 rounded-sm bg-muted animate-pulse" />
    </div>
  </div>
);

const Unauthorized = () => (
  <div className="flex flex-col items-center justify-center h-[60vh] text-center">
    <div className="text-4xl font-light text-muted-foreground mb-2">403</div>
    <h2 className="text-lg font-medium text-foreground mb-2">无访问权限</h2>
    <p className="text-sm text-muted-foreground">
      您没有访问此页面的权限，请联系管理员分配相应角色。
    </p>
  </div>
);

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  requiredRoles: string[];
}> = ({ children, requiredRoles }) => {
  const { hasRole, isLoading } = useRoles();
  if (isLoading) return <PageSkeleton />;
  return hasRole(requiredRoles) ? <>{children}</> : <Unauthorized />;
};

const ROUTE_ROLES: Record<string, string[]> = {
  operations: ['boss', 'supervisor', 'warehouse_admin', 'purchaser', 'sales'],
  'ai-tools': ['boss', 'supervisor', 'warehouse_admin'],
  products: ['boss', 'supervisor', 'warehouse_admin'],
  'add-product': ['boss', 'supervisor', 'warehouse_admin'],
  'sync-settings': ['boss', 'supervisor', 'warehouse_admin'],
  suppliers: ['boss', 'supervisor', 'warehouse_admin', 'purchaser'],
  'purchase-orders': ['boss', 'supervisor', 'warehouse_admin', 'purchaser'],
  'sales-orders': ['boss', 'supervisor', 'warehouse_admin', 'sales'],
  'audit-logs': ['boss', 'supervisor'],
  users: ['boss'],
  roles: ['boss'],
  backup: ['boss', 'supervisor'],
};

const RoutesComponent = () => {
  return (
    <RoleProvider>
      <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route
          path="operations"
          element={
            <ProtectedRoute requiredRoles={ROUTE_ROLES.operations}>
              <OperationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="ai-tools"
          element={
            <ProtectedRoute requiredRoles={ROUTE_ROLES['ai-tools']}>
              <AiToolsPage />
            </ProtectedRoute>
          }
        />
        <Route path="records" element={<RecordsPage />} />
        <Route
          path="products"
          element={
            <ProtectedRoute requiredRoles={ROUTE_ROLES.products}>
              <ProductsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="add-product"
          element={
            <ProtectedRoute requiredRoles={ROUTE_ROLES['add-product']}>
              <AddProductPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="sync-settings"
          element={
            <ProtectedRoute requiredRoles={ROUTE_ROLES['sync-settings']}>
              <SyncSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="suppliers"
          element={
            <ProtectedRoute requiredRoles={ROUTE_ROLES.suppliers}>
              <SuppliersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="sales-orders"
          element={
            <ProtectedRoute requiredRoles={ROUTE_ROLES['sales-orders']}>
              <SalesOrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="purchase-orders"
          element={
            <ProtectedRoute requiredRoles={ROUTE_ROLES['purchase-orders']}>
              <PurchaseOrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="audit-logs"
          element={
            <ProtectedRoute requiredRoles={ROUTE_ROLES['audit-logs']}>
              <AuditLogsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="users"
          element={
            <ProtectedRoute requiredRoles={ROUTE_ROLES.users}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="roles"
          element={
            <ProtectedRoute requiredRoles={ROUTE_ROLES.roles}>
              <RolesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="backup"
          element={
            <ProtectedRoute requiredRoles={ROUTE_ROLES.backup}>
              <BackupPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<NotFound />} />
      </Routes>
    </RoleProvider>
  );
};

export default RoutesComponent;
