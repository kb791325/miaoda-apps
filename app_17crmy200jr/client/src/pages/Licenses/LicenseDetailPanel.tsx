import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { logger } from "@lark-apaas/client-toolkit/logger";
import {
  User,
  Monitor,
  Calendar,
  Loader2,
  UserPlus,
  XCircle,
  Package,
} from "lucide-react";
import dayjs from "dayjs";

import { Button } from "@client/src/components/ui/button";
import { Input } from "@client/src/components/ui/input";
import { Badge } from "@client/src/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@client/src/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@client/src/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@client/src/components/ui/alert-dialog";
import { Table, type TableProps } from "@lark-apaas/client-toolkit/antd-table";
import { cn } from "@client/src/lib/utils";

import * as licensesApi from "@client/src/api/licenses";
import type {
  LicenseItem,
  LicenseAssignmentItem,
  LicenseSoftwareType,
  LicenseMode,
  LicenseAssignmentStatus,
} from "@shared/api.interface";

// ============================================================
// Constants
// ============================================================

const SOFTWARE_TYPE_LABEL: Record<LicenseSoftwareType, string> = {
  os: "操作系统",
  office: "办公软件",
  design: "设计软件",
  dev_tool: "开发工具",
  security: "安全软件",
  other: "其他",
};

const LICENSE_MODE_LABEL: Record<LicenseMode, string> = {
  per_device: "按设备",
  per_user: "按用户",
  per_server: "按服务器",
  subscription: "订阅制",
};

const STATUS_LABEL: Record<LicenseAssignmentStatus, string> = {
  active: "使用中",
  revoked: "已回收",
};

const STATUS_STYLE: Record<LicenseAssignmentStatus, string> = {
  active:
    "border-[hsl(142_60%_45%)] bg-[hsl(142_60%_95%)] text-[hsl(142_60%_30%)]",
  revoked: "border-border bg-muted text-muted-foreground",
};

// ============================================================
// Helper
// ============================================================

const InfoRow: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <div className="flex items-start gap-3 py-2 border-b border-border last:border-0">
    <p className="text-xs text-muted-foreground w-20 shrink-0 pt-0.5">
      {label}
    </p>
    <div className="flex-1 min-w-0">{children}</div>
  </div>
);

// ============================================================
// Component
// ============================================================

