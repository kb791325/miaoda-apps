// EXPORTS: IChannel, ITrafficKeyword, MOCK_CHANNELS, MOCK_KEYWORDS
export interface IChannel {
  id: string
  name: string
  cost: number
  clicks: number
  ctr: number
  conversionRate: number
  gmv: number
  roi: number
}

export interface ITrafficKeyword {
  id: string
  content: string
  type: 'keyword' | 'material'
  clicks: number
  conversionRate: number
  gmv: number
  roi: number
}

export const MOCK_CHANNELS: IChannel[] = [
  {
    id: '1',
    name: '自然流量',
    cost: 0,
    clicks: 12580,
    ctr: 8.5,
    conversionRate: 3.2,
    gmv: 86500,
    roi: 0,
  },
  {
    id: '2',
    name: '直通车',
    cost: 15800,
    clicks: 8920,
    ctr: 5.6,
    conversionRate: 4.1,
    gmv: 52300,
    roi: 3.31,
  },
  {
    id: '3',
    name: '千川',
    cost: 28500,
    clicks: 15600,
    ctr: 6.2,
    conversionRate: 3.8,
    gmv: 108600,
    roi: 3.81,
  },
  {
    id: '4',
    name: '达人带货',
    cost: 32000,
    clicks: 22100,
    ctr: 9.1,
    conversionRate: 5.2,
    gmv: 145800,
    roi: 4.56,
  },
]

export const MOCK_KEYWORDS: ITrafficKeyword[] = [
  {
    id: '1',
    content: '夏季连衣裙显瘦',
    type: 'keyword',
    clicks: 3280,
    conversionRate: 6.8,
    gmv: 28600,
    roi: 5.2,
  },
  {
    id: '2',
    content: '口红不掉色',
    type: 'keyword',
    clicks: 2560,
    conversionRate: 5.4,
    gmv: 19200,
    roi: 4.1,
  },
  {
    id: '3',
    content: '主图视频-场景A',
    type: 'material',
    clicks: 5820,
    conversionRate: 7.2,
    gmv: 46800,
    roi: 6.3,
  },
  {
    id: '4',
    content: '零食大礼包',
    type: 'keyword',
    clicks: 1890,
    conversionRate: 4.9,
    gmv: 12500,
    roi: 3.5,
  },
  {
    id: '5',
    content: '详情页-版本B',
    type: 'material',
    clicks: 4120,
    conversionRate: 6.1,
    gmv: 35400,
    roi: 4.8,
  },
]