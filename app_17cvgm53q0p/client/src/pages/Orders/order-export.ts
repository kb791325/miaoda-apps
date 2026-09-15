import dayjs from 'dayjs';

import type { Order, OrderListParams } from '@shared/order';
import type { OrdersFilters } from './order-utils';
import { fetchOrders } from '@client/src/api/order';
import { exportToExcel } from '@client/src/utils/export-excel';
import { ORDER_STATUS_OPTIONS } from '@shared/order';

const EXPORT_PAGE_SIZE = 500;

/** 按当前筛选条件循环拉取全量订单（pageSize=500 逐页累加直到拿满 total） */
export async function fetchAllOrdersForExport(
  filters: OrdersFilters,
): Promise<Order[]> {
  const params: OrderListParams = buildExportParams(filters);
  const all: Order[] = [];
  let pageNum = 1;
  for (;;) {
    const res = await fetchOrders({ ...params, page: pageNum, pageSize: EXPORT_PAGE_SIZE });
    all.push(...res.items);
    if (res.items.length === 0 || all.length >= res.total) break;
    pageNum += 1;
  }
  return all;
}

const buildExportParams = (filters: OrdersFilters): OrderListParams => {
  const params: OrderListParams = {};
  if (filters.keyword) params.keyword = filters.keyword;
  const status = ORDER_STATUS_OPTIONS.find((option) => option === filters.status);
  if (status) params.status = status;
  if (filters.customerId) params.customerId = filters.customerId;
  if (filters.dateStart) params.dateStart = filters.dateStart;
  if (filters.dateEnd) params.dateEnd = filters.dateEnd;
  return params;
};

/** 导出订单列表 Excel：订单号/商品/数量/金额/客户/状态/下单时间/收货地址/备注 */
export function exportOrdersFile(orders: Order[]): void {
  exportToExcel(`订单列表_${dayjs().format('YYYY-MM-DD')}`, '订单', [
    { header: '订单号', value: (row: Order) => row.orderNo || '-', width: 18 },
    { header: '商品', value: (row: Order) => row.productName || '-', width: 18 },
    { header: '数量', value: (row: Order) => row.quantity ?? 0, width: 8 },
    { header: '金额', value: (row: Order) => row.amount ?? 0, width: 12 },
    { header: '客户', value: (row: Order) => row.customerName || '-', width: 14 },
    { header: '状态', value: (row: Order) => row.status || '-', width: 10 },
    { header: '下单时间', value: (row: Order) => row.orderTime || '-', width: 18 },
    {
      header: '收货地址',
      value: (row: Order) => (row as { address?: string }).address ?? '-',
      width: 24,
    },
    { header: '备注', value: (row: Order) => row.remark || '-', width: 24 },
  ], orders);
}
