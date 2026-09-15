import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { count, eq, inArray } from 'drizzle-orm';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import {
  BitableClient,
  BitableFilter,
  readFormulaNumber,
  readFormulaText,
  readTextField,
} from '@server/common/utils/bitable-client';
import { CAPABILITY_INSTANCE_IDS } from '@server/common/constants/capability-instance-ids';
import { appUser, customerCrm, followUp } from '@server/database/schema';
import { SyncMappingService } from '@server/modules/bitable-sync/sync-mapping.service';
import {
  CrmService,
  type CrmPatch,
  type CustomerCrmRow,
} from '@server/modules/crm/crm.service';
import { FollowUpService } from '@server/modules/follow-up/follow-up.service';
import type { OperatorContext } from '@server/modules/auth/auth.types';
import {
  SALES_STAGES,
  type Customer,
  type CustomerCrmInfo,
  type CustomerFormRequest,
  type CustomerListParams,
  type CustomerProfile,
  type CustomerRecentOrder,
  type CustomerTopProduct,
  type SalesStage,
  type UpdateCustomerStageRequest,
} from '@shared/customer';
import type {
  UpdateCustomerCreditRequest,
} from '@shared/finance-contract';

const CUSTOMER_FIELDS = [
  '客户姓名',
  '联系电话',
  '收货地址',
  '客户等级',
  '累计订单数',
  '累计消费金额',
];

const PROFILE_ORDER_FIELDS = [
  '订单号',
  '数量',
  '下单时间',
  '订单状态',
  '商品名称',
  '订单金额',
];

const EMPTY_CRM_INFO: CustomerCrmInfo = {
  grade: '',
  source: '',
  salesStage: '线索',
  ownerId: '',
  ownerName: '',
  firstContactAt: '',
  expectedDealAt: '',
  nextFollowUpAt: '',
  lastFollowUpAt: '',
  createdAt: '',
};

