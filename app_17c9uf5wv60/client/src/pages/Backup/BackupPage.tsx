import { useCallback, useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { Download, Upload, Loader2, History, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { exportBackup, restoreBackup, getBackupRecords } from '@client/src/api/backup';
import { usePageShortcuts } from '@client/src/hooks/useAppShortcuts';
import { Button } from '@client/src/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/src/components/ui/card';
import { Badge } from '@client/src/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import type { BackupRecord } from '@shared/api.interface';

const VALID_TABLES: string[] = [
  'categories',
  'suppliers',
  'products',
  'salesOrders',
  'purchaseOrders',
  'warehouseInventory',
  'stockTransactions',
  'transfers',
  'inventoryChecks',
  'inventoryCheckItems',
  'salesOrderItems',
  'purchaseOrderItems',
];

interface ParsedBackupFile {
  backupId?: string;
  exportedAt?: string;
  data?: Record<string, unknown>;
}

interface PendingRestore {
  payload: Record<string, Record<string, unknown>[]>;
  fileName: string;
  exportedAt: string | null;
}

function getErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const resp: unknown = (err as { response?: unknown }).response;
    const message: unknown = (
      resp as { data?: { message?: unknown } } | undefined
    )?.data?.message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join('；');
  }
  return String(err);
}

function parseAndValidate(text: string): ParsedBackupFile | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return null;
  }
  const file = parsed as ParsedBackupFile;
  const data: unknown = file.data;
  if (
    typeof data !== 'object' ||
    data === null ||
    Array.isArray(data) ||
    Object.keys(data).length === 0
  ) {
    return null;
  }
  const hasValidTable: boolean = Object.keys(data).some((key: string) =>
    VALID_TABLES.includes(key),
  );
  if (!hasValidTable) return null;
  return file;
}

