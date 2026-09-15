import { Tabs, TabsList, TabsTrigger, TabsContent } from '@client/src/components/ui/tabs';
import { Badge } from '@client/src/components/ui/badge';
import { formatBeijingTime } from '@client/src/utils/date';
import type { ArchivedProductDetail } from '@shared/api.interface';

interface RecordsArchivedDetailProps {
  detail: ArchivedProductDetail;
}

export function RecordsArchivedDetail({ detail }: RecordsArchivedDetailProps) {
  return (
    <Tabs defaultValue="transactions" className="w-full">
      <TabsList className="bg-muted/40 border border-border rounded-sm">
        <TabsTrigger value="transactions" className="text-xs">
          出入库记录 ({detail.transactions.length})
        </TabsTrigger>
        <TabsTrigger value="transfers" className="text-xs">
          调拨记录 ({detail.transfers.length})
        </TabsTrigger>
        <TabsTrigger value="checks" className="text-xs">
          盘点记录 ({detail.inventoryChecks.length})
        </TabsTrigger>
        <TabsTrigger value="inventory" className="text-xs">
          库存快照
        </TabsTrigger>
      </TabsList>

      <TabsContent value="transactions">
        {detail.transactions.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">暂无出入库记录</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-2 py-2 text-left font-medium text-muted-foreground">时间</th>
                  <th className="px-2 py-2 text-left font-medium text-muted-foreground">仓库</th>
                  <th className="px-2 py-2 text-left font-medium text-muted-foreground">类型</th>
                  <th className="px-2 py-2 text-right font-medium text-muted-foreground">数量</th>
                  <th className="px-2 py-2 text-right font-medium text-muted-foreground">单价</th>
                  <th className="px-2 py-2 text-right font-medium text-muted-foreground">金额</th>
                  <th className="px-2 py-2 text-left font-medium text-muted-foreground">订单号</th>
                  <th className="px-2 py-2 text-left font-medium text-muted-foreground">操作人</th>
                  <th className="px-2 py-2 text-left font-medium text-muted-foreground">备注</th>
                </tr>
              </thead>
              <tbody>
                {detail.transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-border/40 hover:bg-accent/40">
                    <td className="px-2 py-1.5 font-mono text-muted-foreground">
                      {formatBeijingTime(tx.transactionDate)}
                    </td>
                    <td className="px-2 py-1.5">{tx.warehouse}</td>
                    <td className="px-2 py-1.5">
                      <Badge
                        variant="secondary"
                        className={
                          tx.type === 'inbound'
                            ? 'rounded-full bg-success/10 text-success border-success/20'
                            : 'rounded-full bg-destructive/10 text-destructive border-destructive/20'
                        }
                      >
                        {tx.type === 'inbound' ? '入库' : '出库'}
                      </Badge>
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono">{tx.quantity}</td>
                    <td className="px-2 py-1.5 text-right font-mono">¥{tx.unitPrice.toFixed(2)}</td>
                    <td className="px-2 py-1.5 text-right font-mono">¥{tx.totalAmount.toFixed(2)}</td>
                    <td className="px-2 py-1.5 font-mono">{tx.orderNo || '-'}</td>
                    <td className="px-2 py-1.5">{tx.operator}</td>
                    <td className="px-2 py-1.5 text-muted-foreground max-w-[120px] truncate">{tx.remark || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="transfers">
        {detail.transfers.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">暂无调拨记录</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-2 py-2 text-left font-medium text-muted-foreground">时间</th>
                  <th className="px-2 py-2 text-left font-medium text-muted-foreground">调拨单号</th>
                  <th className="px-2 py-2 text-left font-medium text-muted-foreground">源仓</th>
                  <th className="px-2 py-2 text-left font-medium text-muted-foreground">目标仓</th>
                  <th className="px-2 py-2 text-right font-medium text-muted-foreground">数量</th>
                  <th className="px-2 py-2 text-left font-medium text-muted-foreground">备注</th>
                </tr>
              </thead>
              <tbody>
                {detail.transfers.map((t) => (
                  <tr key={t.id} className="border-b border-border/40 hover:bg-accent/40">
                    <td className="px-2 py-1.5 font-mono text-muted-foreground">
                      {formatBeijingTime(t.transferDate)}
                    </td>
                    <td className="px-2 py-1.5 font-mono">{t.transferNo}</td>
                    <td className="px-2 py-1.5">{t.sourceWarehouse}</td>
                    <td className="px-2 py-1.5">{t.targetWarehouse}</td>
                    <td className="px-2 py-1.5 text-right font-mono">{t.quantity}</td>
                    <td className="px-2 py-1.5 text-muted-foreground max-w-[120px] truncate">{t.remark || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="checks">
        {detail.inventoryChecks.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">暂无盘点记录</div>
        ) : (
          <div className="space-y-3 py-2">
            {detail.inventoryChecks.map((ic) => (
              <div key={ic.check.id} className="border border-border rounded-sm p-3">
                <div className="flex items-center gap-4 mb-2 text-xs">
                  <span className="text-muted-foreground">
                    盘点时间：<span className="font-mono">{formatBeijingTime(ic.check.checkDate)}</span>
                  </span>
                  <span className="text-muted-foreground">仓库：{ic.check.warehouse}</span>
                  <Badge variant="outline" className="rounded-sm text-xs">
                    {ic.check.status === 'completed' ? '已完成' : ic.check.status === 'in_progress' ? '进行中' : ic.check.status}
                  </Badge>
                </div>
                {ic.items.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="px-2 py-1 text-left font-medium text-muted-foreground">位置</th>
                          <th className="px-2 py-1 text-right font-medium text-muted-foreground">系统数量</th>
                          <th className="px-2 py-1 text-right font-medium text-muted-foreground">实际数量</th>
                          <th className="px-2 py-1 text-right font-medium text-muted-foreground">差异</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ic.items.map((item) => (
                          <tr key={item.id} className="border-b border-border/30">
                            <td className="px-2 py-1">{item.location || '-'}</td>
                            <td className="px-2 py-1 text-right font-mono">{item.systemQuantity}</td>
                            <td className="px-2 py-1 text-right font-mono">{item.actualQuantity}</td>
                            <td className="px-2 py-1 text-right font-mono">
                              <span className={item.difference !== 0 ? 'text-destructive' : ''}>
                                {item.difference > 0 ? '+' : ''}{item.difference}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="inventory">
        {detail.inventory.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">暂无库存快照</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">仓库</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">数量</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">库存价值</th>
                </tr>
              </thead>
              <tbody>
                {detail.inventory.map((inv) => (
                  <tr key={inv.warehouse} className="border-b border-border/40 hover:bg-accent/40">
                    <td className="px-3 py-2">{inv.warehouse}</td>
                    <td className="px-3 py-2 text-right font-mono">{inv.quantity}</td>
                    <td className="px-3 py-2 text-right font-mono">¥{inv.stockValue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
