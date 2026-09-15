import { useCallback, useState } from 'react';
import { sync as syncApi } from '@client/src/api';
import { undoOperation } from '@client/src/api/undo';
import { Button } from '@client/src/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@client/src/components/ui/tabs';
import UndoBanner from '@client/src/components/UndoBanner';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  ClipboardCheck,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { InboundForm } from './InboundForm';
import { OutboundForm } from './OutboundForm';
import { TransferForm } from './TransferForm';
import { RecordsInventoryCheck } from '@client/src/pages/Records/RecordsInventoryCheck';

export default function OperationsPage() {
  const [subTab, setSubTab] = useState<'inbound' | 'outbound'>('inbound');
  const [syncing, setSyncing] = useState(false);
  const [undoTarget, setUndoTarget] = useState<string | null>(null);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [outboundResetKey, setOutboundResetKey] = useState(0);

  const clearUndoState = useCallback(() => {
    setUndoTarget(null);
    setBannerVisible(false);
  }, []);

  const handleOutboundSuccess = (transactionId?: string) => {
    if (!transactionId) return;
    setUndoTarget(transactionId);
    setBannerVisible(true);
  };

  const handleUndo = async () => {
    if (!undoTarget || undoing) return;
    setUndoing(true);
    try {
      const res = await undoOperation({ action: 'outbound', targetId: undoTarget });
      toast.success(res.message);
      clearUndoState();
      // 重挂载出库表单：重置表单并触发库存重新查询
      setOutboundResetKey((k: number) => k + 1);
    } catch (err: unknown) {
      logger.error('撤销出库失败:', String(err));
      toast.error('撤销失败，请重试');
    } finally {
      setUndoing(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncApi.pushSync('warehouse_inventory');
      toast.success('库存数据已同步到飞书');
    } catch (err: unknown) {
      logger.error('同步到飞书失败:', String(err));
      toast.error('同步到飞书失败');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <UndoBanner
        visible={bannerVisible}
        message="出库成功"
        onUndo={handleUndo}
        onDismiss={clearUndoState}
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-5 w-1 rounded-sm bg-primary" />
          <div>
            <h1 className="text-lg font-semibold tracking-tight">库存操作</h1>
            <p className="text-sm text-muted-foreground">入库、出库、调拨与盘点操作</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSync}
          disabled={syncing}
        >
          <RefreshCw className={`size-4 ${syncing ? 'animate-spin' : ''}`} />
          库存同步到飞书
        </Button>
      </div>

      <Tabs defaultValue="inout" className="w-full" onValueChange={() => clearUndoState()}>
        <TabsList className="grid w-full grid-cols-2 bg-transparent border border-border rounded-sm p-0 h-10">
          <TabsTrigger
            value="inout"
            className="rounded-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
          >
            出入库
          </TabsTrigger>
          <TabsTrigger
            value="transfer-check"
            className="rounded-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
          >
            调拨与盘点
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inout">
          <div className="mt-4">
            <div className="flex items-center gap-1 mb-4 border-b border-border">
              <button
                type="button"
                onClick={() => { setSubTab('inbound'); clearUndoState(); }}
                className={`flex items-center gap-1.5 w-[96px] h-[45px] px-4 py-2 text-sm border-b-2 transition-colors ${
                  subTab === 'inbound'
                    ? 'border-primary text-primary font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <ArrowDownToLine className="size-3.5" />
                入库
              </button>
              <button
                type="button"
                onClick={() => { setSubTab('outbound'); clearUndoState(); }}
                className={`flex items-center gap-1.5 w-[96px] h-[45px] px-4 py-2 text-sm border-b-2 transition-colors ${
                  subTab === 'outbound'
                    ? 'border-primary text-primary font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <ArrowUpFromLine className="size-3.5" />
                出库
              </button>
            </div>

            {subTab === 'inbound' && <InboundForm />}
            {subTab === 'outbound' && (
              <OutboundForm
                key={outboundResetKey}
                onOutboundSuccess={handleOutboundSuccess}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="transfer-check">
          <div className="space-y-6 mt-4">
            <TransferForm />
            <RecordsInventoryCheck />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
