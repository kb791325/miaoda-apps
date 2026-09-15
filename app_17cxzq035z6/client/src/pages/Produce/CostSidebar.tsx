import React from 'react';
import { Coins, Clock, Sparkles } from 'lucide-react';

interface CostItem {
  label: string;
  amount: number;
  detail?: string;
}

interface CostSidebarProps {
  items: CostItem[];
  total: number;
  estimatedMinutes: number;
}

const CostSidebar: React.FC<CostSidebarProps> = ({
  items,
  total,
  estimatedMinutes,
}) => {
  return (
    <aside
      className="rounded-xl p-5 space-y-5"
      style={{
        width: 280,
        backgroundColor: '#121738',
        border: '1px solid #1e293b',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        position: 'sticky',
        top: 24,
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: 'rgba(245,158,11,0.15)' }}
        >
          <Coins size={20} style={{ color: '#f59e0b' }} />
        </div>
        <div>
          <h2 className="text-base font-semibold" style={{ color: '#e2e8f0' }}>
            成本预估
          </h2>
          <p className="text-xs" style={{ color: '#64748b' }}>
            实时计算生成消耗
          </p>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-start justify-between">
            <div>
              <div className="text-sm" style={{ color: '#94a3b8' }}>
                {item.label}
              </div>
              {item.detail && (
                <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                  {item.detail}
                </div>
              )}
            </div>
            <div
              className="text-sm font-medium whitespace-nowrap"
              style={{ color: '#e2e8f0' }}
            >
              ¥{item.amount.toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px dashed #1e293b' }} />

      {/* Total */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: '#94a3b8' }}>
          合计
        </span>
        <div className="text-right">
          <div
            className="text-2xl font-bold"
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            ¥{total.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Time estimate */}
      <div
        className="p-3 rounded-lg flex items-center gap-3"
        style={{
          backgroundColor: 'rgba(0,212,255,0.08)',
          border: '1px solid rgba(0,212,255,0.2)',
        }}
      >
        <Clock size={18} style={{ color: '#00d4ff' }} />
        <div>
          <div className="text-xs" style={{ color: '#64748b' }}>
            预计生成时长
          </div>
          <div className="text-sm font-semibold" style={{ color: '#00d4ff' }}>
            约 {estimatedMinutes} 分钟
          </div>
        </div>
      </div>

      {/* Tip */}
      <div
        className="p-3 rounded-lg text-xs leading-relaxed flex items-start gap-2"
        style={{
          backgroundColor: 'rgba(99,102,241,0.08)',
          color: '#94a3b8',
        }}
      >
        <Sparkles size={14} style={{ color: '#6366f1', flexShrink: 0, marginTop: 1 }} />
        <span>
          首次生成赠送 50% 额度抵扣，
          <span style={{ color: '#c7d2fe' }}>会员专享 8 折</span>
        </span>
      </div>
    </aside>
  );
};

export default CostSidebar;
