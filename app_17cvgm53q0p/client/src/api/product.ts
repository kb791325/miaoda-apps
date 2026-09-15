import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  CreateProductRequest,
  CreateProductResponse,
  Product,
  ProductListResponse,
  ProductMutationResponse,
  StockChangeListResponse,
  StockChangeRequest,
  StockChangeResponse,
  StocktakeRequest,
  StocktakeResponse,
  UpdateProductRequest,
} from '@shared/product';
import type {
  InventoryFlowListParams,
  InventoryFlowListResponse,
  UpdateProductProfileRequest,
} from '@shared/inventory-flow';

export interface FetchProductsParams {
  keyword?: string;
  warningOnly?: boolean;
}

/** 商品列表查询（跨模块共享只读函数，订单表单/仪表盘等复用） */
export async function fetchProducts(
  params: FetchProductsParams = {},
): Promise<ProductListResponse> {
  const res = await axiosForBackend.get<ProductListResponse>('/api/products', {
    params,
  });
  return res.data;
}

/** 新增商品（初始库存大于 0 时自动记入库流水） */
export async function createProduct(
  body: CreateProductRequest,
): Promise<CreateProductResponse> {
  const res = await axiosForBackend.post<CreateProductResponse>(
    '/api/products',
    body,
  );
  return res.data;
}

/** 删除商品 */
export async function deleteProduct(
  id: string,
): Promise<ProductMutationResponse> {
  const res = await axiosForBackend.delete<ProductMutationResponse>(
    `/api/products/${id}`,
  );
  return res.data;
}

/** 更新商品信息与预警阈值（只传需更新字段） */
export async function updateProduct(
  id: string,
  body: UpdateProductRequest,
): Promise<ProductMutationResponse> {
  const res = await axiosForBackend.put<ProductMutationResponse>(
    `/api/products/${id}`,
    body,
  );
  return res.data;
}

/** 入库/出库登记，返回变更后最新库存 */
export async function createStockChange(
  id: string,
  body: StockChangeRequest,
): Promise<StockChangeResponse> {
  const res = await axiosForBackend.post<StockChangeResponse>(
    `/api/products/${id}/stock-changes`,
    body,
  );
  return res.data;
}

/** 库存盘点：提交实盘数量，返回调整差值与调整后库存 */
export async function stocktakeProduct(
  id: string,
  body: StocktakeRequest,
): Promise<StocktakeResponse> {
  const res = await axiosForBackend.post<StocktakeResponse>(
    `/api/products/${id}/stocktake`,
    body,
  );
  return res.data;
}

export interface FetchStockChangesParams {
  productId?: string;
  pageSize?: number;
}

/** 库存变动流水查询（按变动时间倒序） */
export async function fetchStockChanges(
  params: FetchStockChangesParams = {},
): Promise<StockChangeListResponse> {
  const res = await axiosForBackend.get<StockChangeListResponse>(
    '/api/stock-changes',
    { params },
  );
  return res.data;
}

/** 库存流水台账列表（按操作时间倒序，可按商品/业务类型/日期范围过滤） */
export async function listInventoryFlows(
  params: InventoryFlowListParams,
): Promise<InventoryFlowListResponse> {
  const res = await axiosForBackend.get<InventoryFlowListResponse>(
    '/api/stock-flows',
    { params },
  );
  return res.data;
}

/** 更新商品成本价档案 */
export async function updateProductProfile(
  productId: string,
  dto: UpdateProductProfileRequest,
): Promise<ProductMutationResponse> {
  const res = await axiosForBackend.patch<ProductMutationResponse>(
    `/api/products/${productId}/profile`,
    dto,
  );
  return res.data;
}

export type { Product };
