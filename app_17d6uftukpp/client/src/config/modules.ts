// EXPORTS: FieldType, FieldTone, IFieldOption, IFieldConfig, IRowAction, IModuleConfig, MODULES, MODULE_ORDER, NAV_ITEMS
// 牧唐数智一体化 · 11 个模块的统一字段 / 筛选 / 行操作配置 (通用列表 / 详情 / 表单页的数据契约)
import type { LucideIcon } from 'lucide-react';
import {
  Users,
  Megaphone,
  Video,
  FileText,
  Wallet,
  IdCard,
  Building,
  CheckSquare,
  Settings,
  Headphones,
} from 'lucide-react';
import type { ModuleKey } from '@/data/mt-records';
import { SUB_MODULES, SUB_INSTANCE, SUB_NAV } from './sub-modules';
import { SUB_ACTIONS } from './sub-actions';

export type FieldType = 'text' | 'number' | 'date' | 'select' | 'textarea' | 'percent' | 'link' | 'datetime' | 'user' | 'attachment' | 'checkbox';

export type FieldTone = 'success' | 'warning' | 'destructive' | 'info' | 'secondary';

export interface IFieldOption {
  value: string;
  label: string;
  tone?: FieldTone;
}

export interface IFieldConfig {
  key: string;
  label: string;
  type: FieldType;
  options?: IFieldOption[];
  required?: boolean;
  inList?: boolean;
  inForm?: boolean;
  inDetail?: boolean;
  placeholder?: string;
  money?: boolean;
  /** 百分比/比例字段 (不渲染为¥) */
  percent?: boolean;
  /** 日期字段仅显示到月 (YYYY-MM) */
  monthOnly?: boolean;
  span?: 2;
  /** select 选项来自其它模块记录 (如关联客户 / 关联合同) */
  sourceModule?: ModuleKey;
  sourceField?: string;
  /** 多维表格中的真实列名 (缺省用 key) */
  bitableField?: string;
  /** 多维表格侧的 bizType (MultiSelect / DateTime / Url / Number / User / Checkbox / Attachment 等需要特化读写格式) */
  bitableType?: 'MultiSelect' | 'DateTime' | 'Url' | 'Number' | 'User' | 'Checkbox' | 'Attachment';
  /** 前端值 -> 多维表格枚举值 映射 */
  toBitableMap?: Record<string, string>;
  /** 多维表格枚举值 -> 前端值 映射 */
  fromBitableMap?: Record<string, string>;
}

export interface IRowAction {
  key: string;
  label: string;
  /** 当字段等于该值时显示 */
  visibleWhenEquals?: { field: string; value: string };
  /** 当字段等于该值时隐藏 */
  hiddenWhenEquals?: { field: string; value: string };
  /** 当字段值属于该集合时显示（优先级高于 visibleWhenEquals） */
  visibleWhenIn?: { field: string; values: string[] };
  /** 当字段值属于该集合时隐藏 */
  hiddenWhenIn?: { field: string; values: string[] };
  patch: Record<string, string>;
  confirm?: boolean;
  confirmTitle: string;
  confirmDescription: string;
  successMessage: string;
}

/** 工具栏批量操作按钮 */
export interface IToolbarAction {
  key: string;
  label: string;
  /** 需要选中 ≥ 1 条记录才能启用 */
  requiresSelection?: boolean;
  /** 触发时跳转路由 (如 /xxx/new) */
  navigateTo?: string;
  /** 批量 patch 更新选中记录 (配合 requiresSelection) */
  batchPatch?: Record<string, string>;
  /** 确认弹窗 */
  confirmTitle?: string;
  confirmDescription?: string;
  successMessage?: string;
  /** 仅当 filterField 值匹配时才显示 */
  visibleWhenTab?: string;
  /** 导出当前筛选结果 */
  exportCsv?: boolean;
}

/** 详情页跨表 Tab 配置 */
export interface IDetailTab {
  key: string;
  label: string;
  /** 子表 key (对应 SUB_MODULES 的 key) */
  subTableKey?: string;
  /** 多表聚合时使用的子表 key 列表 (优先级高于 subTableKey) */
  subTableKeys?: string[];
  /**
   * 子表中关联当前主实体的字段 key (如: 所属客户, 所属视频项目, 所属合同)
   * 为空时表示按子表 recordId 匹配 (父记录存子表 ID, 如视频订单→视频项目)
   */
  linkField?: string;
  /** 当前主实体中用于匹配的字段 key (如: recordId, name, code, 关联项目ID) */
  parentField: string;
}

export interface IModuleConfig {
  key: ModuleKey;
  label: string;
  noun: string;
  description: string;
  route: string;
  /** 多维表格中的数据表标识 */
  tableKey: string;
  /** 该模块是否已真实接入多维表格 */
  bitableEnabled?: boolean;
  searchField: string;
  /** 列表状态 Tabs 筛选字段 */
  filterField?: string;
  /** 列表附加 Select 筛选字段 (如任务优先级) */
  extraFilterField?: string;
  /** 财务列表顶部收支汇总 */
  financeSummary?: boolean;
  icon: LucideIcon;
  fields: IFieldConfig[];
  rowActions?: IRowAction[];
  /** 工具栏批量操作按钮 */
  toolbarActions?: IToolbarAction[];
  /** 需要脱敏的字段 key 列表 */
  maskFields?: string[];
  /** 详情页跨表 Tab 配置 */
  detailTabs?: IDetailTab[];
}

const f = (key: string, label: string, type: FieldType = 'text', extra: Partial<IFieldConfig> = {}): IFieldConfig => ({
  key,
  label,
  type,
  inList: true,
  inForm: true,
  inDetail: true,
  ...extra,
});

const opt = (value: string, label: string, tone?: FieldTone): IFieldOption => ({ value, label, tone });

