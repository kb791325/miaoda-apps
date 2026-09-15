import { useCallback, useState } from 'react';
import { Download, FileUp, Upload, Check, X, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { createModuleRecord } from '@/lib/data-service';
import { recordAuditLog } from '@/lib/audit-log';
import { downloadCsv } from '@/lib/report';
import type { ModuleKey } from '@/data/mt-records';

interface ImportResult {
  row: number;
  success: boolean;
  message: string;
  recordId?: string;
}

export default function BatchImportPage() {
  const [moduleKey, setModuleKey] = useState<ModuleKey>('customer');
  const [csvText, setCsvText] = useState('');
  const [results, setResults] = useState<ImportResult[]>([]);
  const [importing, setImporting] = useState(false);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      setResults([]);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      setResults([]);
    };
    reader.readAsText(file);
  }, []);

  const parseCSV = useCallback((text: string): { headers: string[]; rows: string[][] } => {
    const lines = text.trim().split('\n').filter(Boolean);
    if (lines.length < 2) return { headers: [], rows: [] };
    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map((line) => {
      const parts: string[] = [];
      let current = '';
      let inQuotes = false;
      for (const ch of line) {
        if (ch === '"') { inQuotes = !inQuotes; continue; }
        if (ch === ',' && !inQuotes) { parts.push(current.trim()); current = ''; continue; }
        current += ch;
      }
      parts.push(current.trim());
      return parts.map((p) => p.replace(/^"|"$/g, ''));
    });
    return { headers, rows };
  }, []);

  const handleImport = useCallback(async () => {
    if (!csvText.trim()) {
      toast.error('请先粘贴CSV内容或上传文件');
      return;
    }
    const { headers, rows } = parseCSV(csvText);
    if (headers.length === 0 || rows.length === 0) {
      toast.error('CSV格式无效，请检查文件内容');
      return;
    }
    setImporting(true);
    const importResults: ImportResult[] = [];
    let successCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const values: Record<string, string | number> = {};
        for (let j = 0; j < headers.length && j < row.length; j++) {
          const val = row[j];
          const num = Number(val);
          values[headers[j]] = !isNaN(num) && val !== '' ? num : val;
        }
        const record = await createModuleRecord(moduleKey, values);
        importResults.push({ row: i + 1, success: true, message: '导入成功', recordId: record.recordId });
        successCount++;
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        importResults.push({ row: i + 1, success: false, message: detail });
      }
    }

    setResults(importResults);
    setImporting(false);
    recordAuditLog({
      action: '导入',
      module: moduleKey,
      description: `批量导入 ${moduleKey} 模块，成功 ${successCount}/${rows.length} 条`,
    }).catch(() => {});
    toast.success(`导入完成: ${successCount}/${rows.length} 条成功`);
  }, [csvText, moduleKey, parseCSV]);

  const handleDownloadTemplate = useCallback(() => {
    const templates: Record<ModuleKey, string[]> = {
      customer: ['名称,行业,联系人,联系电话,客户等级,跟进状态,所属销售'],
      ad: ['项目编号,客户名称,广告类型,投放渠道,预算金额,排期开始,排期结束,状态'],
      video: ['项目编号,客户名称,视频类型,导演,制作周期,预算,状态'],
      contract: ['合同编号,合同方,客户名称,合同金额,签订日期,到期日期,合同状态'],
      finance: ['单据编号,类型,关联合同,金额,收支日期,经手人,凭证说明'],
      hr: ['姓名,部门,岗位,入职日期,在职状态,联系方式'],
      admin: ['名称,类别,负责人,日期,状态'],
      task: ['任务标题,负责人,优先级,截止日期,关联模块,任务状态'],
      system: ['用户姓名,角色,所属部门,账号状态'],
      support: ['工单编号,提交人,问题类型,问题描述,处理人,处理状态'],
    };
    const template = templates[moduleKey] ?? ['字段1,字段2,字段3'];
    downloadCsv(`${moduleKey}_导入模板.csv`, template[0].split(','), []);
    toast.success('模板已下载');
  }, [moduleKey]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">批量导入</h2>
        <p className="mt-1 text-sm text-muted-foreground">上传CSV文件或粘贴CSV内容，批量导入数据记录</p>
      </div>

      {/* 模块选择 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">导入目标模块:</label>
            <Select value={moduleKey} onValueChange={(v) => { setModuleKey(v as ModuleKey); setResults([]); }}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  { key: 'customer', label: '客户管理' },
                  { key: 'ad', label: '广告业务' },
                  { key: 'video', label: '视频业务' },
                  { key: 'contract', label: '合同业务' },
                  { key: 'finance', label: '财务管理' },
                  { key: 'hr', label: '人资管理' },
                  { key: 'admin', label: '行政管理' },
                  { key: 'task', label: '任务中心' },
                  { key: 'system', label: '系统管理' },
                  { key: 'support', label: '业务支持' },
                ].map((m) => (
                  <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <FileSpreadsheet className="size-4" /> 下载模板
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 上传区域 */}
      <Card>
        <CardHeader>
          <CardTitle>上传CSV文件</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <FileUp className="mx-auto size-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-2">
              拖拽CSV文件到此处，或点击选择文件
            </p>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <Button variant="outline" size="sm" onClick={() => document.getElementById('csv-upload')?.click()}>
              <Upload className="size-4" /> 选择文件
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 内容编辑区 */}
      <Card>
        <CardHeader>
          <CardTitle>CSV内容（也可直接粘贴）</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="名称,行业,联系人,联系电话&#10;示例公司,IT,张三,13800138000&#10;..."
            value={csvText}
            onChange={(e) => { setCsvText(e.target.value); setResults([]); }}
            rows={8}
            className="font-mono text-sm"
          />
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {csvText ? `${csvText.split('\n').filter(Boolean).length - 1} 条数据行` : '第一行为列名，后续行为数据'}
            </span>
            <Button onClick={handleImport} disabled={importing || !csvText.trim()}>
              {importing ? '导入中...' : '开始导入'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 导入结果 */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              导入结果
              <Badge variant="secondary">
                {results.filter((r) => r.success).length}/{results.length} 成功
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">行号</th>
                    <th className="px-4 py-2 text-left font-medium">结果</th>
                    <th className="px-4 py-2 text-left font-medium">详情</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.row} className="border-t border-border">
                      <td className="px-4 py-2">{r.row}</td>
                      <td className="px-4 py-2">
                        {r.success ? (
                          <Badge variant="secondary"><Check className="size-3" /> 成功</Badge>
                        ) : (
                          <Badge variant="destructive"><X className="size-3" /> 失败</Badge>
                        )}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{r.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}