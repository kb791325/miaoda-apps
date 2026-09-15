import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import FormData from 'form-data';
import { feishuConfig } from '../../config/feishu.config';

interface TokenCache {
  token: string;
  expireAt: number;
}

@Injectable()
export class BitableService {
  private readonly logger = new Logger(BitableService.name);
  private tokenCache: TokenCache | null = null;
  private ensuredFields = new Set<string>();

  constructor(private readonly httpService: HttpService) {}

  async getTenantAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expireAt > now + 60000) {
      return this.tokenCache.token;
    }

    this.logger.log('刷新 tenant_access_token');
    const url = `${feishuConfig.baseUrl}/open-apis/auth/v3/tenant_access_token/internal`;
    const { data } = await firstValueFrom(
      this.httpService.post(url, {
        app_id: feishuConfig.appId,
        app_secret: feishuConfig.appSecret,
      }),
    );

    if (data.code !== 0) {
      throw new Error(`获取飞书 token 失败: ${data.msg}`);
    }

    this.tokenCache = {
      token: data.tenant_access_token,
      expireAt: now + data.expire * 1000,
    };

    return this.tokenCache.token;
  }

  private async request<T = any>(
    method: string,
    path: string,
    data?: any,
    params?: Record<string, string | number>,
    retry = 1,
  ): Promise<T> {
    const token = await this.getTenantAccessToken();
    const url = `${feishuConfig.baseUrl}${path}`;

    try {
      const response = await firstValueFrom(
        this.httpService.request<any>({
          method,
          url,
          data,
          params,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
      );
      const respData = response.data;
      if (respData?.code !== 0) {
        const err = new Error(`Bitable API error code=${respData?.code} msg=${respData?.msg}`);
        (err as any).response = { data: respData };
        throw err;
      }
      return respData;
    } catch (e: any) {
      const status = e.response?.status;
      const respData = e.response?.data;

      if (status === 401 && retry > 0) {
        this.logger.warn('token 过期，重新获取后重试');
        this.tokenCache = null;
        return this.request<T>(method, path, data, params, retry - 1);
      }

      if (status === 429 && retry > 0) {
        this.logger.warn('触发限流，1 秒后重试');
        await new Promise((r) => setTimeout(r, 1000));
        return this.request<T>(method, path, data, params, retry - 1);
      }

      this.logger.error(
        `Bitable 请求失败 ${method} ${path}: ${status} ${JSON.stringify(respData)}`,
      );
      throw e;
    }
  }

  async listRecords(
    tableId: string,
    options: {
      pageSize?: number;
      pageToken?: string;
      viewId?: string;
      sort?: Array<{ field_name: string; desc: boolean }>;
      filter?: any;
      fieldNames?: string[];
    } = {},
  ) {
    const basePath = `/open-apis/bitable/v1/apps/${feishuConfig.baseToken}/tables/${tableId}/records`;

    const body: any = {};
    if (options.sort?.length) body.sort = options.sort;
    if (options.filter) body.filter = options.filter;
    if (options.fieldNames?.length) body.field_names = options.fieldNames;

    const params: Record<string, string | number> = {};
    if (options.pageSize) params.page_size = options.pageSize;
    if (options.pageToken) params.page_token = options.pageToken;
    if (options.viewId) params.view_id = options.viewId;

    return this.request('POST', `${basePath}/search`, body, params);
  }

  async getRecord(tableId: string, recordId: string) {
    return this.request(
      'GET',
      `/open-apis/bitable/v1/apps/${feishuConfig.baseToken}/tables/${tableId}/records/${recordId}`,
    );
  }

  async createRecord(tableId: string, fields: Record<string, any>) {
    return this.request(
      'POST',
      `/open-apis/bitable/v1/apps/${feishuConfig.baseToken}/tables/${tableId}/records`,
      { fields },
    );
  }

  async batchCreateRecords(tableId: string, records: Array<{ fields: Record<string, any> }>) {
    return this.request(
      'POST',
      `/open-apis/bitable/v1/apps/${feishuConfig.baseToken}/tables/${tableId}/records/batch_create`,
      { records },
    );
  }

  async updateRecord(tableId: string, recordId: string, fields: Record<string, any>) {
    return this.request(
      'PUT',
      `/open-apis/bitable/v1/apps/${feishuConfig.baseToken}/tables/${tableId}/records/${recordId}`,
      { fields },
    );
  }

  async deleteRecord(tableId: string, recordId: string) {
    return this.request(
      'DELETE',
      `/open-apis/bitable/v1/apps/${feishuConfig.baseToken}/tables/${tableId}/records/${recordId}`,
    );
  }

  async batchDeleteRecords(tableId: string, recordIds: string[]) {
    return this.request(
      'POST',
      `/open-apis/bitable/v1/apps/${feishuConfig.baseToken}/tables/${tableId}/records/batch_delete`,
      { records: recordIds },
    );
  }

  async listFields(tableId: string) {
    return this.request(
      'GET',
      `/open-apis/bitable/v1/apps/${feishuConfig.baseToken}/tables/${tableId}/fields`,
    );
  }

  async createField(
    tableId: string,
    field: { field_name: string; type: number; ui_type?: string },
  ) {
    return this.request(
      'POST',
      `/open-apis/bitable/v1/apps/${feishuConfig.baseToken}/tables/${tableId}/fields`,
      field,
    );
  }

  async ensureField(
    tableId: string,
    fieldName: string,
    type: number,
    uiType?: string,
  ) {
    const cacheKey = `${tableId}:${fieldName}`;
    if (this.ensuredFields.has(cacheKey)) return;
    const res = await this.listFields(tableId);
    const items: Array<{ field_name?: string }> = res?.data?.items || [];
    if (!items.some((f) => f.field_name === fieldName)) {
      await this.createField(tableId, {
        field_name: fieldName,
        type,
        ...(uiType ? { ui_type: uiType } : {}),
      });
      this.logger.log(`已创建多维表字段 ${fieldName} @ ${tableId}`);
    }
    this.ensuredFields.add(cacheKey);
  }

  async uploadMediaAll(buffer: Buffer, fileName: string, size: number, mimeType?: string): Promise<string> {
    const token = await this.getTenantAccessToken();
    const contentType = mimeType || 'application/octet-stream';
    const bufFirstBytes = buffer.slice(0, 16).toString('hex');
    this.logger.log(`uploadMediaAll 开始: file_name=${fileName}, size=${size}, mimeType=${contentType}, bufHead=${bufFirstBytes}`);
    const form = new FormData();
    form.append('file_name', fileName);
    form.append('parent_type', 'bitable_file');
    form.append('parent_node', feishuConfig.baseToken);
    form.append('size', String(size));
    form.append('file', buffer, { filename: fileName, contentType });
    const uploadUrl = `${feishuConfig.baseUrl}/open-apis/drive/v1/medias/upload_all`;
    const resp = await firstValueFrom(
      this.httpService.post(uploadUrl, form, {
        headers: { ...form.getHeaders(), Authorization: `Bearer ${token}` },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }),
    );
    const d = resp.data;
    this.logger.log(`飞书upload_all响应: code=${d?.code}, msg=${d?.msg}, file_token=${d?.data?.file_token}, name=${d?.data?.name}, size=${d?.data?.size}, type=${d?.data?.type}`);
    if (d?.code !== 0) {
      throw new Error(`飞书媒体上传失败 code=${d?.code} msg=${d?.msg}`);
    }
    return String(d?.data?.file_token || '');
  }

  async prepareMediaUpload(fileName: string, size: number, blockSize: number) {
    const res = await this.request<Record<string, any>>(
      'POST',
      '/open-apis/drive/v1/medias/upload_prepare',
      {
        file_name: fileName,
        parent_type: 'bitable_file',
        parent_node: feishuConfig.baseToken,
        size,
        block_size: blockSize,
      },
    );
    return res?.data || {};
  }

  async uploadMediaPart(
    uploadId: string,
    blockNum: number,
    buffer: Buffer,
    fileName: string,
  ) {
    const token = await this.getTenantAccessToken();
    const form = new FormData();
    form.append('upload_id', uploadId);
    form.append('block_num', String(blockNum));
    form.append('block', buffer, { filename: fileName, contentType: 'application/octet-stream' });
    const resp = await firstValueFrom(
      this.httpService.post(
        `${feishuConfig.baseUrl}/open-apis/drive/v1/medias/upload_part`,
        form,
        {
          headers: { ...form.getHeaders(), Authorization: `Bearer ${token}` },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        },
      ),
    );
    const d = resp.data;
    if (d?.code !== 0) {
      throw new Error(`分片上传失败 block=${blockNum} code=${d?.code} msg=${d?.msg}`);
    }
    return d?.data ?? {};
  }

  async finishMediaUpload(uploadId: string, blockNum: number) {
    return this.request<Record<string, any>>(
      'POST',
      '/open-apis/drive/v1/medias/upload_finish',
      { upload_id: uploadId, block_num: blockNum },
    );
  }

  async deleteMedia(fileToken: string) {
    return this.request(
      'DELETE',
      `/open-apis/drive/v1/files/${encodeURIComponent(fileToken)}?type=file`,
    );
  }

  async downloadMedia(
    fileToken: string,
    extra: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    const token = await this.getTenantAccessToken();
    const url = `${feishuConfig.baseUrl}/open-apis/drive/v1/medias/${encodeURIComponent(fileToken)}/download`;
    const params: Record<string, string> = {};
    if (extra) {
      params.extra = decodeURIComponent(extra);
    }
    this.logger.log(`downloadMedia 开始: url=${url}, params=${JSON.stringify(params)}`);

    let response;
    try {
      response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params,
          responseType: 'arraybuffer',
          timeout: 30000,
        }),
      );
    } catch (e: any) {
      const status = e?.response?.status;
      const body = e?.response?.data ? String(Buffer.from(e.response.data).toString('utf-8')).substring(0, 500) : '无响应体';
      this.logger.error(`飞书downloadMedia失败: status=${status}, url=${url}, body=${body}`);
      throw e;
    }

    const status = response.status;
    const contentType = String(response.headers['content-type'] || 'application/octet-stream');
    const bodyLen = Buffer.from(response.data).length;
    const bodyHead = bodyLen > 0 ? Buffer.from(response.data).slice(0, 50).toString('hex') : 'empty';
    this.logger.log(`飞书downloadMedia成功: status=${status}, content-type=${contentType}, bodyLen=${bodyLen}, bodyHead=${bodyHead}`);

    return { buffer: Buffer.from(response.data), contentType };
  }

  async getMediaTmpUrls(
    fileTokens: string[],
    extra?: string,
  ): Promise<Record<string, string>> {
    const tokens = fileTokens.filter((t: string) => !!t).slice(0, 50);
    const result: Record<string, string> = {};
    if (tokens.length === 0) return result;

    const params: Record<string, string> = {
      file_tokens: tokens.join(','),
    };
    if (extra) {
      params.extra = decodeURIComponent(extra);
    }

    this.logger.log(`getMediaTmpUrls params=${JSON.stringify(params)}`);
    const res = await this.request<Record<string, any>>(
      'GET',
      '/open-apis/drive/v1/medias/batch_get_tmp_download_url',
      undefined,
      params,
    );
    this.logger.log(`getMediaTmpUrls res.code=${res?.code} data_keys=${JSON.stringify(Object.keys(res?.data || {}))}`);
    const list = res?.data?.tmp_download_urls;
    this.logger.log(`getMediaTmpUrls list=${JSON.stringify(list)}`);
    if (Array.isArray(list)) {
      for (const it of list) {
        if (it?.file_token && it?.tmp_download_url) {
          result[String(it.file_token)] = String(it.tmp_download_url);
        }
      }
    }
    return result;
  }

  async listViews(tableId: string) {
    return this.request(
      'GET',
      `/open-apis/bitable/v1/apps/${feishuConfig.baseToken}/tables/${tableId}/views`,
    );
  }

  async listAllRecords(
    tableId: string,
    options: { filter?: any; sort?: Array<{ field_name: string; desc: boolean }> } = {},
  ) {
    const allItems: any[] = [];
    let pageToken: string | undefined;
    const pageSize = 500;

    do {
      const result = await this.listRecords(tableId, {
        pageSize,
        pageToken,
        filter: options.filter,
        sort: options.sort,
      });

      const items = result?.data?.items || [];
      allItems.push(...items);
      pageToken = result?.data?.page_token;

      if (!result?.data?.has_more) break;
    } while (pageToken);

    return allItems;
  }
}
