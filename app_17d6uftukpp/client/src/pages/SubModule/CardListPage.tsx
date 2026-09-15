import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LayoutGrid, LayoutList, User, FolderOpen, Calendar, MapPin, Clock, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { MODULES } from '@/config/modules';
import { useModuleData } from '@/lib/data-service';
import { formatUserName } from '@/lib/user-names';
import { formatDisplayValue } from '@/lib/format';
import { maskPhone } from '@/lib/mask';
import { cn } from '@/lib/utils';
import NotFoundPage from '@/pages/NotFoundPage/NotFoundPage';
import type { IBizRecord } from '@/data/mt-records';
import { Image } from '@/components/ui/image';

/** 格式化数字为万/千 */
function formatNum(n: string | number): string {
  const num = Number(n);
  if (Number.isNaN(num)) return String(n);
  if (num >= 10000) return `${(num / 10000).toFixed(1)}万`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return String(num);
}

/** 卡片视图：演员管理 / 素材库 专用 */
function ActorCard({ record, onClick }: { record: IBizRecord; onClick: () => void }) {
  // 演员表字段：f26=姓名/艺名, f0=粉丝量, f1=报价(全天), f3=经纪人, f24=档期状态, f9=头像照片
  const name = String(record.values.f26 ?? record.values['姓名/艺名'] ?? '');
  const fans = String(record.values.f0 ?? record.values['粉丝量'] ?? '');
  const price = String(record.values.f1 ?? record.values['报价(全天)'] ?? '');
  const agent = String(record.values.f3 ?? record.values['经纪人'] ?? '');
  const status = String(record.values.f24 ?? record.values['档期状态'] ?? '');
  const avatar = String(record.values.f9 ?? record.values['头像照片'] ?? '');
  const phone = String(record.values.phone ?? record.values['联系电话'] ?? '');

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-medium text-primary">
            {avatar ? (
              <Image src={avatar} alt={name} className="size-full rounded-full object-cover" />
            ) : (
              name.charAt(0) || '?'
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{name || '—'}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {fans ? `粉丝 ${formatNum(fans)}` : ''}{fans && price ? ' · ' : ''}{price ? `¥${price}` : ''}
            </p>
            {agent && (
              <p className="mt-1 text-xs text-muted-foreground">
                经纪人：{agent}
              </p>
            )}
            {phone && (
              <p className="mt-0.5 text-xs text-muted-foreground">{maskPhone(phone)}</p>
            )}
            {status && (
              <Badge variant="secondary" className="mt-1.5 text-xs">{status}</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MaterialCard({ record, onClick }: { record: IBizRecord; onClick: () => void }) {
  const name = String(record.values.name ?? record.values.f1 ?? record.values.materialName ?? '');
  const materialType = String(record.values.materialType ?? record.values.type ?? '');
  const status = String(record.values.status ?? '');
  const tags = String(record.values.f4 ?? '');
  const uploadTime = String(record.values.f0 ?? record.values.date ?? '');
  const uploader = formatUserName(record.values.f3 ?? record.values.creator ?? '');

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted text-2xl">
            <ImageIcon className="size-6 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{name || '—'}</p>
            <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
              {materialType && <Badge variant="outline" className="text-xs">{materialType}</Badge>}
              {status && (
                <Badge variant="secondary" className="text-xs">{status}</Badge>
              )}
            </div>
            {tags && (
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  {tags.split(/[,，、;；\s]+/).filter(Boolean).slice(0, 3).map((t, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] px-1 py-0">{t}</Badge>
                  ))}
                </span>
              </p>
            )}
            <p className="mt-1.5 flex items-center gap-4 text-xs text-muted-foreground">
              {uploadTime && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" />
                  {formatDisplayValue(uploadTime)}
                </span>
              )}
              {uploader && uploader !== '—' && (
                <span className="inline-flex items-center gap-1">
                  <User className="size-3" />
                  {uploader}
                </span>
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** 卡片视图通用列表页 */
export default function CardListPage() {
  const { subKey = '' } = useParams<{ subKey: string }>();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

  const config = MODULES[subKey];
  const { records, loading } = useModuleData(subKey as any);

  if (!config) return <NotFoundPage />;

  const isActor = subKey === 'actor';
  const CardComponent = isActor ? ActorCard : MaterialCard;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{config.label}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{config.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border/60 bg-muted/50 p-0.5">
            <Button
              variant={viewMode === 'card' ? 'secondary' : 'ghost'}
              size="sm" className="h-8"
              onClick={() => setViewMode('card')}
            >
              <LayoutGrid className="size-4" /> 卡片
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm" className="h-8"
              onClick={() => setViewMode('list')}
            >
              <LayoutList className="size-4" /> 列表
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <FolderOpen className="size-8 text-muted-foreground/50" />
            <EmptyTitle>暂无数据</EmptyTitle>
            <EmptyDescription>当前模块暂无记录</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {records.map((r) => (
            <CardComponent
              key={r.recordId}
              record={r}
              onClick={() => navigate(`/sub/${subKey}/${r.recordId}`)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {config.fields.filter((f) => f.inList).slice(0, 6).map((f) => (
                      <th key={f.key} className="whitespace-nowrap px-4 py-3 text-left font-medium text-muted-foreground">
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr
                      key={r.recordId}
                      className="cursor-pointer border-b border-border/40 transition-colors hover:bg-muted/50"
                      onClick={() => navigate(`/sub/${subKey}/${r.recordId}`)}
                    >
                      {config.fields.filter((f) => f.inList).slice(0, 6).map((f) => {
                        const val = r.values[f.key];
                        const displayVal = val !== undefined && val !== null ? String(val) : '—';
                        return (
                          <td key={f.key} className="whitespace-nowrap px-4 py-3">
                            {f.key === 'name' || f.key === 'f1' ? (
                              <span className="font-medium">{displayVal}</span>
                            ) : f.type === 'select' ? (
                              <Badge variant="secondary" className="text-xs">{displayVal}</Badge>
                            ) : (
                              displayVal
                            )}
                          </td>
                        );
                      })}
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