import { Building2, Package, ShoppingCart } from 'lucide-react';
import { Badge } from '@client/src/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@client/src/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import type { SupplierDetail } from '@shared/api.interface';
import {
  SUPPLIER_STATUS_BADGE_VARIANT,
  SUPPLIER_STATUS_LABEL,
  formatSupplierAmount,
  formatSupplierDate,
} from './supplier-utils';

export interface SupplierDetailDialogProps {
  open: boolean;
  loading: boolean;
  data: SupplierDetail | null;
  onOpenChange: (open: boolean) => void;
}

export default function SupplierDetailDialog({
  open,
  loading,
  data,
  onOpenChange,
}: SupplierDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-sm max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="size-5 text-primary" />
            供应商详情
          </DialogTitle>
          <DialogDescription>{data?.name || '加载中...'}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-16 text-center text-muted-foreground">加载中...</div>
        ) : data ? (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* 基本信息 */}
            <Card className="rounded-sm shadow-none border border-border">
              <CardHeader className="py-3 px-4 border-b border-border">
                <CardTitle className="text-sm font-medium text-foreground">
                  基本信息
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    供应商编号
                  </div>
                  <div className="font-mono text-foreground">{data.code}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    供应商名称
                  </div>
                  <div className="text-foreground">{data.name}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    联系人
                  </div>
                  <div className="text-foreground">
                    {data.contactPerson || '-'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    电话
                  </div>
                  <div className="text-foreground">{data.phone || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    邮箱
                  </div>
                  <div className="text-foreground">{data.email || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    主营品类
                  </div>
                  <div className="text-foreground">
                    {data.mainCategory || '-'}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground mb-1">
                    地址
                  </div>
                  <div className="text-foreground">{data.address || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    状态
                  </div>
                  <Badge
                    variant="outline"
                    className={`rounded-full ${SUPPLIER_STATUS_BADGE_VARIANT[data.status] ?? ''}`}
                  >
                    {SUPPLIER_STATUS_LABEL[data.status] ?? data.status}
                  </Badge>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    创建时间
                  </div>
                  <div className="text-foreground">
                    {formatSupplierDate(data.createdAt)}
                  </div>
                </div>
                {data.remark && (
                  <div className="col-span-2">
                    <div className="text-xs text-muted-foreground mb-1">
                      备注
                    </div>
                    <div className="text-foreground">{data.remark}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 采购统计 */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="rounded-sm shadow-none border border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-sm bg-accent flex items-center justify-center">
                      <ShoppingCart className="size-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        近30天入库次数
                      </div>
                      <div className="text-2xl font-mono font-light text-foreground">
                        {data.purchaseCount}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-sm shadow-none border border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-sm bg-accent flex items-center justify-center">
                      <Package className="size-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        近30天采购金额
                      </div>
                      <div className="text-2xl font-mono font-light text-foreground">
                        ¥{formatSupplierAmount(data.purchaseAmount)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 关联商品 */}
            <Card className="rounded-sm shadow-none border border-border">
              <CardHeader className="py-3 px-4 border-b border-border">
                <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Package className="size-4 text-primary" />
                  关联商品
                  <span className="text-xs font-normal text-muted-foreground">
                    共 {data.products.length} 件
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {data.products.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    暂无关联商品
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>商品编码</TableHead>
                        <TableHead>商品名称</TableHead>
                        <TableHead>品类</TableHead>
                        <TableHead className="text-right">单价</TableHead>
                        <TableHead className="text-center">状态</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.products.slice(0, 10).map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {product.code}
                          </TableCell>
                          <TableCell className="text-foreground">
                            {product.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {product.category}
                          </TableCell>
                          <TableCell className="text-right font-mono text-foreground">
                            ¥{formatSupplierAmount(product.unitPrice)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="rounded-full">
                              {product.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
