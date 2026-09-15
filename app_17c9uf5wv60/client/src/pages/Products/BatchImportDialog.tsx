import { useCallback, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@client/src/components/ui/dialog';
import { Button } from '@client/src/components/ui/button';
import { Badge } from '@client/src/components/ui/badge';
import { Progress } from '@client/src/components/ui/progress';
import {
  Upload,
  Download,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { products as productsApi } from '@client/src/api';
import type {
  BatchImportItem,
  BatchImportResult,
} from '@shared/api.interface';

const TEMPLATE_COLUMNS = [
  'SKU编码',
  '商品名称',
  '分类',
  '品牌',
  '规格',
  '单位',
  '单价',
  '安全库存',
  '初始库存',
  '仓库',
  '备注',
];

interface ParsedRow {
  row: number;
  data: BatchImportItem;
  errors: string[];
}

interface BatchImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

const REQUIRED_FIELDS: { key: keyof BatchImportItem; label: string }[] = [
  { key: 'code', label: 'SKU编码' },
  { key: 'name', label: '商品名称' },
  { key: 'category', label: '分类' },
  { key: 'unit', label: '单位' },
];

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      currentRow.push(current);
      current = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      currentRow.push(current);
      current = '';
      if (currentRow.length > 1 || currentRow[0] !== '') {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      current += ch;
    }
  }
  if (current.length > 0 || currentRow.length > 0) {
    currentRow.push(current);
    rows.push(currentRow);
  }
  return rows;
}

function mapRowToItem(headers: string[], row: string[], rowIdx: number): ParsedRow {
  const getVal = (name: string): string => {
    const idx = headers.findIndex((h) => h.trim() === name);
    return idx >= 0 ? (row[idx] ?? '').trim() : '';
  };

  const errors: string[] = [];
  const code = getVal('SKU编码');
  const name = getVal('商品名称');
  const category = getVal('分类');
  const brand = getVal('品牌') || undefined;
  const spec = getVal('规格') || undefined;
  const unit = getVal('单位');
  const unitPriceStr = getVal('单价');
  const safetyStockStr = getVal('安全库存');
  const initialQuantityStr = getVal('初始库存');
  const warehouse = getVal('仓库') || undefined;
  const remark = getVal('备注') || undefined;

  if (!code) errors.push('SKU编码不能为空');
  if (!name) errors.push('商品名称不能为空');
  if (!category) errors.push('分类不能为空');
  if (!unit) errors.push('单位不能为空');

  let unitPrice = 0;
  if (unitPriceStr) {
    unitPrice = Number(unitPriceStr);
    if (Number.isNaN(unitPrice)) errors.push('单价必须是数字');
    else if (unitPrice < 0) errors.push('单价不能为负数');
  } else {
    errors.push('单价不能为空');
  }

  let safetyStock = 0;
  if (safetyStockStr) {
    safetyStock = Number(safetyStockStr);
    if (Number.isNaN(safetyStock)) errors.push('安全库存必须是数字');
    else if (safetyStock < 0) errors.push('安全库存不能为负数');
  } else {
    errors.push('安全库存不能为空');
  }

  let initialQuantity: number | undefined;
  if (initialQuantityStr) {
    initialQuantity = Number(initialQuantityStr);
    if (Number.isNaN(initialQuantity)) errors.push('初始库存必须是数字');
    else if (initialQuantity < 0) errors.push('初始库存不能为负数');
  }

  if (warehouse && (!initialQuantity || initialQuantity <= 0)) {
    errors.push('指定仓库时初始库存必须大于0');
  }

  return {
    row: rowIdx + 2,
    data: {
      code,
      name,
      category,
      brand,
      spec,
      unit,
      unitPrice,
      safetyStock,
      initialQuantity,
      warehouse,
      remark,
    },
    errors,
  };
}

