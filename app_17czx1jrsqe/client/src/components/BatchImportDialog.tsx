import { useMemo, useRef, useState } from 'react';
import { CheckCircle2, Download, FileSpreadsheet, Loader2, Upload, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  IMPORT_SCHEMAS,
  downloadImportTemplate,
  rowsToEntityPayloads,
  validateImportRows,
} from '@/api/import-schemas';
import {
  batchWriteRows,
  createImportTaskRecord,
  getEntityApiForSchema,
  makeTaskNo,
  parseImportFile,
  uploadOriginalFile,
  type ImportDetailRow,
} from '@/pages/Task/import-result';
import { extractErrorMessage } from '@/lib/error-utils';

export interface BatchImportResult {
  fileName: string;
  total: number;
  success: number;
  fail: number;
}

const SCHEMA_LIST = Object.values(IMPORT_SCHEMAS);
const MAX_FILE_SIZE = 25 * 1024 * 1024;

interface BatchImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 固定导入类型；指定后隐藏类型选择器 */
  importType?: string;
  /** 可选导入类型列表（schema.type），不传用全部已接入类型 */
  importTypes?: string[];
  /** 确认导入后的回调（任务记录已由弹窗写入） */
  onImported?: (result: BatchImportResult, type: string) => void;
}

export default function BatchImportDialog({
  open,
  onOpenChange,
  importType,
  importTypes,
  onImported,
}: BatchImportDialogProps) {
  const types = useMemo(
    () => SCHEMA_LIST.filter((s) => !importTypes || importTypes.includes(s.type)),
    [importTypes],
  );
  const [selectedType, setSelectedType] = useState(importType ?? types[0]?.type ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  const [rowErrors, setRowErrors] = useState<Array<{ row: number; reasons: string[] }>>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const effectiveType = importType ?? selectedType;
  const schema = types.find((s) => s.type === effectiveType) ?? null;
  const unsupported = !schema;
  const validCount = rows ? rows.length - rowErrors.length : 0;

  const resetDialog = () => {
    setFile(null);
    setRows(null);
    setRowErrors([]);
    setParsing(false);
    setImporting(false);
    setProgress('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = async (f: File | null) => {
    if (!f) return;
    if (!/\.(xlsx|csv)$/i.test(f.name)) {
      toast.error('仅支持 .xlsx 或 .csv 文件');
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      toast.error('文件不能超过 25MB');
      return;
    }
    if (!schema) return;
    setFile(f);
    setParsing(true);
    setRows(null);
    setRowErrors([]);
    try {
      const parsed = await parseImportFile(f);
      if (parsed.length === 0) throw new Error('文件中没有数据行');
      const errs = validateImportRows(schema, parsed);
      const byRow = new Map<number, string[]>();
      for (const e of errs) {
        const list = byRow.get(e.row) ?? [];
        list.push(e.reason);
        byRow.set(e.row, list);
      }
      setRows(parsed);
      setRowErrors(
        Array.from(byRow.entries())
          .map(([row, reasons]) => ({ row, reasons }))
          .sort((a, b) => a.row - b.row),
      );
    } catch (e) {
      toast.error(extractErrorMessage(e));
      setFile(null);
    } finally {
      setParsing(false);
    }
  };

  const handleConfirm = async () => {
    if (!schema || !file || !rows || importing) return;
    const api = getEntityApiForSchema(schema);
    if (!api) {
      toast.error('未找到该导入类型对应的写入接口');
      return;
    }
    const errorRowSet = new Set(rowErrors.map((e) => e.row));
    const validRows = rows
      .map((data, idx) => ({ row: idx + 1, data }))
      .filter((r) => !errorRowSet.has(r.row));
    if (validRows.length === 0) return;
    setImporting(true);
    setProgress('正在写入数据…');
    let outcome = { successRows: 0, failRows: 0, details: [] as ImportDetailRow[] };
    try {
      const payloads = rowsToEntityPayloads(
        schema,
        validRows.map((v) => v.data),
      );
      outcome = await batchWriteRows(
        api,
        validRows.map((v, i) => ({ row: v.row, payload: payloads[i] })),
        (done, total) => setProgress(`正在写入 ${done}/${total} 行`),
      );
    } catch (e) {
      toast.error(extractErrorMessage(e));
      setImporting(false);
      return;
    }
    const validationDetails: ImportDetailRow[] = rowErrors.map((e) => ({
      row: e.row,
      ok: false,
      reason: e.reasons.join('；'),
    }));
    const details = [...validationDetails, ...outcome.details].sort((a, b) => a.row - b.row);
    const total = rows.length;
    const fail = total - outcome.successRows;
    let docToken: string | undefined;
    try {
      docToken = await uploadOriginalFile(file);
    } catch (e) {
      toast.warning(extractErrorMessage(e));
    }
    try {
      await createImportTaskRecord({
        taskNo: makeTaskNo('IMP'),
        taskType: schema.type,
        fileName: file.name,
        totalRows: total,
        successRows: outcome.successRows,
        failRows: fail,
        failDetail: details,
        docFileToken: docToken,
      });
    } catch (e) {
      toast.error(`导入任务记录写入失败：${extractErrorMessage(e)}`);
    }
    toast.success(`导入完成：成功 ${outcome.successRows} 行，失败 ${fail} 行`);
    onImported?.({ fileName: file.name, total, success: outcome.successRows, fail }, schema.type);
    setImporting(false);
    onOpenChange(false);
    resetDialog();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) resetDialog();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>新建导入任务</DialogTitle>
          <DialogDescription>下载模板 → 填写数据 → 选择文件，系统将真实校验并写入数据表</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {!importType && (
            <div className="space-y-2">
              <Label>导入类型</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger><SelectValue placeholder="请选择导入类型" /></SelectTrigger>
                <SelectContent>
                  {types.map((s) => (
                    <SelectItem key={s.type} value={s.type}>{s.type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {importType && (
            <div className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2 text-sm">
              <FileSpreadsheet className="size-4 text-primary" />
              导入类型：<span className="font-medium">{importType}</span>
            </div>
          )}
          {unsupported ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700">
              该导入类型暂未接入真实数据链路，请前往任务中心的批量导入使用已接入类型。
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (schema) downloadImportTemplate(schema, 'xlsx');
                  }}
                >
                  <Download className="size-3.5" /> 下载导入模板
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (schema) downloadImportTemplate(schema, 'csv');
                  }}
                >
                  CSV 模板
                </Button>
              </div>
              <div className="space-y-2">
                <Label>选择文件</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.csv"
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  {file ? (
                    <>
                      <FileSpreadsheet className="size-8 text-primary" />
                      <span className="font-medium text-foreground">{file.name}</span>
                      <span className="text-xs">{(file.size / 1024).toFixed(1)} KB · 点击重新选择</span>
                    </>
                  ) : (
                    <>
                      <Upload className="size-8" />
                      <span>点击选择 .xlsx / .csv 文件</span>
                    </>
                  )}
                </button>
              </div>
              {parsing && (
                <div className="flex items-center gap-2 rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin text-primary" /> 正在解析文件…
                </div>
              )}
              {rows && !parsing && (
                <div className="rounded-md border border-border bg-muted/20 p-3">
                  <div className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                    <CheckCircle2 className="size-4 text-primary" /> 校验完成
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-lg font-semibold tabular-nums">{rows.length}</div>
                      <div className="text-xs text-muted-foreground">总行数</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold tabular-nums text-primary">{validCount}</div>
                      <div className="text-xs text-muted-foreground">有效行</div>
                    </div>
                    <div>
                      <div className={`text-lg font-semibold tabular-nums ${rowErrors.length > 0 ? 'text-destructive' : ''}`}>{rowErrors.length}</div>
                      <div className="text-xs text-muted-foreground">无效行</div>
                    </div>
                  </div>
                  {rowErrors.length > 0 && (
                    <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded border border-destructive/30 bg-destructive/5 p-2">
                      {rowErrors.map((e) => (
                        <div key={e.row} className="flex items-start gap-1.5 text-xs text-destructive">
                          <XCircle className="mt-0.5 size-3 shrink-0" />
                          <span>第 {e.row} 行：{e.reasons.join('；')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {importing && (
                <div className="flex items-center gap-2 rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin text-primary" /> {progress}
                </div>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>取消</Button>
          <Button disabled={unsupported || !file || validCount === 0 || parsing || importing} onClick={handleConfirm}>
            确认导入
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
