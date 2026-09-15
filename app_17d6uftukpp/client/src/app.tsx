import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import NotFoundPage from "@/pages/NotFoundPage/NotFoundPage";
import type { ReactElement } from 'react';
import WorkbenchPage from "@/pages/WorkbenchPage/WorkbenchPage";
import CustomerListPage from "@/pages/Customer/CustomerListPage";
import CustomerDetailPage from "@/pages/Customer/CustomerDetailPage";
import CustomerFormPage from "@/pages/Customer/CustomerFormPage";
import CustomerEditPage from "@/pages/Customer/CustomerEditPage";
import AdProjectListPage from "@/pages/AdProject/AdProjectListPage";
import AdProjectDetailPage from "@/pages/AdProject/AdProjectDetailPage";
import AdProjectFormPage from "@/pages/AdProject/AdProjectFormPage";
import AdProjectEditPage from "@/pages/AdProject/AdProjectEditPage";
import VideoProjectListPage from "@/pages/VideoProject/VideoProjectListPage";
import VideoProjectDetailPage from "@/pages/VideoProject/VideoProjectDetailPage";
import VideoProjectFormPage from "@/pages/VideoProject/VideoProjectFormPage";
import VideoProjectEditPage from "@/pages/VideoProject/VideoProjectEditPage";
import ContractListPage from "@/pages/Contract/ContractListPage";
import ContractDetailPage from "@/pages/Contract/ContractDetailPage";
import ContractFormPage from "@/pages/Contract/ContractFormPage";
import ContractEditPage from "@/pages/Contract/ContractEditPage";
import FinanceListPage from "@/pages/Finance/FinanceListPage";
import FinanceDetailPage from "@/pages/Finance/FinanceDetailPage";
import FinanceFormPage from "@/pages/Finance/FinanceFormPage";
import FinanceEditPage from "@/pages/Finance/FinanceEditPage";
import HrListPage from "@/pages/Hr/HrListPage";
import HrDetailPage from "@/pages/Hr/HrDetailPage";
import HrFormPage from "@/pages/Hr/HrFormPage";
import HrEditPage from "@/pages/Hr/HrEditPage";
import AdminListPage from "@/pages/Admin/AdminListPage";
import AdminDetailPage from "@/pages/Admin/AdminDetailPage";
import AdminFormPage from "@/pages/Admin/AdminFormPage";
import AdminEditPage from "@/pages/Admin/AdminEditPage";
import TaskListPage from "@/pages/Task/TaskListPage";
import TaskDetailPage from "@/pages/Task/TaskDetailPage";
import TaskFormPage from "@/pages/Task/TaskFormPage";
import TaskEditPage from "@/pages/Task/TaskEditPage";
import SystemListPage from "@/pages/System/SystemListPage";
import SystemDetailPage from "@/pages/System/SystemDetailPage";
import SystemFormPage from "@/pages/System/SystemFormPage";
import SystemEditPage from "@/pages/System/SystemEditPage";
import SupportListPage from "@/pages/Support/SupportListPage";
import SupportDetailPage from "@/pages/Support/SupportDetailPage";
import SupportFormPage from "@/pages/Support/SupportFormPage";
import SupportEditPage from "@/pages/Support/SupportEditPage";
import SubListPage from '@/pages/SubModule/SubListPage';
import SubFormPage from '@/pages/SubModule/SubFormPage';
import SubDetailPage from '@/pages/SubModule/SubDetailPage';
import SubEditPage from "@/pages/SubModule/SubEditPage";
import CustomerAnalyticsPage from '@/pages/Analytics/CustomerAnalyticsPage';
import FinanceDashboardPage from '@/pages/Analytics/FinanceDashboardPage';
import HrDashboardPage from '@/pages/Analytics/HrDashboardPage';
import CompetitorAnalyticsPage from '@/pages/Analytics/CompetitorAnalyticsPage';
import IndustryMarketPage from '@/pages/Analytics/IndustryMarketPage';
import CompetitorDashboardPage from '@/pages/Analytics/CompetitorDashboardPage';
import IndustryMarketDashboardPage from '@/pages/Analytics/IndustryMarketDashboardPage';
import IndustryRoiDashboardPage from '@/pages/Analytics/IndustryRoiDashboardPage';
import CostAccountDashboardPage from '@/pages/Analytics/CostAccountDashboardPage';
import OrgTreeDashboardPage from '@/pages/Analytics/OrgTreeDashboardPage';
import MyTodoPage from '@/pages/Task/MyTodoPage';
import OrgTreePage from '@/pages/Hr/OrgTreePage';
import RoleMatrixPage from '@/pages/System/RoleMatrixPage';
import ApprovalListPage from '@/pages/Approval/ApprovalListPage';
import AuditLogPage from '@/pages/System/AuditLogPage';
import BatchImportPage from '@/pages/Task/BatchImportPage';
import KanbanBoardPage from '@/pages/Task/KanbanBoardPage';
import PerformanceManagementPage from '@/pages/Hr/PerformanceManagementPage';
import InterviewCalendarPage from '@/pages/Hr/InterviewCalendarPage';
import CustomReportPage from '@/pages/Report/CustomReportPage';
import ReportTemplatePage from '@/pages/Report/ReportTemplatePage';
import ReportPushPage from '@/pages/Report/ReportPushPage';
import DrillDownPage from '@/pages/Report/DrillDownPage';
import SystemSettingsPage from '@/pages/System/SystemSettingsPage';
import CardListPage from '@/pages/SubModule/CardListPage';
import SeedFixerPage from '@/pages/System/SeedFixerPage';
import FollowTimelinePage from '@/pages/SubModule/FollowTimelinePage';

