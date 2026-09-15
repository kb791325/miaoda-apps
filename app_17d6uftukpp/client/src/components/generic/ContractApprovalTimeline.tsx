import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatUserName } from '@/lib/user-names';
import { formatDisplayValue } from '@/lib/format';
import type { IBizRecord } from '@/data/mt-records';

interface ApprovalTimelineProps {
  record: IBizRecord;
  fields: Array<{ key: string; label: string }>;
}

const STATUS_STEPS = [
  { status: '草稿', label: '合同起草', description: '合同信息已录入，待提交审批' },
  { status: '待审批', label: '提交审批', description: '已提交审批流程，等待审批人处理' },
  { status: '审批中', label: '审批中', description: '审批人正在审核合同条款' },
  { status: '已驳回', label: '审批驳回', description: '审批不通过，需修改后重新提交', done: 'error' },
  { status: '待盖章', label: '审批通过 · 待盖章', description: '审批已通过，等待盖章确认' },
  { status: '已盖章', label: '已盖章', description: '合同已完成盖章确认' },
  { status: '已归档', label: '已归档', description: '合同已归档保存' },
  { status: '已终止', label: '已终止', description: '合同已终止，不再履行' },
  { status: '已作废', label: '已作废', description: '合同已作废' },
];

/** 合同审批流程时间线 */
export default memo(function ContractApprovalTimeline({ record, fields }: ApprovalTimelineProps) {
  const currentStatus = String(record.values.status ?? '草稿');
  const currentIdx = STATUS_STEPS.findIndex((s) => s.status === currentStatus);
  const approver = formatUserName(record.values.approver);
  const opinion = String(record.values.approvalOpinion ?? '');
  const sealDate = formatDisplayValue(record.values.sealDate);
  const archiveDate = formatDisplayValue(record.values.archiveDate);
  const signDate = formatDisplayValue(record.values.signDate);
  const createdAt = record.createdAt ?? '';

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          审批流程时间线
          <Badge variant="secondary" className="ml-1 text-xs font-normal">
            {currentStatus}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          {STATUS_STEPS.map((step, idx) => {
            const isDone = idx <= currentIdx && currentIdx >= 0 && step.done !== 'error';
            const isError = step.done === 'error' && idx === currentIdx;
            const isCurrent = idx === currentIdx;
            const isFuture = idx > currentIdx;

            return (
              <div key={step.status} className="flex gap-3">
                {/* 左侧时间线 */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold',
                      isDone && !isError && 'border-primary bg-primary text-primary-foreground',
                      isError && 'border-destructive bg-destructive text-destructive-foreground',
                      isCurrent && !isError && 'border-primary bg-primary/10 text-primary',
                      isFuture && 'border-muted-foreground/30 bg-muted text-muted-foreground',
                    )}
                  >
                    {isDone && !isError ? '✓' : isError ? '✗' : idx + 1}
                  </div>
                  {idx < STATUS_STEPS.length - 1 && (
                    <div
                      className={cn(
                        'h-10 w-0.5',
                        idx < currentIdx && !isError ? 'bg-primary' : 'bg-muted-foreground/20',
                      )}
                    />
                  )}
                </div>

                {/* 右侧内容 */}
                <div className={cn('min-w-0 pb-4', isFuture && 'opacity-40')}>
                  <p className={cn('text-sm font-medium', isCurrent && 'text-primary')}>{step.label}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                  {isCurrent && approver && (
                    <p className="mt-1 text-xs text-muted-foreground">审批人：{approver}</p>
                  )}
                  {isCurrent && opinion && (
                    <p className="text-xs text-muted-foreground">审批意见：{opinion}</p>
                  )}
                  {step.status === '已盖章' && sealDate && (
                    <p className="mt-1 text-xs text-muted-foreground">盖章日期：{sealDate}</p>
                  )}
                  {step.status === '已归档' && archiveDate && (
                    <p className="mt-1 text-xs text-muted-foreground">归档日期：{archiveDate}</p>
                  )}
                  {step.status === '草稿' && createdAt && (
                    <p className="mt-1 text-xs text-muted-foreground">创建时间：{createdAt}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 条款正文区 */}
        <div className="mt-6 border-t border-border/60 pt-4">
          <h4 className="mb-2 text-sm font-medium">条款正文</h4>
          <div className="rounded-md bg-muted/40 p-4 text-sm leading-relaxed text-muted-foreground">
            <p className="mb-2">第一条 合同标的：本合同约定双方就广告投放/视频制作服务的合作条款。</p>
            <p className="mb-2">第二条 合同金额：以合同首页载明的金额为准，含税价格。</p>
            <p className="mb-2">第三条 付款方式：按合同约定节点分期支付，具体以付款计划为准。</p>
            <p className="mb-2">第四条 违约责任：任何一方违约需承担相应违约责任，详见合同附件。</p>
            <p>第五条 争议解决：双方协商解决，协商不成提交合同签订地人民法院管辖。</p>
          </div>
        </div>

        {/* 附件区 */}
        <div className="mt-4 border-t border-border/60 pt-4">
          <h4 className="mb-2 text-sm font-medium">附件</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2 text-sm">
              <span className="text-muted-foreground">📄</span>
              <span className="flex-1">合同正文.pdf</span>
              <span className="text-xs text-muted-foreground">2.4 MB</span>
            </div>
            <div className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2 text-sm">
              <span className="text-muted-foreground">📎</span>
              <span className="flex-1">广告投放排期表.xlsx</span>
              <span className="text-xs text-muted-foreground">156 KB</span>
            </div>
            <div className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2 text-sm">
              <span className="text-muted-foreground">📎</span>
              <span className="flex-1">双方资质证明.zip</span>
              <span className="text-xs text-muted-foreground">3.1 MB</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});