interface LicenseDetailPanelProps {
  license: LicenseItem | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

const LicenseDetailPanel: React.FC<LicenseDetailPanelProps> = ({
  license,
  open,
  onClose,
  onUpdated,
}) => {
  const [assignments, setAssignments] = useState<
    LicenseAssignmentItem[]
  >([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [assignOpen, setAssignOpen] = useState<boolean>(false);
  const [assignee, setAssignee] = useState<string>("");
  const [deviceId, setDeviceId] = useState<string>("");
  const [assigning, setAssigning] = useState<boolean>(false);
  const [revokeTarget, setRevokeTarget] =
    useState<LicenseAssignmentItem | null>(null);
  const [revoking, setRevoking] = useState<boolean>(false);

  // ---- Fetch assignments ----

  const fetchAssignments = useCallback(async () => {
    if (!license) return;
    setLoading(true);
    try {
      const data = await licensesApi.getAssignments(license.id);
      setAssignments(data);
    } catch (err: unknown) {
      logger.error("获取分配记录失败:", err);
      toast.error("获取分配记录失败");
    } finally {
      setLoading(false);
    }
  }, [license]);

  useEffect(() => {
    if (open && license) fetchAssignments();
  }, [open, license, fetchAssignments]);

  // ---- Assign seat ----

  const handleAssign = async () => {
    if (!license || !assignee.trim()) {
      toast.error("请填写分配用户ID");
      return;
    }
    setAssigning(true);
    try {
      await licensesApi.assignSeat(license.id, {
        assignee: assignee.trim(),
        deviceId: deviceId.trim() || undefined,
      });
      toast.success("座位已分配");
      setAssignOpen(false);
      setAssignee("");
      setDeviceId("");
      fetchAssignments();
      onUpdated();
    } catch (err: unknown) {
      logger.error("分配座位失败:", err);
      toast.error("分配失败，请稍后重试");
    } finally {
      setAssigning(false);
    }
  };

  // ---- Revoke seat ----

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await licensesApi.revokeSeat(revokeTarget.id);
      toast.success("座位已回收");
      setRevokeTarget(null);
      fetchAssignments();
      onUpdated();
    } catch (err: unknown) {
      logger.error("回收座位失败:", err);
      toast.error("回收失败，请稍后重试");
    } finally {
      setRevoking(false);
    }
  };

  // ---- Expire date status ----

  const getExpireStatus = (
    date: string,
  ): "normal" | "warning" | "expired" => {
    if (!date) return "normal";
    const d = dayjs(date);
    const now = dayjs();
    if (d.isBefore(now, "day")) return "expired";
    if (d.diff(now, "day") <= 30) return "warning";
    return "normal";
  };

  const expireStatus = license
    ? getExpireStatus(license.expireDate)
    : "normal";
  const expireTextColor =
    expireStatus === "expired"
      ? "text-[hsl(0_70%_55%)]"
      : expireStatus === "warning"
        ? "text-[hsl(38_90%_50%)]"
        : "text-foreground";

  // ---- Table columns ----

  const columns: TableProps<LicenseAssignmentItem>["columns"] = [
    {
      title: "分配用户",
      dataIndex: "assigneeName",
      key: "assigneeName",
      width: 140,
      render: (_: unknown, r: LicenseAssignmentItem) => (
        <span className="font-medium text-foreground">
          {r.assigneeName}
        </span>
      ),
    },
    {
      title: "设备ID",
      dataIndex: "deviceName",
      key: "deviceName",
      width: 200,
      ellipsis: true,
      render: (_: unknown, r: LicenseAssignmentItem) =>
        r.deviceName || (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      title: "分配日期",
      dataIndex: "assignDate",
      key: "assignDate",
      width: 120,
      render: (_: unknown, r: LicenseAssignmentItem) => (
        <span className="font-mono text-sm">
          {r.assignDate || "-"}
        </span>
      ),
    },
    {
      title: "分配人",
      dataIndex: "assignerName",
      key: "assignerName",
      width: 120,
      render: (_: unknown, r: LicenseAssignmentItem) => (
        <span className="text-sm">{r.assignerName}</span>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 80,
      render: (_: unknown, r: LicenseAssignmentItem) => (
        <Badge
          className={cn(
            "rounded-sm font-medium border px-2 py-0.5 text-xs",
            STATUS_STYLE[r.status],
          )}
          variant="outline"
        >
          {STATUS_LABEL[r.status]}
        </Badge>
      ),
    },
    {
      title: "操作",
      key: "action",
      width: 80,
      render: (_: unknown, r: LicenseAssignmentItem) =>
        r.status === "active" ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setRevokeTarget(r)}
            title="回收座位"
          >
            <XCircle className="size-4 text-destructive" />
          </Button>
        ) : null,
    },
  ];

  const remaining =
    (license?.totalSeats ?? 0) - (license?.assignedCount ?? 0);

  // ---- Render ----

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(v: boolean) => {
          if (!v) onClose();
        }}
      >
        <SheetContent
          side="right"
          className="w-[520px] sm:max-w-[520px] rounded-sm"
        >
          <SheetHeader>
            <SheetTitle className="text-base font-semibold">
              {license?.name ?? "许可证详情"}
            </SheetTitle>
            <SheetDescription>许可证基本信息与座位分配</SheetDescription>
          </SheetHeader>

