import React from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Search } from 'lucide-react';
import {
  Table,
  type TableColumnsType,
} from '@lark-apaas/client-toolkit/antd-table';

import { UserDisplay } from '@/components/business-ui/user-display';
import HelpTip from '@/components/HelpTip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { shipmentApi } from '@client/src/api';
import { useAuth } from '@client/src/hooks/use-auth';
import type {
  ShipmentListItem,
  ShipmentListParams,
  ShipmentStatus,
} from '@shared/shipment';
import { SHIPMENT_STATUS_OPTIONS } from '@shared/shipment';

import CompleteInstallDialog from './CompleteInstallDialog';
import OutboundPopover from './OutboundPopover';
import ShipmentStatusBadge from './ShipmentStatusBadge';
import { extractErrorMessage, formatTime } from './shipment-helpers';

const PAGE_SIZE_DEFAULT: number = 10;
const KEYWORD_DEBOUNCE_MS: number = 400;

type StatusTab = 'all' | ShipmentStatus;

const EMPTY_TEXT_BY_TAB: Record<StatusTab, string> = {
  all: '暂无配送安装单',
  待出库: '暂无待出库的配送安装单',
  运输中: '暂无运输中的配送安装单',
  在安装: '暂无在安装配送安装单',
  已完成: '暂无已完成的配送安装单',
};

const ROW_HIGHLIGHT_MS: number = 3000;

const ACTION_HINTS: Record<string, string> = {
  待出库: '确认出库后自动扣减库存并安排运输',
  运输中: '师傅到达客户处后，点击开始安装',
  在安装: '安装完成后填写验收信息并确认完成',
};

const ShipmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPerm } = useAuth();

  const [tab, setTab] = React.useState<StatusTab>('all');
  const [keywordDraft, setKeywordDraft] = React.useState<string>('');
  const [keyword, setKeyword] = React.useState<string>('');
  const [page, setPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(PAGE_SIZE_DEFAULT);

  const [items, setItems] = React.useState<ShipmentListItem[]>([]);
  const [total, setTotal] = React.useState<number>(0);
  const [loading, setLoading] = React.useState<boolean>(false);

  const [completeTarget, setCompleteTarget] =
    React.useState<ShipmentListItem | null>(null);
  const [installBusyId, setInstallBusyId] = React.useState<string | null>(null);
  const [highlightId, setHighlightId] = React.useState<string | null>(null);
  const highlightTimerRef = React.useRef<number | null>(null);

  const flashRow = React.useCallback((id: string): void => {
    setHighlightId(id);
    if (highlightTimerRef.current !== null) {
      window.clearTimeout(highlightTimerRef.current);
    }
    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightId(null);
      highlightTimerRef.current = null;
    }, ROW_HIGHLIGHT_MS);
  }, []);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setKeyword(keywordDraft.trim());
      setPage(1);
    }, KEYWORD_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [keywordDraft]);

  const loadData = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const params: ShipmentListParams = { page, pageSize };
      if (keyword) params.keyword = keyword;
      if (tab !== 'all') params.status = tab;
      const res = await shipmentApi.listShipments(params);
      setItems(Array.isArray(res.items) ? res.items : []);
      setTotal(res.total);
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [tab, keyword, page, pageSize]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleStatusSuccess = React.useCallback(
    (id: string): void => {
      flashRow(id);
      void loadData();
    },
    [flashRow, loadData],
  );

  const handleStartInstall = async (
    record: ShipmentListItem,
  ): Promise<void> => {
    setInstallBusyId(record.id);
    try {
      await shipmentApi.updateShipmentStatus(record.id, {
        targetStatus: '在安装',
      });
      toast.success('已开始安装');
      handleStatusSuccess(record.id);
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error));
    } finally {
      setInstallBusyId(null);
    }
  };

  const renderAction = (record: ShipmentListItem): React.ReactNode => {
    const goDetail = (): void => navigate(`/shipments/${record.id}`);
    if (record.shipStatus === '待出库') {
      return hasPerm('shipment:outbound') ? (
        <div
          className="flex flex-col gap-1"
          onClick={(e: React.MouseEvent<HTMLDivElement>) =>
            e.stopPropagation()
          }
        >
          <div className="flex items-center gap-1">
            <OutboundPopover
              shipmentId={record.id}
              onSuccess={handleStatusSuccess}
            />
            <HelpTip content="确认出库会按发货明细扣减商品库存，请核对型号与数量后再操作" />
          </div>
          <span className="text-sm text-muted-foreground">
            {ACTION_HINTS['待出库']}
          </span>
        </div>
      ) : null;
    }
    if (record.shipStatus === '运输中') {
      return hasPerm('shipment:install') ? (
        <div className="flex flex-col gap-1">
          <Button
            data-ai-section-type="button"
            size="sm"
            disabled={installBusyId === record.id}
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              void handleStartInstall(record);
            }}
          >
            {installBusyId === record.id && (
              <Loader2 className="size-4 animate-spin" />
            )}
            开始安装
          </Button>
          <span className="text-sm text-muted-foreground">
            {ACTION_HINTS['运输中']}
          </span>
        </div>
      ) : null;
    }
    if (record.shipStatus === '在安装') {
      return hasPerm('shipment:install') ? (
        <div className="flex flex-col gap-1">
          <Button
            data-ai-section-type="button"
            size="sm"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              setCompleteTarget(record);
            }}
          >
            确认安装完成
          </Button>
          <span className="text-sm text-muted-foreground">
            {ACTION_HINTS['在安装']}
          </span>
        </div>
      ) : null;
    }
    return (
      <Button
        data-ai-section-type="button"
        variant="ghost"
        size="sm"
        className="text-primary"
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation();
          goDetail();
        }}
      >
        查看详情
      </Button>
    );
  };

  const columns: TableColumnsType<ShipmentListItem> = [
    {
      title: '配送单号',
      dataIndex: 'shipNo',
      fixed: 'left',
      width: 150,
      render: (shipNo: string) => (
        <span className="font-medium text-primary">{shipNo}</span>
      ),
    },
    { title: '订单号', dataIndex: 'orderNo', width: 150 },
    { title: '客户', dataIndex: 'customerName', width: 130 },
    {
      title: '安装地址',
      dataIndex: 'installAddress',
      width: 200,
      ellipsis: true,
      render: (value: string) => value || '-',
    },
    {
      title: '状态',
      dataIndex: 'shipStatus',
      width: 100,
      render: (status: ShipmentStatus) => (
        <ShipmentStatusBadge status={status} />
      ),
    },
    {
      title: '发货人员',
      dataIndex: 'shipperId',
      width: 140,
      render: (value: string) =>
        value ? <UserDisplay value={[value]} size="small" /> : '-',
    },
    {
      title: '安装人员',
      dataIndex: 'installerId',
      width: 140,
      render: (value: string) =>
        value ? <UserDisplay value={[value]} size="small" /> : '-',
    },
    {
      title: '预约时间',
      dataIndex: 'appointmentTime',
      width: 150,
      render: (value?: string) =>
        value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 230,
      render: (_: unknown, record: ShipmentListItem) => renderAction(record),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          配送安装管理
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          配送安装单全流程跟踪：出库、运输、上门安装与验收
        </p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value: string) => {
          setTab(value as StatusTab);
          setPage(1);
        }}
      >
        <TabsList>
          <TabsTrigger value="all">全部</TabsTrigger>
          {SHIPMENT_STATUS_OPTIONS.map((status: ShipmentStatus) => (
            <TabsTrigger key={status} value={status}>
              {status}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4 shadow-sm">
        <div className="relative w-[300px]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="w-[300px] h-10 pl-9"
            placeholder="搜索配送单号/发货单号/订单号/客户名"
            value={keywordDraft}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setKeywordDraft(e.target.value)
            }
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') {
                setKeyword(keywordDraft.trim());
                setPage(1);
              }
            }}
          />
        </div>
        <Button
          data-ai-section-type="button"
          variant="ghost"
          size="sm"
          className="ml-auto"
          onClick={() => {
            void loadData();
          }}
        >
          <RefreshCw className="size-4" />
          刷新
        </Button>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <Table<ShipmentListItem>
          columns={columns}
          dataSource={items}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1300, y: 500 }}
          onRow={(record: ShipmentListItem) => ({
            className: `${
              record.id === highlightId ? 'row-highlight ' : ''
            }cursor-pointer`,
            onClick: () => navigate(`/shipments/${record.id}`),
          })}
          locale={{ emptyText: EMPTY_TEXT_BY_TAB[tab] }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t: number) => `共 ${t} 条`,
            onChange: (p: number, ps: number) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </div>

      {completeTarget && (
        <CompleteInstallDialog
          open={completeTarget !== null}
          shipmentId={completeTarget.id}
          onOpenChange={(open: boolean) => {
            if (!open) setCompleteTarget(null);
          }}
          onSuccess={() => {
            handleStatusSuccess(completeTarget.id);
          }}
        />
      )}
    </div>
  );
};

export default ShipmentsPage;
