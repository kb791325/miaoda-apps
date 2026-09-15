import { Injectable, Logger } from '@nestjs/common';
import { CapabilityService } from '@lark-apaas/fullstack-nestjs-core';

interface SearchResult {
  records: Array<{ id: string; record: Record<string, unknown> }>;
  hasMore?: boolean;
  total?: number;
}

@Injectable()
export class DataFixService {
  private readonly logger = new Logger(DataFixService.name);

  constructor(private readonly capabilityService: CapabilityService) {}

  private async searchAll(
    instanceId: string,
    tableId: string,
  ): Promise<Array<{ id: string; record: Record<string, unknown> }>> {
    const all: Array<{ id: string; record: Record<string, unknown> }> = [];
    let pageToken: string | undefined;
    do {
      const resp = (await this.capabilityService
        .load(instanceId)
        .call('searchRecords', {
          tableId,
          pageSize: 200,
          pageToken,
        })) as SearchResult;
      all.push(...resp.records);
      pageToken = resp.hasMore
        ? ((resp as unknown as { pageToken?: string }).pageToken)
        : undefined;
    } while (pageToken);
    return all;
  }

  async fixAuditLogs(): Promise<{ updated: number }> {
    const instanceId = 'feishu_bitable_role_permission_1';
    const tableId = 'tbljF0XqkOYbdKOn';
    const records = await this.searchAll(instanceId, tableId);
    this.logger.log(`审计日志: 共 ${records.length} 条`);

    const realDescriptions: Record<string, string> = {
      '操作对象-01': '新增客户：华美广告传媒有限公司',
      '操作对象-02': '修改广告账户余额至50000元',
      '操作对象-03': '导出客户清单共156条',
      '操作对象-04': '审批通过合同HT-20260801',
      '操作对象-05': '删除过期线索32条',
      '操作对象-06': '导入视频项目排期表',
      '操作对象-07': '审批驳回合同HT-20260815',
      '操作对象-08': '修改员工张伟的部门归属',
      '操作对象-09': '新增任务：Q3季度广告投放计划',
      '操作对象-10': '批量分配公海客资15条',
    };

    const tableFixMap: Record<string, string> = {
      '更新purchaseOrder记录': '更新采购订单记录',
      '更新role记录': '更新角色权限记录',
      '更新customer记录': '更新客户档案记录',
    };

    let updated = 0;
    const updates: Array<{ id: string; record: Record<string, unknown> }> = [];

    for (const r of records) {
      const desc = this.textVal(r.record['操作对象']);
      let newDesc = realDescriptions[desc];
      if (!newDesc) {
        newDesc = tableFixMap[desc];
        if (!newDesc) {
          for (const [old, replacement] of Object.entries(tableFixMap)) {
            if (desc.includes(old)) {
              newDesc = desc.replace(old, replacement)
                .replace(/f\d+:/g, '')
                .replace(/\s*:\s*/g, '：')
                .replace(/\s+/g, ' ')
                .trim();
              break;
            }
          }
        }
      }
      if (newDesc && newDesc !== desc) {
        updates.push({ id: r.id, record: { '操作对象': newDesc } });
        updated++;
      }
    }

    if (updates.length > 0) {
      await this.capabilityService
        .load(instanceId)
        .call('batchUpdateRecords', { records: updates });
    }
    return { updated };
  }