const MAIN_MODULES: Record<string, IModuleConfig> = {
  customer: {
    key: 'customer',
    label: '客户管理',
    noun: '客户',
    description: '维护客户档案、等级与跟进状态',
    route: '/customers',
    tableKey: 'tblBeTsnl4bMi1D0',
    bitableEnabled: true,
    searchField: 'name',
    filterField: 'status',
    icon: Users,
    fields: [
      f('name', '客户名称', 'text', { required: true, placeholder: '请输入客户名称', bitableField: '客户名称' }),
      f('shortName', '客户简称', 'text', { inList: false, placeholder: '请输入客户简称', bitableField: '客户简称' }),
      f('entityName', '主体名称', 'text', { inList: false, placeholder: '请输入主体名称', bitableField: '主体名称' }),
      f('status', '客户状态', 'select', {
        bitableField: '客户状态',
        options: [
          opt('潜在', '潜在', 'secondary'),
          opt('试用', '试用', 'warning'),
          opt('合作中', '合作中', 'success'),
          opt('暂停', '暂停', 'secondary'),
          opt('流失', '流失', 'destructive'),
          opt('黑名单', '黑名单', 'destructive'),
        ],
      }),
      f('level', '客户等级', 'select', {
        required: true,
        bitableField: '客户等级',
        toBitableMap: { A: 'A类', B: 'B类', C: 'C类', VIP: 'VIP客户' },
        fromBitableMap: { A类: 'A', B类: 'B', C类: 'C', VIP客户: 'VIP' },
        options: [opt('VIP', 'VIP客户', 'info'), opt('A', 'A 类', 'success'), opt('B', 'B 类', 'warning'), opt('C', 'C 类', 'secondary')],
      }),
      f('industry', '一级行业', 'select', {
        bitableField: '一级行业',
        options: [
          opt('电商', '电商'), opt('教育', '教育'), opt('金融', '金融'), opt('医疗', '医疗'),
          opt('游戏', '游戏'), opt('旅游', '旅游'), opt('房产', '房产'), opt('汽车', '汽车'),
          opt('美妆', '美妆'), opt('服饰', '服饰'), opt('食品', '食品'), opt('3C', '3C'), opt('其他', '其他'),
        ],
      }),
      f('tags', '客户标签', 'select', {
        inList: false,
        bitableField: '客户标签',
        bitableType: 'MultiSelect',
        options: [
          opt('高消耗', '高消耗', 'warning'), opt('账期客户', '账期客户', 'info'),
          opt('视频客户', '视频客户', 'info'), opt('重点维护', '重点维护', 'success'), opt('新客户', '新客户', 'secondary'),
        ],
      }),
      f('source', '客户来源', 'select', {
        inList: false,
        bitableField: '客户来源',
        options: [
          opt('公海领取', '公海领取'), opt('线索转化', '线索转化'), opt('转介绍', '转介绍'),
          opt('主动开发', '主动开发'), opt('市场活动', '市场活动'), opt('其他', '其他'),
        ],
      }),
      f('department', '所属部门', 'select', {
        inList: false,
        bitableField: '所属部门',
        options: [
          opt('商务一部', '商务一部'), opt('商务二部', '商务二部'), opt('商务三部', '商务三部'),
          opt('运营部', '运营部'), opt('视频部', '视频部'), opt('财务部', '财务部'),
          opt('人事部', '人事部'), opt('行政部', '行政部'), opt('管理层', '管理层'),
        ],
      }),
      f('signDate', '签约日期', 'date', { inList: false, bitableField: '签约日期', bitableType: 'DateTime' }),
      f('website', '客户官网', 'text', { inList: false, placeholder: '请输入客户官网地址', bitableField: '客户官网', bitableType: 'Url' }),
      f('intro', '客户简介', 'textarea', { inList: false, placeholder: '请输入客户简介', span: 2, bitableField: '客户简介' }),
      f('note', '备注', 'textarea', { inList: false, placeholder: '请输入备注', span: 2, bitableField: '备注' }),
    
      f('f0', '营业执照', 'attachment', { inList: true, inForm: true, bitableField: '营业执照' }),
      f('f1', '二级行业', 'select', { inList: true, inForm: true, bitableType: 'MultiSelect', options: [opt('女装', '女装'), opt('男装', '男装'), opt('美妆', '美妆'), opt('食品', '食品'), opt('3C', '3C'), opt('家居', '家居'), opt('母婴', '母婴'), opt('运动', '运动'), opt('其他', '其他')], bitableField: '二级行业' }),
      f('f2', '创建人', 'text', { inList: false, inForm: false, bitableField: '创建人' }),
      f('f3', '税号', 'text', { inList: true, inForm: true, bitableField: '税号' }),
      f('f4', '其他资质', 'attachment', { inList: true, inForm: true, bitableField: '其他资质' }),
      f('f5', '开户银行', 'text', { inList: true, inForm: true, bitableField: '开户银行' }),
      f('f6', '负责商务', 'user', { inList: true, inForm: true, bitableField: '负责商务', bitableType: 'User' }),
      f('f7', '银行账号', 'text', { inList: true, inForm: true, bitableField: '银行账号' }),
      f('f8', '修改时间', 'date', { inList: false, inForm: false, bitableField: '修改时间' }),
      f('f9', '协作商务', 'user', { inList: true, inForm: true, bitableField: '协作商务', bitableType: 'User' }),
      f('f10', '开票抬头', 'text', { inList: true, inForm: true, bitableField: '开票抬头' }),
      f('f11', '创建时间', 'date', { inList: false, inForm: false, bitableField: '创建时间' }),
      f('f12', 'KH编号', 'text', { inList: true, inForm: false, bitableField: 'KH编号' }),
      f('f13', '修改人', 'text', { inList: false, inForm: false, bitableField: '修改人' }),
      f('f14', '注册地址', 'text', { inList: true, inForm: true, bitableField: '注册地址' }),],
    maskFields: ['phone', 'contact'],
    toolbarActions: [
      { key: 'batchClaim', label: '批量领取', requiresSelection: true, visibleWhenTab: '公海', batchPatch: { status: '潜在' }, confirmTitle: '批量领取公海客资', confirmDescription: '确认将选中的公海客资领取到自己名下?', successMessage: '已批量领取选中客资' },
      { key: 'batchAssign', label: '批量分配', requiresSelection: true, visibleWhenTab: '公海', batchPatch: { status: '潜在' }, confirmTitle: '批量分配公海客资', confirmDescription: '确认将选中的公海客资分配给指定人员?', successMessage: '已批量分配选中客资' },
      { key: 'autoAssign', label: '自动分配', requiresSelection: false, visibleWhenTab: '公海', confirmTitle: '自动分配公海客资', confirmDescription: '确认按规则自动分配所有公海客资?', successMessage: '公海客资已自动分配' },
      { key: 'exportCsv', label: '导出CSV', exportCsv: true },
    ],
    rowActions: [
      {
        key: 'toCoop', label: '转为合作中', hiddenWhenEquals: { field: 'status', value: '合作中' },
        patch: { status: '合作中' }, confirmTitle: '客户转为合作中',
        confirmDescription: '确认将该客户状态更新为「合作中」?', successMessage: '客户已转为合作中',
      },
      {
        key: 'pause', label: '暂停跟进', hiddenWhenEquals: { field: 'status', value: '暂停' },
        patch: { status: '暂停' }, confirmTitle: '暂停跟进客户',
        confirmDescription: '确认将该客户标记为「暂停」?', successMessage: '客户已暂停跟进',
      },
      {
        key: 'lost', label: '标记流失', hiddenWhenEquals: { field: 'status', value: '流失' },
        patch: { status: '流失' }, confirmTitle: '标记客户流失',
        confirmDescription: '确认将该客户标记为「流失」?', successMessage: '客户已标记流失',
      },
      {
        key: 'black', label: '移入黑名单', hiddenWhenEquals: { field: 'status', value: '黑名单' },
        patch: { status: '黑名单' }, confirmTitle: '移入黑名单',
        confirmDescription: '确认将该客户移入黑名单?', successMessage: '已移入黑名单',
      },
      {
        key: 'recover', label: '恢复', visibleWhenEquals: { field: 'status', value: '无效' },
        patch: { status: '潜在' }, confirmTitle: '恢复客户',
        confirmDescription: '确认将该客户恢复为「潜在」?', successMessage: '客户已恢复',
      },
      {
        key: 'convert', label: '转化', visibleWhenEquals: { field: 'status', value: '线索' },
        patch: { status: '潜在' }, confirmTitle: '线索转化',
        confirmDescription: '确认将该线索转化为正式客户?', successMessage: '线索已转化为客户',
      },
    ],
    detailTabs: [
      { key: 'contacts', label: '联系人', subTableKey: 'contact', linkField: '关联客户ID', parentField: 'recordId' },
      { key: 'followups', label: '跟进记录', subTableKey: 'follow', linkField: '关联客户ID', parentField: 'recordId' },
      { key: 'contracts', label: '合同', subTableKey: 'contract', linkField: '关联客户ID', parentField: 'recordId' },
      { key: 'adAccounts', label: '广告账户', subTableKey: 'ad', linkField: '关联客户ID', parentField: 'recordId' },
      { key: 'consumption', label: '消耗', subTableKey: 'adCost', linkField: '关联客户ID', parentField: 'recordId' },
    ],
  },
  ad: {
    key: 'ad',
    label: '广告业务',
    noun: '广告账户',
    description: '广告投放账户的余额、消耗与端口状态管理',
    route: '/ads',
    tableKey: 'tblnqTA0Ec9B6glO',
    bitableEnabled: true,
    searchField: 'name',
    filterField: 'status',
    icon: Megaphone,
    fields: [
      f('name', '账户名称', 'text', { required: true, placeholder: '请输入账户名称', bitableField: '账户名称' }),
      f('accountId', '账户ID', 'text', { bitableField: '账户ID' }),
      f('port', '投放端口', 'select', {
        bitableField: '投放端口',
        options: [opt('巨量千川', '巨量千川'), opt('巨量AD', '巨量AD'), opt('快手磁力', '快手磁力'), opt('小红书', '小红书'), opt('腾讯广告', '腾讯广告'), opt('百度', '百度'), opt('其他', '其他')],
      }),
      f('accountType', '账户类型', 'select', {
        inList: false, bitableField: '账户类型',
        options: [opt('内部端口', '内部端口'), opt('外部端口', '外部端口'), opt('集团端口', '集团端口')],
      }),
      f('status', '账户状态', 'select', {
        required: true, bitableField: '账户状态',
        options: [opt('正常', '正常', 'success'), opt('余额不足', '余额不足', 'warning'), opt('暂停', '暂停', 'secondary'), opt('封禁', '封禁', 'destructive'), opt('已注销', '已注销', 'secondary'), opt('待激活', '待激活', 'info')],
      }),
      f('balance', '当前余额', 'number', { money: true, bitableField: '当前余额' }),
      f('totalCost', '累计消耗', 'number', { money: true, bitableField: '累计消耗' }),
      f('yesterdayCost', '昨日消耗', 'number', { money: true, bitableField: '昨日消耗' }),
      f('totalRecharge', '累计充值', 'number', { money: true, inList: false, bitableField: '累计充值' }),
      f('bonusBalance', '赠款余额', 'number', { money: true, inList: false, bitableField: '赠款余额' }),
      f('openTime', '开户时间', 'date', { inList: false, bitableField: '开户时间', bitableType: 'DateTime' }),
      f('department', '所属部门', 'select', {
        inList: false, bitableField: '所属部门',
        options: [opt('商务一部', '商务一部'), opt('商务二部', '商务二部'), opt('商务三部', '商务三部'), opt('运营部', '运营部'), opt('视频部', '视频部'), opt('财务部', '财务部'), opt('人事部', '人事部'), opt('行政部', '行政部'), opt('管理层', '管理层')],
      }),
      f('note', '备注', 'textarea', { inList: false, span: 2, bitableField: '备注' }),
    
      f('f0', '余额预警阈值', 'text', { inList: true, inForm: true, money: true, bitableField: '余额预警阈值' }),
      f('f1', '所属客户', 'text', { inList: true, inForm: true, bitableField: '所属客户' }),
      f('f2', '修改人', 'text', { inList: false, inForm: false, bitableField: '修改人' }),
      f('f3', '创建时间', 'date', { inList: false, inForm: false, bitableField: '创建时间' }),
      f('f4', '账户密码', 'text', { inList: true, inForm: true, bitableField: '账户密码' }),
      f('f5', '负责优化师', 'user', { inList: true, inForm: true, bitableField: '负责优化师', bitableType: 'User' }),
      f('f6', '账户链接', 'text', { inList: true, inForm: true, bitableField: '账户链接' }),
      f('f7', '修改时间', 'date', { inList: false, inForm: false, bitableField: '修改时间' }),
      f('f8', '创建人', 'text', { inList: false, inForm: false, bitableField: '创建人' }),
      f('f9', '关联客户ID', 'text', { inList: true, inForm: true, bitableField: '关联客户ID' }),],
    toolbarActions: [
      { key: 'batchOpen', label: '批量开户', requiresSelection: true, visibleWhenTab: '待激活', batchPatch: { status: '正常' }, confirmTitle: '批量开户', confirmDescription: '确认将选中的账户批量开通?', successMessage: '已批量开通选中账户' },
      { key: 'exportCsv', label: '导出CSV', exportCsv: true },
    ],
    rowActions: [
      {
        key: 'approve', label: '审批通过', visibleWhenEquals: { field: 'status', value: '待激活' },
        patch: { status: '正常' }, confirmTitle: '审批通过',
        confirmDescription: '确认审批通过该开户申请? 账户将恢复正常', successMessage: '开户申请已审批通过',
      },
      {
        key: 'reject', label: '驳回', visibleWhenEquals: { field: 'status', value: '待激活' },
        patch: { status: '封禁' }, confirmTitle: '驳回开户申请',
        confirmDescription: '确认驳回该开户申请?', successMessage: '开户申请已驳回',
      },
      {
        key: 'recharge', label: '充值', hiddenWhenEquals: { field: 'status', value: '封禁' },
        patch: { status: '正常' }, confirmTitle: '账户充值',
        confirmDescription: '确认对该账户进行充值?', successMessage: '账户充值已提交',
      },
      {
        key: 'toNormal', label: '恢复正常', hiddenWhenEquals: { field: 'status', value: '正常' },
        patch: { status: '正常' }, confirmTitle: '账户恢复正常',
        confirmDescription: '确认将该广告账户状态更新为「正常」?', successMessage: '账户已恢复正常投放',
      },
      {
        key: 'lowBalance', label: '标记余额不足', hiddenWhenEquals: { field: 'status', value: '余额不足' },
        patch: { status: '余额不足' }, confirmTitle: '标记余额不足',
        confirmDescription: '确认将该账户标记为「余额不足」?', successMessage: '已标记余额不足',
      },
      {
        key: 'pause', label: '暂停投放', hiddenWhenEquals: { field: 'status', value: '暂停' },
        patch: { status: '暂停' }, confirmTitle: '暂停投放',
        confirmDescription: '确认暂停该广告账户投放?', successMessage: '账户已暂停投放',
      },
    ],
  },
  video: {
    key: 'video',
    label: '视频业务',
    noun: '视频项目',
    description: '视频拍摄制作项目的排期、成本与交付全流程管理',
    route: '/videos',
    tableKey: 'tblfANeadTzUCqWY',
    bitableEnabled: true,
    searchField: 'name',
    filterField: 'status',
    icon: Video,
    fields: [
      f('name', '项目名称', 'text', { required: true, placeholder: '请输入项目名称', bitableField: '项目名称' }),
      f('code', 'XM编号', 'text', { inForm: false, bitableField: 'XM编号' }),
      f('status', '项目状态', 'select', {
        required: true, bitableField: '项目状态',
        options: [
          opt('待启动', '待启动', 'secondary'), opt('脚本创作', '脚本创作', 'warning'), opt('样品准备', '样品准备', 'warning'),
          opt('拍摄中', '拍摄中', 'info'), opt('后期制作', '后期制作', 'info'), opt('待审核', '待审核', 'warning'),
          opt('修改中', '修改中', 'warning'), opt('已完成', '已完成', 'success'), opt('已暂停', '已暂停', 'secondary'),
        ],
      }),
      f('stage', '项目阶段', 'select', {
        inList: true, bitableField: '项目阶段',
        options: [opt('前期', '前期'), opt('中期', '中期'), opt('后期', '后期'), opt('交付', '交付')],
      }),
      f('progress', '项目进度', 'number', { bitableField: '项目进度' }),
      f('budget', '项目预算', 'number', { inList: true, money: true, bitableField: '项目预算' }),
      f('manager', '项目经理', 'user', { inForm: true, bitableField: '项目经理', bitableType: 'User' }),
      f('planStart', '计划开始', 'date', { inList: true, bitableField: '计划开始日期', bitableType: 'DateTime' }),
      f('planEnd', '计划结束', 'date', { inList: true, bitableField: '计划结束日期', bitableType: 'DateTime' }),
      f('actualStart', '实际开始', 'date', { inList: false, bitableField: '实际开始日期', bitableType: 'DateTime' }),
      f('actualEnd', '实际结束', 'date', { inList: false, bitableField: '实际结束日期', bitableType: 'DateTime' }),
      f('director', '导演', 'user', { inList: false, inForm: true, bitableField: '导演', bitableType: 'User' }),
      f('cameraman', '摄像师', 'user', { inList: false, inForm: true, bitableField: '摄像师', bitableType: 'User' }),
      f('editor', '剪辑师', 'user', { inList: false, inForm: true, bitableField: '剪辑师', bitableType: 'User' }),
      f('shootCost', '拍摄费用', 'number', { money: true, inList: true, bitableField: '拍摄费用' }),
      f('actorCost', '演员费用', 'number', { money: true, inList: true, bitableField: '演员费用' }),
      f('siteCost', '场地费用', 'number', { money: true, inList: true, bitableField: '场地费用' }),
      f('postCost', '后期费用', 'number', { money: true, inList: true, bitableField: '后期费用' }),
      f('outsourceCost', '外包费用', 'number', { money: true, inList: true, bitableField: '外包费用' }),
      f('otherCost', '其他费用', 'number', { money: true, inList: true, bitableField: '其他费用' }),
      f('risk', '风险提示', 'text', { inList: false, bitableField: '风险提示' }),
      f('note', '备注', 'textarea', { inList: false, span: 2, bitableField: '备注' }),
    
      f('f0', '精剪完成', 'checkbox', { inList: true, inForm: true, bitableField: '精剪完成', bitableType: 'Checkbox' }),
      f('f1', '脚本文件', 'attachment', { inList: true, inForm: true, bitableField: '脚本文件' }),
      f('f2', '初剪完成', 'checkbox', { inList: true, inForm: true, bitableField: '初剪完成', bitableType: 'Checkbox' }),
      f('f3', '修改时间', 'date', { inList: false, inForm: false, bitableField: '修改时间' }),
      f('f4', '客户确认', 'checkbox', { inList: true, inForm: true, bitableField: '客户确认', bitableType: 'Checkbox' }),
      f('f5', '素材文件', 'attachment', { inList: true, inForm: true, bitableField: '素材文件' }),
      f('f6', '拍摄完成', 'checkbox', { inList: true, inForm: true, bitableField: '拍摄完成', bitableType: 'Checkbox' }),
      f('f7', '修改人', 'text', { inList: false, inForm: false, bitableField: '修改人' }),
      f('f8', '脚本完成', 'checkbox', { inList: true, inForm: true, bitableField: '脚本完成', bitableType: 'Checkbox' }),
      f('f9', '创建人', 'text', { inList: false, inForm: false, bitableField: '创建人' }),
      f('f10', '成片文件', 'attachment', { inList: true, inForm: true, bitableField: '成片文件' }),
      f('f11', '创建时间', 'date', { inList: false, inForm: false, bitableField: '创建时间' }),],
    toolbarActions: [
      { key: 'newProject', label: '新建项目', navigateTo: '/videos/new' },
      { key: 'newContract', label: '新建合同', navigateTo: '/contracts/new' },
      { key: 'batchApprove', label: '批量通过', requiresSelection: true, batchPatch: { status: '已完成' }, confirmTitle: '批量通过', confirmDescription: '确认将选中的视频项目批量标记为通过?', successMessage: '已批量通过选中项目' },
      { key: 'batchReject', label: '批量驳回', requiresSelection: true, batchPatch: { status: '修改中' }, confirmTitle: '批量驳回', confirmDescription: '确认将选中的视频项目批量驳回?', successMessage: '已批量驳回选中项目' },
      { key: 'exportCsv', label: '导出CSV', exportCsv: true },
    ],
    rowActions: [
      {
        key: 'script', label: '进入脚本创作', visibleWhenEquals: { field: 'status', value: '待启动' },
        patch: { status: '脚本创作' }, confirmTitle: '启动脚本创作',
        confirmDescription: '确认启动项目脚本创作?', successMessage: '项目已进入脚本创作阶段',
      },
      {
        key: 'sample', label: '进入样品准备', visibleWhenEquals: { field: 'status', value: '脚本创作' },
        patch: { status: '样品准备' }, confirmTitle: '进入样品准备',
        confirmDescription: '确认推进到样品准备阶段?', successMessage: '项目已进入样品准备阶段',
      },
      {
        key: 'shoot', label: '开始拍摄', hiddenWhenEquals: { field: 'status', value: '拍摄中' },
        patch: { status: '拍摄中' }, confirmTitle: '项目开始拍摄',
        confirmDescription: '确认将该视频项目推进到「拍摄中」?', successMessage: '项目已进入拍摄中',
      },
      {
        key: 'post', label: '进入后期', hiddenWhenEquals: { field: 'status', value: '后期制作' },
        patch: { status: '后期制作' }, confirmTitle: '进入后期制作',
        confirmDescription: '确认将该视频项目推进到「后期制作」?', successMessage: '项目已进入后期制作',
      },
      {
        key: 'submitReview', label: '提交审核', hiddenWhenEquals: { field: 'status', value: '待审核' },
        patch: { status: '待审核' }, confirmTitle: '提交审核',
        confirmDescription: '确认将成片提交审核?', successMessage: '项目已提交审核',
      },
      {
        key: 'finish', label: '完成交付', hiddenWhenEquals: { field: 'status', value: '已完成' },
        patch: { status: '已完成' }, confirmTitle: '完成交付',
        confirmDescription: '确认该视频项目已完成交付?', successMessage: '项目已完成交付',
      },
      {
        key: 'pause', label: '暂停项目', hiddenWhenEquals: { field: 'status', value: '已暂停' },
        patch: { status: '已暂停' }, confirmTitle: '暂停项目',
        confirmDescription: '确认暂停该视频项目?', successMessage: '项目已暂停',
      },
    ],
    detailTabs: [
      { key: 'costs', label: '费用汇总', subTableKey: '', subTableKeys: ['shootCost', 'siteCost'], linkField: '关联项目ID', parentField: 'recordId' },
      { key: 'progress', label: '节点进度', subTableKey: '', linkField: '', parentField: '' },
      { key: 'deliverables', label: '交付物', subTableKey: '', linkField: '', parentField: '' },
      { key: 'team', label: '团队成员', subTableKey: '', linkField: '', parentField: '' },
    ],
  },
  contract: {
    key: 'contract',
    label: '合同业务',
    noun: '合同',
    description: '合同签订、审批、盖章与归档状态管理',
    route: '/contracts',
    tableKey: 'tblNVBZhgRN9dSJY',
    bitableEnabled: true,
    searchField: 'name',
    filterField: 'status',
    icon: FileText,
    fields: [
      f('name', '合同名称', 'text', { required: true, placeholder: '请输入合同名称', bitableField: '合同名称' }),
      f('code', '合同编号', 'text', { bitableField: '合同编号' }),
      f('type', '合同类型', 'select', {
        bitableField: '合同类型',
        options: [opt('广告投放合同', '广告投放合同'), opt('视频制作合同', '视频制作合同'), opt('年度框架合同', '年度框架合同'), opt('补充协议', '补充协议'), opt('服务合同', '服务合同'), opt('其他', '其他')],
      }),
      f('status', '合同状态', 'select', {
        required: true, bitableField: '合同状态',
        options: [
          opt('草稿', '草稿', 'secondary'), opt('待审批', '待审批', 'warning'), opt('审批中', '审批中', 'warning'),
          opt('已驳回', '已驳回', 'destructive'), opt('待盖章', '待盖章', 'info'), opt('已盖章', '已盖章', 'info'),
          opt('已归档', '已归档', 'success'), opt('已终止', '已终止', 'secondary'), opt('已作废', '已作废', 'destructive'),
        ],
      }),
      f('amount', '合同金额', 'number', { money: true, bitableField: '合同金额' }),
      f('cost', '成本金额', 'number', { money: true, inList: false, bitableField: '成本金额' }),
      f('commission', '提成金额', 'number', { money: true, inList: false, bitableField: '提成金额' }),
      f('taxRate', '税率', 'number', { percent: true, inList: false, bitableField: '税率' }),
      f('commissionStatus', '提成状态', 'select', {
        inList: false, bitableField: '提成状态',
        options: [opt('未申请', '未申请'), opt('申请中', '申请中'), opt('已审批', '已审批'), opt('已发放', '已发放'), opt('不适用', '不适用')],
      }),
      f('signDate', '签订日期', 'date', { bitableField: '签订日期', bitableType: 'DateTime' }),
      f('effectiveDate', '生效日期', 'date', { inList: false, bitableField: '生效日期', bitableType: 'DateTime' }),
      f('expireDate', '到期日期', 'date', { bitableField: '到期日期', bitableType: 'DateTime' }),
      f('sealDate', '盖章日期', 'date', { inList: false, bitableField: '盖章日期', bitableType: 'DateTime' }),
      f('archiveDate', '归档日期', 'date', { inList: false, bitableField: '归档日期', bitableType: 'DateTime' }),
      f('department', '所属部门', 'select', {
        inList: false, bitableField: '所属部门',
        options: [opt('商务一部', '商务一部'), opt('商务二部', '商务二部'), opt('商务三部', '商务三部'), opt('运营部', '运营部'), opt('视频部', '视频部'), opt('财务部', '财务部'), opt('人事部', '人事部'), opt('行政部', '行政部'), opt('管理层', '管理层')],
      }),
      f('approver', '审批人', 'user', { inList: false, inForm: true, bitableField: '审批人', bitableType: 'User' }),
      f('approvalOpinion', '审批意见', 'text', { inList: false, bitableField: '审批意见' }),
      f('note', '备注', 'textarea', { inList: false, span: 2, bitableField: '备注' }),
    
      f('f0', '创建时间', 'date', { inList: false, inForm: false, bitableField: '创建时间' }),
      f('f1', '修改人', 'text', { inList: false, inForm: false, bitableField: '修改人' }),
      f('f2', '所属客户', 'text', { inList: true, inForm: true, bitableField: '所属客户' }),
      f('f3', '审批时间', 'datetime', { inList: true, inForm: true, bitableType: 'DateTime', bitableField: '审批时间' }),
      f('f4', '关联客户ID', 'text', { inList: true, inForm: true, bitableField: '关联客户ID' }),
      f('f5', '修改时间', 'date', { inList: false, inForm: false, bitableField: '修改时间' }),
      f('f6', '合同文件', 'attachment', { inList: true, inForm: true, bitableField: '合同文件' }),
      f('f7', '补充协议', 'attachment', { inList: true, inForm: true, bitableField: '补充协议' }),
      f('f8', '创建人', 'text', { inList: false, inForm: false, bitableField: '创建人' }),
      f('f9', 'HT编号', 'text', { inList: true, inForm: false, bitableField: 'HT编号' }),],
    toolbarActions: [
      { key: 'remind', label: '一键提醒', requiresSelection: true, confirmTitle: '一键提醒', confirmDescription: '确认向选中合同的关联客户发送到期提醒?', successMessage: '已发送提醒通知' },
      { key: 'applyCommission', label: '申请提成', requiresSelection: true, batchPatch: { commissionStatus: '申请中' }, confirmTitle: '申请提成', confirmDescription: '确认将选中合同的提成状态改为申请中?', successMessage: '已提交提成申请' },
      { key: 'exportCsv', label: '批量导出', exportCsv: true },
    ],
    rowActions: [
      {
        key: 'submit', label: '提交审批', hiddenWhenEquals: { field: 'status', value: '待审批' },
        patch: { status: '待审批' }, confirmTitle: '提交合同审批',
        confirmDescription: '确认将该合同提交审批? 状态将变为「待审批」', successMessage: '合同已提交审批',
      },
      {
        key: 'approve', label: '审批通过', hiddenWhenEquals: { field: 'status', value: '待盖章' },
        patch: { status: '待盖章' }, confirmTitle: '合同审批通过',
        confirmDescription: '确认审批通过? 状态将变为「待盖章」', successMessage: '合同已审批通过, 待盖章',
      },
      {
        key: 'reject', label: '审批驳回', hiddenWhenEquals: { field: 'status', value: '已驳回' },
        patch: { status: '已驳回' }, confirmTitle: '驳回合同',
        confirmDescription: '确认驳回该合同?', successMessage: '合同已驳回',
      },
      {
        key: 'seal', label: '确认盖章', hiddenWhenEquals: { field: 'status', value: '已盖章' },
        patch: { status: '已盖章' }, confirmTitle: '确认盖章',
        confirmDescription: '确认该合同已完成盖章?', successMessage: '合同已盖章',
      },
      {
        key: 'archive', label: '归档合同', hiddenWhenEquals: { field: 'status', value: '已归档' },
        patch: { status: '已归档' }, confirmTitle: '归档合同',
        confirmDescription: '确认归档该合同?', successMessage: '合同已归档',
      },
      {
        key: 'terminate', label: '终止合同', hiddenWhenEquals: { field: 'status', value: '已终止' },
        patch: { status: '已终止' }, confirmTitle: '终止合同',
        confirmDescription: '确认终止该合同? 终止后不可继续履行', successMessage: '合同已终止',
      },
      {
        key: 'applyCommission', label: '申请提成', visibleWhenEquals: { field: 'commissionStatus', value: '未申请' },
        patch: { commissionStatus: '申请中' }, confirmTitle: '申请提成',
        confirmDescription: '确认对该合同发起提成申请?', successMessage: '提成申请已提交',
      },
    ],
    detailTabs: [
      { key: 'costs', label: '合同费用', subTableKey: 'contractCost', linkField: '关联合同ID', parentField: 'recordId' },
      { key: 'approval', label: '审批时间线', subTableKey: '', linkField: '', parentField: '' },
    ],
  },
  finance: {
    key: 'finance',
    label: '财务管理',
    noun: '收款记录',
    description: '客户收款登记、到账确认与核销管理',
    route: '/finance',
    tableKey: 'tbltNEgtjH90huTj',
    bitableEnabled: true,
    searchField: 'name',
    filterField: 'status',
    icon: Wallet,
    fields: [
      f('name', '付款方名称', 'text', { required: true, placeholder: '请输入付款方名称', bitableField: '付款方名称' }),
      f('receiptType', '收款类型', 'select', {
        bitableField: '收款类型',
        options: [opt('合同款', '合同款'), opt('预付款', '预付款'), opt('尾款', '尾款'), opt('充值款', '充值款'), opt('保证金', '保证金'), opt('押金', '押金'), opt('其他', '其他')],
      }),
      f('status', '收款状态', 'select', {
        required: true, bitableField: '收款状态',
        options: [opt('待确认', '待确认', 'warning'), opt('已到账', '已到账', 'success'), opt('已核销', '已核销', 'success'), opt('部分核销', '部分核销', 'info'), opt('已退回', '已退回', 'destructive')],
      }),
      f('amount', '收款金额', 'number', { money: true, required: true, bitableField: '收款金额' }),
      f('verifiedAmount', '已核销金额', 'number', { money: true, inList: false, bitableField: '已核销金额' }),
      f('method', '收款方式', 'select', {
        inList: false, bitableField: '收款方式',
        options: [opt('银行转账', '银行转账'), opt('微信', '微信'), opt('支付宝', '支付宝'), opt('支票', '支票'), opt('现金', '现金'), opt('承兑汇票', '承兑汇票'), opt('其他', '其他')],
      }),
      f('account', '收款账户', 'select', {
        inList: false, bitableField: '收款账户',
        options: [opt('基本户', '基本户'), opt('一般户', '一般户'), opt('支付宝', '支付宝'), opt('微信', '微信'), opt('其他', '其他')],
      }),
      f('registerDate', '登记日期', 'date', { bitableField: '登记日期', bitableType: 'DateTime' }),
      f('arriveDate', '到账日期', 'date', { inList: false, bitableField: '到账日期', bitableType: 'DateTime' }),
      f('confirmDate', '确认时间', 'date', { inList: false, bitableField: '确认时间', bitableType: 'DateTime' }),
      f('bankSerial', '银行流水号', 'text', { inList: false, bitableField: '银行流水号' }),
      f('payBank', '付款银行', 'text', { inList: false, bitableField: '付款银行' }),
      f('payAccount', '付款账号', 'text', { inList: false, bitableField: '付款账号' }),
      f('registrar', '登记人', 'user', { inList: false, inForm: true, bitableField: '登记人', bitableType: 'User' }),
      f('confirmer', '确认人', 'user', { inList: false, inForm: true, bitableField: '确认人', bitableType: 'User' }),
      f('note', '备注', 'textarea', { inList: false, span: 2, bitableField: '备注' }),
    
      f('f0', '收款凭证', 'attachment', { inList: true, inForm: true, bitableField: '收款凭证' }),
      f('f1', '创建人', 'text', { inList: false, inForm: false, bitableField: '创建人' }),
      f('f2', '创建时间', 'date', { inList: false, inForm: false, bitableField: '创建时间' }),
      f('f3', '修改时间', 'date', { inList: false, inForm: false, bitableField: '修改时间' }),
      f('f4', '修改人', 'text', { inList: false, inForm: false, bitableField: '修改人' }),
      f('f5', 'SK编号', 'text', { inList: true, inForm: false, bitableField: 'SK编号' }),],
    maskFields: ['bankSerial', 'payAccount'],
    toolbarActions: [
      { key: 'exportCsv', label: '导出CSV', exportCsv: true },
    ],
    rowActions: [
      {
        key: 'arrive', label: '确认到账', hiddenWhenEquals: { field: 'status', value: '已到账' },
        patch: { status: '已到账' }, confirmTitle: '确认收款到账',
        confirmDescription: '确认该笔款项已实际到账?', successMessage: '收款已确认到账',
      },
      {
        key: 'verify', label: '核销', hiddenWhenEquals: { field: 'status', value: '已核销' },
        patch: { status: '已核销' }, confirmTitle: '核销收款',
        confirmDescription: '确认将该笔收款核销?', successMessage: '收款已核销',
      },
      {
        key: 'refund', label: '标记退回', hiddenWhenEquals: { field: 'status', value: '已退回' },
        patch: { status: '已退回' }, confirmTitle: '标记款项退回',
        confirmDescription: '确认将该笔收款标记为已退回?', successMessage: '已标记为退回',
      },
    ],
  },
  hr: {
    key: 'hr',
    label: '人资管理',
    noun: '员工档案',
    description: '员工档案、岗位职级、薪酬与在职状态管理',
    route: '/hr',
    tableKey: 'tblbJzyJEyYopTu7',
    bitableEnabled: true,
    searchField: 'name',
    filterField: 'status',
    icon: IdCard,
    fields: [
      f('name', '姓名', 'text', { required: true, placeholder: '请输入姓名', bitableField: '姓名' }),
      f('empNo', '工号', 'text', { bitableField: '工号' }),
      f('status', '员工状态', 'select', {
        required: true, bitableField: '员工状态',
        options: [opt('试用期', '试用期', 'warning'), opt('正式', '正式', 'success'), opt('待转正', '待转正', 'info'), opt('调岗中', '调岗中', 'info'), opt('待离职', '待离职', 'warning'), opt('已离职', '已离职', 'secondary'), opt('休假中', '休假中', 'secondary')],
      }),
      f('empType', '员工类型', 'select', {
        bitableField: '员工类型',
        options: [opt('全职', '全职'), opt('兼职', '兼职'), opt('实习', '实习'), opt('外包', '外包'), opt('顾问', '顾问')],
      }),
      f('department', '部门', 'select', {
        bitableField: '部门',
        options: [opt('商务一部', '商务一部'), opt('商务二部', '商务二部'), opt('商务三部', '商务三部'), opt('运营部', '运营部'), opt('视频部', '视频部'), opt('财务部', '财务部'), opt('人事部', '人事部'), opt('行政部', '行政部'), opt('管理层', '管理层')],
      }),
      f('position', '岗位', 'select', {
        bitableField: '岗位',
        options: [opt('商务', '商务'), opt('优化师', '优化师'), opt('项目经理', '项目经理'), opt('财务', '财务'), opt('HR', 'HR'), opt('行政', '行政'), opt('导演', '导演'), opt('摄像师', '摄像师'), opt('剪辑师', '剪辑师'), opt('其他', '其他')],
      }),
      f('level', '职级', 'select', {
        inList: false, bitableField: '职级',
        options: ['P1','P2','P3','P4','P5','P6','P7','M1','M2','M3'].map((v) => opt(v, v)),
      }),
      f('gender', '性别', 'select', { inList: false, bitableField: '性别', options: [opt('男', '男'), opt('女', '女')] }),
      f('phone', '手机号', 'text', { bitableField: '手机号' }),
      f('email', '邮箱', 'text', { inList: false, bitableField: '邮箱' }),
      f('hireDate', '入职日期', 'date', { bitableField: '入职日期', bitableType: 'DateTime' }),
      f('regularDate', '转正日期', 'date', { inList: false, bitableField: '转正日期', bitableType: 'DateTime' }),
      f('birthDate', '出生日期', 'date', { inList: false, bitableField: '出生日期', bitableType: 'DateTime' }),
      f('leaveDate', '离职日期', 'date', { inList: false, bitableField: '离职日期', bitableType: 'DateTime' }),
      f('baseSalary', '基本工资', 'number', { money: true, inList: false, bitableField: '基本工资' }),
      f('perfSalary', '绩效工资', 'number', { money: true, inList: false, bitableField: '绩效工资' }),
      f('socialBase', '社保基数', 'number', { money: true, inList: false, bitableField: '社保基数' }),
      f('fundBase', '公积金基数', 'number', { money: true, inList: false, bitableField: '公积金基数' }),
      f('education', '学历', 'select', { inList: false, bitableField: '学历', options: [opt('高中', '高中'), opt('大专', '大专'), opt('本科', '本科'), opt('硕士', '硕士'), opt('博士', '博士')] }),
      f('school', '毕业院校', 'text', { inList: false, bitableField: '毕业院校' }),
      f('major', '专业', 'text', { inList: false, bitableField: '专业' }),
      f('tags', '员工标签', 'select', {
        inList: false, bitableField: '员工标签', bitableType: 'MultiSelect',
        options: [opt('高潜', '高潜'), opt('核心', '核心'), opt('重点培养', '重点培养'), opt('待改进', '待改进')],
      }),
      f('leader', '直属上级', 'user', { inList: false, inForm: true, bitableField: '直属上级', bitableType: 'User' }),
      f('note', '备注', 'textarea', { inList: false, span: 2, bitableField: '备注' }),
    
      f('f0', '飞书账号', 'user', { inList: true, inForm: true, bitableField: '飞书账号', bitableType: 'User' }),
      f('f1', '身份证扫描件', 'attachment', { inList: true, inForm: true, bitableField: '身份证扫描件' }),
      f('f2', '紧急联系电话', 'text', { inList: true, inForm: true, bitableField: '紧急联系电话' }),
      f('f3', '修改人', 'text', { inList: false, inForm: false, bitableField: '修改人' }),
      f('f4', '头像', 'attachment', { inList: true, inForm: true, bitableField: '头像' }),
      f('f5', '创建时间', 'date', { inList: false, inForm: false, bitableField: '创建时间' }),
      f('f6', '开户行', 'text', { inList: true, inForm: true, bitableField: '开户行' }),
      f('f7', '身份证号', 'text', { inList: true, inForm: true, bitableField: '身份证号' }),
      f('f8', '户籍地址', 'text', { inList: true, inForm: true, bitableField: '户籍地址' }),
      f('f9', '紧急联系人', 'text', { inList: true, inForm: true, bitableField: '紧急联系人' }),
      f('f10', '创建人', 'text', { inList: false, inForm: false, bitableField: '创建人' }),
      f('f11', '居住地址', 'text', { inList: true, inForm: true, bitableField: '居住地址' }),
      f('f12', '修改时间', 'date', { inList: false, inForm: false, bitableField: '修改时间' }),
      f('f13', '劳动合同', 'attachment', { inList: true, inForm: true, bitableField: '劳动合同' }),
      f('f14', '银行卡号', 'text', { inList: true, inForm: true, bitableField: '银行卡号' }),],
    maskFields: ['phone'],
    toolbarActions: [
      { key: 'exportCsv', label: '导出CSV', exportCsv: true },
    ],
    rowActions: [
      {
        key: 'onboard', label: '办理入职', visibleWhenEquals: { field: 'status', value: '试用期' },
        patch: { status: '试用期' }, confirmTitle: '确认入职',
        confirmDescription: '确认该员工已完成入职手续?', successMessage: '入职手续已完成',
      },
      {
        key: 'regular', label: '办理转正', hiddenWhenEquals: { field: 'status', value: '正式' },
        patch: { status: '正式' }, confirmTitle: '员工转正',
        confirmDescription: '确认将该员工状态更新为「正式」?', successMessage: '员工已转正',
      },
      {
        key: 'transfer', label: '调岗', visibleWhenEquals: { field: 'status', value: '正式' },
        patch: { status: '调岗中' }, confirmTitle: '员工调岗',
        confirmDescription: '确认将该员工标记为调岗中?', successMessage: '员工已标记调岗中',
      },
      {
        key: 'preLeave', label: '标记待离职', hiddenWhenEquals: { field: 'status', value: '待离职' },
        patch: { status: '待离职' }, confirmTitle: '标记待离职',
        confirmDescription: '确认将该员工标记为「待离职」?', successMessage: '员工已标记待离职',
      },
      {
        key: 'leave', label: '办理离职', hiddenWhenEquals: { field: 'status', value: '已离职' },
        patch: { status: '已离职' }, confirmTitle: '办理离职',
        confirmDescription: '确认该员工已办理离职? 状态将变为「已离职」', successMessage: '员工已办理离职',
      },
    ],
  },
  admin: {
    key: 'admin',
    label: '行政管理',
    noun: '资产',
    description: '固定资产登记、领用、盘点与状态管理',
    route: '/admin',
    tableKey: 'tblYT4HiVuz25EE2',
    bitableEnabled: true,
    searchField: 'name',
    filterField: 'status',
    icon: Building,
    fields: [
      f('name', '资产名称', 'text', { required: true, placeholder: '请输入资产名称', bitableField: '资产名称' }),
      f('code', 'ZC编号', 'text', { inForm: false, bitableField: 'ZC2编号' }),
      f('category', '资产类别', 'select', {
        bitableField: '资产类别',
        options: [opt('电子设备', '电子设备'), opt('办公家具', '办公家具'), opt('拍摄器材', '拍摄器材'), opt('车辆', '车辆'), opt('软件', '软件'), opt('其他', '其他')],
      }),
      f('status', '资产状态', 'select', {
        required: true, bitableField: '资产状态',
        options: [opt('在用', '在用', 'success'), opt('闲置', '闲置', 'secondary'), opt('维修中', '维修中', 'warning'), opt('已报废', '已报废', 'destructive'), opt('已丢失', '已丢失', 'destructive'), opt('调拨中', '调拨中', 'info')],
      }),
      f('stockStatus', '盘点状态', 'select', {
        inList: false, bitableField: '盘点状态',
        options: [opt('未盘点', '未盘点'), opt('已盘点', '已盘点'), opt('盘盈', '盘盈'), opt('盘亏', '盘亏')],
      }),
      f('brandModel', '品牌型号', 'text', { bitableField: '品牌型号' }),
      f('department', '使用部门', 'select', {
        inList: false, bitableField: '使用部门',
        options: [opt('商务一部', '商务一部'), opt('商务二部', '商务二部'), opt('商务三部', '商务三部'), opt('运营部', '运营部'), opt('视频部', '视频部'), opt('财务部', '财务部'), opt('人事部', '人事部'), opt('行政部', '行政部'), opt('管理层', '管理层')],
      }),
      f('user', '使用人', 'user', { inForm: true, bitableField: '使用人', bitableType: 'User' }),
      f('buyDate', '购入日期', 'date', { inList: false, bitableField: '购入日期', bitableType: 'DateTime' }),
      f('buyAmount', '购入金额', 'number', { money: true, bitableField: '购入金额' }),
      f('warrantyDate', '保修截止', 'date', { inList: false, bitableField: '保修截止日期', bitableType: 'DateTime' }),
      f('location', '存放地点', 'text', { inList: false, bitableField: '存放地点' }),
      f('lifeYears', '使用年限', 'number', { inList: false, bitableField: '使用年限' }),
      f('residualRate', '残值率', 'number', { inList: false, bitableField: '残值率' }),
      f('lastStockDate', '上次盘点', 'date', { inList: false, bitableField: '上次盘点日期', bitableType: 'DateTime' }),
      f('note', '备注', 'textarea', { inList: false, span: 2, bitableField: '备注' }),
    
      f('f0', '创建时间', 'date', { inList: false, inForm: false, bitableField: '创建时间' }),
      f('f1', '资产照片', 'attachment', { inList: true, inForm: true, bitableField: '资产照片' }),
      f('f2', '修改人', 'text', { inList: false, inForm: false, bitableField: '修改人' }),
      f('f3', '创建人', 'text', { inList: false, inForm: false, bitableField: '创建人' }),
      f('f4', '修改时间', 'date', { inList: false, inForm: false, bitableField: '修改时间' }),
      f('f5', '购买发票', 'attachment', { inList: true, inForm: true, bitableField: '购买发票' }),],
    toolbarActions: [
      { key: 'exportCsv', label: '导出CSV', exportCsv: true },
    ],
    rowActions: [
      {
        key: 'inUse', label: '投入在用', hiddenWhenEquals: { field: 'status', value: '在用' },
        patch: { status: '在用' }, confirmTitle: '资产投入在用',
        confirmDescription: '确认将该资产状态更新为「在用」?', successMessage: '资产已投入在用',
      },
      {
        key: 'repair', label: '报修', hiddenWhenEquals: { field: 'status', value: '维修中' },
        patch: { status: '维修中' }, confirmTitle: '资产报修',
        confirmDescription: '确认将该资产标记为「维修中」?', successMessage: '资产已报修, 状态为维修中',
      },
      {
        key: 'scrap', label: '资产报废', hiddenWhenEquals: { field: 'status', value: '已报废' },
        patch: { status: '已报废' }, confirmTitle: '资产报废',
        confirmDescription: '确认将该资产报废? 报废后不可再领用', successMessage: '资产已报废',
      },
      {
        key: 'stockCheck', label: '盘点确认', visibleWhenEquals: { field: 'stockStatus', value: '未盘点' },
        patch: { stockStatus: '已盘点' }, confirmTitle: '确认盘点',
        confirmDescription: '确认完成该资产的盘点?', successMessage: '资产盘点已完成',
      },
    ],
  },
  task: {
    key: 'task',
    label: '任务中心',
    noun: '任务',
    description: '跨模块协作任务的分派、跟进与完成跟踪',
    route: '/tasks',
    tableKey: 'tblj3NeR0ZRIcSof',
    bitableEnabled: true,
    searchField: 'title',
    filterField: 'status',
    extraFilterField: 'priority',
    icon: CheckSquare,
    fields: [
      f('title', '任务名称', 'text', { required: true, placeholder: '请输入任务名称', bitableField: '任务名称' }),
      f('status', '任务状态', 'select', {
        required: true, bitableField: '任务状态',
        options: [opt('待处理', '待处理', 'secondary'), opt('进行中', '进行中', 'info'), opt('已完成', '已完成', 'success'), opt('已取消', '已取消', 'secondary')],
      }),
      f('priority', '优先级', 'select', {
        required: true, bitableField: '优先级',
        options: [opt('高', '高', 'destructive'), opt('中', '中', 'warning'), opt('低', '低', 'secondary')],
      }),
      f('relatedModule', '关联模块', 'select', {
        bitableField: '关联模块',
        options: [opt('客户管理', '客户管理'), opt('广告业务', '广告业务'), opt('视频业务', '视频业务'), opt('合同财务', '合同财务'), opt('人资行政', '人资行政'), opt('其他', '其他')],
      }),
      f('owner', '负责人', 'user', { inForm: true, bitableField: '负责人', bitableType: 'User' }),
      f('collaborators', '协作人', 'user', { inList: false, inForm: true, bitableField: '协作人', bitableType: 'User' }),
      f('dueDate', '截止日期', 'date', { bitableField: '截止日期', bitableType: 'DateTime' }),
      f('finishTime', '完成时间', 'date', { inList: false, bitableField: '完成时间', bitableType: 'DateTime' }),
      f('description', '任务描述', 'textarea', { inList: false, span: 2, bitableField: '任务描述' }),
      f('note', '备注', 'textarea', { inList: false, span: 2, bitableField: '备注' }),
    
      f('f0', '创建时间', 'date', { inList: false, inForm: false, bitableField: '创建时间' }),
      f('f1', '修改时间', 'date', { inList: false, inForm: false, bitableField: '修改时间' }),
      f('f2', '修改人', 'text', { inList: false, inForm: false, bitableField: '修改人' }),
      f('f3', '创建人', 'text', { inList: false, inForm: false, bitableField: '创建人' }),
      f('f4', 'XZ编号', 'text', { inList: true, inForm: false, bitableField: 'XZ编号' }),],
    toolbarActions: [
      { key: 'batchImport', label: '批量导入', navigateTo: '/batch-import' },
      { key: 'exportCsv', label: '导出CSV', exportCsv: true },
    ],
    rowActions: [
      {
        key: 'start',
        label: '开始处理',
        visibleWhenEquals: { field: 'status', value: '待处理' },
        patch: { status: '进行中' },
        confirmTitle: '开始处理任务',
        confirmDescription: '确认开始处理该任务? 状态将变为「进行中」',
        successMessage: '任务已进入进行中',
      },
      {
        key: 'complete',
        label: '标记完成',
        hiddenWhenEquals: { field: 'status', value: '已完成' },
        patch: { status: '已完成' },
        confirmTitle: '标记任务完成',
        confirmDescription: '确认将该任务标记为已完成?',
        successMessage: '任务已标记完成',
      },
      {
        key: 'cancel',
        label: '取消任务',
        hiddenWhenEquals: { field: 'status', value: '已取消' },
        patch: { status: '已取消' },
        confirmTitle: '取消任务',
        confirmDescription: '确认取消该任务?',
        successMessage: '任务已取消',
      },
    ],
  },
  system: {
    key: 'system',
    label: '系统管理',
    noun: '系统设置',
    description: '业务参数、预警阈值与系统配置项管理',
    route: '/system',
    tableKey: 'tblPPqjHCuTduHI0',
    bitableEnabled: true,
    searchField: 'name',
    filterField: 'status',
    icon: Settings,
    fields: [
      f('name', '设置项', 'text', { required: true, placeholder: '请输入设置项名称', bitableField: '设置项' }),
      f('code', '设置编号', 'text', { bitableField: '设置编号' }),
      f('category', '设置分类', 'select', {
        bitableField: '设置分类',
        options: [opt('公海设置', '公海设置'), opt('线索设置', '线索设置'), opt('客户设置', '客户设置'), opt('预警设置', '预警设置'), opt('税点设置', '税点设置'), opt('其他', '其他')],
      }),
      f('value', '设置值', 'text', { bitableField: '设置值' }),
      f('status', '状态', 'select', {
        required: true, bitableField: '状态',
        options: [opt('启用', '启用', 'success'), opt('停用', '停用', 'destructive')],
      }),
      f('description', '说明', 'textarea', { inList: false, span: 2, bitableField: '说明' }),
      f('note', '备注', 'textarea', { inList: false, span: 2, bitableField: '备注' }),
    
      f('f0', '创建人', 'text', { inList: false, inForm: false, bitableField: '创建人' }),
      f('f1', '创建时间', 'date', { inList: false, inForm: false, bitableField: '创建时间' }),
      f('f2', '修改时间', 'date', { inList: false, inForm: false, bitableField: '修改时间' }),
      f('f3', '修改人', 'text', { inList: false, inForm: false, bitableField: '修改人' }),],
    toolbarActions: [
      { key: 'exportCsv', label: '导出CSV', exportCsv: true },
    ],
    rowActions: [
      {
        key: 'disable',
        label: '停用',
        hiddenWhenEquals: { field: 'status', value: '停用' },
        patch: { status: '停用' },
        confirm: true,
        confirmTitle: '停用设置项',
        confirmDescription: '停用后该配置将不再生效,确认继续?',
        successMessage: '设置项已停用',
      },
      {
        key: 'enable',
        label: '启用',
        hiddenWhenEquals: { field: 'status', value: '启用' },
        patch: { status: '启用' },
        confirmTitle: '启用设置项',
        confirmDescription: '确认启用该设置项?',
        successMessage: '设置项已启用',
      },
    ],
  },
  support: {
    key: 'support',
    label: '业务支持',
    noun: '采购申请',
    description: '采购申请的提交、审批、采购与入库流转管理',
    route: '/support',
    tableKey: 'tblzNP3ynYIArxiW',
    bitableEnabled: true,
    searchField: 'name',
    filterField: 'status',
    icon: Headphones,
    fields: [
      f('name', '申请标题', 'text', { required: true, placeholder: '请输入申请标题', bitableField: '申请标题' }),
      f('code', 'CG编号', 'text', { inForm: false, bitableField: 'CG编号' }),
      f('type', '采购类型', 'select', {
        bitableField: '采购类型',
        options: [opt('办公用品', '办公用品'), opt('电子设备', '电子设备'), opt('拍摄器材', '拍摄器材'), opt('视频素材', '视频素材'), opt('软件服务', '软件服务'), opt('团建物资', '团建物资'), opt('其他', '其他')],
      }),
      f('status', '申请状态', 'select', {
        required: true, bitableField: '申请状态',
        options: [
          opt('草稿', '草稿', 'secondary'), opt('待审批', '待审批', 'warning'), opt('审批中', '审批中', 'warning'),
          opt('已通过', '已通过', 'info'), opt('已驳回', '已驳回', 'destructive'), opt('采购中', '采购中', 'info'),
          opt('已入库', '已入库', 'success'), opt('已取消', '已取消', 'secondary'),
        ],
      }),
      f('urgency', '紧急程度', 'select', {
        bitableField: '紧急程度',
        options: [opt('普通', '普通', 'secondary'), opt('紧急', '紧急', 'warning'), opt('特急', '特急', 'destructive')],
      }),
      f('item', '采购物品', 'text', { bitableField: '采购物品' }),
      f('supplier', '供应商', 'text', { inList: false, bitableField: '供应商' }),
      f('reason', '采购理由', 'textarea', { inList: false, span: 2, bitableField: '采购理由' }),
      f('department', '申请部门', 'select', {
        inList: false, bitableField: '申请部门',
        options: [opt('商务一部', '商务一部'), opt('商务二部', '商务二部'), opt('商务三部', '商务三部'), opt('运营部', '运营部'), opt('视频部', '视频部'), opt('财务部', '财务部'), opt('人事部', '人事部'), opt('行政部', '行政部'), opt('管理层', '管理层')],
      }),
      f('estAmount', '预计金额', 'number', { money: true, bitableField: '预计金额' }),
      f('actualAmount', '实际金额', 'number', { money: true, inList: false, bitableField: '实际金额' }),
      f('purchaseDate', '采购日期', 'date', { inList: false, bitableField: '采购日期', bitableType: 'DateTime' }),
      f('expectDate', '期望到货', 'date', { inList: false, bitableField: '期望到货日期', bitableType: 'DateTime' }),
      f('approvalDate', '审批时间', 'date', { inList: false, bitableField: '审批时间', bitableType: 'DateTime' }),
      f('stockDate', '入库日期', 'date', { inList: false, bitableField: '入库日期', bitableType: 'DateTime' }),
      f('applicant', '申请人', 'user', { inForm: true, bitableField: '申请人', bitableType: 'User' }),
      f('purchaser', '采购人', 'user', { inList: false, inForm: true, bitableField: '采购人', bitableType: 'User' }),
      f('stockKeeper', '入库人', 'user', { inList: false, inForm: true, bitableField: '入库人', bitableType: 'User' }),
      f('approver', '审批人', 'user', { inList: false, inForm: true, bitableField: '审批人', bitableType: 'User' }),
      f('approvalOpinion', '审批意见', 'text', { inList: false, bitableField: '审批意见' }),
      f('note', '备注', 'textarea', { inList: false, span: 2, bitableField: '备注' }),
    
      f('f0', '创建时间', 'date', { inList: false, inForm: false, bitableField: '创建时间' }),
      f('f1', '修改人', 'text', { inList: false, inForm: false, bitableField: '修改人' }),
      f('f2', '修改时间', 'date', { inList: false, inForm: false, bitableField: '修改时间' }),
      f('f3', '创建人', 'text', { inList: false, inForm: false, bitableField: '创建人' }),
      f('f4', '报价单', 'attachment', { inList: true, inForm: true, bitableField: '报价单' }),
      f('f5', '发票', 'attachment', { inList: true, inForm: true, bitableField: '发票' }),],
    toolbarActions: [
      { key: 'exportCsv', label: '导出CSV', exportCsv: true },
    ],
    rowActions: [
      {
        key: 'approve',
        label: '审批通过',
        visibleWhenIn: { field: 'status', values: ['草稿', '待审批', '审批中'] },
        patch: { status: '已通过' },
        confirm: true,
        confirmTitle: '审批通过采购申请',
        confirmDescription: '确认审批通过该采购申请?',
        successMessage: '采购申请已审批通过',
      },
      {
        key: 'reject',
        label: '审批驳回',
        visibleWhenIn: { field: 'status', values: ['草稿', '待审批', '审批中'] },
        patch: { status: '已驳回' },
        confirmTitle: '驳回采购申请',
        confirmDescription: '确认驳回该采购申请?',
        successMessage: '采购申请已驳回',
      },
      {
        key: 'stockIn',
        label: '确认入库',
        visibleWhenIn: { field: 'status', values: ['已通过', '采购中'] },
        patch: { status: '已入库' },
        confirmTitle: '确认采购入库',
        confirmDescription: '确认该采购物品已完成入库?',
        successMessage: '采购已入库',
      },
    ],
    detailTabs: [
      { key: 'items', label: '物品明细', parentField: '' },
      { key: 'approval', label: '审批时间线', parentField: '' },
      { key: 'stockIn', label: '入库记录', parentField: '' },
      { key: 'payment', label: '付款记录', parentField: '' },
    ],
  },
};

