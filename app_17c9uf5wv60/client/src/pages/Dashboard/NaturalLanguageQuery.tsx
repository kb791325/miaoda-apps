import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Download,
  PlusCircle,
  RotateCcw,
  Search,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface ParsedQuery {
  category?: string;
  status?: string;
  keyword?: string;
  maxStock?: number;
  sortBy?: string;
}

const PRESET_QUERIES = [
  '库存低于10',
  '上海仓最多',
  '近7天入库最多',
  '电子产品缺货',
  '全部预警',
  '金额最高',
  '成都仓最多',
];

const WAREHOUSES = ['上海仓', '北京仓', '广州仓', '成都仓'];
const CATEGORIES = [
  '电子产品',
  '服装鞋帽',
  '食品饮料',
  '家居用品',
  '美妆个护',
  '母婴用品',
  '办公文具',
  '运动户外',
  '汽车配件',
  '宠物用品',
  '图书音像',
  '五金工具',
];

export function parseNaturalLanguage(text: string): ParsedQuery {
  const query: ParsedQuery = {};
  const trimmed = text.trim();
  if (!trimmed) return query;

  const stockBelow = trimmed.match(/库存低于\s*(\d+)/);
  if (stockBelow) {
    query.maxStock = parseInt(stockBelow[1], 10);
  }

  for (const wh of WAREHOUSES) {
    if (trimmed.includes(`${wh}最多`)) {
      query.sortBy = `warehouse_${wh}_desc`;
      break;
    }
  }

  if (trimmed.includes('入库最多') || trimmed.includes('出库最多')) {
    if (!query.sortBy) {
      query.sortBy = 'stock_asc';
    }
  }

  if (trimmed.includes('金额最高') || trimmed.includes('库存金额')) {
    query.sortBy = 'value_desc';
  }

  if (trimmed.includes('缺货') || trimmed.includes('断货')) {
    query.status = 'shortage';
  }

  if (trimmed.includes('预警') || trimmed.includes('低于安全')) {
    query.status = 'warning';
  }

  for (const cat of CATEGORIES) {
    if (trimmed.includes(cat)) {
      query.category = cat;
      break;
    }
  }

  if (trimmed.includes('正常')) {
    query.status = 'normal';
  }

  return query;
}

interface NaturalLanguageQueryProps {
  onQuery: (parsed: ParsedQuery) => void;
  onReset: () => void;
  onExport: () => void | Promise<void>;
  exporting: boolean;
}

const NaturalLanguageQuery = ({
  onQuery,
  onReset,
  onExport,
  exporting,
}: NaturalLanguageQueryProps) => {
  const [inputValue, setInputValue] = useState('');

  const handleExecute = () => {
    const parsed = parseNaturalLanguage(inputValue);
    onQuery(parsed);
  };

  const handleChipClick = (chip: string) => {
    setInputValue(chip);
    const parsed = parseNaturalLanguage(chip);
    onQuery(parsed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleExecute();
    }
  };

  return (
    <div className="bg-card border border-border rounded-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="size-4 text-primary" />
        <span className="text-sm font-medium text-foreground">
          智能查询
        </span>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="输入查询，如：库存低于10、上海仓最多、电子产品缺货"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-8"
          />
        </div>
        <Button size="sm" onClick={handleExecute}>
          执行查询
        </Button>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        {PRESET_QUERIES.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => handleChipClick(chip)}
            className="px-2.5 py-1 text-xs rounded-full border border-primary/30 text-primary hover:bg-primary/5 transition-colors cursor-pointer"
          >
            {chip}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
        <Button variant="outline" size="sm" onClick={onReset}>
          <RotateCcw className="size-3.5 mr-1.5" />
          重置
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={exporting}
        >
          <Download className="size-3.5 mr-1.5" />
          {exporting ? '导出中...' : '导出CSV'}
        </Button>
        <div className="flex-1" />
        <NavLink to="/add-product">
          <Button size="sm">
            <PlusCircle className="size-3.5 mr-1.5" />
            新增商品
          </Button>
        </NavLink>
      </div>
    </div>
  );
};

export default NaturalLanguageQuery;
