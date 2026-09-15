import { Injectable, Logger } from '@nestjs/common';
import { BitableService } from '../../common/feishu/bitable.service';
import { getTableId } from '../../config/feishu.config';

const RULE_TABLE = '业务-提成规则';

const FIELDS_TO_ENSURE: Array<[string, number]> = [
  ['适用部门', 1],
  ['是否启用', 1],
];

@Injectable()
export class CommissionRuleFieldsService {
  private readonly logger = new Logger(CommissionRuleFieldsService.name);

  constructor(private readonly bitable: BitableService) {}

  /** 启动时幂等补建「业务-提成规则」的 适用部门/是否启用 文本列（不阻断启动） */
  async onModuleInit(): Promise<void> {
    try {
      const tableId = getTableId(RULE_TABLE);
      const res: unknown = await this.bitable.listFields(tableId);
      const fields: Array<{ field_name?: string }> = Array.isArray(res)
        ? (res as Array<{ field_name?: string }>)
        : (((res as { data?: { items?: Array<{ field_name?: string }> } })?.data?.items || []) as Array<{ field_name?: string }>);
      const names = new Set(fields.map((f) => String(f?.field_name || '')));
      for (const [name, type] of FIELDS_TO_ENSURE) {
        if (names.has(name)) continue;
        await this.bitable.createField(tableId, { field_name: name, type });
        this.logger.log(`已为 ${RULE_TABLE} 补建字段「${name}」`);
      }
    } catch (err) {
      this.logger.warn(`提成规则字段补建失败（不阻断模块启动）: ${err instanceof Error ? err.message : err}`);
    }
  }
}