/** 58 张子表 + 为审批/办理类子表注入业务流转动作, 并修正个别被生成器误选的状态筛选字段 */
const FILTER_FIELD_FIX: Record<string, string> = {
  sample: 'f18', // 样品状态(而非完好状态)
  income: 'f10', // 确认状态(而非发票状态)
  expense: 'status', // 审批状态(而非发票状态)
};

/** 子表脱敏字段 */
const SUB_MASK_FIELDS: Record<string, string[]> = {
  pool: ['phone'],
  clue: ['phone'],
  contact: ['phone'],
  bank: ['bankSerial', 'payAccount'],
};

/** 子表工具栏批量操作 */
const SUB_TOOLBAR_ACTIONS: Record<string, IToolbarAction[]> = {
  pool: [
    { key: 'batchClaim', label: '批量领取', requiresSelection: true, batchPatch: { f9: '已领取' }, confirmTitle: '批量领取', confirmDescription: '确认将选中的公海客资批量领取？', successMessage: '已批量领取选中客资' },
    { key: 'batchAssign', label: '批量分配', requiresSelection: true, batchPatch: { f9: '已分配' }, confirmTitle: '批量分配', confirmDescription: '确认将选中的公海客资批量分配？', successMessage: '已批量分配选中客资' },
    { key: 'autoAssign', label: '自动分配', confirmTitle: '自动分配', confirmDescription: '确认按规则自动分配所有待分配公海客资？', batchPatch: { f9: '已分配' }, successMessage: '公海客资已自动分配' },
  ],
  videoOrder: [
    { key: 'batchApprove', label: '批量通过', requiresSelection: true, batchPatch: { status: '已通过' }, confirmTitle: '批量通过', confirmDescription: '确认将选中的视频订单批量通过？', successMessage: '已批量通过选中订单' },
    { key: 'batchReject', label: '批量驳回', requiresSelection: true, batchPatch: { status: '已驳回' }, confirmTitle: '批量驳回', confirmDescription: '确认将选中的视频订单批量驳回？', successMessage: '已批量驳回选中订单' },
  ],
};

