import { useState } from 'react';
import { Button } from '@client/src/components/ui/button';
import { Badge } from '@client/src/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import type { FeishuFieldInfo, SmartMatchResult } from '@shared/api.interface';

interface FieldMappingTableProps {
  localFields: string[];
  feishuFields: FeishuFieldInfo[];
  fieldMap: Record<string, string>;
  onFieldMapChange: (map: Record<string, string>) => void;
  onLoadFeishuFields: () => Promise<void>;
  onSmartMatch: () => Promise<SmartMatchResult[]>;
  loadingFields: boolean;
  matching: boolean;
}

const CONFIDENCE_STYLE: Record<string, string> = {
  high: 'bg-success/10 text-success border-success/20',
  medium: 'bg-warning/10 text-warning border-warning/20',
  low: 'bg-muted/60 text-muted-foreground border-border',
};

const CONFIDENCE_LABEL: Record<string, string> = {
  high: '高置信',
  medium: '中置信',
  low: '低置信',
};

export function FieldMappingTable({
  localFields,
  feishuFields,
  fieldMap,
  onFieldMapChange,
  onLoadFeishuFields,
  onSmartMatch,
  loadingFields,
  matching,
}: FieldMappingTableProps) {
  const [lastMatch, setLastMatch] = useState<SmartMatchResult[]>([]);

  const handleSelect = (localField: string, feishuField: string) => {
    onFieldMapChange({ ...fieldMap, [localField]: feishuField });
  };

  const handleSmartMatch = async () => {
    const results = await onSmartMatch();
    setLastMatch(results);
    const newMap: Record<string, string> = { ...fieldMap };
    results.forEach((r: SmartMatchResult) => {
      newMap[r.localField] = r.feishuField;
    });
    onFieldMapChange(newMap);
  };

  const getConfidence = (localField: string): string | null => {
    const match = lastMatch.find((m: SmartMatchResult) => m.localField === localField);
    return match ? match.confidence : null;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-foreground">字段映射</div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadFeishuFields}
            disabled={loadingFields}
          >
            {loadingFields ? (
              <Loader2 className="size-3.5 animate-spin mr-1" />
            ) : (
              <RefreshCw className="size-3.5 mr-1" />
            )}
            读取飞书字段
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSmartMatch}
            disabled={matching || feishuFields.length === 0}
          >
            {matching ? (
              <Loader2 className="size-3.5 animate-spin mr-1" />
            ) : (
              <Sparkles className="size-3.5 mr-1 text-primary" />
            )}
            智能匹配
          </Button>
        </div>
      </div>

      {feishuFields.length === 0 ? (
        <div className="text-xs text-muted-foreground py-4 text-center border border-dashed border-border rounded-sm">
          点击「读取飞书字段」加载多维表格字段列表
        </div>
      ) : (
        <div className="border border-border rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground w-1/2">
                  本地字段
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  飞书字段
                </th>
              </tr>
            </thead>
            <tbody>
              {localFields.map((field: string) => {
                const confidence = getConfidence(field);
                return (
                  <tr
                    key={field}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span>{field}</span>
                        {confidence && (
                          <Badge
                            variant="secondary"
                            className={CONFIDENCE_STYLE[confidence]}
                          >
                            {CONFIDENCE_LABEL[confidence]}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Select
                        value={fieldMap[field] ?? ''}
                        onValueChange={(val: string) => handleSelect(field, val)}
                      >
                        <SelectTrigger size="sm" className="w-full h-8">
                          <SelectValue placeholder="请选择飞书字段" />
                        </SelectTrigger>
                        <SelectContent>
                          {feishuFields.map((f: FeishuFieldInfo) => (
                            <SelectItem key={f.fieldName} value={f.fieldName}>
                              {f.fieldName}
                              <span className="text-muted-foreground ml-2 text-xs">
                                {f.fieldType}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