export default function BackupPage() {
  const [exporting, setExporting] = useState<boolean>(false);
  const [restoring, setRestoring] = useState<boolean>(false);
  const [records, setRecords] = useState<BackupRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState<boolean>(true);
  const [pendingRestore, setPendingRestore] = useState<PendingRestore | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportingRef = useRef<boolean>(false);

  const loadRecords = useCallback(async (): Promise<void> => {
    setRecordsLoading(true);
    try {
      const res = await getBackupRecords();
      setRecords(res.items);
    } catch (err: unknown) {
      logger.error('获取备份记录失败:', getErrorMessage(err));
      toast.error('获取备份记录失败', {
        description: getErrorMessage(err),
      });
    } finally {
      setRecordsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const handleExport = useCallback(async (): Promise<void> => {
    if (exportingRef.current) return;
    exportingRef.current = true;
    setExporting(true);
    try {
      const payload = await exportBackup();
      const json: string = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url: string = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `inventory-backup-${dayjs().format('YYYY-MM-DD HH-mm')}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      const totalRecords: number = Object.values(payload.data).reduce(
        (sum: number, rows: Record<string, unknown>[]) => sum + rows.length,
        0,
      );
      toast.success('导出成功', {
        description: `共导出 ${Object.keys(payload.data).length} 张表、${totalRecords} 条记录`,
      });
    } catch (err: unknown) {
      logger.error('导出备份失败:', getErrorMessage(err));
      toast.error('导出失败', { description: getErrorMessage(err) });
    } finally {
      exportingRef.current = false;
      setExporting(false);
    }
  }, []);

  usePageShortcuts({ onExport: handleExport });

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file: File | undefined = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    let text: string;
    try {
      text = await file.text();
    } catch (err: unknown) {
      logger.error('读取备份文件失败:', getErrorMessage(err));
      toast.error('备份文件格式不正确');
      return;
    }
    const parsed: ParsedBackupFile | null = parseAndValidate(text);
    if (!parsed) {
      toast.error('备份文件格式不正确');
      return;
    }
    const payload = parsed.data as Record<string, Record<string, unknown>[]>;
    setPendingRestore({
      payload,
      fileName: file.name,
      exportedAt:
        typeof parsed.exportedAt === 'string' ? parsed.exportedAt : null,
    });
  };

  const handleConfirmRestore = async (): Promise<void> => {
    if (!pendingRestore || restoring) return;
    setRestoring(true);
    try {
      await restoreBackup({
        payload: pendingRestore.payload,
        fileName: pendingRestore.fileName,
      });
      setPendingRestore(null);
      toast.success('数据恢复成功', {
        description: '页面即将刷新以加载恢复后的数据',
      });
      window.setTimeout(() => window.location.reload(), 1200);
    } catch (err: unknown) {
      logger.error('恢复备份失败:', getErrorMessage(err));
      toast.error('恢复失败', { description: getErrorMessage(err) });
      setRestoring(false);
    }
  };

  const lastExport: BackupRecord | undefined = records
    .filter((r: BackupRecord) => r.type === 'export')
    .sort((a: BackupRecord, b: BackupRecord) =>
      dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf(),
    )[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-5 w-1 rounded-sm bg-primary" />
        <div>
          <h1 className="text-lg font-semibold tracking-tight">数据备份</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            全量导出商品、库存、出入库记录、调拨、盘点、供应商、订单等业务数据；恢复操作会覆盖当前数据
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="rounded-sm shadow-none border border-border">
          <CardHeader className="p-4 pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Download className="size-4 text-primary" />
              一键导出
            </CardTitle>
            <CardDescription className="text-xs">
              将所有业务数据导出为 JSON 备份文件，可用于数据迁移或归档
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <Button onClick={handleExport} disabled={exporting}>
              {exporting ? (
                <Loader2 className="size-4 mr-1.5 animate-spin" />
              ) : (
                <Download className="size-4 mr-1.5" />
              )}
              导出全量数据（JSON）
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              快捷键 Ctrl / Cmd + E 快速导出
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-sm shadow-none border border-border">
          <CardHeader className="p-4 pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="size-4 text-primary" />
              恢复数据
            </CardTitle>
            <CardDescription className="text-xs">
              仅支持本应用导出的 JSON 备份；恢复将清空并覆盖当前全部业务数据
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-4 mr-1.5" />
              选择备份文件
            </Button>
            <div className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
              <TriangleAlert className="size-3.5 mt-0.5 shrink-0 text-warning" />
              <span>恢复操作不可撤销，请先导出当前数据作为备份</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-sm shadow-none border border-border">
        <CardHeader className="p-4 pb-3 flex-row items-center justify-between space-y-0">
          <div className="space-y-1.5">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="size-4 text-primary" />
              备份记录
            </CardTitle>
          </div>
          <div className="text-xs text-muted-foreground">
            最近备份：
            <span className="font-mono">
              {lastExport
                ? dayjs(lastExport.createdAt).format('YYYY-MM-DD HH:mm')
                : '暂无'}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {recordsLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i: number) => (
                <div
                  key={i}
                  className="h-9 rounded-sm bg-accent/60 animate-pulse"
                />
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              暂无备份记录
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {['类型', '文件名', '记录条数', '操作人', '时间'].map(
                      (label: string) => (
                        <th
                          key={label}
                          className="text-left text-xs font-medium text-muted-foreground tracking-wider py-2 px-3"
                        >
                          {label}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {records.map((record: BackupRecord) => (
                    <tr
                      key={record.id}
                      className="border-b border-border last:border-b-0 hover:bg-accent/50"
                    >
                      <td className="py-2.5 px-3">
                        {record.type === 'export' ? (
                          <Badge className="rounded-sm border-primary/20 bg-primary/10 text-primary">
                            备份
                          </Badge>
                        ) : (
                          <Badge className="rounded-sm border-warning/20 bg-warning/10 text-warning">
                            恢复
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs max-w-[260px]">
                        <span className="block truncate">
                          {record.fileName ?? '-'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        {record.recordCount}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">
                        {record.operatorName ?? '-'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs whitespace-nowrap">
                        {dayjs(record.createdAt).format('YYYY-MM-DD HH:mm')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={pendingRestore !== null}
        onOpenChange={(open: boolean) => {
          if (!open && !restoring) setPendingRestore(null);
        }}
      >
        <DialogContent className="rounded-sm shadow-none">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TriangleAlert className="size-4 text-destructive" />
              确认恢复数据？
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-1">
              <span className="block">
                将以该备份文件覆盖当前全部业务数据，操作不可撤销：
              </span>
              {pendingRestore && (
                <span className="block rounded-sm border border-border bg-background p-2 text-xs">
                  <span className="block">
                    文件：
                    <span className="font-mono">
                      {pendingRestore.fileName}
                    </span>
                  </span>
                  {pendingRestore.exportedAt && (
                    <span className="block mt-1">
                      备份时间：
                      <span className="font-mono">
                        {dayjs(pendingRestore.exportedAt).format(
                          'YYYY-MM-DD HH:mm',
                        )}
                      </span>
                    </span>
                  )}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingRestore(null)}
              disabled={restoring}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRestore}
              disabled={restoring}
            >
              {restoring && (
                <Loader2 className="size-4 mr-1.5 animate-spin" />
              )}
              确认恢复
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