const SUB_MODULES_WITH_ACTIONS: Record<string, IModuleConfig> = Object.fromEntries(
  Object.entries(SUB_MODULES).map(([k, cfg]) => [
    k,
    {
      ...cfg,
      ...(FILTER_FIELD_FIX[k] ? { filterField: FILTER_FIELD_FIX[k] } : {}),
      ...(SUB_ACTIONS[k] ? { rowActions: SUB_ACTIONS[k] } : {}),
      ...(SUB_MASK_FIELDS[k] ? { maskFields: SUB_MASK_FIELDS[k] } : {}),
      ...(SUB_TOOLBAR_ACTIONS[k] ? { toolbarActions: SUB_TOOLBAR_ACTIONS[k] } : {}),
    },
  ]),
);

/** 报表中心配置表(隐藏模块, 不进侧栏导航, 仅作实时数据通道): 自定义模板 / 定时推送任务均落多维表格 */
const CONFIG_MODULES: Record<string, IModuleConfig> = {
  reportTpl: {
    key: 'reportTpl',
    label: '报表模板',
    noun: '模板',
    description: '用户自定义报表模板, 实时读写多维表格',
    route: '/report/templates',
    tableKey: 'tblk8x1UF4aMoAGl',
    bitableEnabled: true,
    searchField: 'name',
    icon: Settings,
    fields: [
      f('name', '模板名称', 'text', { required: true, bitableField: '模板名称' }),
      f('category', '分类', 'text', { bitableField: '分类' }),
      f('scope', '可见范围', 'select', {
        bitableField: '可见范围',
        options: [opt('个人', '个人'), opt('部门', '部门'), opt('全员', '全员'), opt('管理层', '管理层')],
      }),
      f('source', '数据源', 'text', { bitableField: '数据源' }),
      f('dim', '分组维度', 'text', { bitableField: '分组维度' }),
      f('measure', '统计指标', 'text', { bitableField: '统计指标' }),
      f('chart', '图表类型', 'select', {
        bitableField: '图表类型',
        options: ['柱状图', '条形图', '饼图', '折线图', '数据表', '指标卡'].map((x) => opt(x, x)),
      }),
      f('topN', 'TopN', 'text', { bitableField: 'TopN' }),
      f('sort', '排序', 'text', { bitableField: '排序' }),
      f('status', '状态', 'select', {
        bitableField: '状态',
        options: [opt('启用', '启用', 'success'), opt('停用', '停用', 'secondary')],
      }),
      f('rowState', '记录状态', 'select', {
        inList: false, inForm: false, bitableField: '记录状态',
        options: [opt('正常', '正常'), opt('已删除', '已删除')],
      }),
    ],
  },
  reportPush: {
    key: 'reportPush',
    label: '定时推送',
    noun: '推送任务',
    description: '报表定时推送任务配置, 实时读写多维表格',
    route: '/report/push',
    tableKey: 'tblmVPxXuQJCco7I',
    bitableEnabled: true,
    searchField: 'name',
    icon: Settings,
    fields: [
      f('name', '任务名称', 'text', { required: true, bitableField: '任务名称' }),
      f('tpl', '关联报表', 'text', { bitableField: '关联报表' }),
      f('freq', '频率', 'select', {
        bitableField: '频率',
        options: [opt('每日', '每日'), opt('每周', '每周'), opt('每月', '每月')],
      }),
      f('time', '推送时间', 'text', { bitableField: '推送时间' }),
      f('group', '接收群', 'text', { bitableField: '接收群' }),
      f('fmt', '推送格式', 'select', {
        bitableField: '推送格式',
        options: [opt('卡片消息', '卡片消息'), opt('文件附件', '文件附件'), opt('两者', '两者')],
      }),
      f('atAll', 'At所有人', 'select', {
        bitableField: 'At所有人',
        options: [opt('是', '是'), opt('否', '否')],
      }),
      f('enabled', '启用状态', 'select', {
        bitableField: '启用状态',
        options: [opt('启用', '启用', 'success'), opt('停用', '停用', 'secondary')],
      }),
      f('lastPush', '上次推送', 'text', { bitableField: '上次推送' }),
      f('rowState', '记录状态', 'select', {
        inList: false, inForm: false, bitableField: '记录状态',
        options: [opt('正常', '正常'), opt('已删除', '已删除')],
      }),
    ],
  },
};
/** 报表配置模块 -> 多维表格插件实例(69 模板 / 70 推送) */
export const CONFIG_INSTANCE: Record<string, string> = {
  reportTpl: 'feishu_multitable_crud_analysis_69',
  reportPush: 'feishu_multitable_crud_analysis_70',
};

/** 全部模块: 10 个一级主模块 + 58 张业务子表 + 2 张报表配置表(共覆盖 70 张数据表) */
export const MODULES: Record<string, IModuleConfig> = {
  ...MAIN_MODULES,
  ...SUB_MODULES_WITH_ACTIONS,
  ...CONFIG_MODULES,
};

/** 一级模块 -> 其子页面(子表)导航 */
export { SUB_NAV };
/** 子模块 -> 插件实例映射(供 mt-client 合并) */
export { SUB_INSTANCE };

export const MODULE_ORDER: ModuleKey[] = [
  'customer',
  'ad',
  'video',
  'contract',
  'finance',
  'hr',
  'admin',
  'task',
  'system',
  'support',
];

export const MODULE_NAV_ITEMS = MODULE_ORDER.map((key) => {
  const config = MODULES[key];
  return { key, path: config.route, label: config.label, icon: config.icon };
});
