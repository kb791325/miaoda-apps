import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { t, useLang } from '@/lib/i18n';

export interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline' | 'secondary';
  className?: string;
}

/** 状态映射：自动根据常见状态值匹配颜色 */
const STATUS_MAP: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'default'> = {
  // 成功/通过类
  已通过: 'success',
  已开户: 'success',
  已生效: 'success',
  已确认: 'success',
  已核销: 'success',
  已回款: 'success',
  已退款: 'success',
  已开: 'success',
  已寄: 'success',
  已收: 'success',
  在职: 'success',
  已录用: 'success',
  已处理: 'success',
  已完成: 'success',
  已采购: 'success',
  正常: 'success',
  启用: 'success',
  已转化: 'success',
  已分配: 'success',
  已跟进: 'success',
  // 进行中/待处理类
  审批中: 'warning',
  待审批: 'warning',
  待确认: 'warning',
  待开: 'warning',
  待处理: 'warning',
  待跟进: 'warning',
  跟进中: 'warning',
  处理中: 'warning',
  试用: 'warning',
  面试中: 'warning',
  已邀约: 'warning',
  待筛选: 'warning',
  部分回款: 'warning',
  进行中: 'warning',
  已申请: 'warning',
  // 失败/驳回类
  已驳回: 'danger',
  失败: 'danger',
  未回款: 'danger',
  已终止: 'danger',
  已流失: 'danger',
  已拒绝: 'danger',
  无效: 'danger',
  离职: 'danger',
  // 信息类
  已到期: 'info',
  已过期: 'info',
  监控中: 'info',
};

export function StatusBadge({ status, variant, className }: StatusBadgeProps) {
  useLang();
  const v = variant || (STATUS_MAP[status] as any) || 'secondary';
  return (
    <Badge
      variant={v === 'default' ? 'default' : v === 'outline' ? 'outline' : 'secondary'}
      className={cn(
        'font-normal',
        v === 'success' && 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-200',
        v === 'warning' && 'bg-amber-50 text-amber-700 hover:bg-amber-50 border border-amber-200',
        v === 'danger' && 'bg-red-50 text-red-700 hover:bg-red-50 border border-red-200',
        v === 'info' && 'bg-blue-50 text-blue-700 hover:bg-blue-50 border border-blue-200',
        className,
      )}
    >
      {t(status)}
    </Badge>
  );
}

export default StatusBadge;
