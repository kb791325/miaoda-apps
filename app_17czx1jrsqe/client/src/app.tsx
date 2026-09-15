import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import NotFoundPage from "@/pages/NotFoundPage/NotFoundPage";
import LoginPage from "@/pages/LoginPage/LoginPage";
import DashboardPage from "@/pages/Dashboard/DashboardPage";

// 客户管理
import PublicSeaPage from "@/pages/Customer/PublicSeaPage";

import InvalidLeadsPage from "@/pages/Customer/InvalidLeadsPage";
import ConversionAnalysisPage from "@/pages/Customer/ConversionAnalysisPage";
import LeadPage from "@/pages/Customer/LeadPage";
import LeadDetailPage from "@/pages/Customer/LeadDetailPage";
import CustomerPage from "@/pages/Customer/CustomerPage";
import CustomerDetailPage from "@/pages/Customer/CustomerDetailPage";

// 广告业务
import AccountOpenPage from "@/pages/Ad/AccountOpenPage";
import AccountOpenDetailPage from "@/pages/Ad/AccountOpenDetailPage";
import FilingPage from "@/pages/Ad/FilingPage";
import TransferPage from "@/pages/Ad/TransferPage";
import AdCommissionPage from "@/pages/Ad/AdCommissionPage";

// 视频业务
import { VideoOrderPage, VideoProjectPage, ActorPage } from "@/pages/Video/VideoPages";
import {
  OutsourcingPage,
  ShootCostPage,
  LocationCostPage,
  SamplePage,
} from "@/pages/Video/VideoExtraPages";
import VideoCommissionPage from "@/pages/Video/VideoCommissionPage";

// 合同业务
import ContractPage from "@/pages/Contract/ContractPage";
import ContractDetailPage from "@/pages/Contract/ContractDetailPage";
import { ContractTemplatePage, ContractFeePage } from "@/pages/ExtraPages";

// 财务管理
import TransactionPage from "@/pages/Finance/TransactionPage";
import ReceiptPage from "@/pages/Finance/ReceiptPage";
import RechargePage from "@/pages/Finance/RechargePage";
import RefundPage from "@/pages/Finance/RefundPage";
import ConsumptionPage from "@/pages/Finance/ConsumptionPage";
import AdvancePage from "@/pages/Finance/AdvancePage";
import InvoicePage from "@/pages/Finance/InvoicePage";
import PortManagePage from "@/pages/Finance/PortManagePage";
import BankPage from "@/pages/Finance/BankPage";
import CostPage from "@/pages/Finance/CostPage";
import IncomePage from "@/pages/Finance/IncomePage";
import ExpensePage from "@/pages/Finance/ExpensePage";
import CoinRefundPage from "@/pages/Finance/CoinRefundPage";
import RebatePage from "@/pages/Finance/RebatePage";
import DeductionPage from "@/pages/Finance/DeductionPage";
import IncentivePage from "@/pages/Finance/IncentivePage";
import DailyExpensePage from "@/pages/Finance/DailyExpensePage";
import DepositPage from "@/pages/Finance/DepositPage";

// 人资管理
import HRDashboardPage from "@/pages/HR/HRDashboardPage";
import {
  EmployeePage,
  ResumePage,
  PerformancePage,
  AttendancePage,
} from "@/pages/HR/HRPages";
import SalaryPage from "@/pages/HR/SalaryPage";
import EmployeeDetailPage from "@/pages/HR/EmployeeDetailPage";
import { InvitationPage } from "@/pages/HR/HRPages";
import {
  InterviewPage,
  CheckinPage,
  RecruitPlanPage,
} from "@/pages/HR/HRRecruitPages";

// 行政管理
import {
  AssetPage,
  InventoryPage,
  StockInPage,
  RequisitionPage,
  ReturnPage,
  InventoryCheckPage,
} from "@/pages/Admin/AdminPages";
import PurchaseReqPage from "@/pages/Admin/PurchaseReqPage";
import { PurchaseOrderPage, PurchaseDetailPage } from "@/pages/ExtraPages";

