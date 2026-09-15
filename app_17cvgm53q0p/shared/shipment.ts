import type { Order } from './order';

/** 配送安装状态：待出库 → 运输中 → 在安装 → 已完成 */
export type ShipmentStatus = '待出库' | '运输中' | '在安装' | '已完成';

export const SHIPMENT_STATUS_OPTIONS: ShipmentStatus[] = [
  '待出库',
  '运输中',
  '在安装',
  '已完成',
];

/** 库存扣减状态：未扣减 / 已扣减（已出库）/ 已回退（取消配送） */
export type ShipmentStockStatus = 'none' | 'deducted' | 'restored';

export interface ShipmentItem {
  id: string;
  /** 关联订单明细（订单记录 id） */
  orderId: string;
  requiredProductId: string;
  requiredProductName: string;
  /** 订单要求型号（订单商品 SKU 编码） */
  requiredModel: string;
  requiredQuantity: number;
  actualProductId: string;
  actualProductName: string;
  /** 实际配送型号 */
  actualModel: string;
  shipQuantity: number;
  /** 型号是否一致（服务端自动比对） */
  modelMatch: boolean;
}

export interface Shipment {
  id: string;
  shipNo: string;
  orderId: string;
  orderNo: string;
  customerName: string;
  shipStatus: ShipmentStatus;
  /** 安装地址（默认取关联客户地址，可手动修改） */
  installAddress: string;
  /** 安装联系人（默认取客户姓名） */
  installContact: string;
  /** 安装联系电话（默认取客户电话） */
  installPhone: string;
  /** 预约安装时间 */
  appointmentTime?: string;
  installerId: string;
  installerName: string;
  /** 出库时间（确认出库自动记录） */
  outboundTime?: string;
  /** 发货人员（确认出库时自动记录当前登录人） */
  shipperId: string;
  shipperName: string;
  /** 货车/司机（选填） */
  truckDriver: string;
  /** 开始安装时间（自动记录） */
  installStartTime?: string;
  /** 安装完成时间（自动记录） */
  installCompleteTime?: string;
  /** 安装费用（选填） */
  installFee?: number;
  /** 安装备注（选填） */
  installRemark: string;
  /** 验收照片 URL 列表（选填，多张） */
  acceptancePhotos: string[];
  hasModelDiff: boolean;
  stockStatus: ShipmentStockStatus;
  remark: string;
  createdAt: string;
}

export interface ShipmentListItem extends Shipment {
  /** 配送明细行数 */
  itemCount: number;
  /** 型号一致的明细行数 */
  matchedCount: number;
}

export interface ShipmentListParams {
  /** 关键词：模糊匹配配送单号/客户名称/订单号 */
  keyword?: string;
  status?: ShipmentStatus;
  page?: number;
  pageSize?: number;
}

export interface ShipmentListResponse {
  items: ShipmentListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ShipmentDetail {
  shipment: Shipment;
  items: ShipmentItem[];
  /** 关联订单快照（多维表格实时读取） */
  order?: Order;
}

export interface UpdateShipmentStatusRequest {
  targetStatus: ShipmentStatus;
  /** 确认出库时可填货车/司机 */
  truckDriver?: string;
  /** 开始安装/确认完成时可指定安装人员 */
  installerId?: string;
  /** 确认安装完成时可填 */
  installFee?: number;
  /** 确认安装完成时可填 */
  installRemark?: string;
  /** 确认安装完成时可上传验收照片（download_url 列表） */
  acceptancePhotos?: string[];
}

export interface UpdateShipmentInfoRequest {
  installAddress?: string;
  installContact?: string;
  installPhone?: string;
  /** 传 null 清空预约时间 */
  appointmentTime?: string | null;
  /** 传 null 清空安装人员 */
  installerId?: string | null;
  truckDriver?: string;
}

export interface ShipmentMutationResponse {
  success: boolean;
}
