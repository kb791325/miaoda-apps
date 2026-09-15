import { useState } from 'react';
import { Code, Copy, Check, ChevronDown, ChevronRight, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { importData, type ImportEntityType, type ImportResult } from '@/api/data-import';
import { toast } from 'sonner';

const API_ENTITIES = [
  { entity: 'products', label: '商品数据', fields: 'name, category, price, cost, shippingCost, salesVolume, salesAmount, profit, profitMargin, conversionRate, status, daysZeroSales' },
  { entity: 'inventory', label: '库存数据', fields: 'productName, productId, category, currentStock, safetyStock, avgDailySales7d, avgDailySales30d, daysAvailable, suggestedRestock, isSlowMoving, stockValue' },
  { entity: 'customers', label: '客户数据', fields: 'customerCode, firstPurchaseDate, totalSpent, purchaseCount, lastPurchaseDate, rfmScore, tag' },
  { entity: 'after-sale', label: '售后工单', fields: 'orderNo, productId, productName, reason, handleType, refundAmount, compensationAmount, status, processDuration, isOverdue' },
  { entity: 'channels', label: '投放渠道', fields: 'name, cost, clicks, ctr, conversionRate, gmv, roi' },
  { entity: 'keywords', label: '流量关键词', fields: 'content, type, clicks, conversionRate, gmv, roi' },
];

function CurlExample({ entity, label, fields }: { entity: string; label: string; fields: string }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const curlCmd = `curl -X POST \\${'{'}
  '{{baseUrl}}/api/data-import/external' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer {{apiKey}}' \\
  -d '${'{'}
    "entity": "${entity}",
    "data": [
      ${'{'} /* ${label}字段: ${fields} */ ${'}'}
    ]
  ${'}'}'`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(curlCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        className="flex items-center gap-2 w-full px-4 py-2.5 text-left hover:bg-accent/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown className="size-3.5 text-muted-foreground" /> : <ChevronRight className="size-3.5 text-muted-foreground" />}
        <span className="text-sm font-medium">{label}</span>
        <Badge variant="secondary" className="text-xs ml-auto">
          {entity}
        </Badge>
      </button>
      {expanded && (
        <div className="border-t border-border">
          <div className="relative">
            <pre className="text-xs p-4 bg-accent/30 overflow-x-auto text-foreground/80 leading-relaxed">
              <code>{curlCmd}</code>
            </pre>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 size-7 p-0"
              onClick={handleCopy}
            >
              {copied ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
            </Button>
          </div>
          <div className="px-4 py-2.5 bg-accent/10 border-t border-border">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">可用字段：</span>{fields}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ApiImportSection() {
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [jsonInput, setJsonInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleSubmit = async () => {
    if (!selectedEntity) {
      toast.error('请选择数据类型');
      return;
    }
    if (!jsonInput.trim()) {
      toast.error('请输入 JSON 数据');
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonInput);
    } catch {
      toast.error('JSON 格式无效，请检查语法');
      return;
    }

    const dataArray = Array.isArray(parsed) ? parsed : [parsed];
    if (dataArray.length === 0) {
      toast.error('数据不能为空');
      return;
    }
    if (dataArray.length > 500) {
      toast.error('单次导入最多 500 条记录');
      return;
    }

    setSubmitting(true);
    setResult(null);
    try {
      const res = await importData(selectedEntity as ImportEntityType, dataArray);
      setResult(res);
      toast.success(`成功导入 ${res.imported} 条记录`);
    } catch {
      toast.error('导入失败，请检查数据格式');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Code className="size-4 text-primary" />
          API 接口调用
        </CardTitle>
        <CardDescription>
          通过 REST API 从外部系统批量导入数据。可直接在下方粘贴 JSON 数据提交，或参考调用示例集成到外部系统。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Select value={selectedEntity} onValueChange={setSelectedEntity}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="选择数据类型" />
              </SelectTrigger>
              <SelectContent>
                {API_ENTITIES.map((item) => (
                  <SelectItem key={item.entity} value={item.entity}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !selectedEntity || !jsonInput.trim()}
              size="sm"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin mr-1" />
              ) : (
                <Send className="size-4 mr-1" />
              )}
              {submitting ? '导入中...' : '提交导入'}
            </Button>
          </div>
          <Textarea
            placeholder={'粘贴 JSON 数据，支持数组或单条对象格式，例如：\n[{"name": "商品A", "price": 99, "category": "服装"}]'}
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            className="min-h-[120px] font-mono text-xs resize-y"
          />
          {result && (
            <div className="rounded-lg border border-border p-3 bg-accent/20">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  导入 {result.imported} 条
                </Badge>
                {result.errors.length > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {result.errors.length} 条错误
                  </Badge>
                )}
              </div>
              {result.errors.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {result.errors.map((err, i) => (
                    <li key={i} className="text-xs text-destructive">
                      {err}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border p-4 bg-accent/20">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs font-mono">POST</Badge>
            <code className="text-sm font-mono text-foreground">/api/data-import/external</code>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            请求体结构：<code className="bg-accent px-1 py-0.5 rounded text-xs">{`{ "entity": "<类型>", "data": [<记录数组>] }`}</code>
          </p>
          <p className="text-xs text-muted-foreground">
            单次最多导入 500 条记录。字段名支持中文或英文，缺失字段将使用默认值。
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">各数据类型调用示例：</p>
          <div className="space-y-2">
            {API_ENTITIES.map((item) => (
              <CurlExample
                key={item.entity}
                entity={item.entity}
                label={item.label}
                fields={item.fields}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