// 任务中心
import { BatchImportPage } from "@/pages/Task/BatchImportPage";
import { BatchExportPage } from "@/pages/Task/BatchExportPage";
import TodoPage from "@/pages/Task/TodoPage";
import CollabTaskPage from "@/pages/Task/CollabTaskPage";
import MyDraftsPage from "@/pages/Task/MyDraftsPage";

// 系统管理
import SystemSettingsPage from "@/pages/System/SystemSettingsPage";

// 系统设置子页包装组件（页面内部按 URL 路径切换对应 Tab，行为不变）
function ClueSettingsPage() {
  return <SystemSettingsPage />;
}
function CustomerSettingsPage() {
  return <SystemSettingsPage />;
}
function AlertSettingsPage() {
  return <SystemSettingsPage />;
}
function TaxSettingsPage() {
  return <SystemSettingsPage />;
}
import OrganizationPage from "@/pages/System/OrganizationPage";
import CustomerAccountPage from "@/pages/System/CustomerAccountPage";
import RolePermissionPage from "@/pages/System/RolePermissionPage";
import OperationLogPage from "@/pages/System/OperationLogPage";
import LoginLogPage from "@/pages/System/LoginLogPage";
import PersonalSettingsPage from "@/pages/System/PersonalSettingsPage";

// 业务支持
import { IndustryRoiPage, CompetitorPage } from "@/pages/Business/BusinessPages";
import { MaterialPage } from "@/pages/Business/MaterialPage";
import IndustryOverviewPage from "@/pages/Business/IndustryOverviewPage";

