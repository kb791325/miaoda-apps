import { useEffect, useRef, useState } from 'react';
import { formatBeijingTime } from '@client/src/utils/date';
import { products, records } from '@client/src/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { Badge } from '@client/src/components/ui/badge';
import { Button } from '@client/src/components/ui/button';
import { QRCodeCanvas } from 'qrcode.react';
import {
  Download,
  Package,
  Printer,
  Tag,
} from 'lucide-react';
import { Image as ProductImage } from '@client/src/components/ui/image';
import {
  downloadProductLabel,
  printProductLabel,
} from './productLabel';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { ProductWithInventory, StockTransaction } from '@shared/api.interface';

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  normal: {
    label: '正常',
    className:
      'rounded-full bg-success/10 text-success border-success/20',
  },
  warning: {
    label: '预警',
    className:
      'rounded-full bg-warning/10 text-warning border-warning/20',
  },
  shortage: {
    label: '缺货',
    className:
      'rounded-full bg-destructive/10 text-destructive border-destructive/20',
  },
};

const LOCKED_PER_WAREHOUSE = 4;

interface ProductDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string | null;
}

export function ProductDetailDialog({
  open,
  onOpenChange,
  productId,
}: ProductDetailDialogProps) {
  const [product, setProduct] = useState<ProductWithInventory | null>(null);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !productId) {
      setProduct(null);
      setTransactions([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [detail, txRes] = await Promise.all([
          products.getProduct(productId),
          records.getTransactions({
            page: 1,
            pageSize: 5,
          }),
        ]);
        if (cancelled) return;
        setProduct(detail);
        const filtered = txRes.items.filter(
          (t: StockTransaction) => t.productId === productId,
        );
        setTransactions(filtered);
      } catch (err: unknown) {
        logger.error('获取商品详情失败:', String(err));
        toast.error('获取商品详情失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open, productId]);

  const labelRef = useRef<HTMLDivElement>(null);

  if (!product && !loading) return null;

  const statusInfo = product
    ? STATUS_MAP[product.status] ?? {
        label: product.status,
        className: '',
      }
    : null;

  const getWarehouseQty = (warehouseName: string): number => {
    if (!product) return 0;
    const found = product.inventory.find(
      (i) => i.warehouse === warehouseName,
    );
    return found?.quantity ?? 0;
  };

  const genLocation = (warehouseName: string): string => {
    const prefix = warehouseName.charAt(0);
    const hash = product
      ? product.id
          .split('-')
          .slice(0, 2)
          .map((s) => s.slice(0, 2))
          .join('-')
      : '';
    return `${prefix}-${hash}`;
  };

  const warehouses = ['上海仓', '北京仓', '广州仓', '成都仓'];

  const handleDownloadLabel = (): void => {
    if (product && labelRef.current) {
      downloadProductLabel(product, labelRef.current);
    }
  };

  const handlePrintLabel = (): void => {
    if (product && labelRef.current) {
      printProductLabel(product, labelRef.current);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b border-border">
          <DialogTitle className="text-base font-medium">
            商品详情
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            加载中...
          </div>
        ) : product ? (
          <div className="space-y-6">
            {product.imageUrl ? (
              <ProductImage
                src={product.imageUrl}
                alt={product.name}
                width={672}
                className="h-48 w-full rounded-sm border border-border object-cover"
              />
            ) : (
              <div className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-sm border border-border bg-muted">
                <Package className="h-10 w-10 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">暂无图片</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <div className="text-muted-foreground text-xs mb-1">
                  商品编码
                </div>
                <div className="font-mono">{product.code}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs mb-1">
                  商品名称
                </div>
                <div className="font-medium">{product.name}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs mb-1">
                  品类
                </div>
                <div>{product.category}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs mb-1">
                  品牌
                </div>
                <div>{product.brand || '-'}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs mb-1">
                  规格型号
                </div>
                <div>{product.spec || '-'}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs mb-1">
                  单位
                </div>
                <div>{product.unit}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs mb-1">
                  商品图片
                </div>
                <div>{product.imageUrl ? '已上传' : '暂无'}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs mb-1">
                  基本单位
                </div>
                <div>{product.baseUnit || product.unit}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs mb-1">
                  销售单位
                </div>
                <div>{product.salesUnit || '-'}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs mb-1">
                  换算比例
                </div>
                <div>
                  {product.salesUnit && product.conversionRatio
                    ? `1 ${product.salesUnit} = ${product.conversionRatio} ${product.baseUnit || product.unit}`
                    : '-'}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs mb-1">
                  安全库存
                </div>
                <div className="font-mono">{product.safetyStock} 个</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs mb-1">
                  参考单价
                </div>
                <div className="font-mono">¥{product.unitPrice.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs mb-1">
                  当前总库存
                </div>
                <div className="font-mono text-lg font-light">
                  {product.totalQuantity} 个
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs mb-1">
                  状态
                </div>
                <div>
                  {statusInfo && (
                    <Badge
                      variant="secondary"
                      className={statusInfo.className}
                    >
                      {statusInfo.label}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3 text-foreground">
                各仓库库存
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        仓库
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                        库存
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                        锁定
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                        可用
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        库位
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {warehouses.map((wh) => {
                      const qty = getWarehouseQty(wh);
                      const available = Math.max(
                        0,
                        qty - LOCKED_PER_WAREHOUSE,
                      );
                      return (
                        <tr
                          key={wh}
                          className="border-b border-border/50"
                        >
                          <td className="px-3 py-2">{wh}</td>
                          <td className="px-3 py-2 text-right font-mono">
                            {qty}
                          </td>
                          <td className="px-3 py-2 text-right font-mono">
                            {qty > 0 ? LOCKED_PER_WAREHOUSE : 0}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-success">
                            {available}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">
                            {qty > 0 ? genLocation(wh) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Tag className="size-4 text-primary" />
                  商品标签
                </h4>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={handleDownloadLabel}
                  >
                    <Download className="size-4" />
                    下载标签
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={handlePrintLabel}
                  >
                    <Printer className="size-4" />
                    打印标签
                  </Button>
                </div>
              </div>
              <div className="border border-border rounded-sm p-4 bg-card">
                <div
                  ref={labelRef}
                  className="flex items-start gap-4"
                  style={{ width: '60mm', minHeight: '40mm' }}
                >
                  <div className="shrink-0 bg-card p-1 border border-border/50 rounded-sm">
                    <QRCodeCanvas
                      value={product.id}
                      size={110}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="font-medium text-sm leading-tight truncate">
                      {product.name}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {product.code}
                    </div>
                    {product.spec && (
                      <div className="text-xs text-muted-foreground truncate">
                        规格：{product.spec}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      单位：{product.unit}
                    </div>
                    <div className="font-mono text-base font-medium text-primary pt-1">
                      ¥{product.unitPrice.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3 text-foreground">
                最近出入库记录
              </h4>
              {transactions.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-sm">
                  暂无出入库记录
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          编号
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          类型
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                          数量
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          时间
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((t: StockTransaction) => (
                        <tr
                          key={t.id}
                          className="border-b border-border/50"
                        >
                          <td className="px-3 py-2 font-mono text-xs">
                            {t.id.slice(0, 12)}
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              variant="secondary"
                              className={
                                t.type === 'inbound'
                                  ? 'rounded-full bg-success/10 text-success border-success/20'
                                  : 'rounded-full bg-destructive/10 text-destructive border-destructive/20'
                              }
                            >
                              {t.type === 'inbound' ? '入库' : '出库'}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-right font-mono">
                            {t.quantity}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground font-mono text-xs">
                            {formatBeijingTime(t.transactionDate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
