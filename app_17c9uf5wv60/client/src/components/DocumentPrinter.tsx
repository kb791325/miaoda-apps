import { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@client/src/components/ui/dialog';
import { Button } from '@client/src/components/ui/button';
import { Printer, FileDown } from 'lucide-react';
import type {
  StockTransaction,
  Transfer,
  InventoryCheck,
  InventoryCheckItem,
} from '@shared/api.interface';

type DocType = 'inbound' | 'outbound' | 'transfer' | 'inventory-check';

interface InboundDocData extends StockTransaction {
  spec?: string;
  unit?: string;
}

interface OutboundDocData extends StockTransaction {
  spec?: string;
  unit?: string;
}

interface TransferDocData extends Transfer {
  spec?: string;
  unit?: string;
  unitPrice?: number;
}

interface InventoryCheckDocData extends InventoryCheck {
  items: InventoryCheckItem[];
}

type DocData =
  | InboundDocData
  | OutboundDocData
  | TransferDocData
  | InventoryCheckDocData;

export interface DocumentPrinterProps {
  type: DocType;
  data: DocData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TITLE_MAP: Record<DocType, string> = {
  inbound: '入库单',
  outbound: '出库单',
  transfer: '调拨单',
  'inventory-check': '库存盘点单',
};

const COMPANY_NAME = '飞书伙伴演示环境2026';

function formatDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex text-sm">
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <span className="flex-1 font-medium">{value || '-'}</span>
    </div>
  );
}

function SignatureRow({ labels }: { labels: string[] }) {
  return (
    <div className="grid grid-cols-3 gap-8 pt-12">
      {labels.map((label: string) => (
        <div key={label} className="text-center">
          <div className="border-b border-border h-10" />
          <div className="pt-2 text-sm text-muted-foreground">{label}</div>
        </div>
      ))}
    </div>
  );
}

function InboundContent({ data }: { data: InboundDocData }) {
  const totalAmount = Number(data.totalAmount) || 0;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-x-8 gap-y-2">
        <InfoRow label="入库单号" value={data.orderNo || '-'} />
        <InfoRow label="入库日期" value={formatDate(data.transactionDate)} />
        <InfoRow label="供应商" value={data.supplier || '-'} />
        <InfoRow label="仓库" value={data.warehouse} />
        <InfoRow label="入库类型" value={data.subType || '-'} />
        <InfoRow label="操作人" value={data.operator} />
      </div>
      <div>
        <InfoRow label="备注" value={data.remark || ''} />
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border border-border">
            <th className="px-3 py-2 text-left font-medium">商品编码</th>
            <th className="px-3 py-2 text-left font-medium">商品名称</th>
            <th className="px-3 py-2 text-left font-medium">规格</th>
            <th className="px-3 py-2 text-left font-medium">单位</th>
            <th className="px-3 py-2 text-right font-medium">数量</th>
            <th className="px-3 py-2 text-right font-medium">单价</th>
            <th className="px-3 py-2 text-right font-medium">金额</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border border-border">
            <td className="px-3 py-2">{data.productCode || '-'}</td>
            <td className="px-3 py-2">{data.productName}</td>
            <td className="px-3 py-2">{data.spec || '-'}</td>
            <td className="px-3 py-2">{data.unit || '-'}</td>
            <td className="px-3 py-2 text-right font-mono">{data.quantity}</td>
            <td className="px-3 py-2 text-right font-mono">
              ¥{Number(data.unitPrice).toFixed(2)}
            </td>
            <td className="px-3 py-2 text-right font-mono">
              ¥{totalAmount.toFixed(2)}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr className="border border-border bg-muted/30">
            <td className="px-3 py-2 font-medium" colSpan={4}>合计</td>
            <td className="px-3 py-2 text-right font-mono font-medium">
              {data.quantity}
            </td>
            <td className="px-3 py-2" />
            <td className="px-3 py-2 text-right font-mono font-medium">
              ¥{totalAmount.toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>
      <SignatureRow labels={['经办人', '仓管员', '财务']} />
    </div>
  );
}