export function BatchImportDialog({
  open,
  onOpenChange,
  onImported,
}: BatchImportDialogProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<BatchImportResult | null>(null);

  const resetState = useCallback(() => {
    setStep('upload');
    setFileName('');
    setParsedRows([]);
    setHeaders([]);
    setImportResult(null);
    setImporting(false);
  }, []);

  const handleClose = useCallback(() => {
    if (importing) return;
    resetState();
    onOpenChange(false);
  }, [importing, onOpenChange, resetState]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = String(e.target?.result ?? '');
        const rows = parseCSV(text);
        if (rows.length < 2) {
          toast.error('CSV 文件为空或缺少表头');
          return;
        }
        const hdrs = rows[0].map((h) => h.trim());
        setHeaders(hdrs);

        const missing = REQUIRED_FIELDS.filter(
          (f) => !hdrs.includes(f.label),
        ).map((f) => f.label);
        if (missing.length > 0) {
          toast.error(`缺少必填列：${missing.join('、')}`);
          return;
        }

        const dataRows = rows.slice(1);
        const seen = new Set<string>();
        const parsed = dataRows.map((r, idx) => {
          const rowData = mapRowToItem(hdrs, r, idx);
          if (rowData.data.code) {
            if (seen.has(rowData.data.code)) {
              rowData.errors.push('SKU编码在文件中重复');
            } else {
              seen.add(rowData.data.code);
            }
          }
          return rowData;
        });
        setParsedRows(parsed);
        setStep('preview');
      } catch (err: unknown) {
        logger.error('解析 CSV 失败:', String(err));
        toast.error('CSV 解析失败，请检查文件格式');
      }
    };
    reader.onerror = () => {
      toast.error('读取文件失败');
    };
    reader.readAsText(file, 'utf-8');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: false,
    maxFiles: 1,
  });

  const downloadTemplate = () => {
    const headerRow = TEMPLATE_COLUMNS.join(',');
    const sampleRow =
      'SKU001,示例商品,电子产品,示例品牌,100ml/瓶,瓶,99.9,10,100,上海仓,示例备注';
    const content = `${headerRow}\n${sampleRow}\n`;
    const blob = new Blob(['\ufeff' + content], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '商品导入模板.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const validRows = useMemo(
    () => parsedRows.filter((r) => r.errors.length === 0),
    [parsedRows],
  );
  const invalidRows = useMemo(
    () => parsedRows.filter((r) => r.errors.length > 0),
    [parsedRows],
  );
  const previewRows = useMemo(() => parsedRows.slice(0, 20), [parsedRows]);

  const handleImport = async () => {
    if (validRows.length === 0) {
      toast.error('没有可导入的有效数据');
      return;
    }
    setImporting(true);
    try {
      const items = validRows.map((r) => r.data);
      const result = await productsApi.batchImportProducts(items);
      setImportResult(result);
      setStep('result');
      if (result.successCount > 0) {
        onImported();
      }
    } catch (err: unknown) {
      logger.error('批量导入失败:', String(err));
      toast.error('批量导入失败，请稍后重试');
    } finally {
      setImporting(false);
    }
  };

  const progressValue = useMemo(() => {
    if (parsedRows.length === 0) return 0;
    return Math.round((validRows.length / parsedRows.length) * 100);
  }, [parsedRows, validRows]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-medium">
              批量导入商品
            </DialogTitle>
          </div>
          <div className="flex items-center gap-3 pt-3">
            <StepBadge active={step === 'upload'} done={step !== 'upload'} num={1} label="上传文件" />
            <div className="flex-1 h-px bg-border" />
            <StepBadge active={step === 'preview'} done={step === 'result'} num={2} label="预览校验" />
            <div className="flex-1 h-px bg-border" />
            <StepBadge active={step === 'result'} done={false} num={3} label="导入结果" />
          </div>
        </DialogHeader>

        {step === 'upload' && (
          <div className="py-6 space-y-4">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-sm p-10 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-primary bg-accent'
                  : 'border-border hover:border-primary/50 hover:bg-muted/30'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="size-10 mx-auto mb-3 text-muted-foreground" />
              <div className="text-sm font-medium mb-1">
                拖拽 CSV 文件到此处，或点击选择文件
              </div>
              <div className="text-xs text-muted-foreground">
                仅支持 .csv 格式文件
              </div>
            </div>
            <div className="text-center">
              <button
                type="button"
                onClick={downloadTemplate}
                className="text-primary hover:text-primary/80 text-sm inline-flex items-center gap-1"
              >
                <Download className="size-4" />
                下载 CSV 导入模板
              </button>
            </div>
            <div className="bg-muted/30 border border-border rounded-sm p-3 text-xs text-muted-foreground space-y-1">
              <div className="font-medium text-foreground mb-1">模板说明：</div>
              <div>• 必填列：SKU编码、商品名称、分类、单位、单价、安全库存</div>
              <div>• 数字列：单价、安全库存、初始库存必须为有效数字</div>
              <div>• SKU编码不可与现有商品重复，也不能在文件内重复</div>
              <div>• 指定仓库时必须同时填写初始库存（需大于 0）</div>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <FileText className="size-4 text-primary" />
                <span className="font-medium">{fileName}</span>
                <span className="text-muted-foreground">
                  共 {parsedRows.length} 行数据
                </span>
              </div>
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="text-primary hover:text-primary/80 text-sm"
                disabled={importing}
              >
                重新上传
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <StatCard
                label="有效数据"
                value={validRows.length}
                variant="success"
              />
              <StatCard
                label="校验失败"
                value={invalidRows.length}
                variant="error"
              />
              <StatCard
                label="通过率"
                value={`${progressValue}%`}
                variant="default"
              />
            </div>

            <Progress value={progressValue} className="h-1.5" />

            {invalidRows.length > 0 && (
              <div className="bg-destructive/5 border border-destructive/20 rounded-sm p-3">
                <div className="flex items-start gap-2 text-sm">
                  <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium text-destructive mb-1">
                      发现 {invalidRows.length} 条错误数据
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-0.5 max-h-24 overflow-y-auto">
                      {invalidRows.slice(0, 5).map((r) => (
                        <li key={r.row}>
                          第 {r.row} 行：{r.errors.join('；')}
                        </li>
                      ))}
                      {invalidRows.length > 5 && (
                        <li>... 还有 {invalidRows.length - 5} 条错误</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div>
              <div className="text-sm font-medium mb-2">
                数据预览（前 {previewRows.length} 行）
              </div>
              <div className="overflow-x-auto border border-border rounded-sm">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border">
                      <th className="px-2 py-2 text-left font-medium text-muted-foreground w-12">
                        行
                      </th>
                      {['SKU编码', '商品名称', '分类', '规格', '单价', '初始库存', '仓库'].map(
                        (h) => (
                          <th
                            key={h}
                            className="px-2 py-2 text-left font-medium text-muted-foreground"
                          >
                            {h}
                          </th>
                        ),
                      )}
                      <th className="px-2 py-2 text-left font-medium text-muted-foreground w-20">
                        状态
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((r) => (
                      <tr
                        key={r.row}
                        className="border-b border-border/50 last:border-b-0"
                      >
                        <td className="px-2 py-1.5 font-mono text-muted-foreground">
                          {r.row}
                        </td>
                        <td className="px-2 py-1.5 font-mono">{r.data.code}</td>
                        <td className="px-2 py-1.5">{r.data.name}</td>
                        <td className="px-2 py-1.5">{r.data.category}</td>
                        <td className="px-2 py-1.5">{r.data.spec || '-'}</td>
                        <td className="px-2 py-1.5 font-mono">
                          ¥{r.data.unitPrice.toFixed(2)}
                        </td>
                        <td className="px-2 py-1.5 font-mono text-right">
                          {r.data.initialQuantity ?? 0}
                        </td>
                        <td className="px-2 py-1.5">{r.data.warehouse || '-'}</td>
                        <td className="px-2 py-1.5">
                          {r.errors.length === 0 ? (
                            <Badge
                              variant="secondary"
                              className="rounded-full bg-success/10 text-success border-success/20"
                            >
                              有效
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="rounded-full bg-destructive/10 text-destructive border-destructive/20"
                            >
                              错误
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {step === 'result' && importResult && (
          <div className="py-6 space-y-6">
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                label="成功导入"
                value={importResult.successCount}
                variant="success"
              />
              <StatCard
                label="导入失败"
                value={importResult.failCount}
                variant="error"
              />
              <StatCard
                label="总计"
                value={importResult.successCount + importResult.failCount}
                variant="default"
              />
            </div>

            {importResult.failures.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2 flex items-center gap-2">
                  <XCircle className="size-4 text-destructive" />
                  失败明细
                </div>
                <div className="overflow-x-auto border border-border rounded-sm max-h-60 overflow-y-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead className="sticky top-0 bg-card">
                      <tr className="bg-muted/30 border-b border-border">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground w-12">
                          行
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          SKU编码
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          失败原因
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {importResult.failures.map((f, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-border/50 last:border-b-0"
                        >
                          <td className="px-3 py-1.5 font-mono text-muted-foreground">
                            {f.row}
                          </td>
                          <td className="px-3 py-1.5 font-mono">
                            {f.code || '-'}
                          </td>
                          <td className="px-3 py-1.5 text-destructive">
                            {f.reason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {importResult.successCount > 0 && importResult.failCount === 0 && (
              <div className="bg-success/5 border border-success/20 rounded-sm p-4 flex items-center gap-3">
                <CheckCircle className="size-6 text-success" />
                <div>
                  <div className="font-medium text-sm">全部导入成功</div>
                  <div className="text-xs text-muted-foreground">
                    {importResult.successCount} 条商品数据已成功导入
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="pt-3 border-t border-border">
          {step === 'upload' && (
            <Button variant="outline" onClick={handleClose}>
              取消
            </Button>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')} disabled={importing}>
                返回
              </Button>
              <Button onClick={handleImport} disabled={validRows.length === 0 || importing}>
                {importing ? '导入中...' : `确认导入（${validRows.length} 条）`}
              </Button>
            </>
          )}
          {step === 'result' && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  resetState();
                  setStep('upload');
                }}
              >
                继续导入
              </Button>
              <Button onClick={handleClose}>关闭</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface StepBadgeProps {
  num: number;
  label: string;
  active: boolean;
  done: boolean;
}

function StepBadge({ num, label, active, done }: StepBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`size-6 rounded-sm flex items-center justify-center text-xs font-medium ${
          done
            ? 'bg-primary text-primary-foreground'
            : active
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
        }`}
      >
        {done ? <CheckCircle className="size-3.5" /> : num}
      </div>
      <span
        className={`text-xs ${
          active || done ? 'text-foreground font-medium' : 'text-muted-foreground'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number | string;
  variant: 'default' | 'success' | 'error';
}

function StatCard({ label, value, variant }: StatCardProps) {
  const colorMap = {
    default: 'text-foreground',
    success: 'text-success',
    error: 'text-destructive',
  };
  return (
    <div className="border border-border rounded-sm p-3 bg-card">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={`text-2xl font-mono font-light ${colorMap[variant]}`}>
        {value}
      </div>
    </div>
  );
}
