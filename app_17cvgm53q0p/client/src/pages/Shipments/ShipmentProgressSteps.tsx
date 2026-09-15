import React from 'react';
import { Check } from 'lucide-react';

import type { ShipmentStatus } from '@shared/shipment';

interface ShipmentProgressStepsProps {
  status: ShipmentStatus | '已取消';
}

const STEPS: ShipmentStatus[] = ['待出库', '运输中', '在安装', '已完成'];

const ShipmentProgressSteps: React.FC<ShipmentProgressStepsProps> = ({
  status,
}) => {
  const currentIndex: number = status === '已取消' ? -1 : STEPS.indexOf(status);

  return (
    <div className="flex items-center">
      {STEPS.map((step: ShipmentStatus, index: number) => {
        const done: boolean = index < currentIndex;
        const active: boolean = index === currentIndex;
        return (
          <React.Fragment key={step}>
            {index > 0 && (
              <div
                className={`h-0.5 flex-1 transition-colors duration-200 ${
                  index <= currentIndex ? 'bg-primary' : 'bg-border'
                }`}
              />
            )}
            <div className="flex flex-col items-center gap-1.5 px-2">
              <div
                className={`flex size-8 items-center justify-center rounded-full border text-sm font-medium transition-colors duration-200 ${
                  done
                    ? 'border-primary bg-primary text-primary-foreground'
                    : active
                      ? 'border-primary bg-accent text-primary'
                      : 'border-border bg-card text-muted-foreground'
                }`}
              >
                {done ? <Check className="size-4" /> : index + 1}
              </div>
              <span
                className={`text-xs whitespace-nowrap ${
                  done || active
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                {step}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default ShipmentProgressSteps;
