import { useState } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { getDefaultRange } from '@client/src/pages/Finance/finance-utils';
import type { FinanceDateRange } from '@client/src/pages/Finance/finance-utils';
import { ReportDateRangePicker } from './profit-report-utils';
import TimelineTab from './TimelineTab';
import ProductTab from './ProductTab';
import CustomerTab from './CustomerTab';

/** 利润报表（/profit-report）：统一日期区间 + 时间/商品/客户三个统计维度 */
const ProfitReportPage: React.FC = () => {
  const [range, setRange] = useState<FinanceDateRange>(getDefaultRange());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">利润报表</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            按时间、商品、客户三个维度统计区间内收入、成本与利润
          </p>
        </div>
        <ReportDateRangePicker range={range} onRangeChange={setRange} />
      </div>

      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">按时间统计</TabsTrigger>
          <TabsTrigger value="product">按商品统计</TabsTrigger>
          <TabsTrigger value="customer">按客户统计</TabsTrigger>
        </TabsList>
        <TabsContent value="timeline" className="mt-4">
          <TimelineTab startDate={range.startDate} endDate={range.endDate} />
        </TabsContent>
        <TabsContent value="product" className="mt-4">
          <ProductTab startDate={range.startDate} endDate={range.endDate} />
        </TabsContent>
        <TabsContent value="customer" className="mt-4">
          <CustomerTab startDate={range.startDate} endDate={range.endDate} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfitReportPage;
