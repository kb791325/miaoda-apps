import { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ApprovalTimeline, { type ApprovalStep } from '@/components/ApprovalTimeline';
import { FileText, Clock, CheckCircle2, XCircle } from 'lucide-react';
import ApprovalDialog from './ApprovalDialog';

export interface ApprovalSummaryField {
  label: string;
  value: React.ReactNode;
}

interface ApprovalDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  status: string;
  statusVariant?: 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'secondary' | 'outline';
  summaryFields: ApprovalSummaryField[];
  detailContent?: React.ReactNode;
  detailLabel?: string;
  approvalSteps: ApprovalStep[];
  canApprove?: boolean;
  approveType?: 'approve' | 'reject';
  approving?: boolean;
  onApprove?: (type: 'approve' | 'reject', comment: string) => void;
  extraActions?: React.ReactNode;
  // 多级审批：当前节点名（用于提示用户）
  currentStepName?: string;
}

export default function ApprovalDetailDialog({
  open, onOpenChange, title, subtitle, status, statusVariant = 'default',
  summaryFields, detailContent, detailLabel = '详细信息',
  approvalSteps, canApprove, approving, onApprove, extraActions, currentStepName,
}: ApprovalDetailDialogProps) {
  const [tab, setTab] = useState('info');
  const [approveDialog, setApproveDialog] = useState<{ open: boolean; type: 'approve' | 'reject' }>({
    open: false, type: 'approve',
  });

  useEffect(() => {
    if (open) setTab('info');
  }, [open]);

  const handleApprove = (type: 'approve' | 'reject') => {
    setApproveDialog({ open: true, type });
  };

  const handleApproveSubmit = async (comment: string) => {
    if (onApprove) {
      await onApprove(approveDialog.type === 'approve' ? 'approve' : 'reject', comment);
    }
    setApproveDialog({ ...approveDialog, open: false });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <DialogTitle className="truncate">{title}</DialogTitle>
                {subtitle && (
                  <p className="mt-1 text-sm text-muted-foreground truncate">{subtitle}</p>
                )}
              </div>
              <Badge variant={statusVariant === 'destructive' ? 'destructive' : statusVariant === 'success' ? 'secondary' : 'outline'}>
                {status}
              </Badge>
            </div>
          </DialogHeader>

          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info">
                <FileText className="mr-1.5 size-4" />
                {detailLabel}
              </TabsTrigger>
              <TabsTrigger value="timeline">
                <Clock className="mr-1.5 size-4" />
                审批进度
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4 pt-4">
              {/* 摘要字段网格 */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {summaryFields.map((f, i) => (
                  <div key={i}>
                    <div className="text-muted-foreground">{f.label}</div>
                    <div className="font-medium">{f.value}</div>
                  </div>
                ))}
              </div>
              {/* 自定义详情内容 */}
              {detailContent}
            </TabsContent>

            <TabsContent value="timeline" className="pt-4">
              <ApprovalTimeline steps={approvalSteps} />
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row">
            {extraActions}
            {canApprove && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => handleApprove('reject')}
                  disabled={approving}
                >
                  <XCircle className="mr-1.5 size-4" />
                  驳回
                </Button>
                <Button onClick={() => handleApprove('approve')} disabled={approving}>
                  <CheckCircle2 className="mr-1.5 size-4" />
                  通过
                  {currentStepName && <span className="ml-1 opacity-80">（{currentStepName}）</span>}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ApprovalDialog
        open={approveDialog.open}
        onOpenChange={(o) => setApproveDialog({ ...approveDialog, open: o })}
        type={approveDialog.type}
        loading={approving}
        onSubmit={handleApproveSubmit}
      />
    </>
  );
}
