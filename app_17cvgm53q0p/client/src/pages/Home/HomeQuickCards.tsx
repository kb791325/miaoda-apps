import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  ClipboardList,
  FileSpreadsheet,
  Package,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
} from 'lucide-react';

/** 单个快捷入口配置 */
interface QuickCardConfig {
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  path: string;
  permission: string;
}

/** 各角色快捷卡片配置（按 roleCode） */
const QUICK_CARDS: Record<string, QuickCardConfig[]> = {
  admin: [
    { label: '新建订单', Icon: ShoppingCart, path: '/orders?new=1', permission: 'order:create' },
    { label: '配送安装', Icon: Truck, path: '/shipments', permission: 'shipment:view' },
    { label: '商品库存', Icon: Package, path: '/inventory', permission: 'product:view' },
    { label: '财务报表', Icon: Wallet, path: '/finance', permission: 'report:finance' },
  ],
  sales: [
    { label: '新建订单', Icon: ShoppingCart, path: '/orders?new=1', permission: 'order:create' },
    { label: '我的客户', Icon: Users, path: '/customers', permission: 'customer:view' },
    { label: '跟进记录', Icon: ClipboardList, path: '/follow-ups', permission: 'followup:view' },
  ],
  warehouse: [
    { label: '待出库列表', Icon: Truck, path: '/shipments', permission: 'shipment:view' },
    { label: '商品库存', Icon: Package, path: '/inventory', permission: 'product:view' },
  ],
  installer: [
    { label: '配送安装', Icon: Truck, path: '/shipments', permission: 'shipment:view' },
  ],
  finance: [
    { label: '财务仪表盘', Icon: Wallet, path: '/finance', permission: 'report:finance' },
    { label: '利润报表', Icon: FileSpreadsheet, path: '/profit-report', permission: 'report:finance' },
  ],
  inventory: [
    { label: '库存管理', Icon: Package, path: '/inventory', permission: 'product:view' },
    { label: '库存流水', Icon: ArrowLeftRight, path: '/stock-flows', permission: 'stockflow:view' },
  ],
};

interface HomeQuickCardsProps {
  roleCode: string;
  hasPerm: (code: string) => boolean;
}

/** 快捷操作卡片区：按角色配置 + 权限过滤，过滤后为空不渲染 */
const HomeQuickCards: React.FC<HomeQuickCardsProps> = ({
  roleCode,
  hasPerm,
}) => {
  const navigate = useNavigate();

  const cards: QuickCardConfig[] = (QUICK_CARDS[roleCode] ?? []).filter(
    (card: QuickCardConfig) => hasPerm(card.permission),
  );

  if (cards.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">快捷操作</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card: QuickCardConfig) => {
          const Icon = card.Icon;
          return (
            <button
              key={`${card.label}-${card.path}`}
              type="button"
              onClick={() => navigate(card.path)}
              className="relative flex min-h-[120px] min-w-[200px] flex-col justify-center gap-2 overflow-hidden rounded-lg bg-card p-5 text-left shadow-sm ring-1 ring-border transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary to-primary/30"
              />
              <Icon className="size-12 text-primary" />
              <span className="text-lg font-semibold text-foreground">
                {card.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default HomeQuickCards;
