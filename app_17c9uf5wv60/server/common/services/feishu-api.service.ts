import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

const FEISHU_OPEN_API_BASE = 'https://open.feishu.cn/open-apis';
const TOKEN_CACHE_TTL_MS = 1.5 * 60 * 60 * 1000;

interface TenantTokenCache {
  token: string;
  expiresAt: number;
}

interface FeishuApiError {
  code: number;
  msg: string;
}

interface ListRecordsParams {
  pageSize?: number;
  pageToken?: string;
  filter?: Record<string, unknown>;
  sort?: Array<{ field_name: string; desc: boolean }>;
  viewId?: string;
}

interface FeishuRecordResponse {
  record_id: string;
  fields: Record<string, unknown>;
  created_time?: number;
  last_modified_time?: number;
}

interface ListRecordsResponse {
  has_more: boolean;
  page_token?: string;
  total?: number;
  items: FeishuRecordResponse[];
}

interface FieldInfo {
  field_id: string;
  field_name: string;
  type: number;
  ui_type?: string;
  description?: string;
  property?: Record<string, unknown>;
}

interface ListFieldsResponse {
  has_more: boolean;
  page_token?: string;
  total: number;
  items: FieldInfo[];
}

@Injectable()
export class FeishuApiService {
  private readonly logger = new Logger(FeishuApiService.name);
  private tokenCache = new Map<string, TenantTokenCache>();

  constructor(private readonly httpService: HttpService) {}

  async getTenantAccessToken(
    appId: string,
    appSecret: string,
  ): Promise<string> {
    const cacheKey = appId;
    const cached = this.tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.token;
    }

    try {
      const resp = await firstValueFrom(
        this.httpService.post(
          `${FEISHU_OPEN_API_BASE}/auth/v3/tenant_access_token/internal`,
          { app_id: appId, app_secret: appSecret },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000,
          },
        ),
      );

      const data = resp.data as { code: number; msg: string; tenant_access_token: string; expire: number };
      if (data.code !== 0) {
        throw new BadRequestException(
          `飞书获取 tenant_access_token 失败: ${data.code} - ${data.msg}`,
        );
      }

