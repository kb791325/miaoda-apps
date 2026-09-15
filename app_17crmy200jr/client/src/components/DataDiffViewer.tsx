import { useState } from 'react';
import { ArrowLeftRight, Code, Table2 } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { Badge } from '@client/src/components/ui/badge';

// ============ 类型 ============

interface DataDiffViewerProps {
  beforeData?: Record<string, unknown>;
  afterData?: Record<string, unknown>;
  changedFields?: string[];
}

type ViewMode = 'table' | 'json';

// ============ 工具函数 ============

function formatDiffValue(val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'object') return JSON.stringify(val, null, 2);
  return String(val);
}

function getChangedKeys(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  changedFields?: string[],
): string[] {
  if (changedFields && changedFields.length > 0) return changedFields;
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return Array.from(allKeys).filter(
    (k: string) =>
      JSON.stringify(before[k]) !== JSON.stringify(after[k]),
  );
}

function getUnchangedKeys(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  changedKeys: string[],
): string[] {
  const changedSet = new Set(changedKeys);
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return Array.from(allKeys).filter((k: string) => !changedSet.has(k));
}

function categorizeDiffKeys(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  changedKeys: string[],
): {
  addedKeys: string[];
  removedKeys: string[];
  modifiedKeys: string[];
} {
  const addedKeys: string[] = [];
  const removedKeys: string[] = [];
  const modifiedKeys: string[] = [];
  for (const key of changedKeys) {
    const inBefore = key in before;
    const inAfter = key in after;
    if (!inBefore && inAfter) {
      addedKeys.push(key);
    } else if (inBefore && !inAfter) {
      removedKeys.push(key);
    } else {
      modifiedKeys.push(key);
    }
  }
  return { addedKeys, removedKeys, modifiedKeys };
}

function renderJsonHighlight(obj: Record<string, unknown>): string {
  const json = JSON.stringify(obj, null, 2);
  return json
    .replace(
      /^(\s*"[^"]+")(:)/gm,
      '<span class="text-primary">$1</span>$2',
    )
    .replace(
      /: ("(?:[^"\\]|\\.)*")/g,
      ': <span class="text-green-600">$1</span>',
    )
    .replace(
      /: (\d+\.?\d*)/g,
      ': <span class="text-blue-600">$1</span>',
    )
    .replace(
      /: (true|false|null)/g,
      ': <span class="text-purple-600">$1</span>',
    );
}

// ============ 组件 ============

const DataDiffViewer = ({
  beforeData,
  afterData,
  changedFields,
}: DataDiffViewerProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  const before = beforeData ?? {};
  const after = afterData ?? {};
  const hasData = Object.keys(before).length > 0 || Object.keys(after).length > 0;

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
        <ArrowLeftRight className="size-8 mb-3 opacity-40" />
        <p className="text-sm">无变更数据</p>
      </div>
    );
  }

  const changedKeys = getChangedKeys(before, after, changedFields);
  const unchangedKeys = getUnchangedKeys(before, after, changedKeys);
  const { addedKeys, removedKeys, modifiedKeys } = categorizeDiffKeys(
    before,
    after,
    changedKeys,
  );

  return (
    <div className="space-y-4">
      {/* 视图切换 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="rounded-sm border-destructive/30 bg-destructive/10 text-destructive text-xs"
          >
            {changedKeys.length} 项变更
          </Badge>
          {unchangedKeys.length > 0 && (
            <Badge
              variant="outline"
              className="rounded-sm border-border bg-muted/50 text-muted-foreground text-xs"
            >
              {unchangedKeys.length} 项未变
            </Badge>
          )}
        </div>
        <div className="flex items-center rounded-sm border border-border">
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 rounded-r-none rounded-l-sm text-xs"
            onClick={() => setViewMode('table')}
          >
            <Table2 className="mr-1 size-3.5" />
            表格
          </Button>
          <Button
            variant={viewMode === 'json' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 rounded-l-none rounded-r-sm text-xs"
            onClick={() => setViewMode('json')}
          >
            <Code className="mr-1 size-3.5" />
            JSON
          </Button>
        </div>
      </div>

      {/* 表格视图 */}
      {viewMode === 'table' && (
        <div className="rounded-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="w-1/4 px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  字段
                </th>
                <th className="w-[37.5%] px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  变更前
                </th>
                <th className="w-[37.5%] px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  变更后
                </th>
              </tr>
            </thead>
            <tbody>
              {addedKeys.map((key: string) => (
                <tr key={key} className="border-t border-border bg-green-50">
                  <td className="px-3 py-2 font-medium text-green-700">
                    {key}
                    <span className="ml-1.5 text-xs text-green-500">新增</span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground/40 font-mono text-xs">
                    —
                  </td>
                  <td className="px-3 py-2 text-green-700 font-mono text-xs break-words">
                    {formatDiffValue(after[key])}
                  </td>
                </tr>
              ))}
              {modifiedKeys.map((key: string) => (
                <tr key={key} className="border-t border-border bg-yellow-50">
                  <td className="px-3 py-2 font-medium text-yellow-800">
                    {key}
                  </td>
                  <td className="px-3 py-2 text-red-600 font-mono text-xs break-words">
                    {formatDiffValue(before[key])}
                  </td>
                  <td className="px-3 py-2 text-green-700 font-mono text-xs break-words">
                    {formatDiffValue(after[key])}
                  </td>
                </tr>
              ))}
              {removedKeys.map((key: string) => (
                <tr key={key} className="border-t border-border bg-red-50">
                  <td className="px-3 py-2 font-medium text-red-700">
                    {key}
                    <span className="ml-1.5 text-xs text-red-500">已删除</span>
                  </td>
                  <td className="px-3 py-2 text-red-600 font-mono text-xs break-words">
                    {formatDiffValue(before[key])}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground/40 font-mono text-xs">
                    —
                  </td>
                </tr>
              ))}
              {unchangedKeys.map((key: string) => (
                <tr key={key} className="border-t border-border">
                  <td className="px-3 py-2 font-medium text-muted-foreground">
                    {key}
                  </td>
                  <td
                    className="px-3 py-2 font-mono text-xs text-muted-foreground/60 break-words"
                    colSpan={2}
                  >
                    {formatDiffValue(before[key])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* JSON 视图 */}
      {viewMode === 'json' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-sm border border-destructive/20">
            <div className="border-b border-border px-3 py-2">
              <span className="text-xs font-medium text-destructive">
                变更前
              </span>
            </div>
            <pre
              className="p-3 text-xs font-mono text-muted-foreground overflow-auto max-h-80 whitespace-pre-wrap"
              dangerouslySetInnerHTML={{
                __html: renderJsonHighlight(before),
              }}
            />
          </div>
          <div className="rounded-sm border border-success/20">
            <div className="border-b border-border px-3 py-2">
              <span className="text-xs font-medium text-success">
                变更后
              </span>
            </div>
            <pre
              className="p-3 text-xs font-mono text-muted-foreground overflow-auto max-h-80 whitespace-pre-wrap"
              dangerouslySetInnerHTML={{
                __html: renderJsonHighlight(after),
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DataDiffViewer;