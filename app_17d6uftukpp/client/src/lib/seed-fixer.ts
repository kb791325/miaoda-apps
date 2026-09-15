// EXPORTS: fixAllSeedData, SeedFixResult
import { capabilityClient, logger } from '@lark-apaas/client-toolkit';

export interface SeedFixResult {
  table: string;
  total: number;
  updated: number;
  errors: string[];
}

/** 库存表 - 真实办公/拍摄物资 */
const STOCK_ITEMS = [
  { name: 'A4打印纸', spec: '70g 500张/包 5包/箱', qty: 45, safeQty: 10, category: '办公用品', unit: '箱', location: 'A区-1号柜' },
  { name: '移动硬盘', spec: '2TB USB 3.2 Type-C', qty: 8, safeQty: 3, category: '电子耗材', unit: '个', location: 'B区-2号柜' },
  { name: 'LED补光灯', spec: '60W 双色温 3200K-5600K', qty: 5, safeQty: 2, category: '拍摄耗材', unit: '台', location: 'C区-器材室' },
  { name: '64G SD卡', spec: 'U3 V30 读取170MB/s', qty: 3, safeQty: 5, category: '拍摄耗材', unit: '张', location: 'C区-器材室' },
  { name: '碳纤维三脚架', spec: '承重8kg 4节反折 1.2kg', qty: 4, safeQty: 2, category: '拍摄耗材', unit: '个', location: 'C区-器材室' },
  { name: '无线领夹麦', spec: '2.4GHz 一拖二 续航8h', qty: 6, safeQty: 3, category: '拍摄耗材', unit: '套', location: 'C区-器材室' },
  { name: '64G U盘', spec: 'USB 3.2 读取200MB/s', qty: 20, safeQty: 5, category: '电子耗材', unit: '个', location: 'B区-2号柜' },
  { name: '打印机硒鼓', spec: 'HP 26A 黑色 3100页', qty: 2, safeQty: 3, category: '办公用品', unit: '个', location: 'A区-1号柜' },
  { name: '人体工学办公椅', spec: '网布靠背 可调腰托 升降扶手', qty: 12, safeQty: 2, category: '办公用品', unit: '把', location: 'D区-仓库' },
  { name: '相机电池', spec: 'NP-FZ100 2280mAh 原厂', qty: 4, safeQty: 3, category: '拍摄耗材', unit: '块', location: 'C区-器材室' },
];

/** 合同模版 - 真实模版名 */
const CONTRACT_TPL_ITEMS = [
  { name: '广告投放框架协议模版', type: '广告投放合同', industry: '全行业' },
  { name: '广告投放单项合同模版', type: '广告投放合同', industry: '全行业' },
  { name: '短视频制作合同模版', type: '视频制作合同', industry: '全行业' },
  { name: '视频年度框架合同模版', type: '视频制作合同', industry: '全行业' },
  { name: '补充协议模版', type: '补充协议', industry: '全行业' },
  { name: '服务外包合同模版', type: '服务合同', industry: '全行业' },
  { name: '年度框架合作协议模版', type: '年度框架合同', industry: '电商' },
  { name: '保密协议模版', type: '其他', industry: '全行业' },
  { name: '销售服务合同模版', type: '服务合同', industry: '电商' },
  { name: '其他通用协议模版', type: '其他', industry: '全行业' },
];

/** 角色权限 - 真实角色 */
const ROLE_ITEMS = [
  { name: '超级管理员', code: 'ROLE_ADMIN', scope: '全部', menus: '全部模块', desc: '系统最高权限，可管理所有模块与系统配置' },
  { name: '商务总监', code: 'ROLE_BIZ_DIRECTOR', scope: '本部门及下级', menus: '客户/广告/视频/合同/工作台', desc: '商务部门管理，可查看部门及下级数据' },
  { name: '客户经理(销售)', code: 'ROLE_SALES', scope: '本部门', menus: '客户/合同/工作台', desc: '客户开发与维护，管理个人客户与合同' },
  { name: '媒介优化师', code: 'ROLE_MEDIA', scope: '本部门', menus: '广告/工作台', desc: '广告投放优化，管理广告项目与数据' },
  { name: '视频项目经理', code: 'ROLE_VIDEO_PM', scope: '本部门', menus: '视频/工作台', desc: '视频项目制作管理' },
  { name: '财务会计', code: 'ROLE_FINANCE', scope: '本部门', menus: '财务/合同/工作台', desc: '财务核算与收支管理' },
  { name: 'HR人事', code: 'ROLE_HR', scope: '本部门', menus: '人资/行政/工作台', desc: '人事管理与员工档案' },
  { name: '行政专员', code: 'ROLE_ADMIN', scope: '本部门', menus: '行政/工作台', desc: '行政事务与资产管理' },
  { name: '管理层(老板)', code: 'ROLE_BOSS', scope: '全部', menus: '全部模块(只读)', desc: '公司经营全貌，所有模块只读权限' },
  { name: '只读访客', code: 'ROLE_GUEST', scope: '仅本人', menus: '工作台', desc: '仅查看工作台概况，无编辑权限' },
];