          {!license ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              {/* Basic Info */}
              <div className="rounded-sm border border-border bg-card">
                <div className="px-4 py-2 border-b border-border">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    基本信息
                  </p>
                </div>
                <div className="px-4 py-2">
                  <InfoRow label="软件类型">
                    <Badge
                      className="rounded-sm font-medium border px-2 py-0.5 text-xs border-[hsl(215_25%_35%)] bg-[hsl(215_25%_95%)] text-[hsl(215_25%_30%)]"
                      variant="outline"
                    >
                      {SOFTWARE_TYPE_LABEL[license.softwareType] ??
                        license.softwareType}
                    </Badge>
                  </InfoRow>
                  <InfoRow label="授权方式">
                    <Badge
                      className="rounded-sm font-medium border px-2 py-0.5 text-xs border-[hsl(215_25%_35%)] bg-[hsl(215_25%_95%)] text-[hsl(215_25%_30%)]"
                      variant="outline"
                    >
                      {LICENSE_MODE_LABEL[license.licenseMode] ??
                        license.licenseMode}
                    </Badge>
                  </InfoRow>
                  <InfoRow label="总座位数">
                    <p className="text-sm text-foreground font-mono">
                      {license.totalSeats}
                    </p>
                  </InfoRow>
                  <InfoRow label="已分配">
                    <p className="text-sm text-foreground font-mono">
                      {license.assignedCount}
                    </p>
                  </InfoRow>
                  <InfoRow label="剩余">
                    <p
                      className={cn(
                        "text-sm font-mono",
                        remaining <= 0 && "text-destructive",
                      )}
                    >
                      {remaining}
                    </p>
                  </InfoRow>
                  <InfoRow label="采购日期">
                    <p className="text-sm text-foreground font-mono">
                      {license.purchaseDate || "-"}
                    </p>
                  </InfoRow>
                  <InfoRow label="采购金额">
                    <p className="text-sm text-foreground font-mono">
                      {license.purchaseAmount
                        ? license.purchaseAmount.toLocaleString()
                        : "-"}
                    </p>
                  </InfoRow>
                  <InfoRow label="到期日期">
                    <p
                      className={cn(
                        "text-sm font-mono font-semibold",
                        expireTextColor,
                      )}
                    >
                      {license.expireDate || "-"}
                      {expireStatus === "expired" && " (已过期)"}
                      {expireStatus === "warning" && " (临期)"}
                    </p>
                  </InfoRow>
                  <InfoRow label="供应商">
                    <p className="text-sm text-foreground">
                      {license.supplierName || "-"}
                    </p>
                  </InfoRow>
                  <InfoRow label="备注">
                    <p className="text-sm text-foreground break-words">
                      {license.remark || "-"}
                    </p>
                  </InfoRow>
                </div>
              </div>

              {/* Assignments */}
              <div className="rounded-sm border border-border bg-card">
                <div className="px-4 py-2 border-b border-border flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    座位分配
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setAssignOpen(true)}
                    disabled={
                      (license.assignedCount ?? 0) >=
                      license.totalSeats
                    }
                  >
                    <UserPlus className="size-4 mr-1" />
                    分配座位
                  </Button>
                </div>
                <div className="p-1">
                  <Table
                    columns={columns}
                    dataSource={assignments}
                    loading={loading}
                    rowKey="id"
                    scroll={{ x: 700, y: 300 }}
                    pagination={false}
                    locale={{
                      emptyText: (
                        <div className="flex flex-col items-center py-8">
                          <Package className="size-10 text-muted-foreground/30 mb-2" />
                          <p className="text-muted-foreground text-sm">
                            暂无分配记录
                          </p>
                        </div>
                      ),
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Assign Dialog */}
      <Dialog
        open={assignOpen}
        onOpenChange={(v: boolean) => {
          if (!v) setAssignOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>分配座位</DialogTitle>
            <DialogDescription>
              为许可证「{license?.name}」分配座位
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                分配用户ID <span className="text-destructive">*</span>
              </label>
              <Input
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="输入用户ID"
                className="rounded-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                设备ID（可选）
              </label>
              <Input
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                placeholder="输入设备ID"
                className="rounded-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setAssignOpen(false)}
              disabled={assigning}
            >
              取消
            </Button>
            <Button onClick={handleAssign} disabled={assigning}>
              {assigning ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  分配中...
                </>
              ) : (
                "确认分配"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirm */}
      <AlertDialog
        open={revokeTarget !== null}
        onOpenChange={(v: boolean) => {
          if (!v) setRevokeTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认回收座位</AlertDialogTitle>
            <AlertDialogDescription>
              确定要回收用户「{revokeTarget?.assigneeName}
              」的座位吗？回收后该用户将无法使用此许可证。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={revoking}
            >
              {revoking ? "回收中..." : "回收"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default LicenseDetailPanel;