const OWNER_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(
    private readonly bitableClient: BitableClient,
    private readonly crmService: CrmService,
    private readonly followUpService: FollowUpService,
    private readonly mappingService: SyncMappingService,
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async list(
    params: CustomerListParams,
    operator?: OperatorContext,
  ): Promise<{
    items: Customer[];
    total: number;
  }> {
    const trimmed = params.keyword?.trim() ?? '';
    const filter: BitableFilter | undefined = trimmed
      ? {
          conjunction: 'or',
          conditions: [
            { fieldName: '客户姓名', operator: 'contains', value: [trimmed] },
            { fieldName: '联系电话', operator: 'contains', value: [trimmed] },
          ],
        }
      : undefined;

    const output = await this.bitableClient.searchRecords(
      CAPABILITY_INSTANCE_IDS.customer,
      {
        pageSize: 500,
        fieldNames: CUSTOMER_FIELDS,
        filter,
      },
    );

    const customerIds: string[] = output.records.map(
      (item): string => item.id,
    );
    const crmMap = await this.crmService.getMapByCustomerIds(customerIds);
    const ownerNameMap = await this.buildOwnerNameMap(
      Array.from(crmMap.values()).map(
        (row: CustomerCrmRow): string => row.owner ?? '',
      ),
    );

    const items: Customer[] = output.records.map((item): Customer => {
      const r = item.record;
      return {
        id: item.id,
        customerName: readTextField(r['客户姓名']),
        phone: readTextField(r['联系电话']),
        address: readTextField(r['收货地址']),
        totalAmount: readFormulaNumber(r['累计消费金额']),
        orderCount: readFormulaNumber(r['累计订单数']),
        customerLevel:
          typeof r['客户等级'] === 'string' ? r['客户等级'] : '普通',
        crm: this.toCrmInfo(crmMap.get(item.id), ownerNameMap),
      };
    });

    let result: Customer[] = items;
    if (operator?.roleCode === 'sales') {
      result = result.filter((item: Customer): boolean => {
        const ext = crmMap.get(item.id);
        return (
          (ext?.owner ?? '') === operator.userId ||
          (ext?.createdBy ?? '') === operator.userId
        );
      });
    }
    result = this.applyListFilters(result, params);
    return { items: result, total: result.length };
  }

  /** 等级/负责销售/创建时间（自然日半开区间）组合筛选 */
  private applyListFilters(
    items: Customer[],
    params: CustomerListParams,
  ): Customer[] {
    const grade = params.grade?.trim() ?? '';
    const ownerId = params.ownerId?.trim() ?? '';
    const createdFrom = params.createdFrom?.trim() ?? '';
    const createdTo = params.createdTo?.trim() ?? '';
    const fromMs: number | null = createdFrom
      ? new Date(`${createdFrom}T00:00:00`).getTime()
      : null;
    const toMs: number | null = createdTo
      ? new Date(`${createdTo}T23:59:59.999`).getTime()
      : null;

    return items.filter((item: Customer): boolean => {
      if (grade && item.crm.grade !== grade) return false;
      if (ownerId && item.crm.ownerId !== ownerId) return false;
      if (fromMs !== null || toMs !== null) {
        if (!item.crm.createdAt) return false;
        const createdMs: number = new Date(item.crm.createdAt).getTime();
        if (fromMs !== null && createdMs < fromMs) return false;
        if (toMs !== null && createdMs > toMs) return false;
      }
      return true;
    });
  }

  async create(
    dto: CustomerFormRequest,
    operator?: OperatorContext,
  ): Promise<{ id: string }> {
    this.validateForm(dto);
    const record: Record<string, unknown> = {
      客户姓名: dto.customerName,
      联系电话: dto.phone,
    };
    if (dto.address) record['收货地址'] = dto.address;

    const output = await this.bitableClient.batchAddRecords(
      CAPABILITY_INSTANCE_IDS.customer,
      [{ record }],
    );
    const id: string = output.records[0]?.id ?? '';
    this.logger.log(`customer created: ${JSON.stringify(output.records[0])}`);
    if (id) {
      const patch = this.buildCrmPatch(dto);
      if (patch.ownerId === undefined && operator) {
        patch.ownerId = operator.userId;
      }
      await this.crmService.upsert(id, patch, operator?.userId);
    }
    return { id };
  }

  async update(
    id: string,
    dto: CustomerFormRequest,
    operator?: OperatorContext,
  ): Promise<{ success: boolean }> {
    this.validateForm(dto);
    await this.ensureCustomerExists(id);
    await this.assertCustomerOwned(id, operator);
    const record: Record<string, unknown> = {
      客户姓名: dto.customerName,
      联系电话: dto.phone,
      收货地址: dto.address ?? '',
    };
    const output = await this.bitableClient.batchUpdateRecords(
      CAPABILITY_INSTANCE_IDS.customer,
      [{ id, record }],
    );
    await this.crmService.upsert(id, this.buildCrmPatch(dto), operator?.userId);
    this.logger.log(`customer ${id} updated`);
    return { success: output.records.length > 0 };
  }

  async updateStage(
    id: string,
    dto: UpdateCustomerStageRequest,
    operator?: OperatorContext,
  ): Promise<{ success: boolean }> {
    if (!SALES_STAGES.includes(dto.stage as SalesStage)) {
      throw new BadRequestException('无效的销售阶段');
    }
    await this.ensureCustomerExists(id);
    await this.assertCustomerOwned(id, operator);
    await this.crmService.updateStage(id, dto.stage);
    return { success: true };
  }

  async reassignOwner(
    id: string,
    ownerId: string,
    operator?: OperatorContext,
  ): Promise<{ success: boolean }> {
    const trimmed: string = (ownerId ?? '').trim();
    if (!OWNER_UUID_PATTERN.test(trimmed)) {
      throw new BadRequestException('负责销售不合法，请选择系统用户');
    }
    const users: Array<{ name: string }> = await this.db
      .select({ name: appUser.name })
      .from(appUser)
      .where(eq(appUser.id, trimmed))
      .limit(1);
    if (users.length === 0) {
      throw new BadRequestException('负责销售账号不存在，请选择系统用户');
    }
    await this.ensureCustomerExists(id);
    await this.assertCustomerOwned(id, operator);
    await this.crmService.upsert(id, { ownerId: trimmed }, operator?.userId);
    this.logger.log(`customer ${id} owner reassigned to ${trimmed}`);
    return { success: true };
  }

  async updateCredit(
    id: string,
    dto: UpdateCustomerCreditRequest,
    operator?: OperatorContext,
  ): Promise<{ success: boolean }> {
    const patch: { creditLimit?: string; creditWarningRatio?: number } = {};
    if (dto.creditLimit !== undefined) {
      const limit: number = Number(dto.creditLimit);
      if (!Number.isFinite(limit) || limit < 0) {
        throw new BadRequestException('信用额度必须为不小于 0 的数字');
      }
      patch.creditLimit = limit.toFixed(2);
    }
    if (dto.warningRatio !== undefined) {
      const ratio: number = Number(dto.warningRatio);
      if (!Number.isInteger(ratio) || ratio < 1 || ratio > 100) {
        throw new BadRequestException('预警比例必须为 1-100 的整数');
      }
      patch.creditWarningRatio = ratio;
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    await this.ensureCustomerExists(id);
    await this.crmService.upsert(id, patch, operator?.userId);
    this.logger.log(`customer ${id} credit updated`);
    return { success: true };
  }

  async getProfile(
    id: string,
    operator?: OperatorContext,
  ): Promise<CustomerProfile> {
    await this.assertCustomerOwned(id, operator);
    const detail = await this.bitableClient.getRecord(
      CAPABILITY_INSTANCE_IDS.customer,
      id,
    );
    if (!detail.record || Object.keys(detail.record).length === 0) {
      throw new NotFoundException('客户不存在');
    }
    const customerName: string = readTextField(detail.record['客户姓名']);

    const output = await this.bitableClient.searchRecords(
      CAPABILITY_INSTANCE_IDS.order,
      {
        pageSize: 500,
        fieldNames: PROFILE_ORDER_FIELDS,
        filter: {
          conjunction: 'and',
          conditions: [
            { fieldName: '客户', operator: 'is', value: [id] },
          ],
        },
      },
    );

    const orders = output.records.map((item) => {
      const r = item.record;
      return {
        id: item.id,
        orderNo: readTextField(r['订单号']),
        productName: readFormulaText(r['商品名称']),
        quantity: typeof r['数量'] === 'number' ? r['数量'] : 0,
        amount: readFormulaNumber(r['订单金额']),
        orderTime: typeof r['下单时间'] === 'number' ? r['下单时间'] : 0,
        status: typeof r['订单状态'] === 'string' ? r['订单状态'] : '',
      };
    }).sort(
      (a: { orderTime: number }, b: { orderTime: number }): number =>
        b.orderTime - a.orderTime,
    );

    const orderCount: number = orders.length;
    const totalAmount: number = orders.reduce(
      (sum: number, o: { amount: number }): number => sum + o.amount,
      0,
    );
    const avgOrderAmount: number =
      orderCount > 0 ? totalAmount / orderCount : 0;
    const lastOrderTime: string | undefined =
      orderCount > 0
        ? new Date(
            orders.reduce(
              (max: number, o: { orderTime: number }): number =>
                Math.max(max, o.orderTime),
              0,
            ),
          ).toISOString()
        : undefined;

    const productMap = new Map<string, number>();
    for (const o of orders) {
      if (!o.productName) continue;
      productMap.set(
        o.productName,
        (productMap.get(o.productName) ?? 0) + o.quantity,
      );
    }
    const topProducts: CustomerTopProduct[] = [...productMap.entries()]
      .sort((a: [string, number], b: [string, number]): number => b[1] - a[1])
      .slice(0, 5)
      .map(([productName, quantity]: [string, number]): CustomerTopProduct => ({
        productName,
        quantity,
      }));

    const historyOrders: CustomerRecentOrder[] = orders.map(
      (o): CustomerRecentOrder => ({
        id: o.id,
        orderNo: o.orderNo,
        productName: o.productName,
        quantity: o.quantity,
        amount: o.amount,
        orderTime: o.orderTime > 0 ? new Date(o.orderTime).toISOString() : '',
        status: o.status,
      }),
    );

    const crmMap = await this.crmService.getMapByCustomerIds([id]);
    const crmRow: CustomerCrmRow | undefined = crmMap.get(id);
    const ownerNameMap = await this.buildOwnerNameMap([
      crmRow?.owner ?? '',
    ]);
    const followUps = await this.followUpService.listByCustomer(id);

    return {
      customerId: id,
      customerName,
      phone: readTextField(detail.record['联系电话']),
      address: readTextField(detail.record['收货地址']),
      totalAmount,
      orderCount,
      avgOrderAmount,
      lastOrderTime,
      topProducts,
      orders: historyOrders,
      crm: this.toCrmInfo(crmRow, ownerNameMap),
      followUps,
    };
  }

  private buildCrmPatch(dto: CustomerFormRequest): CrmPatch {
    const patch: CrmPatch = {};
    if (dto.grade !== undefined) patch.grade = dto.grade;
    if (dto.source !== undefined) patch.source = dto.source;
    if (dto.salesStage !== undefined) {
      if (dto.salesStage && !SALES_STAGES.includes(dto.salesStage as SalesStage)) {
        throw new BadRequestException('无效的销售阶段');
      }
      patch.salesStage = dto.salesStage || '线索';
    }
    if (dto.ownerId !== undefined) patch.ownerId = dto.ownerId || null;
    if (dto.firstContactAt !== undefined) {
      patch.firstContactAt = this.parseOptionalDate(dto.firstContactAt);
    }
    if (dto.expectedDealAt !== undefined) {
      patch.expectedDealAt = this.parseOptionalDate(dto.expectedDealAt);
    }
    if (dto.nextFollowUpAt !== undefined) {
      patch.nextFollowUpAt = this.parseOptionalDate(dto.nextFollowUpAt);
    }
    return patch;
  }

  private parseOptionalDate(value: string): Date | null {
    if (value === '') return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('日期格式无效');
    }
    return date;
  }

  private async buildOwnerNameMap(
    ownerIds: string[],
  ): Promise<Map<string, string>> {
    const ids: string[] = Array.from(
      new Set(
        ownerIds.filter((id: string): boolean =>
          OWNER_UUID_PATTERN.test(id),
        ),
      ),
    );
    if (ids.length === 0) return new Map();
    const rows: Array<{ id: string; name: string }> = await this.db
      .select({ id: appUser.id, name: appUser.name })
      .from(appUser)
      .where(inArray(appUser.id, ids));
    const map = new Map<string, string>();
    for (const row of rows) {
      map.set(row.id, row.name);
    }
    return map;
  }

  private toCrmInfo(
    row: CustomerCrmRow | undefined,
    ownerNameMap: Map<string, string>,
  ): CustomerCrmInfo {
    if (!row) return { ...EMPTY_CRM_INFO };
    return {
      grade: row.grade,
      source: row.source,
      salesStage: row.salesStage,
      ownerId: row.owner ?? '',
      ownerName: row.owner ? (ownerNameMap.get(row.owner) ?? '') : '',
      firstContactAt: row.firstContactAt
        ? row.firstContactAt.toISOString()
        : '',
      expectedDealAt: row.expectedDealAt
        ? row.expectedDealAt.toISOString()
        : '',
      nextFollowUpAt: row.nextFollowUpAt
        ? row.nextFollowUpAt.toISOString()
        : '',
      lastFollowUpAt: row.lastFollowUpAt
        ? row.lastFollowUpAt.toISOString()
        : '',
      createdAt: row.createdAt.toISOString(),
    };
  }

  /** 删除客户：存在未取消订单或跟进记录时禁止，同步清理 CRM 扩展与同步映射 */
  async remove(
    id: string,
    operator?: OperatorContext,
  ): Promise<{ success: boolean }> {
    await this.assertCustomerOwned(id, operator);
    await this.ensureCustomerExists(id);

    const ordersOutput = await this.bitableClient.searchRecords(
      CAPABILITY_INSTANCE_IDS.order,
      {
        pageSize: 200,
        fieldNames: ['订单状态'],
        filter: {
          conjunction: 'and',
          conditions: [{ fieldName: '客户', operator: 'is', value: [id] }],
        },
      },
    );
    const activeOrderCount: number = ordersOutput.records.filter(
      (item): boolean =>
        typeof item.record['订单状态'] === 'string' &&
        item.record['订单状态'] !== '已取消',
    ).length;
    if (activeOrderCount > 0) {
      throw new ConflictException(
        `该客户存在 ${activeOrderCount} 笔未取消订单，无法删除`,
      );
    }

    const followCountRows: Array<{ count: number }> = await this.db
      .select({ count: count() })
      .from(followUp)
      .where(eq(followUp.customerId, id));
    const followCount: number = Number(followCountRows[0]?.count ?? 0);
    if (followCount > 0) {
      throw new ConflictException(
        `该客户存在 ${followCount} 条跟进记录，无法删除`,
      );
    }

    const output = await this.bitableClient.deleteRecords(
      CAPABILITY_INSTANCE_IDS.customer,
      [id],
    );
    await this.db.delete(customerCrm).where(eq(customerCrm.customerId, id));
    await this.mappingService.remove('customer_crm', id);
    this.logger.log(`customer ${id} deleted`);
    return { success: output.success };
  }

  /** 销售角色只能查看/操作自己创建或负责的客户 */
  private async assertCustomerOwned(
    customerId: string,
    operator?: OperatorContext,
  ): Promise<void> {
    if (operator?.roleCode !== 'sales') return;
    const ext = (
      await this.crmService.getMapByCustomerIds([customerId])
    ).get(customerId);
    const owned =
      (ext?.owner ?? '') === operator.userId ||
      (ext?.createdBy ?? '') === operator.userId;
    if (!owned) {
      throw new ForbiddenException('只能查看或操作自己创建的客户');
    }
  }

  private validateForm(dto: CustomerFormRequest): void {
    if (!dto.customerName?.trim()) {
      throw new BadRequestException('客户姓名不能为空');
    }
    if (!dto.phone?.trim()) {
      throw new BadRequestException('联系电话不能为空');
    }
  }

  private async ensureCustomerExists(id: string): Promise<void> {
    const detail = await this.bitableClient.getRecord(
      CAPABILITY_INSTANCE_IDS.customer,
      id,
    );
    if (!detail.record || Object.keys(detail.record).length === 0) {
      throw new NotFoundException('客户不存在');
    }
  }
}
