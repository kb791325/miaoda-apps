import { useCallback, useEffect, useState, type FC } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@client/src/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { UserDisplay } from '@/components/business-ui/user-display';
import type {
  Customer,
  CustomerProfile,
  CustomerRecentOrder,
  CustomerTopProduct,
} from '@shared/customer';
import type { FollowUpRecord } from '@shared/follow-up';
import { fetchCustomerProfile } from '@/api/customer';
import {
  extractErrorMessage,
  formatAmount,
  formatDate,
  formatDateTime,
} from './customer-utils';
import CustomerCreditSection from './CustomerCreditSection';
import CustomerLevelBadge from './CustomerLevelBadge';
import SalesStageBadge from './SalesStageBadge';
import FollowUpFormDialog from '../FollowUps/FollowUpFormDialog';

const STATUS_STYLES: Record<string, string> = {
  待出库: 'border-orange-400/60 bg-orange-50 text-orange-700',
  运输中: 'border-blue-400/60 bg-blue-50 text-blue-700',
  在安装: 'border-indigo-400/60 bg-indigo-50 text-indigo-700',
  已完成: 'border-emerald-400/60 bg-emerald-50 text-emerald-700',
  已取消: 'border-slate-300 bg-slate-100 text-slate-500',
};

const StatusPill: FC<{ status: string }> = ({ status }) => (
  <span
    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
      STATUS_STYLES[status] ?? STATUS_STYLES['已取消']
    }`}
  >
    {status}
  </span>
);

interface StatCellProps {
  label: string;
  value: string;
}

const StatCell: FC<StatCellProps> = ({ label, value }) => (
  <div className="rounded-lg bg-accent/60 px-4 py-3">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="mt-1 truncate text-lg font-bold tabular-nums text-primary">
      {value}
    </div>
  </div>
);

const ProfileSkeleton: FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_: unknown, i: number) => (
        <Skeleton key={i} className="h-16 rounded-lg" />
      ))}
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_: unknown, i: number) => (
          <Skeleton key={i} className="h-6 w-20 rounded-full" />
        ))}
      </div>
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-20" />
      {Array.from({ length: 3 }).map((_: unknown, i: number) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  </div>
);

interface InfoItemProps {
  label: string;
  children: React.ReactNode;
}

const InfoItem: FC<InfoItemProps> = ({ label, children }) => (
  <div className="space-y-1">
    <p className="text-xs text-muted-foreground">{label}</p>
    <div className="text-sm text-foreground">{children}</div>
  </div>
);

const FollowUpItem: FC<{ record: FollowUpRecord }> = ({ record }) => (
  <div className="rounded-lg border p-3">
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs text-accent-foreground">
        {record.method}
      </span>
      {record.intent && (
        <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs">
          意向：{record.intent}
        </span>
      )}
      {record.stageChange && (
        <span className="text-xs font-medium text-primary">
          阶段变更为「{record.stageChange}」
        </span>
      )}
      <span className="ml-auto tabular-nums text-xs text-muted-foreground">
        {formatDateTime(record.followUpAt)}
      </span>
    </div>
    <p className="mt-2 text-sm text-foreground">{record.content}</p>
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {record.followerName ? (
        <span>跟进人：{record.followerName}</span>
      ) : record.followerId ? (
        <UserDisplay value={[record.followerId]} size="small" />
      ) : null}
      {record.demandProduct && <span>需求产品：{record.demandProduct}</span>}
      {record.budget !== null && (
        <span className="tabular-nums">预算：{formatAmount(record.budget)}</span>
      )}
      {record.nextFollowUpAt && (
        <span className="tabular-nums">
          下次跟进：{formatDate(record.nextFollowUpAt)}
        </span>
      )}
    </div>
  </div>
);

interface CustomerProfileDialogProps {
  open: boolean;
  customer: Customer | null;
  onClose: () => void;
  onChanged?: () => void;
}

const CustomerProfileDialog: FC<CustomerProfileDialogProps> = ({
  open,
  customer,
  onClose,
  onChanged,
}) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);

  const loadProfile = useCallback((): (() => void) => {
    if (!customer) return () => {};
    let cancelled = false;
    setLoading(true);
    fetchCustomerProfile(customer.id)
      .then((data: CustomerProfile) => {
        if (!cancelled) setProfile(data);
      })
      .catch((error: unknown) => {
        if (!cancelled) toast.error(extractErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [customer]);

  useEffect(() => {
    if (!open) return;
    setProfile(null);
    return loadProfile();
  }, [open, loadProfile]);

  if (!customer) return null;

  const handleViewOrders = (): void => {
    onClose();
    navigate(`/orders?customerId=${encodeURIComponent(customer.id)}`);
  };

  const crm = profile?.crm;

  return (
    <Sheet
      open={open}
      onOpenChange={(next: boolean) => {
        if (!next) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="w-[560px] gap-0 p-0 sm:max-w-[560px]"
      >
        <SheetHeader className="border-b p-6">
          <SheetTitle className="flex items-center gap-2 text-lg">
            {customer.customerName}
            <CustomerLevelBadge
              level={customer.crm.grade || customer.customerLevel}
            />
            <SalesStageBadge stage={customer.crm.salesStage} />
          </SheetTitle>
          <SheetDescription className="tabular-nums">
            {customer.phone || '-'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <ProfileSkeleton />
          ) : !profile ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              暂无画像数据
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <StatCell
                  label="累计消费"
                  value={formatAmount(profile.totalAmount)}
                />
                <StatCell label="订单数" value={String(profile.orderCount)} />
                <StatCell
                  label="平均客单价"
                  value={formatAmount(profile.avgOrderAmount)}
                />
                <StatCell
                  label="最近下单时间"
                  value={
                    profile.lastOrderTime
                      ? formatDateTime(profile.lastOrderTime)
                      : '-'
                  }
                />
              </div>

              <CustomerCreditSection customerId={customer.id} />

              <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border p-4">
                <InfoItem label="联系电话">{profile.phone || '-'}</InfoItem>
                <InfoItem label="客户来源">{crm?.source || '-'}</InfoItem>
                <div className="col-span-2">
                  <InfoItem label="收货地址">{profile.address || '-'}</InfoItem>
                </div>
                <InfoItem label="负责销售">
                  {crm?.ownerName ? (
                    <span className="text-foreground">{crm.ownerName}</span>
                  ) : crm?.ownerId ? (
                    <UserDisplay value={[crm.ownerId]} size="small" />
                  ) : (
                    '-'
                  )}
                </InfoItem>
                <InfoItem label="首次接触">
                  {formatDate(crm?.firstContactAt)}
                </InfoItem>
                <InfoItem label="预计成交">
                  {formatDate(crm?.expectedDealAt)}
                </InfoItem>
                <InfoItem label="最近跟进">
                  {formatDate(crm?.lastFollowUpAt)}
                </InfoItem>
                <InfoItem label="下次跟进">
                  {formatDate(crm?.nextFollowUpAt)}
                </InfoItem>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">
                    跟进记录（{profile.followUps.length}）
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFollowUpOpen(true)}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    新增跟进
                  </Button>
                </div>
                {profile.followUps.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    暂无跟进记录
                  </div>
                ) : (
                  <div className="space-y-2">
                    {profile.followUps.map((record: FollowUpRecord) => (
                      <FollowUpItem key={record.id} record={record} />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="mb-3 text-sm font-semibold text-foreground">
                  常购商品
                </h4>
                {profile.topProducts.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    暂无购买记录
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {profile.topProducts.map(
                      (product: CustomerTopProduct) => (
                        <span
                          key={product.productName}
                          className="inline-flex items-center rounded-full bg-accent px-2.5 py-0.5 text-xs text-accent-foreground"
                        >
                          {product.productName}
                          <span className="ml-1 tabular-nums text-muted-foreground">
                            ×{product.quantity}
                          </span>
                        </span>
                      ),
                    )}
                  </div>
                )}
              </div>

              <div>
                <h4 className="mb-3 text-sm font-semibold text-foreground">
                  历史订单
                </h4>
                {profile.orders.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    暂无订单
                  </div>
                ) : (
                  <div className="divide-y rounded-lg border">
                    {profile.orders.map((order: CustomerRecentOrder) => (
                      <div
                        key={order.id}
                        className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm"
                      >
                        <span className="font-medium tabular-nums text-foreground">
                          {order.orderNo}
                        </span>
                        <StatusPill status={order.status} />
                        <span className="w-full text-muted-foreground">
                          {order.productName || '-'}
                          <span className="ml-2 tabular-nums">
                            ×{order.quantity}
                          </span>
                        </span>
                        <span className="ml-auto font-semibold tabular-nums text-primary">
                          {formatAmount(order.amount)}
                        </span>
                        <span className="w-full text-xs tabular-nums text-muted-foreground">
                          {formatDateTime(order.orderTime)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button className="w-full" onClick={handleViewOrders}>
                查看他的订单
              </Button>
            </div>
          )}
        </div>
      </SheetContent>

      <FollowUpFormDialog
        open={followUpOpen}
        presetCustomerId={customer.id}
        presetCustomerName={customer.customerName}
        onClose={() => setFollowUpOpen(false)}
        onSuccess={() => {
          loadProfile();
          onChanged?.();
        }}
      />
    </Sheet>
  );
};

export default CustomerProfileDialog;
