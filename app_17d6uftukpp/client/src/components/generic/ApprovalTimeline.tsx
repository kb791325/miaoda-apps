import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatUserName } from '@/lib/user-names';
import { formatDisplayValue } from '@/lib/format';
import type { IBizRecord } from '@/data/mt-records';

/** 审批流节点定义 */
export interface IApprovalStep {
  /** 节点状态值（匹配 record 中的状态字段） */
  status: string;
  /** 节点显示名称 */
  label: string;
  /** 节点描述 */
  description?: string;
}

/** 各模块审批流配置 */
export const APPROVAL_FLOWS: Record<string, IApprovalStep[]> = {
  contract: [
    { status: '草稿', label: '合同起草', description: '合同信息录入与草拟' },
    { status: '审批中', label: '审批流程', description: '法务与商务审批' },
    { status: '生效', label: '合同生效', description: '合同正式生效执行' },
    { status: '已盖章', label: '盖章归档', description: '完成盖章归档' },
    { status: '已归档', label: '归档完成', description: '合同归档完成' },
    { status: '到期', label: '合同到期', description: '合同到期处理' },
  ],
  adOpen: [
    { status: '草稿', label: '草稿', description: '申请信息填写中' },
    { status: '待审批', label: '待审批', description: '等待运营审核' },
    { status: '审批中', label: '审批中', description: '运营审核进行中' },
    { status: '已通过', label: '已通过', description: '审核通过' },
    { status: '已驳回', label: '已驳回', description: '申请被驳回' },
    { status: '开户中', label: '开户中', description: '媒体平台开户中' },
    { status: '已开通', label: '已开通', description: '账户已开通可用' },
    { status: '已取消', label: '已取消', description: '申请已取消' },
  ],
  purchaseOrder: [
    { status: '待下单', label: '采购下单', description: '采购需求填写并提交' },
    { status: '已下单', label: '订单确认', description: '订单已确认' },
    { status: '已发货', label: '发货运输', description: '供应商已发货' },
    { status: '已到货', label: '货物签收', description: '货物已签收' },
    { status: '已入库', label: '入库完成', description: '物资已入库' },
    { status: '已取消', label: '已取消', description: '采购已取消' },
  ],
  videoOrder: [
    { status: '待确认', label: '需求确认', description: '视频需求确认中' },
    { status: '已确认', label: '项目启动', description: '项目已确认启动' },
    { status: '制作中', label: '制作中', description: '视频制作进行中' },
    { status: '待审核', label: '审核中', description: '内容审核中' },
    { status: '已通过', label: '审核通过', description: '审核通过' },
    { status: '已驳回', label: '已驳回', description: '审核驳回' },
    { status: '已交付', label: '已交付', description: '已交付客户' },
    { status: '已取消', label: '已取消', description: '订单已取消' },
  ],
  support: [
    { status: '草稿', label: '草稿', description: '采购申请填写中' },
    { status: '待审批', label: '提交审批', description: '等待审批人审核' },
    { status: '审批中', label: '审批中', description: '审批人审核中' },
    { status: '已通过', label: '审批通过', description: '审核已通过' },
    { status: '已驳回', label: '审批驳回', description: '申请被驳回' },
    { status: '采购中', label: '采购中', description: '采购执行中' },
    { status: '已入库', label: '已入库', description: '物品已入库' },
    { status: '已取消', label: '已取消', description: '申请已取消' },
  ],
};

interface ApprovalTimelineProps {
  record: IBizRecord;
  /** 审批流类型（如 adOpen / purchaseOrder / videoOrder） */
  flowType?: string;
  /** 状态字段名（默认为 'status'） */
  statusField?: string;
  /** 审批人字段名 */
  approverField?: string;
  /** 审批意见字段名 */
  opinionField?: string;
}

function ApprovalTimeline({
  record,
  flowType = 'adOpen',
  statusField = 'status',
  approverField = 'approver',
  opinionField = 'note',
}: ApprovalTimelineProps) {
  const steps = APPROVAL_FLOWS[flowType] ?? [];
  if (steps.length === 0) return null;

  const currentStatus = String(record.values[statusField] ?? '');
  const approver = formatUserName(String(record.values[approverField] ?? ''));
  const opinion = String(record.values[opinionField] ?? '');
  const currentIdx = steps.findIndex((s) => s.status === currentStatus);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">审批时间线</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          {steps.map((step, idx) => {
            const isDone = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            const isFuture = idx > currentIdx;
            const isError = currentStatus === '已驳回' && isCurrent;
            const isRejected = currentStatus === '已驳回' && idx === steps.findIndex((s) => s.status === currentStatus);

            return (
              <div key={step.status} className="flex gap-3">
                {/* 左侧节点指示器 */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors',
                      isDone && 'bg-primary text-primary-foreground',
                      isCurrent && !isError && 'bg-primary text-primary-foreground ring-2 ring-primary/30',
                      isError && 'bg-destructive text-destructive-foreground',
                      isFuture && 'bg-muted text-muted-foreground',
                    )}
                  >
                    {isDone && !isError ? '✓' : isError ? '✗' : idx + 1}
                  </div>
                  {idx < steps.length - 1 && (
                    <div
                      className={cn(
                        'h-8 w-0.5',
                        idx < currentIdx && !isError ? 'bg-primary' : 'bg-muted-foreground/20',
                      )}
                    />
                  )}
                </div>

                {/* 右侧内容 */}
                <div className={cn('min-w-0 pb-3', isFuture && 'opacity-40')}>
                  <p className={cn('text-sm font-medium', isCurrent && 'text-primary')}>{step.label}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                  {(isCurrent || isRejected) && approver && approver !== '—' && (
                    <p className="mt-1 text-xs text-muted-foreground">审批人：{approver}</p>
                  )}
                  {(isCurrent || isRejected) && opinion && opinion !== '—' && (
                    <p className="text-xs text-muted-foreground">审批意见：{opinion}</p>
                  )}
                  {isCurrent && (
                    <Badge variant="outline" className="mt-1 text-xs">{currentStatus}</Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default memo(ApprovalTimeline);