function OutboundContent({ data }: { data: OutboundDocData }) {
  const totalAmount = Number(data.totalAmount) || 0;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-x-8 gap-y-2">
        <InfoRow label="出库单号" value={data.orderNo || '-'} />
        <InfoRow label="出库日期" value={formatDate(data.transactionDate)} />
        <InfoRow label="客户/领用人" value={data.supplier || '-'} />
        <InfoRow label="仓库" value={data.warehouse} />
        <InfoRow label="出库类型" value={data.subType || '-'} />
        <InfoRow label="操作人" value={data.operator} />
      </div>
      <div>
        <InfoRow label="备注" value={data.remark || ''} />
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border border-border">
            <th className="px-3 py-2 text-left font-medium">商品编码</th>
            <th className="px-3 py-2 text-left font-medium">商品名称</th>
            <th className="px-3 py-2 text-left font-medium">规格</th>
            <th className="px-3 py-2 text-left font-medium">单位</th>
            <th className="px-3 py-2 text-right font-medium">数量</th>
            <th className="px-3 py-2 text-right font-medium">单价</th>
            <th className="px-3 py-2 text-right font-medium">金额</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border border-border">
            <td className="px-3 py-2">{data.productCode || '-'}</td>
            <td className="px-3 py-2">{data.productName}</td>
            <td className="px-3 py-2">{data.spec || '-'}</td>
            <td className="px-3 py-2">{data.unit || '-'}</td>
            <td className="px-3 py-2 text-right font-mono">{data.quantity}</td>
            <td className="px-3 py-2 text-right font-mono">
              ¥{Number(data.unitPrice).toFixed(2)}
            </td>
            <td className="px-3 py-2 text-right font-mono">
              ¥{totalAmount.toFixed(2)}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr className="border border-border bg-muted/30">
            <td className="px-3 py-2 font-medium" colSpan={4}>合计</td>
            <td className="px-3 py-2 text-right font-mono font-medium">
              {data.quantity}
            </td>
            <td className="px-3 py-2" />
            <td className="px-3 py-2 text-right font-mono font-medium">
              ¥{totalAmount.toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>
      <SignatureRow labels={['领用人', '仓管员', '经办人']} />
    </div>
  );
}

function TransferContent({ data }: { data: TransferDocData }) {
  const unitPrice = data.unitPrice ?? 0;
  const totalAmount = data.quantity * unitPrice;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-x-8 gap-y-2">
        <InfoRow label="调拨单号" value={data.transferNo || '-'} />
        <InfoRow label="调拨日期" value={formatDate(data.transferDate)} />
        <InfoRow label="源仓库" value={data.sourceWarehouse} />
        <InfoRow label="目标仓库" value={data.targetWarehouse} />
        <InfoRow label="操作人" value={'-'} />
      </div>
      <div>
        <InfoRow label="备注" value={data.remark || ''} />
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border border-border">
            <th className="px-3 py-2 text-left font-medium">商品编码</th>
            <th className="px-3 py-2 text-left font-medium">商品名称</th>
            <th className="px-3 py-2 text-left font-medium">规格</th>
            <th className="px-3 py-2 text-left font-medium">单位</th>
            <th className="px-3 py-2 text-right font-medium">数量</th>
            <th className="px-3 py-2 text-right font-medium">单价</th>
            <th className="px-3 py-2 text-right font-medium">金额</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border border-border">
            <td className="px-3 py-2">{data.productCode || '-'}</td>
            <td className="px-3 py-2">{data.productName}</td>
            <td className="px-3 py-2">{data.spec || '-'}</td>
            <td className="px-3 py-2">{data.unit || '-'}</td>
            <td className="px-3 py-2 text-right font-mono">{data.quantity}</td>
            <td className="px-3 py-2 text-right font-mono">
              ¥{unitPrice.toFixed(2)}
            </td>
            <td className="px-3 py-2 text-right font-mono">
              ¥{totalAmount.toFixed(2)}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr className="border border-border bg-muted/30">
            <td className="px-3 py-2 font-medium" colSpan={4}>合计</td>
            <td className="px-3 py-2 text-right font-mono font-medium">
              {data.quantity}
            </td>
            <td className="px-3 py-2" />
            <td className="px-3 py-2 text-right font-mono font-medium">
              ¥{totalAmount.toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>
      <SignatureRow labels={['调出仓管员', '调入仓管员', '经办人']} />
    </div>
  );
}

