import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { suppliers as suppliersApi } from '@client/src/api';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Badge } from '@client/src/components/ui/badge';
import {
  Card,
  CardContent,
} from '@client/src/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  Supplier,
  SupplierDetail,
  SupplierListParams,
  CreateSupplierRequest,
  UpdateSupplierRequest,
} from '@shared/api.interface';
import SupplierEditDialog from './SupplierEditDialog';
import SupplierDetailDialog from './SupplierDetailDialog';
import {
  SUPPLIER_PAGE_SIZE,
  SUPPLIER_STATUS_OPTIONS,
  SUPPLIER_STATUS_BADGE_VARIANT,
  SUPPLIER_STATUS_LABEL,
  buildSuppliersCsv,
  getExportDateStamp,
  downloadCsvBlob,
  formatSupplierDate,
  type SupplierFormValues,
} from './supplier-utils';

export default function SuppliersPage() {
  const [searchParams] = useSearchParams();
  const initialKeyword: string = searchParams.get('keyword') ?? '';
  const [items, setItems] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState<string>(initialKeyword);
  const [searchKeyword, setSearchKeyword] = useState<string>(initialKeyword);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<SupplierDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState('');
  const [deleting, setDeleting] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / SUPPLIER_PAGE_SIZE));

  const fetchSuppliers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: SupplierListParams = {
        page,
        pageSize: SUPPLIER_PAGE_SIZE,
      };
      if (searchKeyword.trim()) params.keyword = searchKeyword.trim();
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await suppliersApi.getSuppliers(params);
      setItems(response.items);
      setTotal(response.total);
    } catch (err: unknown) {
      logger.error('获取供应商列表失败:', String(err));
      toast.error('获取供应商列表失败');
      setItems([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, searchKeyword, statusFilter]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  useEffect(() => {
    const paramKeyword: string = searchParams.get('keyword') ?? '';
    if (paramKeyword) {
      setKeyword(paramKeyword);
      setSearchKeyword(paramKeyword);
      setPage(1);
    }
  }, [searchParams]);

  const handleSearch = () => {
    setPage(1);
    setSearchKeyword(keyword);
  };

  const handleStatusChange = (value: string) => {
    setPage(1);
    setStatusFilter(value);
  };

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const params: Omit<SupplierListParams, 'page' | 'pageSize'> = {};
      if (searchKeyword.trim()) params.keyword = searchKeyword.trim();
      if (statusFilter !== 'all') params.status = statusFilter;

      const data: Supplier[] = await suppliersApi.exportSuppliers(params);
      const csv: string = buildSuppliersCsv(data);
      const blob: Blob = new Blob([`\uFEFF${csv}`], {
        type: 'text/csv;charset=utf-8;',
      });
      downloadCsvBlob(blob, `suppliers_${getExportDateStamp()}.csv`);
      toast.success('导出成功');
    } catch (err: unknown) {
      logger.error('导出供应商失败:', String(err));
      toast.error('导出失败');
    } finally {
      setIsExporting(false);
    }
  };

  const handleAdd = () => {
    setEditingSupplier(null);
    setEditOpen(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setEditOpen(true);
  };

  const handleView = async (id: string) => {
    setDetailOpen(true);
    setDetailData(null);
    setDetailLoading(true);
    try {
      const detail = await suppliersApi.getSupplier(id);
      setDetailData(detail);
    } catch (err: unknown) {
      logger.error('获取供应商详情失败:', String(err));
      toast.error('获取供应商详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDeleteClick = (supplier: Supplier) => {
    setDeletingId(supplier.id);
    setDeletingName(supplier.name);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    setDeleting(true);
    try {
      await suppliersApi.deleteSupplier(deletingId);
      toast.success('删除成功');
      setDeleteOpen(false);
      setDeletingId(null);
      setDeletingName('');
      fetchSuppliers();
    } catch (err: unknown) {
      logger.error('删除供应商失败:', String(err));
      toast.error('删除失败');
    } finally {
      setDeleting(false);
    }
  };

  const handleFormSubmit = async (values: SupplierFormValues) => {
    try {
      if (editingSupplier) {
        const updateData: UpdateSupplierRequest = {
          code: values.code,
          name: values.name,
          contactPerson: values.contactPerson || undefined,
          phone: values.phone || undefined,
          email: values.email || undefined,
          address: values.address || undefined,
          mainCategory: values.mainCategory || undefined,
          status: values.status,
          remark: values.remark || undefined,
        };
        await suppliersApi.updateSupplier(editingSupplier.id, updateData);
        toast.success('更新成功');
      } else {
        const createData: CreateSupplierRequest = {
          code: values.code,
          name: values.name,
          contactPerson: values.contactPerson || undefined,
          phone: values.phone || undefined,
          email: values.email || undefined,
          address: values.address || undefined,
          mainCategory: values.mainCategory || undefined,
          status: values.status,
          remark: values.remark || undefined,
        };
        await suppliersApi.createSupplier(createData);
        toast.success('创建成功');
      }
      setEditOpen(false);
      setEditingSupplier(null);
      fetchSuppliers();
    } catch (err: unknown) {
      logger.error('保存供应商失败:', String(err));
      toast.error('保存失败');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-5 w-1 rounded-sm bg-primary" />
        <div>
          <h2 className="text-lg font-semibold text-foreground tracking-tight">
            供应商管理
          </h2>
          <p className="text-sm text-muted-foreground">
            维护供应商档案、合作状态与关联商品
          </p>
        </div>
      </div>

      <Card className="rounded-sm shadow-none border border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="搜索供应商编号 / 名称 / 联系人"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
                className="pl-8 rounded-sm"
              />
            </div>

            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[140px] rounded-sm">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent className="rounded-sm">
                {SUPPLIER_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex-1" />

            <Button
              variant="outline"
              onClick={handleExport}
              disabled={isExporting}
              className="rounded-sm"
            >
              <Download className="size-4 mr-1.5" />
              {isExporting ? '导出中...' : '导出'}
            </Button>

            <Button variant="default" onClick={handleAdd} className="rounded-sm">
              <Plus className="size-4 mr-1.5" />
              新增供应商
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 列表 */}
      <Card className="rounded-sm shadow-none border border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>供应商编号</TableHead>
                <TableHead>供应商名称</TableHead>
                <TableHead>联系人</TableHead>
                <TableHead>电话</TableHead>
                <TableHead>主营品类</TableHead>
                <TableHead className="text-center">状态</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-12 text-muted-foreground"
                  >
                    加载中...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-12 text-muted-foreground"
                  >
                    暂无供应商数据
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {item.code}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {item.name}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {item.contactPerson || '-'}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {item.phone || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.mainCategory || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`rounded-full ${SUPPLIER_STATUS_BADGE_VARIANT[item.status] ?? ''}`}
                      >
                        {SUPPLIER_STATUS_LABEL[item.status] ?? item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatSupplierDate(item.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(item.id)}
                          className="rounded-sm h-7 px-2 text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="size-3.5 mr-1" />
                          查看
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(item)}
                          className="rounded-sm h-7 px-2 text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="size-3.5 mr-1" />
                          编辑
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(item)}
                          className="rounded-sm h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="size-3.5 mr-1" />
                          删除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* 分页 */}
          {items.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <div className="text-xs text-muted-foreground">
                共 {total} 条，第 {page} / {totalPages} 页
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-sm h-7 w-7 p-0"
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() =>
                    setPage((p) => Math.min(totalPages, p + 1))
                  }
                  className="rounded-sm h-7 w-7 p-0"
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <SupplierEditDialog
        open={editOpen}
        supplier={editingSupplier}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditingSupplier(null);
        }}
        onSubmit={handleFormSubmit}
      />

      {/* 详情弹窗 */}
      <SupplierDetailDialog
        open={detailOpen}
        loading={detailLoading}
        data={detailData}
        onOpenChange={setDetailOpen}
      />

      {/* 删除确认弹窗 */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md rounded-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              删除确认
            </DialogTitle>
            <DialogDescription>
              确定要删除供应商「{deletingName}」吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
              className="rounded-sm"
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="rounded-sm"
            >
              {deleting ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