  async fixAttendance(): Promise<{ updated: number }> {
    const instanceId = 'feishu_multitable_crud_analysis_45';
    const tableId = 'tblue1kbelXb7dv1';
    const records = await this.searchAll(instanceId, tableId);
    this.logger.log(`考勤: 共 ${records.length} 条`);

    const leaveTypes = [
      '事假', '病假', '年假', '婚假', '产假',
      '丧假', '调休',
    ];

    const updates: Array<{ id: string; record: Record<string, unknown> }> = [];
    const baseDate = new Date('2026-09-01T00:00:00+08:00');

    for (let i = 0; i < Math.min(records.length, 10); i++) {
      const r = records[i];
      const leaveType = this.textVal(r.record['请假类型']);
      const isLeave = leaveTypes.includes(leaveType);

      const dayOffset = i;
      const date = new Date(baseDate);
      date.setDate(date.getDate() + dayOffset);

      const clockIn = new Date(date);
      clockIn.setHours(8, 50 + (i % 6), 0, 0);
      const clockOut = new Date(date);
      clockOut.setHours(18, (i % 10), 0, 0);

      const status = isLeave
        ? '请假'
        : (i === 3 ? '迟到' : i === 6 ? '早退' : i === 8 ? '缺勤' : '正常');

      const record: Record<string, unknown> = {
        '考勤日期': clockIn.getTime(),
        '上班打卡时间': clockIn.getTime(),
        '下班打卡时间': clockOut.getTime(),
        '考勤状态': status,
      };

      updates.push({ id: r.id, record });
    }

    if (updates.length > 0) {
      await this.capabilityService
        .load(instanceId)
        .call('batchUpdateRecords', { records: updates });
    }
    return { updated: updates.length };
  }

  async fixSignIn(): Promise<{ updated: number }> {
    const instanceId = 'feishu_multitable_crud_analysis_49';
    const tableId = 'tbluzKLb50LHkbNP';
    const records = await this.searchAll(instanceId, tableId);
    this.logger.log(`签到: 共 ${records.length} 条`);

    const eventNames = [
      '9月全员大会', '新员工入职培训', '季度复盘会',
      '产品宣讲会', '客户答谢晚宴', '团队建设活动',
      '技术分享沙龙', '月度经营分析会', '年度战略研讨会',
      '合作伙伴交流会',
    ];

    const updates: Array<{ id: string; record: Record<string, unknown> }> = [];
    for (let i = 0; i < Math.min(records.length, 10); i++) {
      const r = records[i];
      updates.push({
        id: r.id,
        record: { '关联活动': eventNames[i % eventNames.length] },
      });
    }

    if (updates.length > 0) {
      await this.capabilityService
        .load(instanceId)
        .call('batchUpdateRecords', { records: updates });
    }
    return { updated: updates.length };
  }

  async fixMaterial(): Promise<{ updated: number }> {
    const instanceId = 'feishu_multitable_crud_analysis_68';
    const tableId = 'tblNLk4DNKkIEHQR';
    const records = await this.searchAll(instanceId, tableId);
    this.logger.log(`素材库: 共 ${records.length} 条`);

    const materialData: Array<{ name: string; type: string }> = [
      { name: '618大促口播短视频', type: '口播' },
      { name: '品牌形象宣传片', type: '品牌宣传片' },
      { name: '产品开箱测评', type: '开箱测评' },
      { name: '直播间引流切片', type: '直播切片' },
      { name: '剧情短片：职场那些事', type: '剧情' },
      { name: '产品功能演示动画', type: '动画' },
      { name: '图文种草笔记合集', type: '图文' },
      { name: '双11预热口播素材', type: '口播' },
      { name: '企业宣传片花絮', type: '品牌宣传片' },
      { name: '新品发布会直播切片', type: '直播切片' },
    ];

    const updates: Array<{ id: string; record: Record<string, unknown> }> = [];
    for (let i = 0; i < Math.min(records.length, 10); i++) {
      const r = records[i];
      const m = materialData[i];
      updates.push({
        id: r.id,
        record: { '素材名称': m.name, '素材类型': m.type },
      });
    }

    if (updates.length > 0) {
      await this.capabilityService
        .load(instanceId)
        .call('batchUpdateRecords', { records: updates });
    }
    return { updated: updates.length };
  }

  private textVal(v: unknown): string {
    if (v === null || v === undefined) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'object' && v !== null && 'text' in (v as Record<string, unknown>)) {
      return String((v as Record<string, unknown>).text ?? '');
    }
    return String(v);
  }
}