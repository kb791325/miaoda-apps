import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Key,
  Eye,
} from "lucide-react";
import dayjs from "dayjs";
import { toast } from "sonner";
import { logger } from "@lark-apaas/client-toolkit/logger";
import { Table, type TableProps } from "@lark-apaas/client-toolkit/antd-table";

import { Button } from "@client/src/components/ui/button";
import { Input } from "@client/src/components/ui/input";
import { Badge } from "@client/src/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@client/src/components/ui/select";
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
import { cn } from "@client/src/lib/utils";

import * as licensesApi from "@client/src/api/licenses";
import CreateLicenseDialog from "./CreateLicenseDialog";
import LicenseDetailPanel from "./LicenseDetailPanel";
import type {
  LicenseItem,
  LicenseSoftwareType,
  LicenseMode,
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

const SOFTWARE_TYPE_OPTIONS: {
  value: string;
  label: string;
}[] = [
  { value: "", label: "全部类型" },
  ...Object.entries(SOFTWARE_TYPE_LABEL).map(([k, v]) => ({
    value: k,
    label: v,
  })),
];

// ============================================================
// Component
// ============================================================

type EditState = {
  mode: "create" | "edit";
  license?: LicenseItem;
};

const LicensesPage: React.FC = () => {
  const [items, setItems] = useState<LicenseItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [loading, setLoading] = useState<boolean>(true);
  const [keyword, setKeyword] = useState<string>("");
  const [searchValue, setSearchValue] = useState<string>("");
  const [softwareType, setSoftwareType] = useState<string>("");

  const [editState, setEditState] = useState<EditState | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<LicenseItem | null>(null);
  const [detailLicense, setDetailLicense] =
    useState<LicenseItem | null>(null);

  // ---- Fetch ----

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await licensesApi.list({
        keyword: keyword || undefined,
        software_type: softwareType || undefined,
        page,
        pageSize,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      logger.error("获取许可证列表失败:", err);
      toast.error("获取许可证列表失败");
    } finally {
      setLoading(false);
    }
  }, [keyword, softwareType, page, pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---- Search ----

  const handleSearch = () => {
    setPage(1);
    setKeyword(searchValue);
  };

  const handleClearSearch = () => {
    setSearchValue("");
    setPage(1);
    setKeyword("");
  };

  // ---- Create / Edit ----

  const handleOpenCreate = () => {
    setEditState({ mode: "create" });
  };

  const handleOpenEdit = (l: LicenseItem) => {
    setEditState({ mode: "edit", license: l });
  };

  const handleDialogClose = () => setEditState(null);

  // ---- Delete ----

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await licensesApi.remove(deleteTarget.id);
      toast.success("许可证已删除");
      setDeleteTarget(null);
      fetchData();
    } catch (err: unknown) {
      logger.error("删除许可证失败:", err);
      toast.error("删除失败，请稍后重试");
    }
  };

  // ---- Expire date helper ----

  const getExpireClass = (date: string): string => {
    if (!date) return "";
    const d = dayjs(date);
    const now = dayjs();
    if (d.isBefore(now, "day")) return "text-[hsl(0_70%_55%)] font-semibold";
    if (d.diff(now, "day") <= 30)
      return "text-[hsl(38_90%_50%)] font-semibold";
    return "";
  };

  const getExpireSuffix = (date: string): string => {
    if (!date) return "";
    const d = dayjs(date);
    if (d.isBefore(dayjs(), "day")) return " (已过期)";
    if (d.diff(dayjs(), "day") <= 30) return " (临期)";
    return "";
  };

  // ---- Table columns ----

  const columns: TableProps<LicenseItem>["columns"] = [
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
      width: 180,
      fixed: "left",
      render: (_: unknown, r: LicenseItem) => (
        <span className="font-medium text-foreground">
          {r.name}
        </span>
      ),
    },
    {
      title: "软件类型",
      dataIndex: "softwareType",
      key: "softwareType",
      width: 100,
      render: (_: unknown, r: LicenseItem) => (
        <Badge
          className="rounded-sm font-medium border px-2 py-0.5 text-xs border-[hsl(215_25%_35%)] bg-[hsl(215_25%_95%)] text-[hsl(215_25%_30%)]"
          variant="outline"
        >
          {SOFTWARE_TYPE_LABEL[r.softwareType] ?? r.softwareType}
        </Badge>
      ),
    },
    {
      title: "授权方式",
      dataIndex: "licenseMode",
      key: "licenseMode",
      width: 100,
      render: (_: unknown, r: LicenseItem) => (
        <Badge
          className="rounded-sm font-medium border px-2 py-0.5 text-xs border-[hsl(215_25%_35%)] bg-[hsl(215_25%_95%)] text-[hsl(215_25%_30%)]"
          variant="outline"
        >
          {LICENSE_MODE_LABEL[r.licenseMode] ?? r.licenseMode}
        </Badge>
      ),
    },
    {
      title: "总座位",
      dataIndex: "totalSeats",
      key: "totalSeats",
      width: 80,
      align: "right",
      render: (_: unknown, r: LicenseItem) => (
        <span className="font-mono tabular-nums">
          {r.totalSeats}
        </span>
      ),
    },
    {
      title: "已分配",
      dataIndex: "assignedCount",
      key: "assignedCount",
      width: 80,
      align: "right",
      render: (_: unknown, r: LicenseItem) => (
        <span className="font-mono tabular-nums">
          {r.assignedCount}
        </span>
      ),
    },
    {
      title: "剩余",
      key: "remaining",
      width: 80,
      align: "right",
      render: (_: unknown, r: LicenseItem) => {
        const rem = r.totalSeats - r.assignedCount;
        return (
          <span
            className={cn(
              "font-mono tabular-nums",
              rem <= 0 && "text-destructive",
            )}
          >
            {rem}
          </span>
        );
      },
    },
    {
      title: "采购金额",
      dataIndex: "purchaseAmount",
      key: "purchaseAmount",
      width: 110,
      align: "right",
      render: (_: unknown, r: LicenseItem) => (
        <span className="font-mono tabular-nums">
          {r.purchaseAmount
            ? r.purchaseAmount.toLocaleString()
            : "-"}
        </span>
      ),
    },
    {
      title: "到期日期",
      dataIndex: "expireDate",
      key: "expireDate",
      width: 130,
      render: (_: unknown, r: LicenseItem) => (
        <span
          className={cn(
            "font-mono text-sm",
            getExpireClass(r.expireDate),
          )}
        >
          {r.expireDate || "-"}
          {getExpireSuffix(r.expireDate)}
        </span>
      ),
    },
    {
      title: "供应商",
      dataIndex: "supplierName",
      key: "supplierName",
      width: 140,
      ellipsis: true,
      render: (_: unknown, r: LicenseItem) =>
        r.supplierName || (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      title: "操作",
      key: "action",
      fixed: "right",
      width: 130,
      render: (_: unknown, r: LicenseItem) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setDetailLicense(r);
            }}
            title="详情"
          >
            <Eye className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenEdit(r)}
            title="编辑"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteTarget(r)}
            title="删除"
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  // ---- Render ----

  return (
    <div className="max-w-[1400px] mx-auto p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            许可证管理
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理软件许可证，支持座位分配与到期预警
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="size-4 mr-2" />
          新增许可证
        </Button>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="搜索名称、密钥..."
            value={searchValue}
            onChange={(
              e: React.ChangeEvent<HTMLInputElement>,
            ) => setSearchValue(e.target.value)}
            onKeyDown={(
              e: React.KeyboardEvent<HTMLInputElement>,
            ) => {
              if (e.key === "Enter") handleSearch();
            }}
            className="pl-9 pr-8"
          />
          {searchValue && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <Select
          value={softwareType}
          onValueChange={(v: string) => {
            setSoftwareType(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="软件类型" />
          </SelectTrigger>
          <SelectContent>
            {SOFTWARE_TYPE_OPTIONS.map(
              (o: { value: string; label: string }) => (
                <SelectItem
                  key={o.value || "_all"}
                  value={o.value}
                >
                  {o.label}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
        <Button variant="secondary" onClick={handleSearch}>
          搜索
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-sm border bg-card">
        <Table
          columns={columns}
          dataSource={items}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1200, y: 500 }}
          onRow={(r: LicenseItem) => ({
            onClick: () => setDetailLicense(r),
            style: { cursor: "pointer" },
          })}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (
              totalCount: number,
              range: [number, number],
            ) =>
              `第 ${range[0]}-${range[1]} 条 / 共 ${totalCount} 条`,
            onChange: (p: number, ps: number) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          locale={{
            emptyText: (
              <div className="flex flex-col items-center py-12">
                <Key className="size-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">
                  {keyword
                    ? "未找到匹配的许可证"
                    : "暂无许可证数据"}
                </p>
              </div>
            ),
          }}
        />
      </div>

      {/* Create / Edit Dialog */}
      <CreateLicenseDialog
        open={editState !== null}
        mode={editState?.mode ?? "create"}
        license={editState?.license ?? null}
        onClose={handleDialogClose}
        onSuccess={fetchData}
      />

      {/* Detail Panel */}
      <LicenseDetailPanel
        license={detailLicense}
        open={detailLicense !== null}
        onClose={() => setDetailLicense(null)}
        onUpdated={fetchData}
      />

      {/* Delete confirm */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(v: boolean) => {
          if (!v) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除许可证「{deleteTarget?.name}
              」吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LicensesPage;