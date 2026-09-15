import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Package,
  User,
  Calendar,
  CheckCircle2,
  XCircle,
  ArrowRightLeft,
  RotateCcw,
  Clock,
  Ban,
  Building2,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';

import { Button } from '@client/src/components/ui/button';
import { Card, CardContent } from '@client/src/components/ui/card';
import { Badge } from '@client/src/components/ui/badge';
import { Separator } from '@client/src/components/ui/separator';
import { cn } from '@client/src/lib/utils';
import { formatDate } from '@client/src/utils/format';
import { UserDisplay } from '@client/src/components/business-ui/user-display';
import FileUploader from '@client/src/components/FileUpload/FileUploader';
import AttachmentList from '@client/src/components/FileUpload/AttachmentList';
import {
  getAttachmentsByRelated,
  deleteAttachment,
} from '@client/src/api/attachments';
import type { AttachmentItem } from '@shared/api.interface';

import {
  getReservationById,
  approveReservation,
  rejectReservation,
  borrowAsset,
  returnAsset,
  cancelReservation,
} from '@client/src/api/asset-reservations';
import type {
  ReservationDetail,
  ReservationStatus,
  ReservationOperationRecord,
  ReservationOperationType,
} from '@shared/api.interface';

import ApprovalDialog from '@client/src/components/ApprovalDialog';
import BorrowDialog from '@client/src/components/BorrowDialog';
import ReturnDialog from '@client/src/components/ReturnDialog';

const statusLabelMap: Record<ReservationStatus, string> = {
  pending: '待审批',
  approved: '已批准',
  rejected: '已拒绝',
  borrowed: '已借出',
  returned: '已归还',
  cancelled: '已取消',
};

const statusStyleMap: Record<ReservationStatus, string> = {
  pending: 'border-orange-200 bg-orange-50 text-orange-700',
  approved: 'border-blue-200 bg-blue-50 text-blue-700',
  rejected: 'border-red-200 bg-red-50 text-red-700',
  borrowed: 'border-purple-200 bg-purple-50 text-purple-700',
  returned: 'border-green-200 bg-green-50 text-green-700',
  cancelled: 'border-gray-200 bg-gray-50 text-gray-500',
};

const statusIconMap: Record<
  ReservationStatus,
  React.ComponentType<{ className?: string }>
> = {
  pending: Clock,
  approved: CheckCircle2,
  rejected: XCircle,
  borrowed: ArrowRightLeft,
  returned: RotateCcw,
  cancelled: Ban,
};

const statusColorMap: Record<ReservationStatus, string> = {
  pending: 'text-orange-600',
  approved: 'text-blue-600',
  rejected: 'text-red-600',
  borrowed: 'text-purple-600',
  returned: 'text-green-600',
  cancelled: 'text-gray-400',
};

const operationTypeLabelMap: Record<ReservationOperationType, string> = {
  create: '提交预约',
  approve: '审批通过',
  reject: '审批拒绝',
  borrow: '确认借出',
  return: '确认归还',
  cancel: '取消预约',
};

const operationTypeIconMap: Record<
  ReservationOperationType,
  React.ComponentType<{ className?: string }>
> = {
  create: FileText,
  approve: CheckCircle2,
  reject: XCircle,
  borrow: ArrowRightLeft,
  return: RotateCcw,
  cancel: Ban,
};

const operationTypeColorMap: Record<ReservationOperationType, string> = {
  create: 'text-blue-600',
  approve: 'text-green-600',
  reject: 'text-red-600',
  borrow: 'text-purple-600',
  return: 'text-green-600',
  cancel: 'text-gray-400',
};

const operationTypeBgMap: Record<ReservationOperationType, string> = {
  create: 'bg-blue-50',
  approve: 'bg-green-50',
  reject: 'bg-red-50',
  borrow: 'bg-purple-50',
  return: 'bg-green-50',
  cancel: 'bg-gray-50',
};

const ReservationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<ReservationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);

  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalMode, setApprovalMode] = useState<'approve' | 'reject'>(
    'approve',
  );
  const [borrowOpen, setBorrowOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);

  const fetchDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data: ReservationDetail = await getReservationById(id);
      setDetail(data);
    } catch (err: unknown) {
      logger.error('加载预约详情失败', err);
      toast.error('加载失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    fetchAttachments();
  }, [id]);

  const fetchAttachments = async () => {
    if (!id) return;
    setAttachmentsLoading(true);
    try {
      const res = await getAttachmentsByRelated(
        'asset_reservation',
        id,
      );
      setAttachments(res.items);
    } catch (err: unknown) {
      logger.error('加载附件列表失败', err);
    } finally {
      setAttachmentsLoading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      await deleteAttachment(attachmentId);
      setAttachments((prev: AttachmentItem[]) =>
        prev.filter((a: AttachmentItem) => a.id !== attachmentId),
      );
      toast.success('附件已删除');
    } catch (err: unknown) {
      logger.error('删除附件失败', err);
      toast.error('删除失败');
    }
  };

  const handleUploadComplete = () => {
    fetchAttachments();
  };

  const handleApprovalConfirm = async (
    mode: 'approve' | 'reject',
    remark: string,
  ) => {
    if (!detail) return;
    try {
      if (mode === 'approve') {
        await approveReservation(detail.id, remark);
        toast.success('预约已批准');
      } else {
        await rejectReservation(detail.id, remark);
        toast.success('预约已拒绝');
      }
      setApprovalOpen(false);
      fetchDetail();
    } catch (err: unknown) {
      logger.error('操作失败', err);
      toast.error('操作失败，请重试');
    }
  };

  const handleBorrowConfirm = async () => {
    if (!detail) return;
    try {
      await borrowAsset(detail.id);
      toast.success('借出操作已确认');
      setBorrowOpen(false);
      fetchDetail();
    } catch (err: unknown) {
      logger.error('借出操作失败', err);
      toast.error('操作失败，请重试');
    }
  };

  const handleReturnConfirm = async (remark: string) => {
    if (!detail) return;
    try {
      await returnAsset(detail.id, remark);
      toast.success('归还操作已确认');
      setReturnOpen(false);
      fetchDetail();
    } catch (err: unknown) {
      logger.error('归还操作失败', err);
      toast.error('操作失败，请重试');
    }
  };

  const handleCancel = async () => {
    if (!detail) return;
    try {
      await cancelReservation(detail.id);
      toast.success('预约已取消');
      fetchDetail();
    } catch (err: unknown) {
      logger.error('取消预约失败', err);
      toast.error('操作失败，请重试');
    }
  };

  if (loading && !detail) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">未找到预约记录</p>
      </div>
    );
  }

  const renderActionButtons = () => {
    switch (detail.status) {
      case 'pending':
        return (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                setApprovalMode('approve');
                setApprovalOpen(true);
              }}
              className="rounded-sm bg-success hover:bg-success/90 text-white"
            >
              <CheckCircle2 className="size-4 mr-1" />
              批准
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setApprovalMode('reject');
                setApprovalOpen(true);
              }}
              className="rounded-sm border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <XCircle className="size-4 mr-1" />
              拒绝
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              className="rounded-sm border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Ban className="size-4 mr-1" />
              取消
            </Button>
          </div>
        );
      case 'approved':
        return (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setBorrowOpen(true)}
              className="rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <ArrowRightLeft className="size-4 mr-1" />
              确认借出
            </Button>
          </div>
        );
      case 'borrowed':
        return (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setReturnOpen(true)}
              className="rounded-sm bg-success hover:bg-success/90 text-white"
            >
              <RotateCcw className="size-4 mr-1" />
              确认归还
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* 顶部标题 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/asset-reservations')}
              className="h-8 w-8 rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                预约详情
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                查看预约信息与操作历史
              </p>
            </div>
          </div>
          {renderActionButtons()}
        </div>

        {/* 状态横幅 */}
        <div
          className={cn(
            'flex items-center gap-3 rounded-sm border px-4 py-3 transition-colors duration-150',
            statusStyleMap[detail.status],
          )}
        >
          {(() => {
            const StatusIcon = statusIconMap[detail.status];
            return (
              <StatusIcon
                className={cn('size-5', statusColorMap[detail.status])}
              />
            );
          })()}
          <div>
            <p className="text-sm font-semibold">
              {statusLabelMap[detail.status]}
            </p>
            <p className="text-xs opacity-75">
              预约单号：{detail.reservationNo}
            </p>
          </div>
        </div>
      </div>

      {/* 基本信息卡片 */}
      <Card className="rounded-sm border-border bg-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              预约信息
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">预约单号</p>
              <p className="font-mono text-sm font-medium tabular-nums">
                {detail.reservationNo}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">状态</p>
              <Badge
                className={cn(
                  'rounded-sm font-medium border px-2 py-0.5 text-xs',
                  statusStyleMap[detail.status],
                )}
                variant="outline"
              >
                {statusLabelMap[detail.status]}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">创建时间</p>
              <p className="text-sm">{formatDate(detail.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">更新时间</p>
              <p className="text-sm">{formatDate(detail.updatedAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 资产信息卡片 */}
      <Card className="rounded-sm border-border bg-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Package className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              资产信息
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">资产名称</p>
              <p className="text-sm font-medium">{detail.assetName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">资产编码</p>
              <p className="font-mono text-sm tabular-nums">
                {detail.assetCode}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">资产类型</p>
              <div className="flex items-center gap-1.5">
                <Tag className="size-3.5 text-muted-foreground" />
                <p className="font-mono text-sm tabular-nums">{detail.assetType}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">用途说明</p>
              <p className="text-sm">{detail.purpose}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                预计借出日期
              </p>
              <p className="text-sm">
                {formatDate(detail.expectedBorrowDate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                预计归还日期
              </p>
              <p className="text-sm">
                {formatDate(detail.expectedReturnDate)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 申请人信息卡片 */}
      <Card className="rounded-sm border-border bg-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <User className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              申请人信息
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">申请人</p>
              <UserDisplay value={[detail.requesterId]} size="small" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">所属部门</p>
              <div className="flex items-center gap-1.5">
                <Building2 className="size-3.5 text-muted-foreground" />
                <p className="text-sm">{detail.requesterDepartment || '-'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 审批信息卡片 */}
      {detail.approverId && (
        <Card className="rounded-sm border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2
                className={cn(
                  'size-4',
                  detail.status === 'rejected'
                    ? 'text-destructive'
                    : 'text-muted-foreground',
                )}
              />
              <h2 className="text-sm font-semibold text-foreground">
                审批信息
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">审批人</p>
                <UserDisplay value={[detail.approverId]} size="small" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">审批时间</p>
                <p className="text-sm">
                  {detail.approvedAt
                    ? formatDate(detail.approvedAt)
                    : '-'}
                </p>
              </div>
              {detail.status === 'approved' && detail.approvalRemark && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">
                    审批备注
                  </p>
                  <p className="text-sm">{detail.approvalRemark}</p>
                </div>
              )}
              {detail.status === 'rejected' && detail.rejectReason && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">
                    拒绝原因
                  </p>
                  <p className="text-sm text-destructive">
                    {detail.rejectReason}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 借出/归还信息卡片 */}
      {(detail.actualBorrowDate || detail.actualReturnDate) && (
        <Card className="rounded-sm border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <ArrowRightLeft className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">
                借出/归还信息
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {detail.actualBorrowDate && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    实际借出日期
                  </p>
                  <p className="text-sm">
                    {formatDate(detail.actualBorrowDate)}
                  </p>
                </div>
              )}
              {detail.actualReturnDate && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    实际归还日期
                  </p>
                  <p className="text-sm">
                    {formatDate(detail.actualReturnDate)}
                  </p>
                </div>
              )}
              {detail.returnRemark && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">
                    归还备注
                  </p>
                  <p className="text-sm">{detail.returnRemark}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 操作历史时间线 */}
      {detail.operationHistory && detail.operationHistory.length > 0 && (
        <Card className="rounded-sm border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">
                操作历史
              </h2>
            </div>
            <div className="space-y-0">
              {detail.operationHistory.map(
                (record: ReservationOperationRecord, index: number) => {
                  const Icon = operationTypeIconMap[record.operationType] || FileText;
                  const colorClass =
                    operationTypeColorMap[record.operationType] ||
                    'text-muted-foreground';
                  return (
                    <div key={record.id}>
                      <div className="flex items-start gap-3 py-2.5 transition-colors duration-150">
                        <div
                          className={cn(
                            'size-7 rounded-full flex items-center justify-center mt-0.5 shrink-0',
                            operationTypeBgMap[record.operationType] ||
                              'bg-muted',
                            colorClass,
                          )}
                        >
                          <Icon className="size-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">
                              {
                                operationTypeLabelMap[
                                  record.operationType
                                ]
                              }
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(record.createdAt)}
                            </p>
                          </div>
                          {record.operatorName && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              操作人：{record.operatorName}
                            </p>
                          )}
                          {record.remark && (
                            <p className="text-xs mt-1 text-muted-foreground bg-muted/50 rounded-sm px-2 py-1">
                              {record.remark}
                            </p>
                          )}
                        </div>
                      </div>
                      {index < detail.operationHistory.length - 1 && (
                        <Separator />
                      )}
                    </div>
                  );
                },
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 附件管理 */}
      <Card className="rounded-sm border-border bg-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1 h-4 bg-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              附件管理
            </h2>
          </div>
          <FileUploader
            relatedType="asset_reservation"
            relatedId={detail.id}
            onUploadComplete={handleUploadComplete}
          />
          <div className="mt-4">
            <AttachmentList
              attachments={attachments}
              onDelete={handleDeleteAttachment}
              loading={attachmentsLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* 对话框 */}
      <ApprovalDialog
        open={approvalOpen}
        onOpenChange={setApprovalOpen}
        mode={approvalMode}
        reservation={detail}
        onConfirm={handleApprovalConfirm}
      />

      <BorrowDialog
        open={borrowOpen}
        onOpenChange={setBorrowOpen}
        reservation={detail}
        onConfirm={handleBorrowConfirm}
      />

      <ReturnDialog
        open={returnOpen}
        onOpenChange={setReturnOpen}
        reservation={detail}
        onConfirm={handleReturnConfirm}
      />
    </div>
  );
};

export default ReservationDetailPage;