      const token = data.tenant_access_token;
      this.tokenCache.set(cacheKey, {
        token,
        expiresAt: Date.now() + TOKEN_CACHE_TTL_MS,
      });
      return token;
    } catch (error: unknown) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`获取 tenant_access_token 失败: ${String(error)}`);
      throw new BadRequestException(`获取飞书访问凭证失败: ${this.extractErrMsg(error)}`);
    }
  }

  clearTokenCache(appId: string): void {
    this.tokenCache.delete(appId);
  }

  async listRecords(
    appToken: string,
    tableId: string,
    params: ListRecordsParams,
    appId: string,
    appSecret: string,
  ): Promise<ListRecordsResponse> {
    const query: Record<string, string> = {};
    if (params.pageSize) query.page_size = String(params.pageSize);
    if (params.pageToken) query.page_token = params.pageToken;
    if (params.viewId) query.view_id = params.viewId;

    const body: Record<string, unknown> = {};
    if (params.filter) body.filter = params.filter;
    if (params.sort) body.sort = params.sort;

    const path = `/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/records/search`;
    const data = await this.request<{ data: ListRecordsResponse }>(
      'POST',
      path,
      body,
      appId,
      appSecret,
      query,
    );
    return data.data;
  }

  async getRecord(
    appToken: string,
    tableId: string,
    recordId: string,
    appId: string,
    appSecret: string,
  ): Promise<FeishuRecordResponse> {
    const path = `/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/records/${encodeURIComponent(recordId)}`;
    const data = await this.request<{ data: FeishuRecordResponse }>(
      'GET',
      path,
      undefined,
      appId,
      appSecret,
    );
    return data.data;
  }

  async createRecord(
    appToken: string,
    tableId: string,
    fields: Record<string, unknown>,
    appId: string,
    appSecret: string,
  ): Promise<FeishuRecordResponse> {
    const path = `/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/records`;
    const data = await this.request<{ data: FeishuRecordResponse }>(
      'POST',
      path,
      { fields },
      appId,
      appSecret,
    );
    return data.data;
  }

  async batchCreateRecords(
    appToken: string,
    tableId: string,
    records: Array<{ fields: Record<string, unknown> }>,
    appId: string,
    appSecret: string,
  ): Promise<{ records: FeishuRecordResponse[] }> {
    const path = `/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/records/batch_create`;
    const data = await this.request<{ data: { records: FeishuRecordResponse[] } }>(
      'POST',
      path,
      { records },
      appId,
      appSecret,
    );
    return data.data;
  }

  async updateRecord(
    appToken: string,
    tableId: string,
    recordId: string,
    fields: Record<string, unknown>,
    appId: string,
    appSecret: string,
  ): Promise<FeishuRecordResponse> {
    const path = `/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/records/${encodeURIComponent(recordId)}`;
    const data = await this.request<{ data: FeishuRecordResponse }>(
      'PUT',
      path,
      { fields },
      appId,
      appSecret,
    );
    return data.data;
  }

  async batchUpdateRecords(
    appToken: string,
    tableId: string,
    records: Array<{ record_id: string; fields: Record<string, unknown> }>,
    appId: string,
    appSecret: string,
  ): Promise<{ records: FeishuRecordResponse[] }> {
    const path = `/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/records/batch_update`;
    const data = await this.request<{ data: { records: FeishuRecordResponse[] } }>(
      'POST',
      path,
      { records },
      appId,
      appSecret,
    );
    return data.data;
  }

  async batchDeleteRecords(
    appToken: string,
    tableId: string,
    recordIds: string[],
    appId: string,
    appSecret: string,
  ): Promise<{ records: FeishuRecordResponse[] }> {
    const path = `/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/records/batch_delete`;
    const data = await this.request<{ data: { records: FeishuRecordResponse[] } }>(
      'POST',
      path,
      { records: recordIds },
      appId,
      appSecret,
    );
    return data.data;
  }

  async listFields(
    appToken: string,
    tableId: string,
    appId: string,
    appSecret: string,
  ): Promise<ListFieldsResponse> {
    const path = `/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/fields`;
    const allItems: FieldInfo[] = [];
    let pageToken: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const query: Record<string, string> = {};
      if (pageToken) query.page_token = pageToken;
      query.page_size = '100';

      const data = await this.request<{ data: ListFieldsResponse }>(
        'GET',
        path,
        undefined,
        appId,
        appSecret,
        query,
      );
      allItems.push(...data.data.items);
      hasMore = data.data.has_more;
      pageToken = data.data.page_token;
    }

    return { has_more: false, total: allItems.length, items: allItems };
  }

  async getAppInfo(
    appToken: string,
    appId: string,
    appSecret: string,
  ): Promise<{ app: { app_token: string; name: string; is_advanced: boolean } }> {
    const path = `/bitable/v1/apps/${encodeURIComponent(appToken)}`;
    const data = await this.request<{ data: { app: { app_token: string; name: string; is_advanced: boolean } } }>(
      'GET',
      path,
      undefined,
      appId,
      appSecret,
    );
    return data.data;
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body: unknown,
    appId: string,
    appSecret: string,
    query?: Record<string, string>,
    retryOnTokenExpired = true,
  ): Promise<T> {
    const token = await this.getTenantAccessToken(appId, appSecret);
    const url = `${FEISHU_OPEN_API_BASE}${path}`;

    try {
      const resp = await firstValueFrom(
        this.httpService.request({
          method,
          url,
          params: query,
          data: body,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }),
      );

      const respData = resp.data as FeishuApiError & T;
      if (respData.code !== undefined && respData.code !== 0) {
        if (
          (respData.code === 99991663 || respData.code === 99991664 || respData.code === 99991672) &&
          retryOnTokenExpired
        ) {
          this.logger.warn(`飞书 token 失效，自动刷新重试: ${respData.code} - ${respData.msg}`);
          this.clearTokenCache(appId);
          return this.request<T>(method, path, body, appId, appSecret, query, false);
        }
        throw new BadRequestException(
          `飞书 API 错误(${respData.code}): ${respData.msg}`,
        );
      }
      return respData;
    } catch (error: unknown) {
      if (error instanceof BadRequestException) throw error;
      const msg = this.extractErrMsg(error);
      this.logger.error(`飞书 API 请求失败 ${method} ${path}: ${msg}`);
      throw new BadRequestException(`飞书 API 请求失败: ${msg}`);
    }
  }

  private extractErrMsg(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    try {
      return JSON.stringify(error);
    } catch {
      return '未知错误';
    }
  }
}