function InventoryCheckContent({ data }: { data: InventoryCheckDocData }) {
  const totalSystem = data.items.reduce(
    (sum: number, item: InventoryCheckItem) => sum + item.systemQuantity,
    0,
  );
  const totalActual = data.items.reduce(
    (sum: number, item: InventoryCheckItem) => sum + (item.actualQuantity || 0),
    0,
  );
  const totalDiff = data.items.reduce(
    (sum: number, item: InventoryCheckItem) => sum + (item.difference || 0),
    0,
  );
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-x-8 gap-y-2">
        <InfoRow label="盘点单号" value={data.id} />
        <InfoRow label="盘点日期" value={formatDate(data.checkDate)} />
        <InfoRow label="仓库" value={data.warehouse} />
        <InfoRow label="状态" value={data.status} />
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border border-border">
            <th className="px-3 py-2 text-left font-medium">商品编码</th>
            <th className="px-3 py-2 text-left font-medium">商品名称</th>
            <th className="px-3 py-2 text-left font-medium">规格</th>
            <th className="px-3 py-2 text-left font-medium">单位</th>
            <th className="px-3 py-2 text-right font-medium">账面数量</th>
            <th className="px-3 py-2 text-right font-medium">实盘数量</th>
            <th className="px-3 py-2 text-right font-medium">差异</th>
            <th className="px-3 py-2 text-left font-medium">备注</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item: InventoryCheckItem) => (
            <tr key={item.id} className="border border-border">
              <td className="px-3 py-2">{item.productCode || '-'}</td>
              <td className="px-3 py-2">{item.productName}</td>
              <td className="px-3 py-2">-</td>
              <td className="px-3 py-2">-</td>
              <td className="px-3 py-2 text-right font-mono">
                {item.systemQuantity}
              </td>
              <td className="px-3 py-2 text-right font-mono">
                {item.actualQuantity || 0}
              </td>
              <td className="px-3 py-2 text-right font-mono">
                {item.difference || 0}
              </td>
              <td className="px-3 py-2">{item.remark || '-'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border border-border bg-muted/30">
            <td className="px-3 py-2 font-medium" colSpan={4}>合计</td>
            <td className="px-3 py-2 text-right font-mono font-medium">
              {totalSystem}
            </td>
            <td className="px-3 py-2 text-right font-mono font-medium">
              {totalActual}
            </td>
            <td className="px-3 py-2 text-right font-mono font-medium">
              {totalDiff}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
      <SignatureRow labels={['盘点人', '复核人', '财务']} />
    </div>
  );
}

export function DocumentPrinter({
  type,
  data,
  open,
  onOpenChange,
}: DocumentPrinterProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    // Fallback: use browser print → Save as PDF
    window.print();
  };

  const renderContent = () => {
    if (!data) return null;
    switch (type) {
      case 'inbound':
        return <InboundContent data={data as InboundDocData} />;
      case 'outbound':
        return <OutboundContent data={data as OutboundDocData} />;
      case 'transfer':
        return <TransferContent data={data as TransferDocData} />;
      case 'inventory-check':
        return <InventoryCheckContent data={data as InventoryCheckDocData} />;
      default:
        return null;
    }
  };

  const title = TITLE_MAP[type];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-sm"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="size-4 text-primary" />
            {title}预览
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef} id="document-print-area" className="py-2">
          <style>{`
            @media print {
              body * {
                visibility: hidden;
              }
              #document-print-area,
              #document-print-area * {
                visibility: visible;
              }
              #document-print-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                padding: 20mm;
                background: #ffffff;
                color: #000000;
              }
              #document-print-area .no-print {
                display: none !important;
              }
              #document-print-area table {
                border-color: #000000 !important;
              }
              #document-print-area th,
              #document-print-area td {
                border-color: #000000 !important;
                color: #000000 !important;
              }
              #document-print-area .text-muted-foreground {
                color: #333333 !important;
              }
              #document-print-area .bg-muted\\/30 {
                background-color: #f0f0f0 !important;
              }
              @page {
                size: A4;
                margin: 15mm;
              }
            }
          `}</style>

          <div className="bg-white p-6 border border-border rounded-sm">
            {/* 公司抬头 */}
            <div className="text-center pb-4 border-b border-border mb-6 no-print">
              <div className="text-lg font-semibold text-primary">
                {COMPANY_NAME}
              </div>
            </div>
            <div className="text-center pb-4 border-b border-dashed border-border mb-6 print:border-black">
              <h2 className="text-xl font-bold tracking-widest">{title}</h2>
            </div>

            {renderContent()}
          </div>
        </div>

        <DialogFooter className="no-print gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
          <Button variant="outline" onClick={handleDownloadPdf}>
            <FileDown className="size-4" />
            下载 PDF
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="size-4" />
            打印
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
