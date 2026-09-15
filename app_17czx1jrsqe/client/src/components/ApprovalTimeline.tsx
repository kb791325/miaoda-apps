import { CheckCircle2, XCircle, Clock, User, Users, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/** 单个审批人 */
export interface ApprovalSubApprover {
  name: string;
  avatar?: string;
  status: 'pending' | 'approved' | 'rejected' | 'current';
  comment?: string;
  approved_at?: string;
}

export interface ApprovalStep {
  id: number;
  step_name: string;
  approver_name: string;
  status: 'pending' | 'approved' | 'rejected' | 'current';
  comment?: string;
  approved_at?: string;
  is_submit?: boolean;
  /** 节点模式：single=单人逐级；countersign=会签；orsign=或签 */
  mode?: 'single' | 'countersign' | 'orsign';
  /** 会签/或签子审批人列表 */
  sub_approvers?: ApprovalSubApprover[];
  /** 条件分支说明（如"金额≥50万，触发三级审批"） */
  condition_text?: string;
}

interface ApprovalTimelineProps {
  steps: ApprovalStep[];
}

const STATUS_ICON = {
  approved: CheckCircle2,
  rejected: XCircle,
  pending: Clock,
  current: Clock,
};

const STATUS_COLOR = {
  approved: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  rejected: 'text-red-600 bg-red-50 border-red-200',
  pending: 'text-muted-foreground bg-muted border-border',
  current: 'text-primary bg-primary/10 border-primary/30',
};

const STATUS_LABEL: Record<string, string> = {
  approved: '已通过',
  rejected: '已驳回',
  pending: '待审批',
  current: '审批中',
};

const MODE_LABEL: Record<string, string> = {
  countersign: '会签：需全部通过',
  orsign: '或签：任一通过即可',
  single: '',
};

export default function ApprovalTimeline({ steps }: ApprovalTimelineProps) {
  return (
    <div className="relative pl-2">
      {steps.map((step, i) => {
        const Icon = step.is_submit ? User : (step.mode === 'countersign' || step.mode === 'orsign' ? Users : STATUS_ICON[step.status] || Clock);
        const color = STATUS_COLOR[step.status] || STATUS_COLOR.pending;
        const isLast = i === steps.length - 1;
        return (
          <div key={step.id || i} className="relative flex gap-3 pb-5 last:pb-0">
            {/* 竖线 */}
            {!isLast && (
              <div
                className={cn(
                  'absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px',
                  step.status === 'approved' ? 'bg-emerald-200' : 'bg-border'
                )}
              />
            )}
            {/* 图标 */}
            <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${color}`}>
              <Icon className="size-4" />
            </div>
            {/* 内容 */}
            <div className="flex-1 space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{step.step_name}</span>
                {step.mode && step.mode !== 'single' && (
                  <span className="inline-flex items-center gap-1 rounded bg-muted/50 px-1.5 py-0.5 text-[11px] text-muted-foreground">
                    <Link2 className="size-3" />
                    {MODE_LABEL[step.mode]}
                  </span>
                )}
                <span className={`ml-auto text-xs font-medium ${color.split(' ')[0]}`}>
                  {STATUS_LABEL[step.status] || step.status}
                </span>
              </div>

              {/* 条件分支提示 */}
              {step.condition_text && (
                <div className="rounded-md bg-primary/5 px-2 py-1 text-[11px] text-primary/80 border border-primary/10">
                  条件：{step.condition_text}
                </div>
              )}

              {/* 单人模式 */}
              {(!step.mode || step.mode === 'single') && (
                <>
                  <div className="text-xs text-muted-foreground">
                    {step.approver_name}
                    {step.approved_at && ` · ${step.approved_at}`}
                  </div>
                  {step.comment && (
                    <div className="rounded-md bg-muted/40 p-2 text-xs text-foreground/80">
                      {step.comment}
                    </div>
                  )}
                </>
              )}

              {/* 会签/或签子审批人 */}
              {(step.mode === 'countersign' || step.mode === 'orsign') && step.sub_approvers && (
                <div className="space-y-2 pt-1">
                  {step.sub_approvers.map((sub, idx) => {
                    const SubIcon = STATUS_ICON[sub.status] || Clock;
                    const subColor = STATUS_COLOR[sub.status] || STATUS_COLOR.pending;
                    return (
                      <div
                        key={idx}
                        className="flex items-start gap-2 rounded-md border border-border/50 bg-muted/20 p-2"
                      >
                        <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${subColor}`}>
                          <SubIcon className="size-3" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">{sub.name}</span>
                            <span className={`text-[11px] font-medium ${subColor.split(' ')[0]}`}>
                              {STATUS_LABEL[sub.status] || sub.status}
                            </span>
                          </div>
                          {sub.approved_at && (
                            <div className="text-[11px] text-muted-foreground">
                              {sub.approved_at}
                            </div>
                          )}
                          {sub.comment && (
                            <div className="mt-1 text-[11px] text-foreground/70">
                              意见：{sub.comment}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