export default function App() {
  return (
    <Routes>
      {/* 登录页 - 独立布局 */}
      <Route path="/login" element={<LoginPage />} />

      {/* 主布局 */}
      <Route element={<Layout />}>
      <Route index element={<Navigate to="/dashboard/workbench" replace />} />

      {/* 工作台 */}
      <Route path="dashboard/workbench" element={<DashboardPage />} />

        {/* 客户管理 */}
        <Route path="customer/public-sea" element={<PublicSeaPage />} />
        <Route path="customer/invalid-leads" element={<InvalidLeadsPage />} />
        <Route path="customer/conversion-analysis" element={<ConversionAnalysisPage />} />
        <Route path="customer/clues" element={<LeadPage />} />
        <Route path="customer/clues/:id" element={<LeadDetailPage />} />
        <Route path="customer/customers" element={<CustomerPage />} />
        <Route path="customer/customers/:id" element={<CustomerDetailPage />} />

        {/* 广告业务 */}
        <Route path="advertising/account-open" element={<AccountOpenPage />} />
        <Route path="advertising/account-open/:id" element={<AccountOpenDetailPage />} />
        <Route path="advertising/filing" element={<FilingPage />} />
        <Route path="advertising/transfer" element={<TransferPage />} />
        <Route path="advertising/commission" element={<AdCommissionPage />} />

        {/* 视频业务 */}
        <Route path="video/orders" element={<VideoOrderPage />} />
        <Route path="video/projects" element={<VideoProjectPage />} />
        <Route path="video/actors" element={<ActorPage />} />
        <Route path="video/outsourcing" element={<OutsourcingPage />} />
        <Route path="video/commission" element={<VideoCommissionPage />} />
        <Route path="video/shooting-cost" element={<ShootCostPage />} />
        <Route path="video/venue-cost" element={<LocationCostPage />} />
        <Route path="video/samples" element={<SamplePage />} />

        {/* 合同业务 */}
        <Route path="contract/contracts" element={<ContractPage />} />
        <Route path="contract/contracts/:id" element={<ContractDetailPage />} />
        <Route path="contract/templates" element={<ContractTemplatePage />} />
        <Route path="contract/costs" element={<ContractFeePage />} />

        {/* 财务管理 */}
        <Route path="finance/customer-detail" element={<TransactionPage />} />
        <Route path="finance/receipts" element={<ReceiptPage />} />
        <Route path="finance/recharges" element={<RechargePage />} />
        <Route path="finance/refunds" element={<RefundPage />} />
        <Route path="finance/consumption" element={<ConsumptionPage />} />
        <Route path="finance/advances" element={<AdvancePage />} />
        <Route path="finance/invoices" element={<InvoicePage />} />
        <Route path="finance/ports" element={<PortManagePage />} />
        <Route path="finance/banks" element={<BankPage />} />
        <Route path="finance/costs" element={<CostPage />} />
        <Route path="finance/incomes" element={<IncomePage />} />
        <Route path="finance/expenses" element={<ExpensePage />} />
        <Route path="finance/coin-refund" element={<CoinRefundPage />} />
        <Route path="finance/rebate" element={<RebatePage />} />
        <Route path="finance/deduction" element={<DeductionPage />} />
        <Route path="finance/incentive" element={<IncentivePage />} />
        <Route path="finance/expense-mgmt" element={<DailyExpensePage />} />
        <Route path="finance/deposit" element={<DepositPage />} />

        {/* 人资管理 */}
        <Route path="hr/dashboard" element={<HRDashboardPage />} />
        <Route path="hr/employees" element={<EmployeePage />} />
        <Route path="hr/employees/:id" element={<EmployeeDetailPage />} />
        <Route path="hr/resumes" element={<ResumePage />} />
        <Route path="hr/invitations" element={<InvitationPage />} />
        <Route path="hr/interviews" element={<InterviewPage />} />
        <Route path="hr/checkin" element={<CheckinPage />} />
        <Route path="hr/performance" element={<PerformancePage />} />
        <Route path="hr/salary" element={<SalaryPage />} />
        <Route path="hr/attendance" element={<AttendancePage />} />
        <Route path="hr/recruit-plan" element={<RecruitPlanPage />} />

        {/* 行政管理 */}
        <Route path="admin/purchase-requisition" element={<PurchaseReqPage />} />
        <Route path="admin/purchase-order" element={<PurchaseOrderPage />} />
        <Route path="admin/purchase-detail" element={<PurchaseDetailPage />} />
        <Route path="admin/assets" element={<AssetPage />} />
        <Route path="admin/inventory" element={<InventoryPage />} />
        <Route path="admin/stock-in" element={<StockInPage />} />
        <Route path="admin/requisition" element={<RequisitionPage />} />
        <Route path="admin/return" element={<ReturnPage />} />
        <Route path="admin/inventory-check" element={<InventoryCheckPage />} />

        {/* 任务中心 */}
        <Route path="task/batch-import" element={<BatchImportPage />} />
        <Route path="task/batch-export" element={<BatchExportPage />} />
        <Route path="task/my-todo" element={<TodoPage />} />
        <Route path="task/my-drafts" element={<MyDraftsPage />} />
        <Route path="task/collab-tasks" element={<CollabTaskPage />} />

        {/* 系统管理 */}
        <Route path="system/settings/public-sea" element={<SystemSettingsPage />} />
        <Route path="system/settings/clue" element={<ClueSettingsPage />} />
        <Route path="system/settings/customer" element={<CustomerSettingsPage />} />
        <Route path="system/settings/alert" element={<AlertSettingsPage />} />
        <Route path="system/settings/tax" element={<TaxSettingsPage />} />
        <Route path="system/organization" element={<OrganizationPage />} />
        <Route path="system/customer-accounts" element={<CustomerAccountPage />} />
        <Route path="system/roles" element={<RolePermissionPage />} />
        <Route path="system/operation-logs" element={<OperationLogPage />} />
        <Route path="system/login-logs" element={<LoginLogPage />} />
        <Route path="system/personal" element={<PersonalSettingsPage />} />

        {/* 业务支持 */}
        <Route path="support/industry-roi" element={<IndustryRoiPage />} />
        <Route path="support/competitor" element={<CompetitorPage />} />
        <Route path="support/industry-dashboard" element={<IndustryOverviewPage />} />
        <Route path="support/materials" element={<MaterialPage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
