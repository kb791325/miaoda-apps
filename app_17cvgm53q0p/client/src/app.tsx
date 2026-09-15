import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import HomePage from './pages/Home/HomePage';
import OrdersPage from './pages/Orders/OrdersPage';
import InventoryPage from './pages/Inventory/InventoryPage';
import CustomersPage from './pages/Customers/CustomersPage';
import FollowUpsPage from './pages/FollowUps/FollowUpsPage';
import ShipmentsPage from './pages/Shipments/ShipmentsPage';
import ShipmentDetailPage from './pages/Shipments/ShipmentDetailPage';
import StockFlowsPage from './pages/StockFlows/StockFlowsPage';
import FinanceDashboardPage from './pages/Finance/FinanceDashboardPage';
import ProfitReportPage from './pages/ProfitReport/ProfitReportPage';
import LoginPage from './pages/Login/LoginPage';
import UserManagementPage from './pages/UserManagement/UserManagementPage';
import RolePermissionsPage from './pages/RolePermissions/RolePermissionsPage';
import NotFound from './pages/NotFound/NotFound';

import { AuthProvider, useAuth } from './hooks/use-auth';

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { user, ready } = useAuth();
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        加载中…
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const RequirePermission = ({
  code,
  children,
}: {
  code: string;
  children: React.ReactNode;
}) => {
  const { hasPerm } = useAuth();
  if (!hasPerm(code)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const RoutesComponent = () => {
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
              <Route index element={<HomePage />} />
              <Route
                path="orders"
            element={
              <RequirePermission code="order:view">
                <OrdersPage />
              </RequirePermission>
            }
          />
          <Route
            path="shipments"
            element={
              <RequirePermission code="shipment:view">
                <ShipmentsPage />
              </RequirePermission>
            }
          />
          <Route
            path="shipments/:id"
            element={
              <RequirePermission code="shipment:view">
                <ShipmentDetailPage />
              </RequirePermission>
            }
          />
          <Route
            path="inventory"
            element={
              <RequirePermission code="product:view">
                <InventoryPage />
              </RequirePermission>
            }
          />
          <Route
            path="stock-flows"
            element={
              <RequirePermission code="stockflow:view">
                <StockFlowsPage />
              </RequirePermission>
            }
          />
          <Route
            path="customers"
            element={
              <RequirePermission code="customer:view">
                <CustomersPage />
              </RequirePermission>
            }
          />
          <Route
            path="follow-ups"
            element={
              <RequirePermission code="followup:view">
                <FollowUpsPage />
              </RequirePermission>
            }
          />
          <Route
            path="finance"
            element={
              <RequirePermission code="report:finance">
                <FinanceDashboardPage />
              </RequirePermission>
            }
          />
          <Route
            path="profit-report"
            element={
              <RequirePermission code="report:finance">
                <ProfitReportPage />
              </RequirePermission>
            }
          />
          <Route
            path="users"
            element={
              <RequirePermission code="user:manage">
                <UserManagementPage />
              </RequirePermission>
            }
          />
          <Route
            path="roles"
            element={
              <RequirePermission code="role:manage">
                <RolePermissionsPage />
              </RequirePermission>
            }
          />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
};

export default RoutesComponent;
