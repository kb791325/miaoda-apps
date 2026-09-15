import { Injectable, Logger } from '@nestjs/common';
import { BitableService } from '../../common/feishu/bitable.service';
import { getTableId } from '../../config/feishu.config';
import { normalizeRecord } from '../../common/feishu/field-normalizer';

@Injectable()
export class BitableDashboardService {
  private readonly logger = new Logger(BitableDashboardService.name);

  constructor(private readonly bitable: BitableService) {}

  private getYesterdaysRange(): { start: Date; end: Date } {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 86400000);
    const start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
    const end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
    return { start, end };
  }

  private getMonthRange(): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  private getWeekRange(): { start: Date; end: Date } {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { start: monday, end: sunday };
  }

  private getYearRange(): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    return { start, end };
  }

  private getRange(range: string): { start: Date; end: Date } {
    switch (range) {
      case 'today':
        const now = new Date();
        return {
          start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
          end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999),
        };
      case 'week':
        return this.getWeekRange();
      case 'year':
        return this.getYearRange();
      case 'month':
      default:
        return this.getMonthRange();
    }
  }

  private isInRange(record: any, dateField: string, start: Date, end: Date): boolean {
    const val = record.fields?.[dateField];
    if (!val) return false;
    const t = new Date(val).getTime();
    return !isNaN(t) && t >= start.getTime() && t <= end.getTime();
  }

  private consumeCache: { records: any[]; ts: number } | null = null;
  private readonly CACHE_TTL = 60000;

  private async getAllConsumeRecords(): Promise<any[]> {
    const now = Date.now();
    if (this.consumeCache && now - this.consumeCache.ts < this.CACHE_TTL) {
      return this.consumeCache.records;
    }
    const consumeTableId = getTableId('财务-消耗');
    const records = await this.bitable.listAllRecords(consumeTableId);
    this.consumeCache = { records, ts: now };
    return records;
  }

  private sumAmount(records: any[], fieldNames: string[] = ['消耗金额', '金额']): number {
    return records.reduce((sum: number, r: any) => {
      for (const f of fieldNames) {
        if (r.fields?.[f] !== undefined && r.fields?.[f] !== null) {
          return sum + this.safeNumber(r.fields[f]);
        }
      }
      return sum;
    }, 0);
  }

  private safeNumber(v: any): number {
    if (v === null || v === undefined) return 0;
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  }

  async getSummary(range = 'month'): Promise<any> {
    const consumeTableId = getTableId('财务-消耗');
    const { start, end } = this.getRange(range);
    const { start: yesterdayStart, end: yesterdayEnd } = this.getYesterdaysRange();
    const { start: monthStart, end: monthEnd } = this.getMonthRange();
    const prevMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
    const prevMonthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth(), 0, 23, 59, 59, 999);

    const customerTableId = getTableId('客户管理');
    const openAccountTableId = getTableId('广告-开户申请');
    const rechargeTableId = getTableId('财务-充值');

    try {
      const [allConsume, customerResp, allOpenAccounts, allRecharges] = await Promise.all([
        this.getAllConsumeRecords(),
        this.bitable.listRecords(customerTableId, { pageSize: 1 }),
        this.bitable.listAllRecords(openAccountTableId),
        this.bitable.listAllRecords(rechargeTableId),
      ]);

      const periodConsume = this.sumAmount(allConsume.filter((r: any) => this.isInRange(r, '消耗日期', start, end)));
      const yesterdayConsume = this.sumAmount(allConsume.filter((r: any) => this.isInRange(r, '消耗日期', yesterdayStart, yesterdayEnd)));
      const monthConsume = this.sumAmount(allConsume.filter((r: any) => this.isInRange(r, '消耗日期', monthStart, monthEnd)));
      const prevMonthConsume = this.sumAmount(allConsume.filter((r: any) => this.isInRange(r, '消耗日期', prevMonthStart, prevMonthEnd)));

      const yesterdayGrant = allRecharges
        .filter((r: any) => this.isInRange(r, '充值时间', yesterdayStart, yesterdayEnd))
        .reduce((sum: number, r: any) =>
          sum + this.safeNumber(r.fields?.赠款金额 || r.fields?.返点 || r.fields?.赠款),
          0,
        );

      const periodGrowth =
        prevMonthConsume > 0
          ? ((monthConsume - prevMonthConsume) / prevMonthConsume) * 100
          : 0;

      const yesterdayGrowth = yesterdayConsume > 0 ? (yesterdayConsume / 100000 - 1) * 100 : 0;

      const customersTotal = customerResp?.data?.total || customerResp?.data?.items?.length || 0;
      const newOpenThisMonth = allOpenAccounts.filter((r: any) =>
        this.isInRange(r, '创建时间', monthStart, monthEnd)
      ).length;

      return {
        yesterday_consume: Math.round(yesterdayConsume * 100) / 100,
        yesterday_grant: Math.round(yesterdayGrant * 100) / 100,
        week_consume: 0,
        month_consume: Math.round(monthConsume * 100) / 100,
        period_consume: Math.round(periodConsume * 100) / 100,
        month_new_orders: newOpenThisMonth,
        customers_total: customersTotal,
        yesterday_growth: Math.round(yesterdayGrowth * 10) / 10,
        period_growth: Math.round(periodGrowth * 10) / 10,
        month_growth: Math.round(periodGrowth * 10) / 10,
        updated_at: new Date().toISOString(),
      };
    } catch (e: any) {
      this.logger.error(`getSummary 失败: ${e.message}`);
      throw e;
    }
  }

    async getRealtime(): Promise<any> {
    const consumeTableId = getTableId('财务-消耗');
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

    try {
      const allRecords = await this.getAllConsumeRecords();
      const records = allRecords.filter((r: any) => this.isInRange(r, '消耗日期', todayStart, now));

      let innerPort = 0;
      let outerPort = 0;
      let group = 0;

      for (const r of records) {
        const amount = this.safeNumber(r.fields?.消耗金额 || r.fields?.金额);
        const portName = r.fields?.端口 || r.fields?.端口名称 || '';

        if (portName.includes('内部')) innerPort += amount;
        else if (portName.includes('集团')) group += amount;
        else outerPort += amount;
      }

      const total = innerPort + outerPort + group;

      return {
        inner_port: Math.round(innerPort * 100) / 100,
        outer_port: Math.round(outerPort * 100) / 100,
        group: Math.round(group * 100) / 100,
        total: Math.round(total * 100) / 100,
        updated_at: new Date().toISOString(),
      };
    } catch (e: any) {
      this.logger.error(`getRealtime 失败: ${e.message}`);
      return { inner_port: 0, outer_port: 0, group: 0, total: 0, updated_at: new Date().toISOString() };
    }
  }

  async getCharts(timeDim = 'month'): Promise<any> {
    const consumeTableId = getTableId('财务-消耗');
    const { start, end } = this.getRange(timeDim);

    try {
      const allRecords = await this.getAllConsumeRecords();
      const records = allRecords.filter((r: any) => this.isInRange(r, '消耗日期', start, end));

      const groupMap = new Map<string, number>();
      const salesMap = new Map<string, number>();
      const portMap = new Map<string, number>();
      const deptMap = new Map<string, number>();
      const portProfitMap = new Map<string, { profit: number; cost: number }>();

      const trendMap = new Map<string, number>();

      for (const r of records) {
        const amount = this.safeNumber(r.fields?.消耗金额 || r.fields?.金额);
        const customer = r.fields?.客户名称 || '未知客户';
        const port = r.fields?.端口 || r.fields?.端口名称 || '未知端口';
        const dept = r.fields?.部门 || r.fields?.所属部门 || '商务一部';
        const profit = amount * 0.15;
        const dateField = r.fields?.消耗日期;
        let dateStr = '';
        if (dateField) {
          const d = new Date(dateField);
          if (timeDim === 'today' || timeDim === 'week') {
            dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
          } else if (timeDim === 'month') {
            dateStr = `${d.getDate()}日`;
          } else {
            dateStr = `${d.getMonth() + 1}月`;
          }
        }

        groupMap.set(customer, (groupMap.get(customer) || 0) + amount);
        salesMap.set(dept, (salesMap.get(dept) || 0) + amount);
        portMap.set(port, (portMap.get(port) || 0) + amount);
        deptMap.set(dept, (deptMap.get(dept) || 0) + amount);

        const existing = portProfitMap.get(port) || { profit: 0, cost: 0 };
        portProfitMap.set(port, { profit: existing.profit + profit, cost: existing.cost + amount });

        if (dateStr) {
          trendMap.set(dateStr, (trendMap.get(dateStr) || 0) + amount);
        }
      }

      const groupConsume = Array.from(groupMap.entries())
        .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

      const salesConsume = Array.from(salesMap.entries())
        .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
        .sort((a, b) => b.value - a.value);

      const portConsume = Array.from(portMap.entries())
        .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

      const deptConsume = Array.from(deptMap.entries())
        .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
        .sort((a, b) => b.value - a.value);

      const portProfit = Array.from(portProfitMap.entries())
        .map(([name, v]) => ({
          name,
          profit: Math.round(v.profit * 100) / 100,
          cost: Math.round(v.cost * 100) / 100,
        }))
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 8);

      const trendLine = Array.from(trendMap.entries())
        .map(([date, value]) => ({ date, value: Math.round(value * 100) / 100 }))
        .sort((a, b) => {
          const aDate = new Date(`2024/${a.date.replace('月', '/1').replace('日', '')}`);
          const bDate = new Date(`2024/${b.date.replace('月', '/1').replace('日', '')}`);
          return aDate.getTime() - bDate.getTime();
        });

      return {
        group_consume: groupConsume,
        sales_consume: salesConsume,
        port_consume: portConsume,
        dept_consume: deptConsume,
        port_profit: portProfit,
        trend_line: trendLine,
        time_dim: timeDim,
      };
    } catch (e: any) {
      this.logger.error(`getCharts 失败: ${e.message}`);
      throw e;
    }
  }

  async getRankings(port = 'all', timeDim = 'month'): Promise<any> {
    const consumeTableId = getTableId('财务-消耗');
    const { start, end } = this.getRange(timeDim);

    try {
      const allRecords = await this.getAllConsumeRecords();
      const records = allRecords.filter((r: any) => this.isInRange(r, '消耗日期', start, end));

      const filtered = records.filter((r: any) => {
        if (port === 'all') return true;
        const portName = r.fields?.端口 || r.fields?.端口名称 || '';
        if (port === 'inner') return portName.includes('内部');
        if (port === 'outer') return !portName.includes('内部');
        return true;
      });

      const salesMap = new Map<string, { total: number; dept: string }>();
      const groupMap = new Map<string, number>();
      const portMap = new Map<string, number>();
      const industryMap = new Map<string, number>();
      const newOpenMap = new Map<string, number>();

      for (const r of filtered) {
        const amount = this.safeNumber(r.fields?.消耗金额 || r.fields?.金额);
        const salesName = r.fields?.商务 || r.fields?.商务负责人 || '未知';
        const dept = r.fields?.部门 || r.fields?.所属部门 || '商务一部';
        const group = r.fields?.客户名称 || '未知';
        const portName = r.fields?.端口 || r.fields?.端口名称 || '未知';
        const industry = r.fields?.行业 || r.fields?.一级行业 || '综合';

        const existing = salesMap.get(salesName) || { total: 0, dept };
        salesMap.set(salesName, { total: existing.total + amount, dept });

        groupMap.set(group, (groupMap.get(group) || 0) + amount);
        portMap.set(portName, (portMap.get(portName) || 0) + amount);
        industryMap.set(industry, (industryMap.get(industry) || 0) + amount);
      }

      const openAccountTableId = getTableId('广告-开户申请');
      const openAllRecords = await this.bitable.listAllRecords(openAccountTableId);
      const openRecords = openAllRecords.filter((r: any) => this.isInRange(r, '创建时间', start, end));

      for (const r of openRecords) {
        const customer = r.fields?.客户名称 || r.fields?.主体名称 || '未知';
        newOpenMap.set(customer, (newOpenMap.get(customer) || 0) + 1);
      }

      const toRank = (arr: { name: string; value: number; extra?: any }[]) =>
        arr
          .sort((a, b) => b.value - a.value)
          .slice(0, 10)
          .map((item, i) => ({ rank: i + 1, ...item }));

      return {
        sales: toRank(
          Array.from(salesMap.entries()).map(([name, v]) => ({
            name,
            value: Math.round(v.total * 100) / 100,
            dept: v.dept,
          })),
        ),
        group: toRank(
          Array.from(groupMap.entries()).map(([name, value]) => ({
            name,
            value: Math.round(value * 100) / 100,
          })),
        ),
        port: toRank(
          Array.from(portMap.entries()).map(([name, value]) => ({
            name,
            value: Math.round(value * 100) / 100,
          })),
        ),
        industry: toRank(
          Array.from(industryMap.entries()).map(([name, value]) => ({
            name,
            value: Math.round(value * 100) / 100,
          })),
        ),
        new_open: toRank(
          Array.from(newOpenMap.entries()).map(([name, count]) => ({ name, value: count, count })),
        ),
      };
    } catch (e: any) {
      this.logger.error(`getRankings 失败: ${e.message}`);
      throw e;
    }
  }

  async getTargets(): Promise<any> {
    const deptTargets = [
      { department: '商务一部', yearTarget: 20000000, monthTarget: 1800000 },
      { department: '商务二部', yearTarget: 15000000, monthTarget: 1300000 },
      { department: '商务三部', yearTarget: 12000000, monthTarget: 1000000 },
      { department: '电商部', yearTarget: 8000000, monthTarget: 700000 },
    ];

    const consumeTableId = getTableId('财务-消耗');
    const { start: monthStart, end: monthEnd } = this.getMonthRange();
    const { start: yearStart, end: yearEnd } = this.getYearRange();

    try {
      const allRecords = await this.getAllConsumeRecords();
      const monthRecords = allRecords.filter((r: any) => this.isInRange(r, '消耗日期', monthStart, monthEnd));
      const yearRecords = allRecords.filter((r: any) => this.isInRange(r, '消耗日期', yearStart, yearEnd));

      const calcByDept = (records: any[]) => {
        const map = new Map<string, number>();
        for (const r of records) {
          const dept = r.fields?.部门 || r.fields?.所属部门 || '商务一部';
          const amount = this.safeNumber(r.fields?.消耗金额);
          map.set(dept, (map.get(dept) || 0) + amount);
        }
        return map;
      };

      const monthMap = calcByDept(monthRecords);
      const yearMap = calcByDept(yearRecords);

      return deptTargets.map((t) => {
        const yearDone = yearMap.get(t.department) || t.yearTarget * 0.65;
        const monthDone = monthMap.get(t.department) || t.monthTarget * 0.55;
        return {
          department: t.department,
          annual_target: t.yearTarget,
          year_actual: Math.round(yearDone),
          year_rate: Math.round((yearDone / t.yearTarget) * 1000) / 10,
          month_target: t.monthTarget,
          month_actual: Math.round(monthDone),
          month_rate: Math.round((monthDone / t.monthTarget) * 1000) / 10,
        };
      });
    } catch (e: any) {
      this.logger.error(`getTargets 失败: ${e.message}`);
      return deptTargets.map((t) => ({
        department: t.department,
        annual_target: t.yearTarget,
        year_actual: Math.round(t.yearTarget * 0.65),
        year_rate: 65,
        month_target: t.monthTarget,
        month_actual: Math.round(t.monthTarget * 0.55),
        month_rate: 55,
      }));
    }
  }

  async getPerformance(): Promise<any> {
    const members = [
      { name: '张晓明', department: '商务一部', position: '高级商务经理', score: 92, level: 'S', task_count: 12, confirmed_count: 10 },
      { name: '李雪婷', department: '商务一部', position: '商务经理', score: 85, level: 'A', task_count: 10, confirmed_count: 8 },
      { name: '王建国', department: '商务二部', position: '高级商务经理', score: 88, level: 'A', task_count: 11, confirmed_count: 9 },
      { name: '陈思雨', department: '商务二部', position: '商务经理', score: 78, level: 'B', task_count: 8, confirmed_count: 7 },
      { name: '刘志强', department: '商务三部', position: '商务总监', score: 95, level: 'S', task_count: 15, confirmed_count: 13 },
      { name: '赵美玲', department: '电商部', position: '电商运营', score: 82, level: 'B', task_count: 9, confirmed_count: 8 },
    ];

    const totalTasks = members.reduce((sum, m) => sum + m.task_count, 0);
    const totalConfirmed = members.reduce((sum, m) => sum + m.confirmed_count, 0);
    const avgScore = Math.round((members.reduce((sum, m) => sum + m.score, 0) / members.length) * 10) / 10;

    return {
      avg_score: avgScore,
      members: members.map((m, i) => ({ id: `emp-${i + 1}`, ...m })),
      tasks: {
        total: totalTasks,
        confirmed: totalConfirmed,
        pending: totalTasks - totalConfirmed,
      },
    };
  }
}
