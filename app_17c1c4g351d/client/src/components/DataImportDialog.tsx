import { useState, useCallback, type FC } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { importData, type ImportEntityType } from '@/api/data-import';

interface DataImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: ImportEntityType;
  entityLabel: string;
  onSuccess?: () => void;
}

type ParsedRow = Record<string, unknown>;
type ImportStatus = 'idle' | 'preview' | 'importing' | 'done';

const DataImportDialog: FC<DataImportDialogProps> = ({
  open,
  onOpenChange,
  entity,
  entityLabel,
  onSuccess,
}) => {
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [importResult, setImportResult] = useState<{
    imported: number;
    errors: string[];
  } | null>(null);

  const reset = () => {
    setStatus('idle');
    setRows([]);
    setColumns([]);
    setFileName('');
    setImportResult(null);
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) reset();
    onOpenChange(val);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<ParsedRow>(sheet);

        if (jsonData.length === 0) {
          toast.error('文件中没有数据');
          return;
        }

        const cols = Object.keys(jsonData[0]);
        setColumns(cols);
        setRows(jsonData);
        setStatus('preview');
      } catch {
        toast.error('文件解析失败，请检查文件格式');
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
  });

  const handleImport = async () => {
    setStatus('importing');
    try {
      const result = await importData(entity, rows);
      setImportResult(result);
      setStatus('done');
      if (result.imported > 0) {
        toast.success(`成功导入 ${result.imported} 条${entityLabel}`);
        onSuccess?.();
      }
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} 条数据导入失败`);
      }
    } catch {
      toast.error('导入失败，请重试');
      setStatus('preview');
    }
  };

  const previewRows = rows.slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>导入{entityLabel}</DialogTitle>
          <DialogDescription>
            支持 .xlsx / .xls / .csv 格式，文件列名可使用中文或英文
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {status === 'idle' && (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-accent/30'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="size-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">
                {isDragActive ? '松开鼠标上传文件' : '点击或拖拽文件到此处'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                支持 Excel (.xlsx, .xls) 和 CSV (.csv) 文件
              </p>
            </div>
          )}

          {(status === 'preview' || status === 'importing') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="size-4 text-primary" />
                <span className="text-sm font-medium">{fileName}</span>
                <Badge variant="secondary" className="text-xs">
                  {rows.length} 条数据
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-7 text-xs"
                  onClick={reset}
                >
                  <X className="size-3 mr-1" />
                  重新选择
                </Button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-accent/50 border-b text-xs font-medium text-muted-foreground">
                  数据预览（前 {previewRows.length} 条）
                </div>
                <div className="overflow-x-auto max-h-48">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {columns.slice(0, 6).map((col) => (
                          <TableHead key={col} className="text-xs whitespace-nowrap h-8">
                            {col}
                          </TableHead>
                        ))}
                        {columns.length > 6 && (
                          <TableHead className="text-xs h-8">
                            ...+{columns.length - 6} 列
                          </TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.map((row, i) => (
                        <TableRow key={i}>
                          {columns.slice(0, 6).map((col) => (
                            <TableCell
                              key={col}
                              className="text-xs whitespace-nowrap py-1.5 max-w-[120px] truncate"
                            >
                              {String(row[col] ?? '')}
                            </TableCell>
                          ))}
                          {columns.length > 6 && (
                            <TableCell className="text-xs text-muted-foreground py-1.5">
                              ...
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          {status === 'done' && importResult && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-accent/30">
                {importResult.errors.length === 0 ? (
                  <CheckCircle2 className="size-5 text-green-600 shrink-0" />
                ) : (
                  <AlertCircle className="size-5 text-warning shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {importResult.errors.length === 0
                      ? '导入完成'
                      : '导入完成（部分失败）'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    成功 {importResult.imported} 条
                    {importResult.errors.length > 0 &&
                      `，失败 ${importResult.errors.length} 条`}
                  </p>
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-destructive/5 border-b text-xs font-medium text-destructive">
                    失败详情
                  </div>
                  <div className="max-h-32 overflow-y-auto p-2 space-y-1">
                    {importResult.errors.slice(0, 10).map((err, i) => (
                      <p key={i} className="text-xs text-muted-foreground">
                        {err}
                      </p>
                    ))}
                    {importResult.errors.length > 10 && (
                      <p className="text-xs text-muted-foreground">
                        ...还有 {importResult.errors.length - 10} 条错误
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {status === 'done' ? (
            <Button onClick={() => handleOpenChange(false)}>关闭</Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={status === 'importing'}
              >
                取消
              </Button>
              <Button
                onClick={handleImport}
                disabled={status !== 'preview'}
              >
                {status === 'importing'
                  ? '导入中...'
                  : `确认导入 ${rows.length} 条`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DataImportDialog;
