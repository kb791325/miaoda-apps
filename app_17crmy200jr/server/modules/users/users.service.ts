import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AuthNPaasService } from '@lark-apaas/fullstack-nestjs-core';

import type { UserSearchItem } from '@shared/api.interface';

export const FEISHU_APP_ID = 'FEISHU_APP_ID';
export const FEISHU_APP_SECRET = 'FEISHU_APP_SECRET';

interface TenantTokenResponse {
  code: number;
  msg: string;
  tenant_access_token: string;
  expire: number;
}

interface FeishuUserInfo {
  open_id: string;
  user_id: string;
  name: string;
  avatar?: {
    avatar_72?: string;
    avatar_640?: string;
    avatar_origin?: string;
  };
  department_ids?: string[];
  department_name?: string;
}

interface ContactSearchResponse {
  code: number;
  msg: string;
  data?: {
    items?: FeishuUserInfo[];
    has_more?: boolean;
    page_token?: string;
  };
  error?: {
    permission_violations?: Array<{ type: string; subject: string }>;
  };
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private tenantAccessToken: string | null = null;
  private tokenExpireAt = 0;

  constructor(
    @Inject(FEISHU_APP_ID) private readonly appId: string,
    @Inject(FEISHU_APP_SECRET) private readonly appSecret: string,
    private readonly httpService: HttpService,
    private readonly authnService: AuthNPaasService,
  ) {}

  private async getTenantAccessToken(): Promise<string> {
    if (this.tenantAccessToken && Date.now() < this.tokenExpireAt) {
      return this.tenantAccessToken;
    }

    if (!this.appId || !this.appSecret) {
      throw new BadRequestException('飞书应用未配置');
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post<TenantTokenResponse>(
          'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
          {
            app_id: this.appId,
            app_secret: this.appSecret,
          },
        ),
      );

      const { code, msg, tenant_access_token: token, expire } = response.data;

      if (code !== 0) {
        this.logger.error(`获取 tenant_access_token 失败: code=${code}, msg=${msg}`);
        throw new BadRequestException('飞书应用配置错误');
      }

      this.tenantAccessToken = token;
      this.tokenExpireAt = Date.now() + (expire - 300) * 1000;

      return token;
    } catch (error) {
      this.logger.error(`请求飞书 token 接口异常: ${JSON.stringify(error)}`);
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('飞书服务连接失败');
    }
  }

  async searchUsers(
    keyword: string,
    pageSize = 20,
  ): Promise<UserSearchItem[]> {
    if (!this.appId || !this.appSecret) {
      throw new BadRequestException('飞书应用未配置');
    }

    const token = await this.getTenantAccessToken();

    try {
      const response = await firstValueFrom(
        this.httpService.post<ContactSearchResponse>(
          'https://open.feishu.cn/open-apis/contact/v3/users/search',
          {
            query: keyword,
            page_size: pageSize,
          },
          {
            params: {
              user_id_type: 'user_id',
            },
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        ),
      );

      const { code, msg, data } = response.data;

      if (code !== 0) {
        const humanMsg = this.translateFeishuError(code, response.data);
        this.logger.error(`飞书通讯录搜索失败: code=${code}, msg=${msg}`);
        throw new BadRequestException(humanMsg);
      }

      const users = data?.items ?? [];
      const feishuUserIds = users
        .map((u) => u.user_id)
        .filter((id): id is string => Boolean(id));

      const miaodaIds =
        feishuUserIds.length > 0
          ? await this.authnService.getBatchMiaodaUserIds(feishuUserIds)
          : [];

      const result: UserSearchItem[] = [];
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const miaodaId = miaodaIds[i];
        if (!miaodaId) continue;
        result.push({
          id: miaodaId,
          name: user.name,
          avatar: user.avatar?.avatar_72 || user.avatar?.avatar_640,
          department: user.department_name,
        });
      }
      return result;
    } catch (error: unknown) {
      if (error instanceof BadRequestException) throw error;
      const respData = (error as { response?: { data?: ContactSearchResponse } })?.response?.data;
      if (respData?.code) {
        const humanMsg = this.translateFeishuError(respData.code, respData);
        this.logger.error(`飞书通讯录搜索失败: code=${respData.code}`);
        throw new BadRequestException(humanMsg);
      }
      this.logger.error(
        `飞书通讯录搜索异常: ${JSON.stringify(error).slice(0, 300)}`,
      );
      throw new BadRequestException('搜索服务暂时不可用');
    }
  }

  private translateFeishuError(code: number, data?: ContactSearchResponse): string {
    switch (code) {
      case 99991663:
        return '通讯录数据范围不足：请在飞书开放平台「权限管理-通讯录」将应用可见范围调整为「全公司」，并发布新版本等待审批生效';
      case 99991672: {
        const scopes = data?.error?.permission_violations
          ?.map((v) => v.subject)
          .join('、');
        return scopes
          ? `通讯录权限不足：需要开通 ${scopes} 权限并发布应用版本`
          : '通讯录权限不足：请在飞书开放平台开通权限并发布应用版本';
      }
      case 40004:
        return '部门数据范围不足：请在飞书开放平台扩大应用通讯录可见范围并发布版本';
      default:
        return '搜索用户失败';
    }
  }
}
