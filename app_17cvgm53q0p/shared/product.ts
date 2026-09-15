export interface Product {
  id: string;
  /** SKU编码 */
  productNo: string;
  productName: string;
  /** 销售单价 */
  price: number;
  /** 总库存数量 */
  stock: number;
  /** 安全库存预警值 */
  warningThreshold: number;
  /** 品牌 */
  brand?: string;
  /** 规格型号 */
  specModel?: string;
  /** 仓库位置 */
  warehouse?: string;
  /** 库存预警（stock < warningThreshold，服务端计算） */
  isWarning?: boolean;
  /** 成本价（应用数据库 product_profile） */
  costPrice: number;
  /** 库存金额 = 当前库存 × 成本价（服务端计算） */
  stockValue: number;
  /** 累计销量（销售出库流水聚合） */
  cumulativeSales: number;
  /** 商品图片 URL（应用库 product_profile.image_url） */
  imageUrl?: string;
}

export interface ProductListParams {
  keyword?: string;
  warningOnly?: boolean;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
}

/** 新增商品请求（SKU 自动生成；预警值默认 10） */
export interface CreateProductRequest {
  productName: string;
  price: number;
  initialStock: number;
  warningThreshold?: number;
  /** 图片识别出的品牌（可选） */
  brand?: string;
  /** 图片识别出的规格型号（可选） */
  specModel?: string;
  /** 上传的商品图片 URL（可选） */
  imageUrl?: string;
  /** 成本价（可选，默认 0） */
  costPrice?: number;
}

/** 新增商品响应 */
export interface CreateProductResponse {
  id: string;
  /** 自动生成的 SKU 编码 */
  productNo: string;
}

export interface UpdateProductRequest {
  productName?: string;
  price?: number;
  warningThreshold?: number;
  /** 成本价（可选，提供时更新商品成本档案） */
  costPrice?: number;
}

export interface ProductMutationResponse {
  success: boolean;
}

/** in=入库；otherOut=其他出库（样品/损耗/内部领用）；out 为旧值兼容，等同 otherOut */
export type StockChangeType = 'in' | 'otherOut' | 'out';

export interface StockChangeRequest {
  changeType: StockChangeType;
  quantity: number;
  /** 业务类型：入库时必填（采购入库/退货入库），出库固定其他出库 */
  businessType?: string;
  remark?: string;
}

export interface StockChangeResponse {
  success: boolean;
  /** 变动后库存 */
  currentStock: number;
  /** 变动前库存 */
  stockBefore: number;
}

/** 流水变动类型（与多维表格「变动类型」单选一致；订单相关类型为运行时自动新增选项） */
export type StockChangeKind =
  | '入库'
  | '出库'
  | '其他出库'
  | '订单出库'
  | '订单恢复';

export interface StockChangeRecord {
  id: string;
  productId: string;
  productName: string;
  changeType: string;
  quantity: number;
  changeTime: string;
  /** 关联订单号（订单触发的流水，从备注中解析） */
  orderNo?: string;
  remark?: string;
}

export interface StockChangeListParams {
  productId?: string;
  /** 按关联订单号过滤（匹配流水备注） */
  orderNo?: string;
  pageSize?: number;
}

export interface StockChangeListResponse {
  items: StockChangeRecord[];
  total: number;
}

/** 商品盘点请求（实盘数量必须为非负整数） */
export interface StocktakeRequest {
  actualQuantity: number;
  remark?: string;
}

/** 商品盘点响应（adjusted 为调整差值，正=盘盈 负=盘亏） */
export interface StocktakeResponse {
  adjusted: number;
  stockAfter: number;
}
