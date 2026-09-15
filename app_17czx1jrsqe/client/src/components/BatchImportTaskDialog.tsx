import { useMemo, useRef, useState } from 'react';
import { FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  IMPORT_SCHEMA_ENTRIES,
  downloadImportTemplate,
  fetchExistingNameSet,
  parseImportFile,
  rowsToEntityPayloads,
  validateImportRows,
  type ImportSchema,
  type ImportRowError,
} from '@/api/import-schemas';
import {
  batchWriteRows,
  createProcessingImportTaskRecord,
  getEntityApiForSchema,
  makeTaskNo,
  updateImportTaskRecord,
  uploadOriginalFile,
  type ImportDetailRow,
} from '@/pages/Task/import-result';
import { extractErrorMessage } from '@/lib/error-utils';

export interface BatchImportTaskResult {
  taskNo: string;
  fileName: string;
  total: number;
  success: number;
  fail: number;
}

interface ParsedRow {
  row: number;
  data: Record<string, unknown>;
  errors: string[];
}

interface BatchImportTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFinished?: (result: BatchImportTaskResult) => void;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024;

export default function BatchImportTaskDialog({
  open, onOpenChange, onFinished,
}: BatchImportTaskDialogProps) {
  const [schemaKey, setSchemaKey] = useState<string>(IMPORT_SCHEMA_ENTRIES[0].key);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parsing, setParsing] = useState<boolean>(false);
  const [importing, setImporting] = useState<boolean>(false);
  const [progress, setProgress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentEntry = useMemo(
    () => IMPORT_SCHEMA_ENTRIES.find((e) => e.key === schemaKey) ?? IMPORT_SCHEMA_ENTRIES[0],
    [schemaKey],
  );
  const currentSchema: ImportSchema = currentEntry.schema;
  const validCount = rows.filter((r: ParsedRow) => r.errors.length === 0).length;
  const failCount = rows.length - validCount;

  const resetDialog = (): void => {
    setFile(null);
    setRows([]);
    setParsing(false);
    setImporting(false);
    setProgress('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const buildParsedRows = (
    schema: ImportSchema,
    rawRows: Record<string, unknown>[],
    existing: Set<string>,
  ): ParsedRow[] => {
    const fieldErrors: ImportRowError[] = validateImportRows(schema, rawRows);
    const byRow = new Map<number, string[]>();
    for (const err of fieldErrors) {
      const list = byRow.get(err.row) ?? [];
      list.push(err.reason);
      byRow.set(err.row, list);
    }
    const dedupLabel = schema.fields.find((f) => f.key === schema.dedupKey)?.label ?? schema.dedupKey;
    const seen = new Set<string>();
    return rawRows.map((data: Record<string, unknown>, idx: number): ParsedRow => {
      const errors = [...(byRow.get(idx + 1) ?? [])];
      const name = String(data[dedupLabel] ?? '').trim();
      if (name) {
        const norm = name.toLowerCase();
        if (existing.has(norm)) errors.push(`${dedupLabel} 已存在（重名）：${name}`);
        else if (seen.has(norm)) errors.push(`${dedupLabel} 文件内重复：${name}`);
        else seen.add(norm);
      }
      return { row: idx + 1, data, errors };
    });
  };

  const handleSchemaChange = (key: string): void => {
    setSchemaKey(key);
    setFile(null);
    setRows([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = async (f: File | null): Promise<void> => {
    if (!f) return;
    if (!/\.(xlsx|csv)$/i.test(f.name)) {
      toast.error('仅支持 .xlsx 或 .csv 文件');
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      toast.error('文件不能超过 25MB');
      return;
    }
    setFile(f);
    setRows([]);
    setParsing(true);
    try {
      const rawRows = await parseImportFile(f);
      if (rawRows.length === 0) {
        toast.warning('文件中没有可解析的数据行');
        setFile(null);
        return;
      }
      const existing = await fetchExistingNameSet(schemaKey);
      setRows(buildParsedRows(currentSchema, rawRows, existing));
    } catch (e) {
      toast.error(extractErrorMessage(e));
      setFile(null);
    } finally {
      setParsing(false);
    }
  };

  const handleConfirm = async (): Promise<void> => {
    if (!file || rows.length === 0 || validCount === 0 || importing) return;
    const batchCreate = getEntityApiForSchema(currentSchema);
    if (!batchCreate) {
      toast.error('未找到该导入类型对应的数据写入接口');
      return;
    }
    setImporting(true);
    setProgress('正在上传原文档…');
    let docToken: string | undefined;
    try {
      docToken = await uploadOriginalFile(file);
    } catch (e) {
      toast.warning(`原文档上传失败，任务记录将不包含附件：${extractErrorMessage(e)}`);
    }
    setProgress('正在创建任务记录…');
    const taskNo = makeTaskNo('IMP');
    let recordId = '';
    try {
      recordId = await createProcessingImportTaskRecord({
        taskNo,
        taskType: currentSchema.type,
        fileName: file.name,
        totalRows: rows.length,
        docFileToken: docToken,
      });
    } catch (e) {
      toast.error(extractErrorMessage(e));
      setImporting(false);
      setProgress('');
      return;
    }
    const validRows: ParsedRow[] = rows.filter((r: ParsedRow) => r.errors.length === 0);
    const payloads = rowsToEntityPayloads(currentSchema, validRows.map((r: ParsedRow) => r.data));
    setProgress('正在写入数据…');
    const outcome = await batchWriteRows(
      batchCreate,
      validRows.map((r: ParsedRow, i: number) => ({ row: r.row, payload: payloads[i] })),
      (done: number, total: number) => setProgress(`正在写入 ${done}/${total} 行`),
    );
    const validationDetails: ImportDetailRow[] = rows
      .filter((r: ParsedRow) => r.errors.length > 0)
      .map((r: ParsedRow): ImportDetailRow => ({ row: r.row, ok: false, reason: r.errors.join('；') }));
    const details = [...validationDetails, ...outcome.details]
      .sort((a: ImportDetailRow, b: ImportDetailRow) => a.row - b.row);
    const success = outcome.successRows;
    const fail = rows.length - success;
    try {
      await updateImportTaskRecord(recordId, {
        completed: success > 0,
        successRows: success,
        failRows: fail,
        failDetail: details,
      });
    } catch (e) {
      toast.error(`导入已执行，但任务记录更新失败：${extractErrorMessage(e)}`);
    }
    toast.success(`导入完成：成功 ${success} 条，失败 ${fail} 条`);
    onFinished?.({ taskNo, fileName: file.name, total: rows.length, success, fail });
    onOpenChange(false);
    resetDialog();
  };

  return (
    <Dialog open={open} onOpenChange={(o: boolean) => { if (!importing) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>新建导入任务</DialogTitle>
          <DialogDescription>
            选择导入类型，下载模板填入数据后上传，系统将逐行校验、去重比对并真实写入对应业务表。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>导入类型</Label>
            <Select value={schemaKey} onValueChange={handleSchemaChange}>
              <SelectTrigger><SelectValue placeholder="请选择导入类型" /></SelectTrigger>
              <SelectContent>
                {IMPORT_SCHEMA_ENTRIES.map((e) => (
                  <SelectItem key={e.key} value={e.key}>{e.schema.type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>数据文件</Label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.csv"
                className="hidden"
                onChange={(e) => void handleFileChange(e.target.files?.[0] ?? null)}
              />
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-1 size-4" />选择文件
              </Button>
              <Button type="button" variant="ghost" onClick={() => downloadImportTemplate(currentSchema)}>
                <FileSpreadsheet className="mr-1 size-4" />下载导入模板
              </Button>
            </div>
            {file ? <div className="text-xs text-muted-foreground">已选择：{file.name}</div> : null}
          </div>
          {parsing ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />正在解析文件…
            </div>
          ) : null}
          {importing && progress ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />{progress}
            </div>
          ) : null}
          {rows.length > 0 && !parsing ? (
            <div className="rounded-md border">
              <div className="flex items-center justify-between border-b px-3 py-2 text-xs text-muted-foreground">
                <span>共 {rows.length} 行</span>
                <span>
                  <span className="text-success">可导入 {validCount}</span>
                  {failCount > 0 ? <span className="ml-2 text-destructive">错误 {failCount}</span> : null}
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto text-xs">
                {rows.map((r: ParsedRow) => (
                  <div key={r.row} className="border-b px-3 py-1.5 last:border-b-0">
                    {r.errors.length === 0 ? (
                      <span className="text-muted-foreground">第 {r.row} 行：校验通过</span>
                    ) : (
                      <span className="text-destructive">第 {r.row} 行：{r.errors.join('；')}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={importing} onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            type="button"
            disabled={importing || parsing || validCount === 0}
            onClick={() => void handleConfirm()}
          >
            {importing ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
            确认导入{validCount > 0 ? `（${validCount} 条）` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