/** 系统设置 - 5类真实参数 */
const SETTING_ITEMS = [
  { cat: '公海规则', key: 'poolReclaimDays', label: '公海回收天数', val: '15', unit: '天', desc: '客户超过此天数未跟进将自动回收至公海' },
  { cat: '公海规则', key: 'poolPerPersonLimit', label: '每人领取上限', val: '20', unit: '个', desc: '每人累计可从公海领取的客户上限' },
  { cat: '公海规则', key: 'poolDailyLimit', label: '每日领取上限', val: '5', unit: '个', desc: '每人每天可从公海领取的客户上限' },
  { cat: '公海规则', key: 'poolAutoAssign', label: '自动分配开关', val: '开启', unit: '', desc: '是否开启公海自动分配' },
  { cat: '公海规则', key: 'poolAssignMethod', label: '分配方式', val: '轮询', unit: '', desc: '自动分配策略（轮询/随机/负载均衡）' },
  { cat: '审批流程', key: 'approvalContractNode', label: '合同审批节点', val: '商务总监→法务→老板', unit: '', desc: '合同审批链' },
  { cat: '审批流程', key: 'approvalAdOpenNode', label: '开户审批节点', val: '媒介总监→运营总监', unit: '', desc: '广告开户审批链' },
  { cat: '审批流程', key: 'approvalPurchaseNode', label: '采购审批节点', val: '部门经理→财务→老板', unit: '', desc: '采购审批链' },
  { cat: '审批流程', key: 'approvalVideoNode', label: '视频订单审批节点', val: '项目经理→商务总监', unit: '', desc: '视频订单审批链' },
  { cat: '编号规则', key: 'prefixCustomer', label: '客户编号前缀', val: 'KH', unit: '', desc: '客户编号前缀+日期+4位自增' },
  { cat: '编号规则', key: 'prefixContract', label: '合同编号前缀', val: 'HT', unit: '', desc: '合同编号前缀+日期+4位自增' },
  { cat: '编号规则', key: 'prefixAdAccount', label: '广告账户前缀', val: 'AD', unit: '', desc: '广告账户编号前缀+日期+4位自增' },
  { cat: '编号规则', key: 'prefixVideo', label: '视频项目前缀', val: 'XM', unit: '', desc: '视频项目编号前缀+日期+4位自增' },
  { cat: '编号规则', key: 'prefixPurchase', label: '采购编号前缀', val: 'CGD', unit: '', desc: '采购编号前缀+日期+4位自增' },
  { cat: '提成规则', key: 'adComTier1', label: '广告提成T1(≤10万)', val: '8%', unit: '', desc: '广告消耗≤10万提成比例' },
  { cat: '提成规则', key: 'adComTier2', label: '广告提成T2(10-50万)', val: '12%', unit: '', desc: '广告消耗10-50万提成比例' },
  { cat: '提成规则', key: 'adComTier3', label: '广告提成T3(>50万)', val: '15%', unit: '', desc: '广告消耗>50万提成比例' },
  { cat: '提成规则', key: 'videoComTier1', label: '视频提成T1(≤5万)', val: '10%', unit: '', desc: '视频项目≤5万提成比例' },
  { cat: '提成规则', key: 'videoComTier2', label: '视频提成T2(>5万)', val: '18%', unit: '', desc: '视频项目>5万提成比例' },
  { cat: '系统参数', key: 'taxRate', label: '默认税点', val: '6%', unit: '', desc: '增值税税率' },
  { cat: '系统参数', key: 'stockWarningThreshold', label: '库存预警阈值', val: '10', unit: '个', desc: '库存低于此数量时标红预警' },
  { cat: '系统参数', key: 'balanceWarningThreshold', label: '账户余额预警阈值', val: '5000', unit: '元', desc: '账户余额低于此金额时预警' },
  { cat: '系统参数', key: 'customerWarningDays', label: '客户跟进预警天数', val: '7', unit: '天', desc: '客户超过此天数未跟进则预警' },
  { cat: '系统参数', key: 'contractExpireWarningDays', label: '合同到期预警天数', val: '30', unit: '天', desc: '合同到期前预警天数' },
];

/** 修复库存表 */
async function fixStock(): Promise<SeedFixResult> {
  const result: SeedFixResult = { table: '库存表', total: 0, updated: 0, errors: [] };
  try {
    const resp = await capabilityClient.load('feishu_multitable_crud_analysis_55').call('searchRecords', { tableId: 'tblTyRXuhrO3wy1N' }) as { records?: any[] };
    const records = resp?.records ?? [];
    result.total = records.length;
    if (records.length === 0) { result.errors.push('无记录'); return result; }

    const updates = records.slice(0, 10).map((r: any, i: number) => {
      const item = STOCK_ITEMS[i] ?? STOCK_ITEMS[0];
      const isLow = item.qty < item.safeQty;
      return {
        id: r.id ?? r.record_id,
        record: {
          '物品名称': item.name,
          '规格型号': item.spec,
          '库存数量': item.qty,
          '安全库存': item.safeQty,
          '状态': isLow ? '库存不足' : '正常',
          '类别': item.category,
          '单位': item.unit,
          '存放位置': item.location,
        },
      };
    });
    await capabilityClient.load('feishu_multitable_crud_analysis_55').call('batchUpdateRecords', { records: updates });
    result.updated = updates.length;
    logger.info('库存表修复完成', `${updates.length}条`);
  } catch (e) {
    result.errors.push(String(e));
    logger.error('库存表修复失败', String(e));
  }
  return result;
}

