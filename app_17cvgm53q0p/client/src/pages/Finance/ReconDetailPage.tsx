import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { ArrowLeft, FileDown, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { resolveAppUrl } from '@lark-apaas/client-toolkit/utils/resolveAppUrl';
import type { TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { Table } from '@lark-apaas/client-toolkit/antd-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { reconciliationApi } from '@client/src/api';
import {
  extractErrorMessage,
  formatMoney,
} from '@client/src/pages/Inventory/inventory-utils';
import type {
  ReconLedgerRow,
  ReceiptPaymentRecord,
  ReconciliationDetail,
} from '@shared/finance-contract';
import { LedgerStatusTag, LedgerSummaryCards } from './finance-contract-ui';

/** 对账单详情：汇总 + 往来/收付款明细，支持导出 PDF 与分享链接 */
const ReconDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<ReconciliationDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [shareOpen, setShareOpen] = useState<boolean>(false);

  const loadDetail = useCallback(async (): Promise<void> => {
    if (!id) return;
    setLoading(true);
    try {
      const result = await reconciliationApi.getReconciliationDetail(id);
      setDetail(result);
    } catch (error: unknown) {
      setDetail(null);
      toast.error(extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const handleCopyShare = async (): Promise<void> => {
    if (!detail) return;
    const url: string = resolveAppUrl(`/recon-share/${detail.shareToken}`);
    try {
      await navigator.clipboard.writeText(url);
      toast.success('分享链接已复制');
    } catch {
      toast.error('复制失败，请手动复制下方链接');
    }
  };

  const ledgerColumns: TableColumnsType<ReconLedgerRow> = [
    {
      title: '单号',
      dataIndex: 'ledgerNo',
      width: 180,
      render: (value: string) => <span className="font-mono text-sm">{value}</span>,
    },
    {
      title: '关联订单',
      dataIndex: 'orderNo',
      width: 170,
      render: (value: string) => (
        <span className="font-mono text-sm text-muted-foreground">
          {value || '-'}
        </span>
      ),
    },
    {
      title: '总额',
      dataIndex: 'totalAmount',
      width: 130,
      render: (value: number) => (
        <span className="font-semibold tabular-nums">{formatMoney(value)}</span>
      ),
    },
    {
      title: '已结',
      dataIndex: 'settledAmount',
      width: 130,
      render: (value: number) => (
        <span className="tabular-nums text-[hsl(152_65%_30%)]">
          {formatMoney(value)}
        </span>
      ),
    },
    {
      title: '未结',
      dataIndex: 'unpaidAmount',
      width: 130,
      render: (value: number) => (
        <span className="font-semibold tabular-nums text-[hsl(4_85%_35%)]">
          {formatMoney(value)}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (value: string) => <LedgerStatusTag status={value} />,
    },
    {
      title: '创建日期',
      dataIndex: 'createdAt',
      width: 120,
      render: (value: string) => dayjs(value).format('YYYY-MM-DD'),
    },
  ];

  const paymentColumns: TableColumnsType<ReceiptPaymentRecord> = [
    {
      title: '关联单号',
      dataIndex: 'relatedNo',
      width: 180,
      render: (value: string) => <span className="font-mono text-sm">{value}</span>,
    },
    {
      title: '关联订单',
      dataIndex: 'orderNo',
      width: 170,
      render: (value: string) => (
        <span className="font-mono text-sm text-muted-foreground">
          {value || '-'}
        </span>
      ),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 130,
      render: (value: number) => (
        <span className="font-semibold tabular-nums text-[hsl(152_65%_30%)]">
          {formatMoney(value)}
        </span>
      ),
    },
    { title: '方式', dataIndex: 'paymentMethod', width: 110 },
    {
      title: '日期',
      dataIndex: 'paymentDate',
      width: 120,
      render: (value: string) => value || '-',
    },
    {
      title: '备注',
      dataIndex: 'remark',
      render: (value: string) => (
        <span className="block max-w-[200px] truncate" title={value ?? ''}>
          {value || <span className="text-muted-foreground">-</span>}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="py-20 text-center text-muted-foreground">加载中…</div>
    );
  }

  if (!detail) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-muted-foreground">对账单不存在或已删除</p>
        <Button variant="outline" onClick={() => navigate('/reconciliations')}>
          <ArrowLeft className="size-4" />
          返回列表
        </Button>
      </div>
    );
  }

  const shareUrl: string = resolveAppUrl(`/recon-share/${detail.shareToken}`);
  const confirmed: boolean = detail.status === '已确认';
  const openCount: number = detail.ledgerRows.filter(
    (row: ReconLedgerRow) => row.unpaidAmount > 0,
  ).length;

  return (
    <div className="flex flex-col gap-6" id="recon-print-area">
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate('/reconciliations')}>
            <ArrowLeft className="size-4" />
            返回
          </Button>
          <div>
            <h1 className="page-title">
              对账单 {detail.reconNo}
              <span
                className={`ml-3 inline-flex items-center rounded-full px-2.5 py-0.5 align-middle text-xs font-medium ${
                  confirmed
                    ? 'bg-[hsl(152_65%_95%)] text-[hsl(152_65%_30%)]'
                    : 'bg-[hsl(38_90%_95%)] text-[hsl(38_90%_35%)]'
                }`}
              >
                {detail.status}
              </span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {detail.type} · {detail.partyName} · {detail.periodStart} 至{' '}
              {detail.periodEnd}
              {confirmed && detail.confirmedAt
                ? ` · 确认于 ${dayjs(detail.confirmedAt).format('YYYY-MM-DD HH:mm')}`
                : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="xl" onClick={() => window.print()}>
            <FileDown className="size-4" />
            导出 PDF
          </Button>
          <Button size="xl" onClick={() => setShareOpen(true)}>
            <Link2 className="size-4" />
            分享链接
          </Button>
        </div>
      </div>

      <LedgerSummaryCards
        summary={{
          totalAmount: detail.totalAmount,
          receivedAmount: detail.receivedAmount,
          unpaidAmount: detail.unpaidAmount,
          openCount,
        }}
      />

      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">
          往来账款明细（{detail.ledgerRows.length}）
        </h2>
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <Table
            columns={ledgerColumns}
            dataSource={detail.ledgerRows}
            rowKey="id"
            pagination={false}
            scroll={{ y: 500 }}
            locale={{ emptyText: '本期无往来账款' }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">
          {detail.type === '客户对账' ? '收款' : '付款'}明细（
          {detail.paymentRows.length}）
        </h2>
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <Table
            columns={paymentColumns}
            dataSource={detail.paymentRows}
            rowKey="id"
            pagination={false}
            scroll={{ y: 500 }}
            locale={{
              emptyText: `本期无${detail.type === '客户对账' ? '收款' : '付款'}记录`,
            }}
          />
        </div>
      </div>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>分享对账单</DialogTitle>
          </DialogHeader>
          <p className="text-base text-muted-foreground">
            将链接发送给{detail.type === '客户对账' ? '客户' : '供应商'}，对方可在线查看并确认对账结果（无需登录）。
          </p>
          <div className="flex items-center gap-2">
            <Input readOnly value={shareUrl} className="h-11" />
            <Button onClick={handleCopyShare}>复制</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReconDetailPage;
