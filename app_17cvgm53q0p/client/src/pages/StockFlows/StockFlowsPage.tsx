import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import type { TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { Table } from '@lark-apaas/client-toolkit/antd-table';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import DateField from '@/components/date-field';
import { productApi } from '@client/src/api';
import {
  INVENTORY_FLOW_BUSINESS_TYPES,
  type InventoryFlow,
  type InventoryFlowListResponse,
} from '@shared/inventory-flow';
import type { Product } from '@shared/product';

const ALL_VALUE = 'all';
const DEFAULT_PAGE_SIZE = 20;

interface AxiosLikeError {
  response?: { data?: { message?: string } };
  message?: string;
}

/** 提取后端错误信息：优先 response.data.message */
const extractErrorMessage = (error: unknown): string => {
  if (typeof error === 'object' && error !== null) {
    const axiosError = error as AxiosLikeError;
    const serverMessage: string | undefined = axiosError.response?.data?.message;
    if (serverMessage) return serverMessage;
    if (axiosError.message) return axiosError.message;
  }
  return '操作失败，请稍后重试';
};

/** 库存流水台账：商品 / 业务类型 / 时间范围多条件筛选 + 后端分页 */
const StockFlowsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [productId, setProductId] = useState<string>(
    () => searchParams.get('productId') ?? ALL_VALUE,
  );
  const [businessType, setBusinessType] = useState<string>(ALL_VALUE);
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [data, setData] = useState<InventoryFlowListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [products, setProducts] = useState<Product[]>([]);

  const productNoMap = useMemo((): Map<string, string> => {
    const map = new Map<string, string>();
    for (const item of products) {
      map.set(item.id, item.productNo);
    }
    return map;
  }, [products]);

  useEffect(() => {
    let mounted = true;
    productApi
      .fetchProducts({})
      .then((res) => {
        if (mounted) setProducts(res.items ?? []);
      })
      .catch((error: unknown) => {
        if (mounted) toast.error(extractErrorMessage(error));
      });
    return (): void => {
      mounted = false;
    };
  }, []);

  const loadFlows = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const result = await productApi.listInventoryFlows({
        productId: productId !== ALL_VALUE ? productId : undefined,
        businessType: businessType !== ALL_VALUE ? businessType : undefined,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        page,
        pageSize,
      });
      setData(result);
    } catch (error: unknown) {
      setData(null);
      toast.error(extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [productId, businessType, startTime, endTime, page, pageSize]);

  useEffect(() => {
    void loadFlows();
  }, [loadFlows]);

  const handleReset = useCallback((): void => {
    setProductId(ALL_VALUE);
    setBusinessType(ALL_VALUE);
    setStartTime('');
    setEndTime('');
    setPage(1);
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const columns: TableColumnsType<InventoryFlow> = [
    {
      title: '流水编号',
      dataIndex: 'flowNo',
      fixed: 'left',
      width: 150,
      render: (value: string) => (
        <span className="font-mono text-xs text-muted-foreground">
          {value || '-'}
        </span>
      ),
    },
    {
      title: '关联商品',
      dataIndex: 'productName',
      fixed: 'left',
      width: 190,
      render: (value: string, record: InventoryFlow) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{value || '-'}</span>
          <span className="font-mono text-xs text-muted-foreground">
            {productNoMap.get(record.productId) ?? ''}
          </span>
        </div>
      ),
    },
    {
      title: '变动方向',
      dataIndex: 'changeDirection',
      width: 90,
      render: (value: string) =>
        value === 'in' ? (
          <span className="inline-flex items-center rounded-full bg-[hsl(152_65%_95%)] px-2.5 py-0.5 text-xs font-medium text-[hsl(152_65%_30%)]">
            入库
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-[hsl(4_85%_95%)] px-2.5 py-0.5 text-xs font-medium text-[hsl(4_85%_35%)]">
            出库
          </span>
        ),
    },
    { title: '业务类型', dataIndex: 'businessType', width: 110 },
    {
      title: '变动数量',
      dataIndex: 'quantity',
      width: 100,
      render: (value: number, record: InventoryFlow) =>
        record.changeDirection === 'in' ? (
          <span className="font-semibold text-[hsl(152_65%_30%)]">
            +{value}
          </span>
        ) : (
          <span className="font-semibold text-destructive">-{value}</span>
        ),
    },
    {
      title: '变动前库存',
      dataIndex: 'stockBefore',
      width: 100,
      render: (value: number) => (
        <span className="text-muted-foreground">{value}</span>
      ),
    },
    {
      title: '变动后库存',
      dataIndex: 'stockAfter',
      width: 100,
      render: (value: number) => (
        <span className="text-muted-foreground">{value}</span>
      ),
    },
    {
      title: '关联订单',
      dataIndex: 'orderNo',
      width: 130,
      render: (value: string) => (
        <span className="font-mono text-xs text-muted-foreground">
          {value || '-'}
        </span>
      ),
    },
    {
      title: '关联配送单',
      dataIndex: 'shipmentNo',
      width: 130,
      render: (value: string) => (
        <span className="font-mono text-xs text-muted-foreground">
          {value || '-'}
        </span>
      ),
    },
    {
      title: '操作人',
      dataIndex: 'operatorName',
      width: 100,
      render: (value: string) => (
        <span className="text-muted-foreground">{value || '-'}</span>
      ),
    },
    {
      title: '操作时间',
      dataIndex: 'operatedAt',
      width: 150,
      render: (value: string) => (
        <span className="text-muted-foreground">
          {value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-'}
        </span>
      ),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      width: 160,
      render: (value: string) =>
        value ? (
          <span className="block max-w-[140px] truncate" title={value}>
            {value}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">库存流水</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          所有出入库记录，支持多条件筛选
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
        <Select
          value={productId}
          onValueChange={(value: string) => {
            setProductId(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="全部商品" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>全部商品</SelectItem>
            {products.map((item: Product): React.ReactNode => (
              <SelectItem key={item.id} value={item.id}>
                {item.productName}（{item.productNo}）
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={businessType}
          onValueChange={(value: string) => {
            setBusinessType(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="全部业务类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>全部业务类型</SelectItem>
            {INVENTORY_FLOW_BUSINESS_TYPES.map(
              (item: string): React.ReactNode => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
        <div className="w-40">
          <DateField
            value={startTime}
            placeholder="开始日期"
            onSelect={(value: string) => {
              setStartTime(value);
              setPage(1);
            }}
          />
        </div>
        <span className="text-sm text-muted-foreground">至</span>
        <div className="w-40">
          <DateField
            value={endTime}
            placeholder="结束日期"
            onSelect={(value: string) => {
              setEndTime(value);
              setPage(1);
            }}
          />
        </div>
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="size-4" />
          重置
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <Table
          columns={columns}
          dataSource={data?.items ?? []}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1600, y: 500 }}
          locale={{ emptyText: '暂无流水记录' }}
          pagination={{
            current: page,
            pageSize,
            total: data?.total ?? 0,
            showSizeChanger: true,
            onChange: (nextPage: number, nextPageSize: number): void => {
              setPage(nextPage);
              setPageSize(nextPageSize);
            },
          }}
        />
      </div>
    </div>
  );
};

export default StockFlowsPage;
