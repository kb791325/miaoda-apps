import { useState, useEffect, useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Package,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { logger } from "@lark-apaas/client-toolkit/logger";
import { Table, type TableProps } from "@lark-apaas/client-toolkit/antd-table";

import { Button } from "@client/src/components/ui/button";
import { Input } from "@client/src/components/ui/input";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@client/src/components/ui/form";
import { Textarea } from "@client/src/components/ui/textarea";
import * as suppliersApi from "@client/src/api/suppliers";
import type {
  SupplierItem,
  CreateSupplierDto,
  UpdateSupplierDto,
} from "@shared/api.interface";

// ============================================================
// Form schema
// ============================================================

const supplierSchema = z.object({
  name: z.string().min(1, "供应商名称不能为空").max(200, "名称不能超过200字"),
  contactPerson: z.string().max(100, "联系人不能超过100字").optional().default(""),
  phone: z.string().max(50, "电话不能超过50字").optional().default(""),
  email: z.string().max(200, "邮箱不能超过200字").optional().default(""),
  address: z.string().max(500, "地址不能超过500字").optional().default(""),
  businessScope: z.string().max(200, "主营品类不能超过200字").optional().default(""),
  remark: z.string().optional().default(""),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

// ============================================================
// Edit state
// ============================================================

type EditState = {
  mode: "create" | "edit";
  supplier?: SupplierItem;
};

// ============================================================
// Component
// ============================================================

const SuppliersPage: React.FC = () => {
  const [items, setItems] = useState<SupplierItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [loading, setLoading] = useState<boolean>(true);
  const [keyword, setKeyword] = useState<string>("");
  const [searchValue, setSearchValue] = useState<string>("");

  const [editState, setEditState] = useState<EditState | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<SupplierItem | null>(null);

  // ---- Form ----

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      businessScope: "",
      remark: "",
    },
  });

  // ---- Fetch ----

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await suppliersApi.list({
        keyword: keyword || undefined,
        page,
        pageSize,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      logger.error("获取供应商列表失败:", err);
      toast.error("获取供应商列表失败");
    } finally {
      setLoading(false);
    }
  }, [keyword, page, pageSize]);

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
    form.reset({
      name: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      businessScope: "",
      remark: "",
    });
    setEditState({ mode: "create" });
  };

  const handleOpenEdit = (supplier: SupplierItem) => {
    form.reset({
      name: supplier.name,
      contactPerson: supplier.contactPerson ?? "",
      phone: supplier.phone ?? "",
      email: supplier.email ?? "",
      address: supplier.address ?? "",
      businessScope: supplier.businessScope ?? "",
      remark: supplier.remark ?? "",
    });
    setEditState({ mode: "edit", supplier });
  };

  const handleCloseDialog = () => {
    setEditState(null);
    form.reset();
  };

  const handleSubmit = async (data: SupplierFormData) => {
    setSubmitting(true);
    try {
      const dto: CreateSupplierDto = {
        name: data.name,
        contactPerson: data.contactPerson || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
        address: data.address || undefined,
        businessScope: data.businessScope || undefined,
        remark: data.remark || undefined,
      };

      if (editState?.mode === "edit" && editState.supplier) {
        const patch: UpdateSupplierDto = { ...dto };
        await suppliersApi.update(editState.supplier.id, patch);
        toast.success("供应商已更新");
      } else {
        await suppliersApi.create(dto);
        toast.success("供应商已创建");
      }

      handleCloseDialog();
      fetchData();
    } catch (err: unknown) {
      logger.error("提交供应商失败:", err);
      toast.error("操作失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Delete ----

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await suppliersApi.remove(deleteTarget.id);
      toast.success("供应商已删除");
      setDeleteTarget(null);
      fetchData();
    } catch (err: unknown) {
      logger.error("删除供应商失败:", err);
      toast.error("删除失败，请稍后重试");
    }
  };

  // ---- Table columns ----

  const columns: TableProps<SupplierItem>["columns"] = [
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
      width: 180,
      fixed: "left",
      render: (_: unknown, record: SupplierItem) => (
        <span className="font-medium text-foreground">{record.name}</span>
      ),
    },
    {
      title: "联系人",
      dataIndex: "contactPerson",
      key: "contactPerson",
      width: 100,
      render: (_: unknown, record: SupplierItem) =>
        record.contactPerson || <span className="text-muted-foreground">-</span>,
    },
    {
      title: "电话",
      dataIndex: "phone",
      key: "phone",
      width: 140,
      render: (_: unknown, record: SupplierItem) =>
        record.phone || <span className="text-muted-foreground">-</span>,
    },
    {
      title: "邮箱",
      dataIndex: "email",
      key: "email",
      width: 200,
      render: (_: unknown, record: SupplierItem) =>
        record.email || <span className="text-muted-foreground">-</span>,
    },
    {
      title: "地址",
      dataIndex: "address",
      key: "address",
      width: 200,
      ellipsis: true,
      render: (_: unknown, record: SupplierItem) =>
        record.address || <span className="text-muted-foreground">-</span>,
    },
    {
      title: "主营品类",
      dataIndex: "businessScope",
      key: "businessScope",
      width: 150,
      ellipsis: true,
      render: (_: unknown, record: SupplierItem) =>
        record.businessScope || <span className="text-muted-foreground">-</span>,
    },
    {
      title: "操作",
      key: "action",
      fixed: "right",
      width: 120,
      render: (_: unknown, record: SupplierItem) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenEdit(record)}
            title="编辑"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteTarget(record)}
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
          <h1 className="text-xl font-semibold text-foreground">供应商管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理供应商信息，支持搜索、新增、编辑和删除
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="size-4 mr-2" />
          新增供应商
        </Button>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="搜索名称、联系人、电话、邮箱、品类..."
            value={searchValue}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearchValue(e.target.value)
            }
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
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
          scroll={{ x: 1100, y: 500 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (totalCount: number, range: [number, number]) =>
              `第 ${range[0]}-${range[1]} 条 / 共 ${totalCount} 条`,
            onChange: (p: number, ps: number) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          locale={{
            emptyText: (
              <div className="flex flex-col items-center py-12">
                <Package className="size-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">
                  {keyword ? "未找到匹配的供应商" : "暂无供应商数据"}
                </p>
              </div>
            ),
          }}
        />
      </div>

      {/* Create / Edit Dialog */}
      <Dialog
        open={editState !== null}
        onOpenChange={(open: boolean) => {
          if (!open) handleCloseDialog();
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              {editState?.mode === "create" ? "新增供应商" : "编辑供应商"}
            </DialogTitle>
            <DialogDescription>
              {editState?.mode === "create"
                ? "填写供应商信息，名称必填"
                : "修改供应商信息，名称必填"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      供应商名称 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="请输入供应商名称"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-wrap gap-4">
                <FormField
                  control={form.control}
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>联系人</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="联系人姓名"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>电话</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="联系电话"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>邮箱</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="电子邮箱"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>地址</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="办公地址"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="businessScope"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>主营品类</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="主营品类，如：IT设备、办公用品"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="remark"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>备注</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="备注信息（可选）"
                        className="resize-none"
                        rows={3}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCloseDialog}
                  disabled={submitting}
                >
                  取消
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting
                    ? "提交中..."
                    : editState?.mode === "create"
                      ? "创建"
                      : "保存"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除供应商「{deleteTarget?.name}」吗？此操作不可撤销。
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

export default SuppliersPage;