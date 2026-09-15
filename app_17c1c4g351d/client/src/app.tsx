import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth, ROLE_SUBJECT } from "@lark-apaas/client-toolkit/auth";
import { Layout } from "@/components/Layout";
import DashboardPage from "@/pages/DashboardPage/DashboardPage";
import ProductAnalysisPage from "@/pages/ProductAnalysisPage/ProductAnalysisPage";
import TrafficPage from "@/pages/TrafficPage/TrafficPage";
import CustomerPage from "@/pages/CustomerPage/CustomerPage";
import AfterSalePage from "@/pages/AfterSalePage/AfterSalePage";
import InventoryPage from "@/pages/InventoryPage/InventoryPage";
import AIReviewPage from "@/pages/AIReviewPage/AIReviewPage";
import SettingsPage from "@/pages/SettingsPage/SettingsPage";
import NotFoundPage from "@/pages/NotFoundPage/NotFoundPage";
import { ROUTE_ROLES } from "@shared/roles";

const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRoles: string[] }> = ({ children, requiredRoles }) => {
  const { ability, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-sm text-muted-foreground">加载中...</div>
      </div>
    );
  }
  const hasPermission = requiredRoles.some((role) => ability.can(role, ROLE_SUBJECT));
  return hasPermission ? <>{children}</> : <Navigate to="/unauthorized" replace />;
};

const UnauthorizedPage: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
    <div className="text-4xl font-bold text-muted-foreground/30">403</div>
    <div className="text-base text-muted-foreground">无访问权限，请联系管理员分配角色</div>
  </div>
);

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<ProtectedRoute requiredRoles={ROUTE_ROLES['/']}><DashboardPage /></ProtectedRoute>} />
        <Route path="products" element={<ProtectedRoute requiredRoles={ROUTE_ROLES['/products']}><ProductAnalysisPage /></ProtectedRoute>} />
        <Route path="traffic" element={<ProtectedRoute requiredRoles={ROUTE_ROLES['/traffic']}><TrafficPage /></ProtectedRoute>} />
        <Route path="customers" element={<ProtectedRoute requiredRoles={ROUTE_ROLES['/customers']}><CustomerPage /></ProtectedRoute>} />
        <Route path="aftersale" element={<ProtectedRoute requiredRoles={ROUTE_ROLES['/aftersale']}><AfterSalePage /></ProtectedRoute>} />
        <Route path="inventory" element={<ProtectedRoute requiredRoles={ROUTE_ROLES['/inventory']}><InventoryPage /></ProtectedRoute>} />
        <Route path="ai-review" element={<ProtectedRoute requiredRoles={ROUTE_ROLES['/ai-review']}><AIReviewPage /></ProtectedRoute>} />
        <Route path="settings" element={<ProtectedRoute requiredRoles={ROUTE_ROLES['/settings']}><SettingsPage /></ProtectedRoute>} />
        <Route path="unauthorized" element={<UnauthorizedPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
