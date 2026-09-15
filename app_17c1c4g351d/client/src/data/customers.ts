// EXPORTS: ICustomer, MOCK_CUSTOMERS, MOCK_RFM_DISTRIBUTION, MOCK_REPURCHASE_TREND
export interface ICustomer {
  id: string
  firstPurchaseDate: string
  totalSpent: number
  purchaseCount: number
  lastPurchaseDate: string
  rfmScore: number
  tag: '新客' | '老客' | '沉睡客' | '高价值客'
}

export interface IRfmDistribution {
  tag: string
  count: number
  color: string
}

export interface IRepurchaseTrendItem {
  month: string
  rate: number
}

export const MOCK_CUSTOMERS: ICustomer[] = [
  { id: 'C001', firstPurchaseDate: '2024-01-15', totalSpent: 12580, purchaseCount: 18, lastPurchaseDate: '2025-01-10', rfmScore: 9, tag: '高价值客' },
  { id: 'C002', firstPurchaseDate: '2024-03-22', totalSpent: 8920, purchaseCount: 12, lastPurchaseDate: '2025-01-08', rfmScore: 8, tag: '高价值客' },
  { id: 'C003', firstPurchaseDate: '2024-06-10', totalSpent: 5600, purchaseCount: 8, lastPurchaseDate: '2025-01-05', rfmScore: 7, tag: '老客' },
  { id: 'C004', firstPurchaseDate: '2024-08-01', totalSpent: 3200, purchaseCount: 5, lastPurchaseDate: '2024-12-28', rfmScore: 6, tag: '老客' },
  { id: 'C005', firstPurchaseDate: '2024-09-15', totalSpent: 2100, purchaseCount: 3, lastPurchaseDate: '2024-12-20', rfmScore: 5, tag: '老客' },
  { id: 'C006', firstPurchaseDate: '2024-11-20', totalSpent: 890, purchaseCount: 2, lastPurchaseDate: '2025-01-02', rfmScore: 4, tag: '新客' },
  { id: 'C007', firstPurchaseDate: '2024-12-01', totalSpent: 560, purchaseCount: 1, lastPurchaseDate: '2024-12-01', rfmScore: 3, tag: '新客' },
  { id: 'C008', firstPurchaseDate: '2024-12-10', totalSpent: 320, purchaseCount: 1, lastPurchaseDate: '2024-12-10', rfmScore: 3, tag: '新客' },
  { id: 'C009', firstPurchaseDate: '2024-04-05', totalSpent: 1500, purchaseCount: 3, lastPurchaseDate: '2024-08-10', rfmScore: 2, tag: '沉睡客' },
  { id: 'C010', firstPurchaseDate: '2024-02-18', totalSpent: 2200, purchaseCount: 4, lastPurchaseDate: '2024-07-22', rfmScore: 2, tag: '沉睡客' },
  { id: 'C011', firstPurchaseDate: '2024-05-30', totalSpent: 980, purchaseCount: 2, lastPurchaseDate: '2024-09-15', rfmScore: 3, tag: '沉睡客' },
  { id: 'C012', firstPurchaseDate: '2024-07-12', totalSpent: 4500, purchaseCount: 7, lastPurchaseDate: '2024-11-30', rfmScore: 5, tag: '老客' },
  { id: 'C013', firstPurchaseDate: '2024-10-08', totalSpent: 1800, purchaseCount: 3, lastPurchaseDate: '2025-01-06', rfmScore: 5, tag: '老客' },
  { id: 'C014', firstPurchaseDate: '2024-12-25', totalSpent: 450, purchaseCount: 1, lastPurchaseDate: '2024-12-25', rfmScore: 2, tag: '新客' },
  { id: 'C015', firstPurchaseDate: '2024-11-05', totalSpent: 720, purchaseCount: 2, lastPurchaseDate: '2024-12-15', rfmScore: 4, tag: '新客' },
  { id: 'C016', firstPurchaseDate: '2024-01-20', totalSpent: 15600, purchaseCount: 22, lastPurchaseDate: '2025-01-12', rfmScore: 9, tag: '高价值客' },
  { id: 'C017', firstPurchaseDate: '2024-03-10', totalSpent: 6780, purchaseCount: 10, lastPurchaseDate: '2025-01-03', rfmScore: 7, tag: '老客' },
  { id: 'C018', firstPurchaseDate: '2024-06-25', totalSpent: 2300, purchaseCount: 4, lastPurchaseDate: '2024-10-20', rfmScore: 4, tag: '沉睡客' },
  { id: 'C019', firstPurchaseDate: '2024-09-01', totalSpent: 1100, purchaseCount: 2, lastPurchaseDate: '2024-12-05', rfmScore: 4, tag: '老客' },
  { id: 'C020', firstPurchaseDate: '2024-12-18', totalSpent: 280, purchaseCount: 1, lastPurchaseDate: '2024-12-18', rfmScore: 2, tag: '新客' },
]

export const MOCK_RFM_DISTRIBUTION: IRfmDistribution[] = [
  { tag: '高价值客', count: 3, color: '#10B981' },
  { tag: '老客', count: 7, color: '#3B82F6' },
  { tag: '新客', count: 6, color: '#06B6D4' },
  { tag: '沉睡客', count: 4, color: '#9CA3AF' },
]

export const MOCK_REPURCHASE_TREND: IRepurchaseTrendItem[] = [
  { month: '2024-08', rate: 18.5 },
  { month: '2024-09', rate: 20.3 },
  { month: '2024-10', rate: 22.1 },
  { month: '2024-11', rate: 25.8 },
  { month: '2024-12', rate: 28.4 },
  { month: '2025-01', rate: 31.2 },
]