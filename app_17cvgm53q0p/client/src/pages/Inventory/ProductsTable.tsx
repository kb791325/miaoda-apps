import { Pencil } from 'lucide-react';
import type { TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { Table } from '@lark-apaas/client-toolkit/antd-table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Product } from '@shared/product';
import { useAuth } from '@client/src/hooks/use-auth';
import { formatMoney } from './inventory-utils';

export type StockChangeActionType = 'in' | 'otherOut';

export interface ProductsTableProps {
  items: Product[];
  loading: boolean;
  onStockChange: (product: Product, type: StockChangeActionType) => void;
  /** 点击成本价铅笔图标：设置成本价 */
  onEditCost: (product: Product) => void;
  /** 跳转库存流水页（按商品过滤） */
  onFlow: (product: Product) => void;
  /** 库存盘点 */
  onStocktake: (product: Product) => void;
  /** 编辑商品档案 */
  onEdit: (product: Product) => void;
  /** 删除商品（表格内已含确认弹窗） */
  onDelete: (product: Product) => void;
  /** 空态文案 */
  emptyText?: string;
}

/** 库存状态标签：预警红 / 正常绿（浅底深字 pill） */
const StockStatusBadge: React.FC<{ isWarning: boolean }> = ({ isWarning }) =>
  isWarning ? (
    <span className="inline-flex items-center rounded-full bg-[hsl(4_85%_95%)] px-2.5 py-0.5 text-xs font-medium text-[hsl(4_85%_35%)]">
      ⚠️预警
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-[hsl(152_65%_95%)] px-2.5 py-0.5 text-xs font-medium text-[hsl(152_65%_30%)]">
      正常
    </span>
  );

/**
 * 商品库存表格：预警行浅红底 + 左侧 2px 红边；
 * 列含成本价编辑入口、库存金额、累计销量与库存状态。
 */
export const ProductsTable: React.FC<ProductsTableProps> = ({
  items,
  loading,
  onStockChange,
  onEditCost,
  onFlow,
  onStocktake,
  onEdit,
  onDelete,
  emptyText = '暂无商品数据',
}) => {
  const { hasPerm } = useAuth();
  const canViewCost: boolean = hasPerm('cost:view');
  const canManagePrice: boolean = hasPerm('price:manage');
  const warningFirstCellProps = (record: Product) =>
    record.isWarning
      ? { className: 'border-l-2 border-l-[hsl(4_85%_50%)]' }
      : {};

  const columns: TableColumnsType<Product> = [
    {
      title: 'SKU编码',
      dataIndex: 'productNo',
      fixed: 'left',
      width: 130,
      onCell: warningFirstCellProps,
      render: (value: string) => (
        <span className="font-mono text-xs text-muted-foreground">
          {value || '-'}
        </span>
      ),
    },
    {
      title: '名称',
      dataIndex: 'productName',
      fixed: 'left',
      width: 170,
      render: (value: string) => (
        <span className="font-medium text-foreground">{value || '-'}</span>
      ),
    },
    {
      title: '规格型号',
      dataIndex: 'specModel',
      width: 110,
      render: (value?: string) => (
        <span className="text-muted-foreground">{value || '-'}</span>
      ),
    },
    {
      title: '品牌',
      dataIndex: 'brand',
      width: 90,
      render: (value?: string) => (
        <span className="text-muted-foreground">{value || '-'}</span>
      ),
    },
    {
      title: '销售单价',
      dataIndex: 'price',
      width: 110,
      render: (value: number) => (
        <span className="text-foreground">{formatMoney(value)}</span>
      ),
    },
    ...(canViewCost
      ? [
          {
            title: '成本价',
            dataIndex: 'costPrice',
            width: 130,
            render: (value: number, record: Product) => (
              <span className="flex items-center gap-1">
                <span className="text-foreground">
                  {formatMoney(value ?? 0)}
                </span>
                {canManagePrice ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 text-muted-foreground hover:text-primary"
                    onClick={() => onEditCost(record)}
                    aria-label={`设置${record.productName}的成本价`}
                  >
                    <Pencil className="size-3" />
                  </Button>
                ) : null}
              </span>
            ),
          },
          {
            title: '毛利率',
            key: 'grossMargin',
            width: 90,
            render: (_: unknown, record: Product) => {
              if (!record.price) {
                return <span className="text-muted-foreground">—</span>;
              }
              const rate: number =
                ((record.price - (record.costPrice ?? 0)) / record.price) *
                100;
              return (
                <span
                  className={
                    rate < 0
                      ? 'font-medium text-destructive'
                      : 'text-foreground'
                  }
                >
                  {rate.toFixed(1)}%
                </span>
              );
            },
          },
        ]
      : []),
    {
      title: '当前库存',
      dataIndex: 'stock',
      width: 90,
      render: (value: number, record: Product) =>
        record.isWarning ? (
          <span className="font-bold text-destructive">{value}</span>
        ) : (
          <span className="font-medium text-foreground">{value}</span>
        ),
    },
    {
      title: '预警阈值',
      dataIndex: 'warningThreshold',
      width: 90,
      render: (value: number) => (
        <span className="text-muted-foreground">{value}</span>
      ),
    },
    ...(canViewCost
      ? [
          {
            title: '库存金额',
            dataIndex: 'stockValue',
            width: 120,
            render: (value: number) => (
              <span className="text-foreground">{formatMoney(value ?? 0)}</span>
            ),
          },
        ]
      : []),
    {
      title: '累计销量',
      dataIndex: 'cumulativeSales',
      width: 90,
      render: (value: number) => (
        <span className="text-muted-foreground">{value ?? 0}</span>
      ),
    },
    {
      title: '库存状态',
      key: 'status',
      width: 100,
      render: (_: unknown, record: Product) => (
        <StockStatusBadge isWarning={record.isWarning === true} />
      ),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 330,
      render: (_: unknown, record: Product) => (
        <div className="flex items-center gap-1">
          {hasPerm('stock:manage') ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-success hover:text-success"
              onClick={() => onStockChange(record, 'in')}
            >
              入库
            </Button>
          ) : null}
          {hasPerm('stock:manage') ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onStockChange(record, 'otherOut')}
            >
              出库
            </Button>
          ) : null}
          {hasPerm('stock:manage') ? (
            <Button variant="ghost" size="sm" onClick={() => onStocktake(record)}>
              盘点
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={() => onFlow(record)}>
            流水
          </Button>
          {hasPerm('product:manage') || hasPerm('price:manage') ? (
            <Button variant="ghost" size="sm" onClick={() => onEdit(record)}>
              编辑
            </Button>
          ) : null}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
              >
                删除
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>删除商品</AlertDialogTitle>
                <AlertDialogDescription>
                  确定删除商品「{record.productName}」吗？删除后相关库存数据将无法恢复。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => onDelete(record)}
                >
                  确认删除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

  if (loading && items.length === 0) {
    return (
      <div className="space-y-2 rounded-lg border border-border bg-card p-4 shadow-sm">
        {[1, 2, 3, 4, 5].map((n: number) => (
          <Skeleton key={n} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <Table
        columns={columns}
        dataSource={items}
        loading={loading}
        rowKey="id"
        scroll={{ x: 1700, y: 500 }}
        pagination={false}
        locale={{ emptyText }}
        rowClassName={(record: Product): string =>
          record.isWarning ? 'h-12 bg-[hsl(4_85%_97%)]' : 'h-12'
        }
      />
    </div>
  );
};