function CardRedirect({ to }: { to: string }): ReactElement {
  return <Navigate to={to} replace />;
}

function SubCardRedirect({ to }: { to: string }): ReactElement {
  return <Navigate to={to} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<WorkbenchPage />} />
        {/* 客户管理 */}
        <Route path="customers" element={<CustomerListPage />} />
        <Route path="customers/new" element={<CustomerFormPage />} />
        <Route path="customers/:id" element={<CustomerDetailPage />} />
        <Route path="customers/:id/edit" element={<CustomerEditPage />} />
        {/* 广告业务 */}
        <Route path="ads" element={<AdProjectListPage />} />
        <Route path="ads/new" element={<AdProjectFormPage />} />
        <Route path="ads/:id" element={<AdProjectDetailPage />} />
        <Route path="ads/:id/edit" element={<AdProjectEditPage />} />
        {/* 视频业务 */}
        <Route path="videos" element={<VideoProjectListPage />} />
        <Route path="videos/new" element={<VideoProjectFormPage />} />
        <Route path="videos/:id" element={<VideoProjectDetailPage />} />
        <Route path="videos/:id/edit" element={<VideoProjectEditPage />} />
        {/* 合同业务 */}
        <Route path="contracts" element={<ContractListPage />} />
        <Route path="contracts/new" element={<ContractFormPage />} />
        <Route path="contracts/:id" element={<ContractDetailPage />} />
        <Route path="contracts/:id/edit" element={<ContractEditPage />} />
        {/* 财务管理 */}
        <Route path="finance" element={<FinanceListPage />} />
        <Route path="finance/new" element={<FinanceFormPage />} />
        <Route path="finance/:id" element={<FinanceDetailPage />} />
        <Route path="finance/:id/edit" element={<FinanceEditPage />} />
        {/* 人资管理 */}
        <Route path="hr" element={<HrListPage />} />
        <Route path="hr/new" element={<HrFormPage />} />
        <Route path="hr/:id" element={<HrDetailPage />} />
        <Route path="hr/:id/edit" element={<HrEditPage />} />
        {/* 行政管理 */}
        <Route path="admin" element={<AdminListPage />} />
        <Route path="admin/new" element={<AdminFormPage />} />
        <Route path="admin/:id" element={<AdminDetailPage />} />
        <Route path="admin/:id/edit" element={<AdminEditPage />} />
        {/* 任务中心 */}
        <Route path="tasks" element={<TaskListPage />} />
        <Route path="tasks/new" element={<TaskFormPage />} />
        <Route path="tasks/:id" element={<TaskDetailPage />} />
        <Route path="tasks/:id/edit" element={<TaskEditPage />} />
        {/* 系统管理 */}
        <Route path="system" element={<SystemListPage />} />
        <Route path="system/new" element={<SystemFormPage />} />
        <Route path="system/:id" element={<SystemDetailPage />} />
        <Route path="system/:id/edit" element={<SystemEditPage />} />
        {/* 业务支持 */}
        <Route path="support" element={<SupportListPage />} />
        <Route path="support/new" element={<SupportFormPage />} />
        <Route path="support/:id" element={<SupportDetailPage />} />
        <Route path="support/:id/edit" element={<SupportEditPage />} />
        {/* 5 个仪表盘/树形升级子页面（路由优先于通用子表） */}
        <Route path="sub/competitor" element={<CompetitorDashboardPage />} />
        <Route path="sub/industryMarket" element={<IndustryMarketDashboardPage />} />
        <Route path="sub/industryRoi" element={<IndustryRoiDashboardPage />} />
        <Route path="sub/costAccount" element={<CostAccountDashboardPage />} />
        <Route path="sub/org" element={<OrgTreeDashboardPage />} />
        {/* 58 张业务子表, 配置驱动通用路由 */}
        <Route path="sub/:subKey" element={<SubListPage />} />
        <Route path="sub/:subKey/new" element={<SubFormPage />} />
        <Route path="sub/:subKey/:id" element={<SubDetailPage />} />
        <Route path="sub/:subKey/:id/edit" element={<SubEditPage />} />
        {/* 分析/仪表盘型子页面 */}
        <Route path="analytics/customer" element={<CustomerAnalyticsPage />} />
        <Route path="analytics/finance" element={<FinanceDashboardPage />} />
        <Route path="analytics/hr" element={<HrDashboardPage />} />
        <Route path="analytics/competitor" element={<CompetitorAnalyticsPage />} />
        <Route path="analytics/industry" element={<IndustryMarketPage />} />
        {/* 特殊形态页面 */}
        <Route path="special/my-todo" element={<MyTodoPage />} />
        <Route path="special/org" element={<OrgTreePage />} />
        <Route path="special/settings" element={<SystemSettingsPage />} />
        <Route path="special/role" element={<RoleMatrixPage />} />
        <Route path="special/seed-fixer" element={<SeedFixerPage />} />
        {/* 跟进记录时间线 */}
        <Route path="sub/follow-timeline" element={<FollowTimelinePage />} />
        {/* 审批中心 */}
        <Route path="approval" element={<ApprovalListPage />} />
        {/* 操作日志 */}
        <Route path="system/audit-log" element={<AuditLogPage />} />
        {/* 报表中心 */}
        <Route path="report/custom" element={<CustomReportPage />} />
        <Route path="report/templates" element={<ReportTemplatePage />} />
        <Route path="report/push" element={<ReportPushPage />} />
        <Route path="report/drill" element={<DrillDownPage />} />
        {/* 批量导入 */}
        <Route path="batch-import" element={<BatchImportPage />} />
        {/* 协作任务看板 */}
        <Route path="kanban" element={<KanbanBoardPage />} />
        {/* 绩效管理 */}
        <Route path="performance" element={<PerformanceManagementPage />} />
        {/* 面试日历 */}
        <Route path="interview-calendar" element={<InterviewCalendarPage />} />
        {/* 演员/素材卡片视图 */}
        <Route path="sub/actor" element={<Navigate to="/sub/card/actor" replace />} />
        <Route path="sub/material" element={<SubCardRedirect to="/sub/card/material" />} />
        <Route path="sub/card/:subKey" element={<CardListPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
