import React, { useState, useEffect, useRef } from 'react';
import { Activity, Clock, AlertTriangle, Server } from 'lucide-react';
import type { PerformanceOverview as PerformanceOverviewData } from '@shared/api.interface';

interface PerformanceOverviewProps {
  data: PerformanceOverviewData | null;
  loading: boolean;
}

interface AnimatedNumberProps {
  end: number;
  decimals?: number;
  duration?: number;
}

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  end,
  decimals = 0,
  duration = 800,
}) => {
  const [displayValue, setDisplayValue] = useState<number>(0);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef<number>(0);

  useEffect(() => {
    startValueRef.current = displayValue;
    startTimeRef.current = null;

    const animate = (timestamp: number): void => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      const elapsed: number = timestamp - startTimeRef.current;
      const progress: number = Math.min(elapsed / duration, 1);
      const eased: number = 1 - Math.pow(1 - progress, 3);
      const current: number =
        startValueRef.current + (end - startValueRef.current) * eased;
      setDisplayValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [end, duration]);

  return <>{displayValue.toFixed(decimals)}</>;
};

const PerformanceOverview: React.FC<PerformanceOverviewProps> = ({
  data,
  loading,
}) => {
  const cards = [
    {
      label: 'QPS',
      value: data?.currentQps ?? 0,
      suffix: '',
      icon: Activity,
      color: 'text-primary',
      bg: 'bg-primary/5',
    },
    {
      label: '平均响应时间',
      value: data?.avgDurationMs ?? 0,
      suffix: ' ms',
      icon: Clock,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'P95 响应时间',
      value: data?.p95Ms ?? 0,
      suffix: ' ms',
      icon: AlertTriangle,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: '错误率',
      value: data ? (data.slowRequestCount / Math.max(data.totalRequests, 1)) * 100 : 0,
      suffix: '%',
      icon: Server,
      color: 'text-red-600',
      bg: 'bg-red-50',
      decimals: 1,
    },
  ];

  if (loading && !data) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-sm border border-border bg-card p-4 animate-pulse"
          >
            <div className="h-4 bg-muted rounded-sm w-16 mb-3" />
            <div className="h-8 bg-muted rounded-sm w-24" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            data-ai-section-type="card-stat"
            className="rounded-sm border border-border bg-card p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`flex items-center justify-center size-8 rounded-sm ${card.bg}`}>
                <Icon className={`size-4 ${card.color}`} />
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {card.label}
              </span>
            </div>
            <div
              className="text-2xl font-bold text-foreground text-right"
              style={{ fontFamily: 'JetBrains Mono, SF Mono, monospace' }}
            >
              <AnimatedNumber
                end={card.value}
                decimals={card.decimals ?? 0}
                duration={800}
              />
              {card.suffix}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PerformanceOverview;