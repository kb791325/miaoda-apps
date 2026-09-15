import React, { useState } from 'react';
import {
  Package,
  Search,
  TrendingUp,
  Heart,
  ArrowLeftRight,
  AlertTriangle,
} from 'lucide-react';
import ReplenishmentTab from './ReplenishmentTab';
import NaturalLanguageTab from './NaturalLanguageTab';
import SalesPredictionTab from './SalesPredictionTab';
import HealthScoreTab from './HealthScoreTab';
import TransferSuggestionTab from './TransferSuggestionTab';
import AnomalyDetectionTab from './AnomalyDetectionTab';

const AI_TABS = [
  { key: 'replenishment', label: '补货建议', icon: Package },
  { key: 'natural-language', label: '自然语言查询', icon: Search },
  { key: 'sales-prediction', label: '销售预测', icon: TrendingUp },
  { key: 'health-score', label: '健康度评分', icon: Heart },
  { key: 'transfer', label: '调拨建议', icon: ArrowLeftRight },
  { key: 'anomaly', label: '异常检测', icon: AlertTriangle },
] as const;

type TabKey = (typeof AI_TABS)[number]['key'];

const AI_TAB_COMPONENTS: Record<TabKey, React.FC> = {
  'replenishment': ReplenishmentTab,
  'natural-language': NaturalLanguageTab,
  'sales-prediction': SalesPredictionTab,
  'health-score': HealthScoreTab,
  'transfer': TransferSuggestionTab,
  'anomaly': AnomalyDetectionTab,
};

const AiToolsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('replenishment');

  const ActiveComponent = AI_TAB_COMPONENTS[activeTab];

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="h-5 w-1 rounded-sm bg-primary" />
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">
            AI 智能工具
          </h1>
          <p className="text-sm text-muted-foreground">
            AI 驱动的库存分析与决策辅助
          </p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="border border-border rounded-sm bg-card overflow-x-auto">
        <div className="flex min-w-max">
          {AI_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`
                  flex items-center gap-2 px-5 py-3 text-sm font-medium
                  border-b-2 transition-colors duration-150
                  ${
                    isActive
                      ? 'border-b-primary text-foreground'
                      : 'border-b-transparent text-muted-foreground hover:text-foreground'
                  }
                `}
              >
                <Icon
                  className={`size-4 ${
                    isActive ? 'text-primary' : ''
                  }`}
                />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div>
        <ActiveComponent />
      </div>
    </div>
  );
};

export default AiToolsPage;