/** 修复合同模版表 */
async function fixContractTpl(): Promise<SeedFixResult> {
  const result: SeedFixResult = { table: '合同模版表', total: 0, updated: 0, errors: [] };
  try {
    const resp = await capabilityClient.load('feishu_multitable_crud_analysis_27').call('searchRecords', { tableId: 'tbltyln1z5QqBymr' }) as { records?: any[] };
    const records = resp?.records ?? [];
    result.total = records.length;
    if (records.length === 0) { result.errors.push('无记录'); return result; }

    const updates = records.slice(0, 10).map((r: any, i: number) => {
      const item = CONTRACT_TPL_ITEMS[i] ?? CONTRACT_TPL_ITEMS[0];
      return {
        id: r.id ?? r.record_id,
        record: {
          '模版名称': item.name,
          '合同类型': item.type,
          '适用行业': item.industry,
          '状态': '启用',
        },
      };
    });
    await capabilityClient.load('feishu_multitable_crud_analysis_27').call('batchUpdateRecords', { records: updates });
    result.updated = updates.length;
    logger.info('合同模版修复完成', `${updates.length}条`);
  } catch (e) {
    result.errors.push(String(e));
    logger.error('合同模版修复失败', String(e));
  }
  return result;
}

/** 修复角色权限表 */
async function fixRole(): Promise<SeedFixResult> {
  const result: SeedFixResult = { table: '角色权限表', total: 0, updated: 0, errors: [] };
  try {
    const resp = await capabilityClient.load('feishu_bitable_management_crud_analysis_72').call('searchRecords', { tableId: 'tblgwOGNNtn2XiiF' }) as { records?: any[] };
    const records = resp?.records ?? [];
    result.total = records.length;
    if (records.length === 0) { result.errors.push('无记录'); return result; }

    const updates = records.slice(0, 10).map((r: any, i: number) => {
      const item = ROLE_ITEMS[i] ?? ROLE_ITEMS[0];
      return {
        id: r.id ?? r.record_id,
        record: {
          '角色名称': item.name,
          '角色编号': item.code,
          '数据权限范围': item.scope,
          '菜单权限': item.menus,
          '角色描述': item.desc,
          '状态': '启用',
        },
      };
    });
    await capabilityClient.load('feishu_bitable_management_crud_analysis_72').call('batchUpdateRecords', { records: updates });
    result.updated = updates.length;
    logger.info('角色权限修复完成', `${updates.length}条`);
  } catch (e) {
    result.errors.push(String(e));
    logger.error('角色权限修复失败', String(e));
  }
  return result;
}

/** 修复系统设置表 */
async function fixSystemSettings(): Promise<SeedFixResult> {
  const result: SeedFixResult = { table: '系统设置表', total: 0, updated: 0, errors: [] };
  try {
    const resp = await capabilityClient.load('feishu_multitable_crud_analysis_9').call('searchRecords', { tableId: 'tbljF0XqkOYbdKOn' }) as { records?: any[] };
    const records = resp?.records ?? [];
    result.total = records.length;

    // 先删除旧的占位记录，再批量新增真实设置
    if (records.length > 0) {
      const oldIds = records.map((r: any) => r.id ?? r.record_id).filter(Boolean);
      if (oldIds.length > 0) {
        await capabilityClient.load('feishu_multitable_crud_analysis_9').call('deleteRecords', { recordIDs: oldIds });
      }
    }

    // 批量新增真实设置
    const newRecords = SETTING_ITEMS.map((item) => ({
      record: {
        '设置项': item.key,
        '设置值': item.val,
        '设置分类': item.cat,
        '说明': item.desc,
        '状态': '启用',
      },
    }));
    await capabilityClient.load('feishu_multitable_crud_analysis_9').call('batchAddRecords', { records: newRecords });
    result.updated = newRecords.length;
    logger.info('系统设置修复完成', `${newRecords.length}条`);
  } catch (e) {
    result.errors.push(String(e));
    logger.error('系统设置修复失败', String(e));
  }
  return result;
}

/** 一键修复所有种子数据 */
export async function fixAllSeedData(): Promise<SeedFixResult[]> {
  const results: SeedFixResult[] = [];
  results.push(await fixStock());
  results.push(await fixContractTpl());
  results.push(await fixRole());
  results.push(await fixSystemSettings());
  return results;
}