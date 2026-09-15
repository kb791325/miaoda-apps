import { useState } from 'react';
import { RecordsTransactions } from './RecordsTransactions';
import { RecordsTransfers } from './RecordsTransfers';
import { RecordsArchivedProducts } from './RecordsArchivedProducts';
import { RecordsInventoryCheck } from './RecordsInventoryCheck';

type RecordsTab = 'transactions' | 'transfers' | 'inventory_check' | 'archived';

const TABS: { key: RecordsTab; label: string }[] = [
  { key: 'transactions', label: '出入库流水' },
  { key: 'transfers', label: '调拨记录' },
  { key: 'inventory_check', label: '库存盘点' },
  { key: 'archived', label: '归档商品' },
];

export default function RecordsPage() {
  const [tab, setTab] = useState<RecordsTab>('transactions');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-5 w-1 rounded-sm bg-primary" />
        <div>
          <h1 className="text-lg font-semibold tracking-tight">记录管理</h1>
          <p className="text-sm text-muted-foreground">出入库流水、调拨、盘点与归档记录查询</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? 'text-primary border-primary'
                : 'text-muted-foreground border-transparent hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'transactions' && <RecordsTransactions />}
      {tab === 'transfers' && <RecordsTransfers />}
      {tab === 'inventory_check' && <RecordsInventoryCheck />}
      {tab === 'archived' && <RecordsArchivedProducts />}
    </div>
  );
}
